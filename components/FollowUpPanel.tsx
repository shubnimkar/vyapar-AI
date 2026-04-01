'use client';

/**
 * Follow-Up Panel — Collections Queue
 * Priority-driven action queue for overdue credit follow-up.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, CheckCircle2, Search, X, Bell, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getOverdueCredits } from '@/lib/credit-manager';
import { markCreditAsPaid, syncPendingEntries, updateCreditEntry, getLocalEntries } from '@/lib/credit-sync';
import { generateReminderLink } from '@/lib/whatsapp-link-generator';
import { recordReminder } from '@/lib/reminder-tracker';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';
import { getProfileLocalFirst } from '@/lib/profile-sync';
import type { OverdueCredit, Language } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpPanelProps {
  userId: string;
  language: Language;
  overdueThreshold?: number;
  onCreditChange?: () => void;
}

interface SyncStatus {
  status: 'synced' | 'pending' | 'offline';
  lastSyncTime?: string;
  pendingCount?: number;
}

interface ErrorState {
  type: 'network' | 'validation' | 'storage' | 'sync' | 'general' | null;
  message: string;
  creditId?: string;
}

type QueueFilter = 'all' | 'critical' | 'high' | 'warning';

// ─── Severity helpers ─────────────────────────────────────────────────────────

function getSeverity(days: number): { label: string; dot: string; badge: string; row: string } {
  if (days >= 30) return {
    label: 'Critical',
    dot: 'bg-rose-600',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    row: 'border-l-4 border-l-rose-500',
  };
  if (days >= 15) return {
    label: 'High',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-700 border border-orange-200',
    row: 'border-l-4 border-l-orange-400',
  };
  if (days >= 5) return {
    label: 'Warning',
    dot: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    row: 'border-l-4 border-l-amber-400',
  };
  return {
    label: 'Mild',
    dot: 'bg-yellow-300',
    badge: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    row: 'border-l-4 border-l-yellow-300',
  };
}

function getIntelligenceHint(credit: OverdueCredit, language: Language): string {
  const days = credit.daysOverdue;
  const sinceReminder = credit.daysSinceReminder;

  if (days >= 30) {
    return language === 'hi' ? '⚠️ डिफ़ॉल्ट का उच्च जोखिम' : '⚠️ High risk of default';
  }
  if (sinceReminder !== null && sinceReminder >= 7) {
    return language === 'hi' ? `📅 ${sinceReminder} दिन पहले रिमाइंडर भेजा — फॉलो-अप करें` : `📅 Last reminder ${sinceReminder}d ago — follow up recommended`;
  }
  if (!credit.lastReminderAt) {
    return language === 'hi' ? '📬 अभी तक कोई रिमाइंडर नहीं भेजा' : '📬 No reminder sent yet';
  }
  if (days >= 15) {
    return language === 'hi' ? '🔔 तत्काल फॉलो-अप की आवश्यकता है' : '🔔 Urgent follow-up needed';
  }
  return language === 'hi' ? '💬 फॉलो-अप की सिफारिश' : '💬 Follow-up recommended';
}

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((r, [k, v]) => r.replaceAll(`{${k}}`, String(v)), template);
}

// ─── WhatsApp icon ────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z" fill="#fff"/>
      <path d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z" fill="#40c351"/>
      <path clipRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" fill="#fff" fillRule="evenodd"/>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FollowUpPanel({
  userId,
  language,
  overdueThreshold = 3,
  onCreditChange,
}: FollowUpPanelProps) {
  const [overdueCredits, setOverdueCredits] = useState<OverdueCredit[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'synced' });
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<ErrorState>({ type: null, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [shopName, setShopName] = useState('');
  const itemsPerPage = 5;

  // ── Derived summary ─────────────────────────────────────────────────────────

  const summary = useMemo(() => ({
    totalOverdue: overdueCredits.length,
    totalAmount: overdueCredits.reduce((s, c) => s + c.amount, 0),
    oldestOverdue: overdueCredits.length ? Math.max(...overdueCredits.map(c => c.daysOverdue)) : 0,
    criticalCount: overdueCredits.filter(c => c.daysOverdue >= 30).length,
  }), [overdueCredits]);

  // ── Filtered + sorted credits ───────────────────────────────────────────────

  const visibleCredits = useMemo(() => {
    // Sort by daysOverdue desc (highest priority first)
    let list = [...overdueCredits].sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Filter tab
    if (activeFilter === 'critical') list = list.filter(c => c.daysOverdue >= 30);
    else if (activeFilter === 'high') list = list.filter(c => c.daysOverdue >= 15 && c.daysOverdue < 30);
    else if (activeFilter === 'warning') list = list.filter(c => c.daysOverdue >= 5 && c.daysOverdue < 15);

    // Search
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(c =>
      c.customerName.toLowerCase().includes(q) ||
      c.amount.toString().includes(q) ||
      c.phoneNumber?.includes(q)
    );

    return list;
  }, [overdueCredits, activeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(visibleCredits.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCredits = showAllEntries ? visibleCredits : visibleCredits.slice(startIndex, startIndex + itemsPerPage);

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => { setIsOnline(true); handleSyncWhenOnline(); };
    const handleOffline = () => { setIsOnline(false); loadSyncStatus(); };
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [userId]);

  useEffect(() => { loadCredits(); loadSyncStatus(); }, [userId, overdueThreshold]);

  useEffect(() => {
    const h = () => { loadCredits(); loadSyncStatus(); };
    window.addEventListener('vyapar-credit-entries-changed', h);
    return () => window.removeEventListener('vyapar-credit-entries-changed', h);
  }, []);

  useEffect(() => {
    getProfileLocalFirst(userId).then(p => setShopName(p?.shopName || '')).catch(() => setShopName(''));
  }, [userId]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeFilter, overdueCredits.length]);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  // ── Data ────────────────────────────────────────────────────────────────────

  const loadCredits = () => {
    try {
      setIsLoading(true);
      setError({ type: null, message: '' });
      const all = getLocalEntries(userId);
      const overdue = getOverdueCredits(all as unknown as Parameters<typeof getOverdueCredits>[0], overdueThreshold);
      setOverdueCredits(overdue);
    } catch (err) {
      setError({ type: err instanceof Error && err.name === 'QuotaExceededError' ? 'storage' : 'general', message: 'Failed to load credits. Please try again.' });
      setOverdueCredits([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncStatus = () => {
    try {
      const raw = localStorage.getItem('vyapar-credit-sync-status');
      if (!raw) { setSyncStatus({ status: isOnline ? 'synced' : 'offline' }); return; }
      const parsed = JSON.parse(raw);
      if (!isOnline) setSyncStatus({ status: 'offline', pendingCount: parsed.pendingCount || 0, lastSyncTime: parsed.lastSyncTime });
      else if (parsed.pendingCount > 0) setSyncStatus({ status: 'pending', lastSyncTime: parsed.lastSyncTime, pendingCount: parsed.pendingCount });
      else setSyncStatus({ status: 'synced', lastSyncTime: parsed.lastSyncTime });
    } catch { setSyncStatus({ status: isOnline ? 'synced' : 'offline' }); }
  };

  const handleSyncWhenOnline = async () => {
    if (!isOnline || isSyncing) return;
    try {
      setIsSyncing(true);
      await syncPendingEntries(userId);
      loadSyncStatus();
    } catch (err) {
      setError({ type: 'network', message: 'Sync failed. Will retry when connection improves.' });
    } finally { setIsSyncing(false); }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleSendReminder = async (credit: OverdueCredit) => {
    setError({ type: null, message: '' });
    if (!credit.phoneNumber || !/^\d{10}$/.test(credit.phoneNumber.trim())) {
      setError({ type: 'validation', message: 'Invalid phone number. Please enter a valid 10-digit number.', creditId: credit.id });
      return;
    }
    try {
      const url = generateReminderLink(credit.phoneNumber, credit.customerName, credit.amount, credit.dueDate, language, shopName);
      await recordReminder(credit.id, userId);
      loadCredits(); loadSyncStatus();
      window.open(url, '_blank');
    } catch (err) {
      setError({ type: 'general', message: 'Failed to send reminder. Please try again.', creditId: credit.id });
    }
  };

  const handleSendAllReminders = () => {
    const withPhone = visibleCredits.filter(c => c.phoneNumber && /^\d{10}$/.test(c.phoneNumber.trim()));
    withPhone.forEach(c => handleSendReminder(c));
  };

  const handleMarkAsPaid = async (credit: OverdueCredit) => {
    setError({ type: null, message: '' });
    try {
      markCreditAsPaid(credit.id, false, userId);
      loadCredits(); loadSyncStatus();
      if (onCreditChange) onCreditChange();
      if (isOnline) {
        try {
          const res = await fetch('/api/credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, id: credit.id, customerName: credit.customerName, amount: credit.amount, dateGiven: credit.dateGiven, dueDate: credit.dueDate, phoneNumber: credit.phoneNumber, isPaid: true, paidDate: new Date().toISOString(), lastReminderAt: credit.lastReminderAt, createdAt: credit.createdAt, updatedAt: new Date().toISOString() }),
          });
          const result = await res.json();
          if (res.ok && result.success) { updateCreditEntry(credit.id, { isPaid: true, paidAt: new Date().toISOString() }, true, userId); loadSyncStatus(); }
        } catch { /* will sync later */ }
      }
    } catch (err) {
      setError({ type: 'general', message: 'Failed to mark as paid. Please try again.', creditId: credit.id });
    }
  };

  // ── Formatters ───────────────────────────────────────────────────────────────

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getSyncBadge = () => {
    if (isSyncing) return { bg: 'bg-primary-50 border-primary-100', dot: 'bg-primary-500 animate-pulse', text: 'text-primary-700', label: t('followUp.syncing', language) };
    if (syncStatus.status === 'pending') return { bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-500', text: 'text-amber-700', label: formatTemplate(t('followUp.pendingSync', language), { count: syncStatus.pendingCount ?? 0 }) };
    if (syncStatus.status === 'offline') return { bg: 'bg-neutral-50 border-neutral-200', dot: 'bg-neutral-400', text: 'text-neutral-600', label: t('followUp.offline', language) };
    return { bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-700', label: t('followUp.synced', language) };
  };

  const syncBadge = getSyncBadge();

  const filterTabs: { id: QueueFilter; label: string; count: number }[] = [
    { id: 'all', label: language === 'hi' ? 'सभी' : 'All', count: overdueCredits.length },
    { id: 'critical', label: language === 'hi' ? 'गंभीर (30+d)' : 'Critical (30+d)', count: overdueCredits.filter(c => c.daysOverdue >= 30).length },
    { id: 'high', label: language === 'hi' ? 'उच्च (15–30d)' : 'High (15–30d)', count: overdueCredits.filter(c => c.daysOverdue >= 15 && c.daysOverdue < 30).length },
    { id: 'warning', label: language === 'hi' ? 'चेतावनी (5–15d)' : 'Warning (5–15d)', count: overdueCredits.filter(c => c.daysOverdue >= 5 && c.daysOverdue < 15).length },
  ];

  // ── Loading skeleton ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">{t('followUp.collectionsQueue', language)}</h2>
          <div className="h-6 w-20 bg-neutral-100 rounded-full animate-pulse" />
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section className="mt-8">
      <div className="bg-[#F9FAFB] rounded-3xl p-1">

      {/* Section header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{t('followUp.collectionsQueue', language)}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{t('followUp.collectionsSubtitle', language)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${syncBadge.bg}`}>
            <span className={`size-2 rounded-full ${syncBadge.dot}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${syncBadge.text}`}>{syncBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error.type && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="size-4 text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-700 flex-1">{error.message}</p>
          <button onClick={() => setError({ type: null, message: '' })} className="text-rose-400 hover:text-rose-600">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Bulk action summary bar */}
      {overdueCredits.length > 0 && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-warning-200 bg-warning-50 px-5 py-4">
          <div className="text-sm text-amber-800">
            <span className="font-semibold">⚠️ ₹{summary.totalAmount.toLocaleString('en-IN')}</span>
            {' '}{language === 'hi' ? `बकाया है ${summary.totalOverdue} ग्राहकों से` : `pending from ${summary.totalOverdue} customer${summary.totalOverdue > 1 ? 's' : ''}`}
            {summary.criticalCount > 0 && (
              <span className="ml-2 text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                {summary.criticalCount} {language === 'hi' ? 'गंभीर' : 'critical'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" icon={<Bell className="w-3.5 h-3.5" />} onClick={handleSendAllReminders}>
              {language === 'hi' ? 'सभी को रिमाइंडर' : 'Send All Reminders'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden shadow-sm">

        {/* Queue controls */}
        <div className="px-5 pt-5 pb-4 border-b border-neutral-100">
          {/* Search */}
          <div className="relative max-w-sm mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder={language === 'hi' ? 'ग्राहक, राशि या फ़ोन से खोजें...' : 'Search by customer, amount, or phone...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filter tabs — horizontal scroll on mobile, View All on right */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1 shrink-0" />
            {filterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap min-h-[32px] ${
                  activeFilter === tab.id
                    ? 'bg-[#ffe088] text-[#735c00] shadow-sm font-semibold'
                    : 'bg-neutral-100 text-neutral-600 active:bg-neutral-200'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeFilter === tab.id ? 'bg-white/25 text-[#735c00]' : 'bg-neutral-200 text-neutral-600'
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
            {visibleCredits.length > itemsPerPage && (
              <button
                onClick={() => { setShowAllEntries(v => !v); setCurrentPage(1); }}
                className="flex-none ml-auto pl-3 text-xs text-primary-600 font-medium whitespace-nowrap"
              >
                {showAllEntries ? t('followUp.showLess', language) : t('followUp.viewAll', language)}
              </button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {visibleCredits.length === 0 && (
          <div className="px-6 py-16 text-center">
            {overdueCredits.length === 0 ? (
              <>
                <span className="text-3xl block mb-3">🎉</span>
                <p className="text-base font-semibold text-neutral-800 mb-1">{t('followUp.noOverdue', language)}</p>
                <p className="text-sm text-neutral-500">{language === 'hi' ? 'सभी भुगतान समय पर हैं' : "All payments are on track"}</p>
              </>
            ) : (
              <>
                <Search className="w-8 h-8 mx-auto mb-3 text-neutral-300" />
                <p className="text-sm text-neutral-500">{t('followUp.noMatching', language)}</p>
              </>
            )}
          </div>
        )}

        {/* Queue cards */}
        {visibleCredits.length > 0 && (
          <div className="divide-y divide-neutral-100 pb-28 sm:pb-0">
            {paginatedCredits.map(credit => {
              const sev = getSeverity(credit.daysOverdue);
              const hint = getIntelligenceHint(credit, language);
              const hasError = error.type !== null && error.creditId === credit.id;

              return (
                <div key={credit.id} className={`px-4 py-4 sm:px-5 sm:py-5 sm:hover:bg-neutral-50 transition-colors ${sev.row}`}>
                  {/* Top: name + amount */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{credit.customerName}</p>
                      <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sev.badge}`}>
                        <span className={`size-1.5 rounded-full ${sev.dot}`} />
                        {credit.daysOverdue}d {language === 'hi' ? 'बकाया' : 'overdue'} · {sev.label}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-neutral-900 shrink-0">₹{credit.amount.toLocaleString('en-IN')}</p>
                  </div>

                  {/* Intelligence hint */}
                  <p className="text-xs text-neutral-400 italic mb-3">{hint}</p>

                  {/* Actions — stacked full-width on mobile, side-by-side on desktop */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {credit.phoneNumber && (
                      <button
                        onClick={() => handleSendReminder(credit)}
                        disabled={hasError}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-4 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-50 active:bg-primary-700 transition-colors"
                      >
                        <WhatsAppIcon />
                        {t('followUp.sendReminder', language)}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkAsPaid(credit)}
                      disabled={hasError}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-neutral-300 bg-white text-neutral-700 text-sm font-semibold disabled:opacity-50 active:bg-neutral-50 transition-colors"
                    >
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      {t('followUp.markPaid', language)}
                    </button>
                  </div>

                  {/* Secondary info — collapsed below actions */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400">
                    <span>{t('dueDate', language)}: {formatDate(credit.dueDate)}</span>
                    {credit.lastReminderAt
                      ? <span>{t('followUp.lastReminder', language)}: {formatDate(credit.lastReminderAt)}</span>
                      : <span className="text-neutral-300">{t('followUp.neverReminded', language)}</span>
                    }
                  </div>

                  {hasError && <p className="mt-2 text-xs text-rose-600">{error.message}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!showAllEntries && visibleCredits.length > itemsPerPage && (
          <div className="px-5 py-4 pb-28 sm:pb-4 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-xs text-neutral-500">
              {formatTemplate(t('followUp.showingResults', language), {
                start: visibleCredits.length > 0 ? startIndex + 1 : 0,
                end: Math.min(startIndex + itemsPerPage, visibleCredits.length),
                total: visibleCredits.length,
              })}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-600" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === page ? 'bg-primary-600 text-white' : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-xs text-neutral-400 px-1">…</span>}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
          </div>
        )}

      </div>
      </div>{/* end bg-[#F9FAFB] wrapper */}
      {/* Sticky bottom bar — mobile only */}
      {overdueCredits.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 px-4 py-3 safe-area-inset-bottom">
          <button
            onClick={handleSendAllReminders}
            className="flex items-center justify-center gap-2 w-full min-h-[48px] rounded-xl bg-primary-600 text-white text-sm font-semibold active:bg-primary-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {language === 'hi' ? `सभी ${overdueCredits.length} को रिमाइंडर भेजें` : `Send Reminders to All ${overdueCredits.length}`}
          </button>
        </div>
      )}
    </section>
  );
}
