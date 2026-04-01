'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Language, CreditSummary } from '@/lib/types';
import { t } from '@/lib/translations';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Check, Trash2, AlertCircle, Search, PlusCircle,
  Landmark, AlertTriangle, ChevronUp, ChevronDown,
  ChevronsUpDown, Bell, Filter, ArrowUpRight,
} from 'lucide-react';
import {
  getLocalEntries,
  createCreditEntry,
  updateCreditEntry,
  deleteLocalEntry,
  fullSync,
  LocalCreditEntry,
} from '@/lib/credit-sync';
import { calculateCreditSummary } from '@/lib/calculations';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditTrackingProps {
  userId: string;
  language: Language;
  onCreditChange?: () => void;
}

type FilterTab = 'all' | 'overdue' | 'pending' | 'paid';
type SortField = 'amount' | 'dueDate' | 'overdueDays' | null;
type SortDir = 'asc' | 'desc';
type Severity = 'mild' | 'warning' | 'critical' | null;

interface EnrichedEntry extends LocalCreditEntry {
  overdueDays: number;
  severity: Severity;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOverdueDays(dueDate: string): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

function getSeverity(entry: LocalCreditEntry): Severity {
  if (entry.isPaid) return null;
  const days = getOverdueDays(entry.dueDate);
  if (days === 0) return null;
  if (days <= 3) return 'mild';
  if (days <= 15) return 'warning';
  return 'critical';
}

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const palette = [
    { bg: 'bg-orange-100', text: 'text-orange-600' },
    { bg: 'bg-primary-100', text: 'text-primary-600' },
    { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-success-100', text: 'text-success-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

const severityDot: Record<NonNullable<Severity>, string> = {
  mild: 'bg-yellow-400',
  warning: 'bg-orange-500',
  critical: 'bg-rose-600',
};

const severityRowBg: Record<NonNullable<Severity>, string> = {
  mild: 'bg-yellow-50/40',
  warning: 'bg-orange-50/40',
  critical: 'bg-rose-50/40',
};

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (r, [k, v]) => r.replaceAll(`{${k}}`, String(v)),
    template
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-neutral-100">
          <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="size-10 rounded-full bg-neutral-200 animate-pulse" /><div className="h-4 w-32 bg-neutral-200 rounded animate-pulse" /></div></td>
          <td className="px-6 py-4"><div className="h-4 w-20 bg-neutral-200 rounded animate-pulse ml-auto" /></td>
          <td className="px-6 py-4"><div className="h-4 w-24 bg-neutral-200 rounded animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-4 w-16 bg-neutral-200 rounded animate-pulse mx-auto" /></td>
          <td className="px-6 py-4"><div className="h-4 w-16 bg-neutral-200 rounded animate-pulse ml-auto" /></td>
        </tr>
      ))}
    </tbody>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────

function SortTh({ label, field, sortField, sortDir, onSort }: {
  label: string; field: SortField;
  sortField: SortField; sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-300" />
        )}
      </span>
    </th>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreditTracking({ userId, language, onCreditChange }: CreditTrackingProps) {
  const [entries, setEntries] = useState<LocalCreditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CreditSummary>({ totalOutstanding: 0, totalOverdue: 0, overdueCount: 0 });

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Undo state
  const [undoEntry, setUndoEntry] = useState<{ id: string; snapshot: LocalCreditEntry } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { showToast } = useToast();

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadEntries = useCallback(() => {
    const local = getLocalEntries(userId);
    setEntries(local);
    setSummary(calculateCreditSummary(local));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadEntries();
    (async () => {
      try { await fullSync(userId); loadEntries(); } catch (e) { logger.error('[CreditTracking] sync failed', { e }); }
    })();
  }, [userId, loadEntries]);

  useEffect(() => {
    const h = () => loadEntries();
    window.addEventListener('vyapar-credit-entries-changed', h);
    return () => window.removeEventListener('vyapar-credit-entries-changed', h);
  }, [loadEntries]);

  // ── Debounce search ─────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Enriched + filtered + sorted entries ────────────────────────────────────

  const enriched = useMemo<EnrichedEntry[]>(() =>
    entries.map(e => ({
      ...e,
      overdueDays: e.isPaid ? 0 : getOverdueDays(e.dueDate),
      severity: getSeverity(e),
    })),
    [entries]
  );

  const filtered = useMemo(() => {
    let list = enriched;

    // Tab filter
    if (activeFilter === 'overdue') list = list.filter(e => !e.isPaid && e.overdueDays > 0);
    else if (activeFilter === 'pending') list = list.filter(e => !e.isPaid && e.overdueDays === 0);
    else if (activeFilter === 'paid') list = list.filter(e => e.isPaid);

    // Search
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(e =>
        e.customerName.toLowerCase().includes(q) ||
        e.amount.toString().includes(q) ||
        e.phoneNumber?.includes(q)
      );
    }

    // Sort
    if (sortField) {
      list = [...list].sort((a, b) => {
        let diff = 0;
        if (sortField === 'amount') diff = a.amount - b.amount;
        else if (sortField === 'dueDate') diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        else if (sortField === 'overdueDays') diff = a.overdueDays - b.overdueDays;
        return sortDir === 'asc' ? diff : -diff;
      });
    } else {
      // Default: overdue severity first, then by overdue days desc
      list = [...list].sort((a, b) => {
        if (!a.isPaid && !b.isPaid) return b.overdueDays - a.overdueDays;
        if (!a.isPaid) return -1;
        if (!b.isPaid) return 1;
        return 0;
      });
    }

    return list;
  }, [enriched, activeFilter, debouncedQuery, sortField, sortDir]);

  const overdueEntries = useMemo(() => enriched.filter(e => !e.isPaid && e.overdueDays > 0), [enriched]);
  const totalOverdueAmount = useMemo(() => overdueEntries.reduce((s, e) => s + e.amount, 0), [overdueEntries]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = showAllEntries ? filtered : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Sort handler ────────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { showToast('error', language === 'hi' ? 'कृपया पहले लॉगिन करें' : 'Please login first'); return; }
    if (phoneNumber && (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber))) {
      showToast('error', t('error.invalidPhoneNumber', language)); return;
    }
    const entryId = `credit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    try {
      const res = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id: entryId, customerName, amount: parseFloat(amount), dueDate, dateGiven: today, phoneNumber: phoneNumber || undefined, createdAt: now, updatedAt: now }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const { saveLocalEntry } = await import('@/lib/credit-sync');
        saveLocalEntry({ ...data.data, syncStatus: 'synced' as const, lastSyncAttempt: now }, userId);
      } else throw new Error();
    } catch {
      createCreditEntry(customerName, parseFloat(amount), dueDate, today, phoneNumber || undefined, false, userId);
    }
    loadEntries();
    setCustomerName(''); setAmount(''); setDueDate(''); setPhoneNumber(''); setShowForm(false);
    if (onCreditChange) onCreditChange();
  };

  const handleMarkPaid = async (id: string) => {
    if (!userId) return;
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    // Optimistic update + undo
    setUndoEntry({ id, snapshot: entry });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoEntry(null), 5000);

    try {
      const res = await fetch('/api/credit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id, isPaid: true, paidDate: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const { saveLocalEntry } = await import('@/lib/credit-sync');
        saveLocalEntry({ ...data.data, syncStatus: 'synced' as const, lastSyncAttempt: new Date().toISOString(), paidAt: data.data.paidDate }, userId);
      } else throw new Error();
    } catch {
      updateCreditEntry(id, { isPaid: true, paidAt: new Date().toISOString() }, false, userId);
    }
    loadEntries();
    if (onCreditChange) onCreditChange();
    showToast('success', `${language === 'hi' ? 'भुगतान दर्ज किया' : 'Marked as paid'} ✅`);
  };

  const handleUndo = async () => {
    if (!undoEntry) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoEntry(null);
    try {
      await fetch('/api/credit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, id: undoEntry.id, isPaid: false, paidDate: null }),
      });
    } catch { /* ignore */ }
    updateCreditEntry(undoEntry.id, { isPaid: false, paidAt: undefined }, false, userId);
    loadEntries();
    if (onCreditChange) onCreditChange();
  };

  const handleDeleteRequest = (id: string) => {
    if (!userId) { showToast('error', 'Please login first'); return; }
    setDeleteTarget(id); setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!userId || !deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/credit?userId=${userId}&id=${deleteTarget}`, { method: 'DELETE' });
    } catch (e) { logger.error('[CreditTracking] delete failed', { e }); }
    finally {
      deleteLocalEntry(deleteTarget, userId);
      loadEntries();
      if (onCreditChange) onCreditChange();
      setShowDeleteConfirm(false); setDeleteTarget(null); setDeleting(false);
    }
  };

  const handleSendReminders = () => {
    showToast('info', language === 'hi' ? `${overdueEntries.length} ग्राहकों को रिमाइंडर भेजा जा रहा है...` : `Sending reminders to ${overdueEntries.length} customers...`);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: language === 'hi' ? 'सभी' : language === 'mr' ? 'सर्व' : 'All' },
    { id: 'overdue', label: language === 'hi' ? 'बकाया' : language === 'mr' ? 'थकीत' : 'Overdue' },
    { id: 'pending', label: language === 'hi' ? 'बाकी' : language === 'mr' ? 'प्रलंबित' : 'Pending' },
    { id: 'paid', label: language === 'hi' ? 'भुगतान' : language === 'mr' ? 'भरलेले' : 'Paid' },
  ];

  return (
    <div className="bg-[#F9FAFB] rounded-3xl text-neutral-900 space-y-5 p-1">

      {/* Top action bar removed — Add Entry button moved into Recent Activity header */}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary-50 border-primary-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-xl border border-primary-100 bg-white p-2">
                <Landmark className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('totalOutstanding', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">₹{summary.totalOutstanding.toLocaleString('en-IN')}</p>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-widest">{t('credit.updatedAgo', language)}</p>
          </CardBody>
        </Card>

        <Card className="bg-rose-50 border-rose-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-xl border border-rose-100 bg-white p-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('totalOverdue', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">₹{summary.totalOverdue.toLocaleString('en-IN')}</p>
            <p className="text-xs text-rose-600 mt-1 uppercase tracking-widest font-medium">{t('credit.requiresAction', language)}</p>
          </CardBody>
        </Card>

        <Card className="bg-amber-50 border-amber-100">
          <CardBody>
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-xl border border-amber-100 bg-white p-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{t('credit.totalAlerts', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">{summary.overdueCount}</p>
            <p className="text-xs text-amber-600 mt-1 uppercase tracking-widest font-medium">{t('credit.criticalCount', language)}</p>
          </CardBody>
        </Card>
      </div>

      {/* ── Overdue action banner ── */}
      {overdueEntries.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50 px-5 py-4">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              <span className="font-semibold">₹{totalOverdueAmount.toLocaleString('en-IN')}</span>
              {' '}{language === 'hi' ? `बकाया है ${overdueEntries.length} ग्राहकों से` : language === 'mr' ? `थकीत आहे ${overdueEntries.length} ग्राहकांकडून` : `overdue from ${overdueEntries.length} customer${overdueEntries.length > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="secondary" icon={<Bell className="w-3.5 h-3.5" />} onClick={handleSendReminders}>
              {language === 'hi' ? 'रिमाइंडर भेजें' : 'Send Reminders'}
            </Button>
            <Button size="sm" variant="ghost" icon={<ArrowUpRight className="w-3.5 h-3.5" />} onClick={() => { setActiveFilter('overdue'); setCurrentPage(1); }}>
              {language === 'hi' ? 'बकाया देखें' : 'View Overdue'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Add form ── */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-neutral-900">{t('addCredit', language)}</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAddEntry}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input type="text" label={t('customerName', language)} required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('enterName', language)} />
                <Input type="number" label={t('amount', language)} min="0" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" />
                <Input type="date" label={t('dueDate', language)} required value={dueDate} onChange={e => setDueDate(e.target.value)} />
                <Input type="tel" label={`${t('phoneNumber', language)} (${t('optional', language)})`} value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="9876543210" maxLength={10} pattern="[0-9]{10}" />
              </div>
              <div className="flex gap-2">
                <Button type="submit">{t('save', language)}</Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="secondary">{t('cancel', language)}</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* ── Data grid ── */}
      <Card className="overflow-hidden p-0">

        {/* Grid header */}
        <div className="px-6 pt-5 pb-4 bg-white border-b border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-neutral-900">{t('credit.recentActivity', language)}</h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowForm(!showForm)}
                variant="secondary"
                size="sm"
                icon={<PlusCircle className="w-3.5 h-3.5" />}
                className="whitespace-nowrap text-xs"
              >
                {language === 'hi' ? '+ एंट्री जोड़ें' : language === 'mr' ? '+ नोंद जोडा' : '+ Add Entry'}
              </Button>
              <Button onClick={() => { setShowAllEntries(!showAllEntries); if (!showAllEntries) setCurrentPage(1); }} variant="ghost" size="sm">
                {showAllEntries ? t('credit.showLess', language) : t('credit.viewAll', language)}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 z-10 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder={language === 'hi' ? 'ग्राहक, राशि या फ़ोन से खोजें...' : language === 'mr' ? 'ग्राहक, रक्कम किंवा फोनने शोधा...' : 'Search by customer, amount, or phone...'}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filter tabs — horizontal scroll on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1 shrink-0" />
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveFilter(tab.id); setCurrentPage(1); }}
                className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] ${
                  activeFilter === tab.id
                    ? 'bg-[#ffe088] text-[#735c00] shadow-sm font-semibold'
                    : 'bg-neutral-100 text-neutral-600 active:bg-neutral-200'
                }`}
              >
                {tab.label}
                {tab.id === 'overdue' && overdueEntries.length > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeFilter === 'overdue' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'}`}>
                    {overdueEntries.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table — desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">{t('customerName', language)}</th>
                <SortTh label={language === 'hi' ? 'राशि (₹)' : t('amount', language)} field="amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label={t('dueDate', language)} field="dueDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortTh label={language === 'hi' ? 'बकाया दिन' : 'Overdue'} field="overdueDays" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-center">{t('credit.status', language)}</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 text-right">{t('credit.action', language)}</th>
              </tr>
            </thead>

            {loading ? <TableSkeleton /> : (
              <tbody className="divide-y divide-neutral-100 bg-white">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      {debouncedQuery ? (
                        <div className="text-neutral-500 text-sm">
                          <Search className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                          {language === 'hi' ? 'कोई परिणाम नहीं मिला' : 'No matching results found'}
                        </div>
                      ) : activeFilter === 'overdue' ? (
                        <div className="text-neutral-500 text-sm">
                          <span className="text-2xl block mb-2">🎉</span>
                          {language === 'hi' ? 'कोई बकाया भुगतान नहीं — सब ठीक है!' : "No overdue payments — you're all clear!"}
                        </div>
                      ) : entries.length === 0 ? (
                        <div className="text-neutral-500 text-sm">
                          <Landmark className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                          {language === 'hi' ? 'अभी तक कोई क्रेडिट एंट्री नहीं' : 'No credit entries yet'}
                        </div>
                      ) : (
                        <div className="text-neutral-500 text-sm">{t('noCreditEntries', language)}</div>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginated.map(entry => {
                    const rowBg = entry.severity ? severityRowBg[entry.severity] : '';
                    const avatarColor = entry.severity ? { bg: 'bg-rose-100', text: 'text-rose-600' } : getAvatarColor(entry.customerName);
                    return (
                      <tr key={entry.id} className={`group hover:bg-neutral-50 transition-colors cursor-default ${rowBg}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`size-9 shrink-0 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColor.bg} ${avatarColor.text}`}>
                              {getInitials(entry.customerName)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{highlightMatch(entry.customerName, debouncedQuery)}</p>
                              {entry.phoneNumber && <p className="text-xs text-neutral-400">{entry.phoneNumber}</p>}
                              {entry.syncStatus === 'pending' && <span className="text-[10px] text-orange-600 font-medium">● {t('pending', language)}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-neutral-900">₹{entry.amount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">
                          {new Date(entry.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          {entry.overdueDays > 0 && !entry.isPaid ? (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                              entry.severity === 'critical' ? 'text-rose-700' :
                              entry.severity === 'warning' ? 'text-orange-700' : 'text-yellow-700'
                            }`}>
                              <span className={`size-1.5 rounded-full ${entry.severity ? severityDot[entry.severity] : ''}`} />
                              {entry.overdueDays}d
                            </span>
                          ) : <span className="text-neutral-300 text-xs">—</span>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {entry.isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{t('paid', language)}</span>
                          ) : entry.overdueDays > 0 ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              entry.severity === 'critical' ? 'bg-rose-50 text-rose-700' :
                              entry.severity === 'warning' ? 'bg-orange-50 text-orange-700' : 'bg-yellow-50 text-yellow-700'
                            }`}>
                              <span className={`size-1.5 rounded-full ${entry.severity ? severityDot[entry.severity] : ''}`} />
                              {t('overdue', language)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">{t('credit.pending', language)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!entry.isPaid && (
                              <button onClick={() => handleMarkPaid(entry.id)} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors" title={t('markPaid', language)}>
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteRequest(entry.id)} className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors" title={t('delete', language)}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* Card layout — mobile */}
        <div className="sm:hidden divide-y divide-neutral-100">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : paginated.length === 0 ? (
            <div className="px-4 py-12 text-center text-neutral-500 text-sm">{t('noCreditEntries', language)}</div>
          ) : (
            paginated.map(entry => {
              const avatarColor = entry.severity ? { bg: 'bg-rose-100', text: 'text-rose-600' } : getAvatarColor(entry.customerName);
              return (
                <div key={entry.id} className={`px-4 py-4 ${entry.severity ? severityRowBg[entry.severity] : ''}`}>
                  {/* Top row: avatar + name + amount */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`size-8 shrink-0 rounded-full flex items-center justify-center font-semibold text-xs ${avatarColor.bg} ${avatarColor.text}`}>
                        {getInitials(entry.customerName)}
                      </div>
                      <p className="text-sm font-semibold text-neutral-900 truncate">{entry.customerName}</p>
                    </div>
                    <p className="text-base font-bold text-neutral-900 shrink-0">₹{entry.amount.toLocaleString('en-IN')}</p>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center gap-2 mb-3">
                    {entry.isPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">{t('paid', language)}</span>
                    ) : entry.overdueDays > 0 ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        entry.severity === 'critical' ? 'bg-rose-50 text-rose-700' :
                        entry.severity === 'warning' ? 'bg-orange-50 text-orange-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        <span className={`size-1.5 rounded-full ${entry.severity ? severityDot[entry.severity] : ''}`} />
                        {entry.overdueDays}d {language === 'hi' ? 'बकाया' : 'overdue'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">{t('credit.pending', language)}</span>
                    )}
                    <span className="text-xs text-neutral-400">{new Date(entry.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>

                  {/* Actions — full-width stacked */}
                  {!entry.isPaid && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkPaid(entry.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] rounded-lg bg-emerald-600 text-white text-xs font-semibold active:bg-emerald-700 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {t('markPaid', language)}
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(entry.id)}
                        className="flex items-center justify-center min-h-[40px] w-10 rounded-lg border border-neutral-200 text-rose-500 active:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {entry.isPaid && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDeleteRequest(entry.id)}
                        className="flex items-center justify-center min-h-[40px] w-10 rounded-lg border border-neutral-200 text-rose-500 active:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && !showAllEntries && (
          <div className="px-6 py-4 bg-white border-t border-neutral-100 flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              {formatTemplate(t('credit.showingLogs', language), {
                start: filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0,
                end: Math.min(currentPage * itemsPerPage, filtered.length),
                total: filtered.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="secondary" size="sm">{t('ui.button.previous', language)}</Button>
              <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="secondary" size="sm">{t('ui.button.next', language)}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Undo toast */}
      {undoEntry && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          <span>✅ {language === 'hi' ? 'भुगतान दर्ज किया' : 'Marked as paid'}</span>
          <button onClick={handleUndo} className="text-primary-300 font-semibold hover:text-primary-200 transition-colors">
            {language === 'hi' ? 'पूर्ववत करें' : 'Undo'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('daily.deleteEntry', language)}
        message={t('daily.confirmDelete', language)}
        cancelLabel={t('cancel', language)}
        confirmLabel={deleting ? t('daily.deleting', language) : t('delete', language)}
        confirmLoading={deleting}
        onCancel={() => { if (deleting) return; setShowDeleteConfirm(false); setDeleteTarget(null); }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
