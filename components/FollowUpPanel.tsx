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
 * 
 * Follows Vyapar Rules: A2. Udhaar Follow-Up Panel
 */

import React, { useState, useEffect } from 'react';
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
          message: t('error.storageQuotaExceeded', language)
        });
        logger.error('localStorage quota exceeded', { userId, error: err.message });
      } else {
        setError({
          type: 'general',
          message: t('error.loadCreditsFailed', language)
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
          message: t('error.syncConflict', language)
        });
        logger.warn('Sync conflict detected', { userId, error: err.message });
      } else {
        setError({
          type: 'network',
          message: t('error.networkUnavailable', language)
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
    if (isSyncing) return t('daily.syncing', language) || 'Syncing...';
    
    switch (syncStatus.status) {
      case 'synced':
        return t('daily.syncSuccess', language);
      case 'pending':
        return `${syncStatus.pendingCount} ${t('daily.pendingSync', language)}`;
      case 'offline':
        return t('daily.offlineMode', language);
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
          message: t('error.invalidPhoneNumber', language),
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
          message: t('error.invalidPhoneNumber', language),
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
          message: t('error.storageQuotaExceeded', language),
          creditId: credit.id
        });
        logger.error('localStorage quota exceeded while sending reminder', { userId, creditId: credit.id });
      } else {
        setError({
          type: 'general',
          message: t('error.reminderFailed', language),
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
          message: t('error.storageQuotaExceeded', language),
          creditId: credit.id
        });
        logger.error('localStorage quota exceeded while marking as paid', { userId, creditId: credit.id });
      } else {
        setError({
          type: 'general',
          message: t('error.markPaidFailed', language),
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {/* Error Banner */}
      {error.type && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                {error.message}
              </p>
              <button
                onClick={() => setError({ type: null, message: '' })}
                className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
              >
                {t('dismiss', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
          {t('followUp.title', language)}
        </h2>
        
        {/* Sync Status Indicator */}
        <div className={`text-xs sm:text-sm ${getSyncStatusColor()} flex items-center gap-1`}>
          {isSyncing ? (
            <svg
              className="animate-spin h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
          )}
          <span>{getSyncStatusText()}</span>
        </div>
      </div>

      {/* Threshold Info */}
      <div className="text-sm text-gray-600 mb-4">
        {t('followUp.threshold', language).replace('{days}', overdueThreshold.toString())}
      </div>

      {/* Summary Section (displayed at top when credits exist) */}
      {overdueCredits.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Total Overdue Count */}
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {summary.totalOverdue}
              </div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1">
                {t('overdueCustomers', language)}
              </div>
            </div>
            
            {/* Total Overdue Amount */}
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {formatAmount(summary.totalAmount)}
              </div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1">
                {t('followUp.totalOverdue', language)}
              </div>
            </div>
            
            {/* Oldest Overdue Days */}
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {summary.oldestOverdue}
              </div>
              <div className="text-xs sm:text-sm text-gray-700 mt-1">
                {t('followUp.oldestCredit', language)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {overdueCredits.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-600 text-base sm:text-lg">
            {t('followUp.noOverdue', language)}
          </p>
        </div>
      )}

      {/* Overdue Credits List */}
      {overdueCredits.length > 0 && (
        <div className="space-y-3">
          {overdueCredits.map((credit) => (
            <div
              key={credit.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Customer Name */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                  {credit.customerName}
                </h3>
                <span className="text-red-600 font-bold text-base sm:text-lg">
                  {formatAmount(credit.amount)}
                </span>
              </div>

              {/* Credit Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                {/* Date Given */}
                <div>
                  <span className="font-medium">{t('daily.entryDate', language)}:</span>{' '}
                  <span>{formatDate(credit.dateGiven)}</span>
                </div>

                {/* Due Date */}
                <div>
                  <span className="font-medium">{t('dueDate', language)}:</span>{' '}
                  <span>{formatDate(credit.dueDate)}</span>
                </div>

                {/* Days Overdue */}
                <div className="sm:col-span-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {credit.daysOverdue} {t('followUp.daysOverdue', language)}
                  </span>
                </div>
              </div>

              {/* Last Reminder (if exists) */}
              {credit.lastReminderAt && (
                <div className="mt-2 text-xs text-gray-500">
                  {t('followUp.lastReminder', language)}: {formatDate(credit.lastReminderAt)}
                  {credit.daysSinceReminder !== null && (
                    <span className="ml-1">
                      ({credit.daysSinceReminder} {t('daily.daysAgo', language)})
                    </span>
                  )}
                </div>
              )}

              {!credit.lastReminderAt && (
                <div className="mt-2 text-xs text-gray-500">
                  {t('followUp.neverReminded', language)}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                {/* WhatsApp Reminder Button (only if phone number exists) */}
                {credit.phoneNumber && (
                  <button
                    onClick={() => handleSendReminder(credit)}
                    disabled={error.type === 'validation' && error.creditId === credit.id}
                    className={`flex-1 sm:flex-initial px-4 py-2 ${
                      error.type === 'validation' && error.creditId === credit.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
                    aria-label={t('followUp.sendReminder', language)}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    <span>{t('followUp.sendReminder', language)}</span>
                  </button>
                )}
                
                {/* Mark as Paid Button (always displayed for overdue credits) */}
                <button
                  onClick={() => handleMarkAsPaid(credit)}
                  disabled={error.type !== null && error.creditId === credit.id}
                  className={`flex-1 sm:flex-initial px-4 py-2 ${
                    error.type !== null && error.creditId === credit.id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
                  aria-label={t('followUp.markPaid', language)}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>{t('followUp.markPaid', language)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
