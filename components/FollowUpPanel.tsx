'use client';

/**
 * Follow-Up Panel Component
 * 
 * Displays overdue credits (udhaar) for collection follow-up.
 * 
 * Architecture:
 * - Offline-first: Loads from localStorage
 * - Deterministic: Uses Credit Manager for all calculations
 * - No business logic: Delegates to lib/credit-manager.ts
 * - Mobile-first responsive design
 * - Uses new design system components
 * 
 * Follows Vyapar Rules: A2. Udhaar Follow-Up Panel
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { getOverdueCredits } from '@/lib/credit-manager';
import { markCreditAsPaid, syncPendingEntries, updateCreditEntry, getLocalEntries } from '@/lib/credit-sync';
import { generateReminderLink } from '@/lib/whatsapp-link-generator';
import { recordReminder } from '@/lib/reminder-tracker';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';
import type { CreditEntry, OverdueCredit, Language } from '@/lib/types';

interface FollowUpPanelProps {
  userId: string;
  language: Language;
  overdueThreshold?: number; // Default: 3 days
  onCreditChange?: () => void; // Callback when credit is marked as paid
}

interface SyncStatus {
  status: 'synced' | 'pending' | 'offline';
  lastSyncTime?: string;
  pendingCount?: number;
}

interface ErrorState {
  type: 'network' | 'validation' | 'storage' | 'sync' | 'general' | null;
  message: string;
  creditId?: string; // For credit-specific errors
}

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
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [shopName, setShopName] = useState('');
  const itemsPerPage = 5;

  // Calculate summary from overdue credits (deterministic)
  const summary = React.useMemo(() => {
    if (overdueCredits.length === 0) {
      return {
        totalOverdue: 0,
        totalAmount: 0,
        oldestOverdue: 0,
      };
    }

    return {
      totalOverdue: overdueCredits.length,
      totalAmount: overdueCredits.reduce((sum, credit) => sum + credit.amount, 0),
      oldestOverdue: Math.max(...overdueCredits.map(credit => credit.daysOverdue)),
    };
  }, [overdueCredits]);

  const visibleCredits = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return overdueCredits;
    }

    return overdueCredits.filter((credit) =>
      credit.customerName.toLowerCase().includes(query) ||
      credit.amount.toString().includes(query) ||
      credit.phoneNumber?.includes(query)
    );
  }, [overdueCredits, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(visibleCredits.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCredits = showAllEntries ? visibleCredits : visibleCredits.slice(startIndex, endIndex);
  const showingStart = visibleCredits.length > 0 ? startIndex + 1 : 0;
  const showingEnd = showAllEntries ? visibleCredits.length : Math.min(endIndex, visibleCredits.length);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming online
      handleSyncWhenOnline();
    };

    const handleOffline = () => {
      setIsOnline(false);
      loadSyncStatus(); // Update status to show offline
    };

    // Set initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  // Load credits from localStorage on mount
  useEffect(() => {
    loadCredits();
    loadSyncStatus();
  }, [userId, overdueThreshold]);

  useEffect(() => {
    const handler = () => { loadCredits(); loadSyncStatus(); };
    window.addEventListener('vyapar-credit-entries-changed', handler);
    return () => window.removeEventListener('vyapar-credit-entries-changed', handler);
  }, []);

  useEffect(() => {
    const loadShopName = async () => {
      try {
        const response = await fetch(`/api/profile?userId=${userId}`);
        const result = await response.json();

        if (result.success && result.data?.shopName) {
          setShopName(result.data.shopName);
          return;
        }

        setShopName('');
      } catch (profileError) {
        logger.warn('Failed to load shop name for reminder message', {
          userId,
          error: profileError instanceof Error ? profileError.message : String(profileError),
        });
        setShopName('');
      }
    };

    loadShopName();
  }, [userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, overdueCredits.length, showAllEntries]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const loadCredits = () => {
    try {
      setIsLoading(true);
      setError({ type: null, message: '' });
      
      // Load from localStorage via credit-sync (offline-first)
      // LocalCreditEntry omits userId — all entries in localStorage belong to the current user
      const allCredits = getLocalEntries();
      
      // Use Credit Manager to calculate and sort overdue credits (deterministic)
      const overdue = getOverdueCredits(allCredits as unknown as Parameters<typeof getOverdueCredits>[0], overdueThreshold);
      
      setOverdueCredits(overdue);
      setIsLoading(false);
    } catch (err) {
      // Check for localStorage quota exceeded error
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setError({
          type: 'storage',
          message: 'Storage quota exceeded. Please clear some data.'
        });
        logger.error('localStorage quota exceeded', { userId, error: err.message });
      } else {
        setError({
          type: 'general',
          message: 'Failed to load credits. Please try again.'
        });
        logger.error('Failed to load credits', { userId, error: err instanceof Error ? err.message : String(err) });
      }
      setOverdueCredits([]);
      setIsLoading(false);
    }
  };

  const loadSyncStatus = () => {
    try {
      const syncStatusData = localStorage.getItem('vyapar-credit-sync-status');
      
      if (!syncStatusData) {
        setSyncStatus({ status: isOnline ? 'synced' : 'offline' });
        return;
      }

      const parsed = JSON.parse(syncStatusData);
      
      // Determine status based on pending count and online status
      if (!isOnline) {
        setSyncStatus({ 
          status: 'offline', 
          pendingCount: parsed.pendingCount || 0,
          lastSyncTime: parsed.lastSyncTime 
        });
      } else if (parsed.pendingCount > 0) {
        setSyncStatus({
          status: 'pending',
          lastSyncTime: parsed.lastSyncTime,
          pendingCount: parsed.pendingCount,
        });
      } else {
        setSyncStatus({
          status: 'synced',
          lastSyncTime: parsed.lastSyncTime,
        });
      }
    } catch (err) {
      logger.warn('Failed to load sync status', { userId, error: err instanceof Error ? err.message : String(err) });
      setSyncStatus({ status: isOnline ? 'synced' : 'offline' });
    }
  };

  const handleSyncWhenOnline = async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);
      setError({ type: null, message: '' });

      // Sync pending entries
      const result = await syncPendingEntries(userId);
      
      // Reload sync status to reflect changes
      loadSyncStatus();
      
      logger.info('Sync completed successfully', { userId, result });
    } catch (err) {
      // Handle sync conflict
      if (err instanceof Error && err.message.includes('conflict')) {
        setError({
          type: 'sync',
          message: 'Sync conflict detected. Please refresh and try again.'
        });
        logger.warn('Sync conflict detected', { userId, error: err.message });
      } else {
        setError({
          type: 'network',
          message: 'Network connection unavailable. Please check your internet connection.'
        });
        logger.error('Sync failed', { userId, error: err instanceof Error ? err.message : String(err) });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'en' ? 'en-IN' : language === 'hi' ? 'hi-IN' : 'mr-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  function formatTemplate(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
      template
    );
  }

  const getSyncStatusColor = (): string => {
    if (isSyncing) return 'text-blue-600';
    
    switch (syncStatus.status) {
      case 'synced':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'offline':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSyncStatusText = (): string => {
    if (isSyncing) return t('followUp.syncing', language);
    
    switch (syncStatus.status) {
      case 'synced':
        return t('followUp.synced', language);
      case 'pending':
        return formatTemplate(t('followUp.pendingSync', language), {
          count: syncStatus.pendingCount ?? 0,
        });
      case 'offline':
        return t('followUp.offline', language);
      default:
        return '';
    }
  };

  const handleSendReminder = async (credit: OverdueCredit) => {
    try {
      // Clear any previous errors for this credit
      setError({ type: null, message: '' });

      // Validate phone number exists
      if (!credit.phoneNumber) {
        setError({
          type: 'validation',
          message: 'Invalid phone number. Please enter a valid 10-digit phone number.',
          creditId: credit.id
        });
        logger.warn('Attempted to send reminder without phone number', { userId, creditId: credit.id });
        return;
      }

      // Validate phone number format (10 digits, numeric only)
      const phoneNumber = credit.phoneNumber.trim();
      if (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber)) {
        setError({
          type: 'validation',
          message: 'Invalid phone number. Please enter a valid 10-digit phone number.',
          creditId: credit.id
        });
        logger.warn('Invalid phone number format', { userId, creditId: credit.id, phoneNumber: phoneNumber.length });
        return;
      }

      // Generate WhatsApp link
      const whatsappUrl = generateReminderLink(
        credit.phoneNumber,
        credit.customerName,
        credit.amount,
        credit.dueDate,
        language,
        shopName
      );

      // Record reminder timestamp (optimistic update)
      // This works offline - updates localStorage and marks for sync
      await recordReminder(credit.id, userId);

      // Reload credits to show updated reminder timestamp
      loadCredits();
      loadSyncStatus();

      // Open WhatsApp app/web
      window.open(whatsappUrl, '_blank');
      
      logger.info('WhatsApp reminder sent', { userId, creditId: credit.id, customerName: credit.customerName });
    } catch (err) {
      // Check for localStorage quota exceeded error
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setError({
          type: 'storage',
          message: 'Storage quota exceeded. Please clear some data.',
          creditId: credit.id
        });
        logger.error('localStorage quota exceeded while sending reminder', { userId, creditId: credit.id });
      } else {
        setError({
          type: 'general',
          message: 'Failed to send reminder. Please try again.',
          creditId: credit.id
        });
        logger.error('Failed to send reminder', { 
          userId, 
          creditId: credit.id, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }
  };

  const handleMarkAsPaid = async (credit: OverdueCredit) => {
    try {
      // Clear any previous errors for this credit
      setError({ type: null, message: '' });
      
      // Update credit entry (optimistic update)
      // This works offline - updates localStorage and marks for sync
      markCreditAsPaid(credit.id, false);

      // Reload credits to remove from overdue list
      loadCredits();
      loadSyncStatus();

      // Trigger callback to notify parent component
      if (onCreditChange) {
        onCreditChange();
      }

      logger.info('Credit marked as paid', { userId, creditId: credit.id, customerName: credit.customerName });

      // Attempt to sync to DynamoDB (only if online)
      if (isOnline) {
        try {
          const response = await fetch('/api/credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              id: credit.id,
              customerName: credit.customerName,
              amount: credit.amount,
              dateGiven: credit.dateGiven,
              dueDate: credit.dueDate,
              phoneNumber: credit.phoneNumber,
              isPaid: true,
              paidDate: new Date().toISOString(),
              lastReminderAt: credit.lastReminderAt,
              createdAt: credit.createdAt,
              updatedAt: new Date().toISOString(),
            }),
          });

          const result = await response.json();
          if (response.ok && result.success) {
            // Mark as synced in localStorage
            updateCreditEntry(credit.id, { isPaid: true, paidAt: new Date().toISOString() }, true);
            loadSyncStatus();
            logger.info('Credit payment synced to DynamoDB', { userId, creditId: credit.id });
          } else {
            logger.warn('Failed to sync payment to DynamoDB', { userId, creditId: credit.id, error: result.message });
          }
        } catch (syncErr) {
          // Network error - will sync later
          logger.warn('Network error during payment sync, will retry later', { 
            userId, 
            creditId: credit.id,
            error: syncErr instanceof Error ? syncErr.message : String(syncErr)
          });
        }
      }
    } catch (err) {
      // Check for localStorage quota exceeded error
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        setError({
          type: 'storage',
          message: 'Storage quota exceeded. Please clear some data.',
          creditId: credit.id
        });
        logger.error('localStorage quota exceeded while marking as paid', { userId, creditId: credit.id });
      } else {
        setError({
          type: 'general',
          message: 'Failed to mark as paid. Please try again.',
          creditId: credit.id
        });
        logger.error('Failed to mark as paid', { 
          userId, 
          creditId: credit.id, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }
  };

  if (isLoading) {
    return (
      <section className="mt-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('followUp.collectionsQueue', language)}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('followUp.collectionsSubtitle', language)}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
            <span className="size-2 rounded-full bg-slate-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('followUp.loading', language)}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="h-10 w-full max-w-md rounded-lg bg-slate-100 animate-pulse mb-6" />
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50 animate-pulse h-40" />
            <div className="rounded-2xl border border-slate-200 p-6 bg-slate-50 animate-pulse h-40" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('followUp.collectionsQueue', language)}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('followUp.collectionsSubtitle', language)}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${
          syncStatus.status === 'synced' ? 'bg-emerald-50 border-emerald-100' :
          syncStatus.status === 'pending' ? 'bg-yellow-50 border-yellow-100' :
          'bg-slate-50 border-slate-200'
        }`}>
          {isSyncing ? (
            <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
          ) : (
            <span className={`size-2 rounded-full ${
              syncStatus.status === 'synced' ? 'bg-emerald-500' :
              syncStatus.status === 'pending' ? 'bg-yellow-500' :
              'bg-slate-400'
            }`}></span>
          )}
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            syncStatus.status === 'synced' ? 'text-emerald-700' :
            syncStatus.status === 'pending' ? 'text-yellow-700' :
            'text-slate-600'
          }`}>
            {getSyncStatusText()}
          </span>
        </div>
      </div>

      {error.type && (
        <div className="mb-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-red-600" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  {error.type === 'network' ? t('followUp.networkErrorTitle', language) : t('followUp.errorTitle', language)}
                </h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
              <button
                onClick={() => setError({ type: null, message: '' })}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder={t('followUp.searchPlaceholder', language)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              setShowAllEntries((current) => !current);
              if (!showAllEntries) {
                setCurrentPage(1);
              }
            }}
            variant="ghost"
            size="sm"
            className="self-end md:self-auto"
          >
            {showAllEntries ? t('followUp.showLess', language) : t('followUp.viewAll', language)}
          </Button>
        </div>

        {visibleCredits.length === 0 && (
          <div className="rounded-2xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-10 text-slate-400" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {overdueCredits.length === 0 ? t('followUp.noOverdue', language) : t('followUp.noMatching', language)}
            </h3>
            <p className="text-slate-500">
              {overdueCredits.length === 0
                ? t('followUp.noOverdue', language)
                : t('followUp.tryAnotherSearch', language)}
            </p>
          </div>
        )}

        {visibleCredits.length > 0 && (
          <div className="space-y-4">
            {paginatedCredits.map((credit) => (
              <Card
                key={credit.id}
                className="overflow-hidden p-0"
              >
                <div className="p-6 border-b border-slate-200">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-3">
                      <h4 className="text-2xl font-bold text-slate-900">{credit.customerName}</h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between min-w-[320px] text-sm text-slate-500">
                          <span>{t('entryDate', language)}: {formatDate(credit.dateGiven)}</span>
                          <span>{t('dueDate', language)}: {formatDate(credit.dueDate)}</span>
                        </div>
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            credit.daysOverdue >= 30 ? 'bg-rose-50 text-rose-700' :
                            credit.daysOverdue >= 15 ? 'bg-orange-50 text-orange-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            <span className={`size-1.5 rounded-full ${
                              credit.daysOverdue >= 30 ? 'bg-rose-500' :
                              credit.daysOverdue >= 15 ? 'bg-orange-500' :
                              'bg-amber-500'
                            }`}></span>
                            {credit.daysOverdue} {t('followUp.daysOverdue', language)}
                          </span>
                        </div>
                        {credit.lastReminderAt ? (
                          <p className="text-xs text-slate-400">
                            {t('followUp.lastReminder', language)}: {formatDate(credit.lastReminderAt)}
                            {credit.daysSinceReminder !== null && (
                              <span className="ml-1">
                                ({credit.daysSinceReminder} {t('followUp.daysOverdue', language)})
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">{t('followUp.neverReminded', language)}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {formatAmount(credit.amount)}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-white grid-cols-2 gap-3 flex grid">
                  {/* WhatsApp Reminder Button */}
                  {credit.phoneNumber && (
                    <Button
                      onClick={() => handleSendReminder(credit)}
                      disabled={error.type === 'validation' && error.creditId === credit.id}
                      className="bg-primary-600 hover:bg-primary-700"
                    >
                      <svg className="size-4" height="20" viewBox="0 0 48 48" width="20" x="0px" xmlns="http://www.w3.org/2000/svg" y="0px">
                        <path d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z" fill="#fff"></path>
                        <path d="M4.868,43.803c-0.132,0-0.26-0.052-0.355-0.148c-0.125-0.127-0.174-0.312-0.127-0.483l2.639-9.636c-1.636-2.906-2.499-6.206-2.497-9.556C4.532,13.238,13.273,4.5,24.014,4.5c5.21,0.002,10.105,2.031,13.784,5.713c3.679,3.683,5.704,8.577,5.702,13.781c-0.004,10.741-8.746,19.48-19.486,19.48c-3.189-0.001-6.344-0.788-9.144-2.277l-9.875,2.589C4.953,43.798,4.911,43.803,4.868,43.803z" fill="#fff"></path>
                        <path d="M24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,4C24.014,4,24.014,4,24.014,4C12.998,4,4.032,12.962,4.027,23.979c-0.001,3.367,0.849,6.685,2.461,9.622l-2.585,9.439c-0.094,0.345,0.002,0.713,0.254,0.967c0.19,0.192,0.447,0.297,0.711,0.297c0.085,0,0.17-0.011,0.254-0.033l9.687-2.54c2.828,1.468,5.998,2.243,9.197,2.244c11.024,0,19.99-8.963,19.995-19.98c0.002-5.339-2.075-10.359-5.848-14.135C34.378,6.083,29.357,4.002,24.014,4L24.014,4z" fill="#cfd8dc"></path>
                        <path d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z" fill="#40c351"></path>
                        <path clipRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" fill="#fff" fillRule="evenodd"></path>
                      </svg>
                      {t('followUp.sendReminder', language)}
                    </Button>
                  )}
                  {/* Mark as Paid Button */}
                  <Button
                    onClick={() => handleMarkAsPaid(credit)}
                    disabled={error.type !== null && error.creditId === credit.id}
                    variant="secondary"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {t('followUp.markPaid', language)}
                  </Button>
                </div>
              </Card>
            ))}

            {!showAllEntries && (
              <div className="pt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {formatTemplate(t('followUp.showingResults', language), {
                    start: showingStart,
                    end: showingEnd,
                    total: visibleCredits.length,
                })}
              </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    variant="secondary"
                    size="sm"
                  >
                    {t('ui.button.previous', language)}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    variant="secondary"
                    size="sm"
                  >
                    {t('ui.button.next', language)}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
