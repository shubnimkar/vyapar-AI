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
import { AlertCircle, CheckCircle2, ListFilter, X } from 'lucide-react';
import { getOverdueCredits } from '@/lib/credit-manager';
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

type FollowUpFilter = 'all' | 'needs-reminder' | 'has-phone' | 'high-overdue';

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
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FollowUpFilter>('all');

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
    switch (activeFilter) {
      case 'needs-reminder':
        return overdueCredits.filter((credit) => credit.daysSinceReminder === null || credit.daysSinceReminder >= 3);
      case 'has-phone':
        return overdueCredits.filter((credit) => Boolean(credit.phoneNumber?.trim()));
      case 'high-overdue':
        return overdueCredits.filter((credit) => credit.daysOverdue >= 15);
      case 'all':
      default:
        return overdueCredits;
    }
  }, [activeFilter, overdueCredits]);

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

  const loadCredits = () => {
    try {
      setIsLoading(true);
      setError({ type: null, message: '' });
      
      // Load from localStorage (offline-first)
      const storedCredits = localStorage.getItem('vyapar-credit-entries');
      
      if (!storedCredits) {
        setOverdueCredits([]);
        setIsLoading(false);
        return;
      }

      const allCredits: CreditEntry[] = JSON.parse(storedCredits);
      
      // Filter for current user
      const userCredits = allCredits.filter(credit => credit.userId === userId);
      
      // Use Credit Manager to calculate and sort overdue credits (deterministic)
      const overdue = getOverdueCredits(userCredits, overdueThreshold);
      
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
      
      // Import sync function dynamically
      const { syncPendingEntries } = await import('@/lib/credit-sync');
      
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
    if (isSyncing) return 'Syncing...';
    
    switch (syncStatus.status) {
      case 'synced':
        return 'Synced';
      case 'pending':
        return `${syncStatus.pendingCount} pending`;
      case 'offline':
        return 'Offline';
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
        language
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

      // Import markCreditAsPaid dynamically to avoid circular dependencies
      const { markCreditAsPaid } = await import('@/lib/credit-sync');
      
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
            const { updateCreditEntry } = await import('@/lib/credit-sync');
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

  const getFilterLabel = (filter: FollowUpFilter): string => {
    switch (filter) {
      case 'needs-reminder':
        return 'Needs reminder';
      case 'has-phone':
        return 'Has phone number';
      case 'high-overdue':
        return '15+ days overdue';
      case 'all':
      default:
        return 'All follow-ups';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen pb-24">
        <div className="sticky top-0 z-50 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">Follow-Up & Collections</h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Showing credits overdue by more than {overdueThreshold} days
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="size-2 rounded-full bg-slate-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Loading...</span>
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-3 gap-4 items-center text-center">
              <div className="flex flex-col gap-1">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-tight">Overdue</span>
              </div>
              <div className="flex flex-col gap-1 border-x border-slate-100 dark:border-slate-800">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-tight">Total</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-tight">Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white font-display text-slate-900 min-h-screen pb-24">
      {/* Header Section */}
      <header className="backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between bg-white/90">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">Follow-up &amp; Collections</h1>
          <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5">Showing credits overdue by 3+ days</p>
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
      </header>

      {/* Error State */}
      {error.type && (
        <div className="px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-red-600" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  {error.type === 'network' ? 'Network Error' : 'Error'}
                </h3>
                <p className="text-sm text-red-700 mt-1">{error.message}</p>
              </div>
              <button
                onClick={() => setError({ type: null, message: '' })}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics Section */}
      <section className="px-4 py-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-3 gap-4 items-center text-center">
            {/* Overdue Customers */}
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-extrabold text-overdue-red">{summary.totalOverdue}</span>
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">
                Overdue Customers
              </span>
            </div>
            {/* Total Overdue */}
            <div className="flex flex-col gap-1 border-x border-slate-100">
              <span className="text-3xl font-extrabold text-overdue-red">{formatAmount(summary.totalAmount)}</span>
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">
                Total Overdue
              </span>
            </div>
            {/* Oldest Credit */}
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-extrabold text-overdue-red">{summary.oldestOverdue}</span>
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-tight">
                Oldest Credit
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Follow-up List Section */}
      <section className="px-4 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 px-1">
            Customer Follow-ups
          </h3>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              aria-expanded={showFilters}
              className="text-primary text-sm font-semibold flex items-center gap-1"
            >
              <ListFilter className="size-4" aria-hidden="true" />
              {activeFilter === 'all' ? 'Filter' : getFilterLabel(activeFilter)}
            </button>
            {showFilters && (
              <div className="absolute right-0 top-full z-10 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {([
                  'all',
                  'needs-reminder',
                  'has-phone',
                  'high-overdue',
                ] as FollowUpFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setActiveFilter(filter);
                      setShowFilters(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeFilter === filter
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{getFilterLabel(filter)}</span>
                    {activeFilter === filter && <CheckCircle2 className="size-4" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {visibleCredits.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-10 text-slate-400" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {overdueCredits.length === 0 ? 'No overdue credits' : 'No matching follow-ups'}
            </h3>
            <p className="text-slate-500">
              {overdueCredits.length === 0
                ? 'All credits are up to date'
                : 'Try another filter to view more follow-ups'}
            </p>
          </div>
        )}

        {/* Overdue Credits List */}
        {visibleCredits.length > 0 && (
          <div className="space-y-4">
            {visibleCredits.map((credit) => (
              <div
                key={credit.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
              >
                <div className="p-4 border-b border-slate-50">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xl font-bold text-slate-900">{credit.customerName}</h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between min-w-[320px] text-sm text-slate-500">
                          <span>Entry Date: {formatDate(credit.dateGiven)}</span>
                          <span>Due Date: {formatDate(credit.dueDate)}</span>
                        </div>
                        <div>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            credit.daysOverdue >= 30 ? 'border-red-100' :
                            credit.daysOverdue >= 15 ? 'border-orange-100' :
                            'border-yellow-100'
                          }`}>
                            {credit.daysOverdue} days overdue
                          </span>
                        </div>
                        {credit.lastReminderAt ? (
                          <p className="text-xs text-slate-400">
                            Last reminder: {formatDate(credit.lastReminderAt)}
                            {credit.daysSinceReminder !== null && (
                              <span className="ml-1">
                                ({credit.daysSinceReminder} days ago)
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Never reminded</p>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {formatAmount(credit.amount)}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-slate-50/50 grid-cols-2 gap-3 flex grid">
                  {/* WhatsApp Reminder Button */}
                  {credit.phoneNumber && (
                    <button
                      onClick={() => handleSendReminder(credit)}
                      disabled={error.type === 'validation' && error.creditId === credit.id}
                      className="flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white py-2.5 px-4 rounded-xl font-semibold text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="size-4" height="20" viewBox="0 0 48 48" width="20" x="0px" xmlns="http://www.w3.org/2000/svg" y="0px">
                        <path d="M4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98c-0.001,0,0,0,0,0h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303z" fill="#fff"></path>
                        <path d="M4.868,43.803c-0.132,0-0.26-0.052-0.355-0.148c-0.125-0.127-0.174-0.312-0.127-0.483l2.639-9.636c-1.636-2.906-2.499-6.206-2.497-9.556C4.532,13.238,13.273,4.5,24.014,4.5c5.21,0.002,10.105,2.031,13.784,5.713c3.679,3.683,5.704,8.577,5.702,13.781c-0.004,10.741-8.746,19.48-19.486,19.48c-3.189-0.001-6.344-0.788-9.144-2.277l-9.875,2.589C4.953,43.798,4.911,43.803,4.868,43.803z" fill="#fff"></path>
                        <path d="M24.014,5c5.079,0.002,9.845,1.979,13.43,5.566c3.584,3.588,5.558,8.356,5.556,13.428c-0.004,10.465-8.522,18.98-18.986,18.98h-0.008c-3.177-0.001-6.3-0.798-9.073-2.311L4.868,43.303l2.694-9.835C5.9,30.59,5.026,27.324,5.027,23.979C5.032,13.514,13.548,5,24.014,5 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974C24.014,42.974,24.014,42.974,24.014,42.974 M24.014,4C24.014,4,24.014,4,24.014,4C12.998,4,4.032,12.962,4.027,23.979c-0.001,3.367,0.849,6.685,2.461,9.622l-2.585,9.439c-0.094,0.345,0.002,0.713,0.254,0.967c0.19,0.192,0.447,0.297,0.711,0.297c0.085,0,0.17-0.011,0.254-0.033l9.687-2.54c2.828,1.468,5.998,2.243,9.197,2.244c11.024,0,19.99-8.963,19.995-19.98c0.002-5.339-2.075-10.359-5.848-14.135C34.378,6.083,29.357,4.002,24.014,4L24.014,4z" fill="#cfd8dc"></path>
                        <path d="M35.176,12.832c-2.98-2.982-6.941-4.625-11.157-4.626c-8.704,0-15.783,7.076-15.787,15.774c-0.001,2.981,0.833,5.883,2.413,8.396l0.376,0.597l-1.595,5.821l5.973-1.566l0.577,0.342c2.422,1.438,5.2,2.198,8.032,2.199h0.006c8.698,0,15.777-7.077,15.78-15.776C39.795,19.778,38.156,15.814,35.176,12.832z" fill="#40c351"></path>
                        <path clipRule="evenodd" d="M19.268,16.045c-0.355-0.79-0.729-0.806-1.068-0.82c-0.277-0.012-0.593-0.011-0.909-0.011c-0.316,0-0.83,0.119-1.265,0.594c-0.435,0.475-1.661,1.622-1.661,3.956c0,2.334,1.7,4.59,1.937,4.906c0.237,0.316,3.282,5.259,8.104,7.161c4.007,1.58,4.823,1.266,5.693,1.187c0.87-0.079,2.807-1.147,3.202-2.255c0.395-1.108,0.395-2.057,0.277-2.255c-0.119-0.198-0.435-0.316-0.909-0.554s-2.807-1.385-3.242-1.543c-0.435-0.158-0.751-0.237-1.068,0.238c-0.316,0.474-1.225,1.543-1.502,1.859c-0.277,0.317-0.554,0.357-1.028,0.119c-0.474-0.238-2.002-0.738-3.815-2.354c-1.41-1.257-2.362-2.81-2.639-3.285c-0.277-0.474-0.03-0.731,0.208-0.968c0.213-0.213,0.474-0.554,0.712-0.831c0.237-0.277,0.316-0.475,0.474-0.791c0.158-0.317,0.079-0.594-0.04-0.831C20.612,19.329,19.69,16.983,19.268,16.045z" fill="#fff" fillRule="evenodd"></path>
                      </svg>
                      Send WhatsApp Reminder
                    </button>
                  )}
                  {/* Mark as Paid Button */}
                  <button
                    onClick={() => handleMarkAsPaid(credit)}
                    disabled={error.type !== null && error.creditId === credit.id}
                    className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-semibold text-xs hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
