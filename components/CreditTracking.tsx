'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Language, CreditSummary } from '@/lib/types';
import { t } from '@/lib/translations';
import { Check, Trash2, AlertCircle, Search, PlusCircle, Landmark, AlertTriangle } from 'lucide-react';
import { 
  getLocalEntries, 
  createCreditEntry, 
  updateCreditEntry, 
  deleteLocalEntry,
  fullSync,
  LocalCreditEntry
} from '@/lib/credit-sync';
import { calculateCreditSummary } from '@/lib/calculations';
import { logger } from '@/lib/logger';

interface CreditTrackingProps {
  userId: string;
  language: Language;
  onCreditChange?: () => void;
}

export default function CreditTracking({ userId, language, onCreditChange }: CreditTrackingProps) {
  const [entries, setEntries] = useState<LocalCreditEntry[]>([]);
  const [summary, setSummary] = useState<CreditSummary>({
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueCount: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadEntries();
    checkAndSync();
  }, [userId]);

  useEffect(() => {
    const handler = () => loadEntries();
    window.addEventListener('vyapar-credit-entries-changed', handler);
    return () => window.removeEventListener('vyapar-credit-entries-changed', handler);
  }, []);

  const loadEntries = () => {
    const localEntries = getLocalEntries();
    setEntries(localEntries);
    
    const calculatedSummary = calculateCreditSummary(localEntries);
    setSummary(calculatedSummary);
  };

  const checkAndSync = async () => {
    if (!userId) return;
    
    try {
      await fullSync(userId);
      loadEntries();
    } catch (error) {
      logger.error('[CreditTracking] Auto-sync failed', { error });
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert('Please log in to add credit entries');
      return;
    }

    // Validate phone number format if provided (10 digits, numeric only)
    if (phoneNumber && (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber))) {
      alert(t('error.invalidPhoneNumber', language));
      return;
    }

    // Generate ID on client side to prevent duplicates
    const entryId = `credit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      // Try to sync to cloud first
      const response = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          id: entryId, // Send the client-generated ID
          customerName,
          amount: parseFloat(amount),
          dueDate,
          dateGiven: today,
          phoneNumber: phoneNumber || undefined,
          createdAt: now,
          updatedAt: now,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // API call succeeded - save the returned entry to localStorage as synced
        const { saveLocalEntry } = await import('@/lib/credit-sync');
        const localEntry = {
          ...data.data,
          syncStatus: 'synced' as const,
          lastSyncAttempt: new Date().toISOString(),
        };
        saveLocalEntry(localEntry);
        logger.info('[CreditTracking] Entry synced to cloud');
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (error) {
      logger.error('[CreditTracking] Failed to sync, saving offline', { error });
      // API call failed - save to localStorage as pending with the SAME ID
      createCreditEntry(customerName, parseFloat(amount), dueDate, today, phoneNumber || undefined, false);
    }

    // Reload entries and reset form
    loadEntries();
    setCustomerName('');
    setAmount('');
    setDueDate('');
    setPhoneNumber('');
    setShowForm(false);
    if (onCreditChange) onCreditChange();
  };

  const handleMarkPaid = async (id: string) => {
    if (!userId) return;

    try {
      // Find the entry
      const entry = entries.find(e => e.id === id);
      if (!entry) return;

      // Try to sync to cloud first
      const response = await fetch('/api/credit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          id,
          isPaid: true,
          paidDate: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // API call succeeded - save the returned entry to localStorage as synced
        const { saveLocalEntry } = await import('@/lib/credit-sync');
        const localEntry = {
          ...data.data,
          syncStatus: 'synced' as const,
          lastSyncAttempt: new Date().toISOString(),
          paidAt: data.data.paidDate, // Alias for backward compatibility
        };
        saveLocalEntry(localEntry);
        logger.info('[CreditTracking] Entry marked paid and synced');
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (error) {
      logger.error('[CreditTracking] Failed to sync, saving offline', { error });
      // API call failed - update localStorage as pending
      updateCreditEntry(id, { isPaid: true, paidAt: new Date().toISOString() }, false);
    }

    // Reload entries
    loadEntries();
    if (onCreditChange) onCreditChange();
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;

    if (!confirm(t('confirmDelete', language))) {
      return;
    }

    try {
      // Try to delete from cloud first
      const response = await fetch(`/api/credit?userId=${userId}&id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        logger.info('[CreditTracking] Entry deleted from cloud');
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error) {
      logger.error('[CreditTracking] Failed to delete from cloud', { error });
    }

    // Delete from localStorage regardless
    deleteLocalEntry(id);
    
    // Reload entries
    loadEntries();
    if (onCreditChange) onCreditChange();
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  // Generate consistent color for each customer based on their name
  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: 'bg-orange-100', text: 'text-orange-600' },
      { bg: 'bg-blue-100', text: 'text-blue-600' },
      { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      { bg: 'bg-purple-100', text: 'text-purple-600' },
      { bg: 'bg-green-100', text: 'text-green-600' },
      { bg: 'bg-pink-100', text: 'text-pink-600' },
      { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      { bg: 'bg-teal-100', text: 'text-teal-600' },
    ];
    
    // Use name to generate consistent color index
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % colors.length;
    return colors[colorIndex];
  };

  // Filter entries based on search query
  const filteredEntries = entries.filter(entry => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const customerMatch = entry.customerName.toLowerCase().includes(query);
    const amountMatch = entry.amount.toString().includes(query);
    const phoneMatch = entry.phoneNumber?.includes(query);
    
    return customerMatch || amountMatch || phoneMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEntries = showAllEntries ? filteredEntries : filteredEntries.slice(startIndex, endIndex);
  const showingStart = filteredEntries.length > 0 ? startIndex + 1 : 0;
  const showingEnd = showAllEntries ? filteredEntries.length : Math.min(endIndex, filteredEntries.length);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatTemplate = (template: string, values: Record<string, string | number>): string => {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
      template
    );
  };

  return (
    <div className="bg-white text-slate-900">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder={language === 'hi' ? 'ग्राहक या चालान खोजें...' : language === 'mr' ? 'ग्राहक किंवा चलन शोधा...' : "Search customers or invoices..."} 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
            className="pl-11"
          />
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          icon={<PlusCircle className="w-4 h-4" />}
          className="whitespace-nowrap"
        >
          <span>{t('addCredit', language)}</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Outstanding */}
        <Card className="bg-primary-50 border-primary-100">
          <CardBody className="relative">
            <div className="absolute top-0 right-0 text-primary-300 text-xs font-semibold">+5.2%</div>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl border border-primary-100 bg-white p-2">
                <Landmark className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <p className="mb-1 text-label text-slate-500">{t('totalOutstanding', language)}</p>
            <h3 className="mb-2 text-numeric-lg text-slate-900">₹{summary.totalOutstanding.toLocaleString('en-IN')}</h3>
            <p className="text-caption uppercase tracking-[0.18em] text-slate-500">
              {t('credit.updatedAgo', language)}
            </p>
          </CardBody>
        </Card>

        {/* Total Overdue */}
        <Card className="bg-rose-50 border-rose-100">
          <CardBody className="relative">
            <div className="absolute top-0 right-0 text-rose-300 text-xs font-semibold">-2.4%</div>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl border border-rose-100 bg-white p-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <p className="mb-1 text-label text-slate-500">{t('totalOverdue', language)}</p>
            <h3 className="mb-2 text-numeric-lg text-slate-900">₹{summary.totalOverdue.toLocaleString('en-IN')}</h3>
            <p className="text-caption uppercase tracking-[0.18em] text-rose-700">
              {t('credit.requiresAction', language)}
            </p>
          </CardBody>
        </Card>

        {/* Total Alerts / Overdue Customers */}
        <Card className="bg-amber-50 border-amber-100">
          <CardBody className="relative">
            <div className="absolute top-0 right-0 text-amber-300 text-xs font-semibold">+12%</div>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-xl border border-amber-100 bg-white p-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="mb-1 text-label text-slate-500">
              {t('credit.totalAlerts', language)}
            </p>
            <h3 className="mb-2 text-numeric-lg text-slate-900">{summary.overdueCount}</h3>
            <p className="text-caption uppercase tracking-[0.18em] text-amber-700">
              {t('credit.criticalCount', language)}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-section-heading text-slate-900">{t('addCredit', language)}</h3>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleAddEntry}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Input
                  type="text"
                  label={t('customerName', language)}
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('enterName', language)}
                />

                <Input
                  type="number"
                  label={t('amount', language)}
                  min="0"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                />

                <Input
                  type="date"
                  label={t('dueDate', language)}
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <Input
                  type="tel"
                  label={`${t('phoneNumber', language)} (${t('optional', language)})`}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  pattern="[0-9]{10}"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {t('save', language)}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="secondary"
                >
                  {t('cancel', language)}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Recent Activity Table */}
      <Card className="overflow-hidden p-0">
        <div className="px-6 py-5 bg-white border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-section-heading text-slate-900">
            {t('credit.recentActivity', language)}
          </h2>
          <Button
            onClick={() => {
              setShowAllEntries(!showAllEntries);
              if (!showAllEntries) {
                setCurrentPage(1); // Reset to first page when toggling
              }
            }}
            variant="ghost"
            size="sm"
          >
            {showAllEntries ? t('credit.showLess', language) : t('credit.viewAll', language)}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-caption uppercase tracking-wider text-gray-900">{t('customerName', language)}</th>
                <th className="px-6 py-3 text-caption uppercase tracking-wider text-gray-900">{t('amount', language)}</th>
                <th className="px-6 py-3 text-caption uppercase tracking-wider text-gray-900">{t('dueDate', language)}</th>
                <th className="px-6 py-3 text-caption uppercase tracking-wider text-gray-900 text-center">{t('credit.status', language)}</th>
                <th className="px-6 py-3 text-caption uppercase tracking-wider text-gray-900 text-right">{t('credit.action', language)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">{t('noCreditEntries', language)}</td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => {
                  const overdue = !entry.isPaid && isOverdue(entry.dueDate);
                  
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`size-10 flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-sm ${overdue ? 'bg-rose-100 text-rose-600' : `${getAvatarColor(entry.customerName).bg} ${getAvatarColor(entry.customerName).text}`}`}>
                            {getInitials(entry.customerName)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-body-sm font-medium text-gray-900">{entry.customerName}</span>
                            {entry.syncStatus === 'pending' && <span className="text-caption text-orange-600 mt-0.5">{t('pending', language)}</span>}
                            {entry.syncStatus === 'error' && <span className="text-caption text-red-600 mt-0.5">{t('error', language)}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{entry.amount.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{new Date(entry.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-6 py-4 text-center">
                        {entry.isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                            {t('paid', language)}
                          </span>
                        ) : overdue ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700">
                            <span className="size-1.5 rounded-full bg-rose-500"></span> {t('overdue', language)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {t('credit.pending', language)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!entry.isPaid && (
                            <button 
                              onClick={() => handleMarkPaid(entry.id)} 
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors" 
                              title={t('markPaid', language)}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(entry.id)} 
                            className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" 
                            title={t('delete', language)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredEntries.length > 0 && !showAllEntries && (
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {formatTemplate(t('credit.showingLogs', language), {
                start: showingStart,
                end: showingEnd,
                total: filteredEntries.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                variant="secondary"
                size="sm"
              >
                {t('ui.button.previous', language)}
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                variant="secondary"
                size="sm"
              >
                {t('ui.button.next', language)}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
