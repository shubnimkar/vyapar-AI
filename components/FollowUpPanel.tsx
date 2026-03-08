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
import { getOverdueCredits } from '@/lib/credit-manager';
import { generateReminderLink } from '@/lib/whatsapp-link-generator';
import { recordReminder } from '@/lib/reminder-tracker';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';
import type { CreditEntry, OverdueCredit, Language } from '@/lib/types';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CheckCircle, MessageCircle, CreditCard } from 'lucide-react';

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
      <Card loading>
        <CardHeader>
          <div className="h-6 bg-neutral-200 rounded w-1/3 mb-4"></div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 rounded"></div>
            <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card elevation="raised" density="comfortable">
      {/* Error State */}
      {error.type && (
        <div className="mb-4">
          <ErrorState
            title={error.type === 'network' ? t('networkError', language) : t('error.required', language)}
            message={error.message}
            action={{
              label: t('dismiss', language),
              onClick: () => setError({ type: null, message: '' })
            }}
          />
        </div>
      )}

      {/* Header */}
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-800">
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
        <div className="text-sm text-neutral-600 mt-2">
          {t('followUp.threshold', language).replace('{days}', overdueThreshold.toString())}
        </div>
      </CardHeader>

      <CardBody>
        {/* Summary Section (displayed at top when credits exist) */}
        {overdueCredits.length > 0 && (
          <div className="mb-6 bg-error-50 border border-error-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              {/* Total Overdue Count */}
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-error-600">
                  {summary.totalOverdue}
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 mt-1">
                  {t('overdueCustomers', language)}
                </div>
              </div>
              
              {/* Total Overdue Amount */}
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-error-600">
                  {formatAmount(summary.totalAmount)}
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 mt-1">
                  {t('followUp.totalOverdue', language)}
                </div>
              </div>
              
              {/* Oldest Overdue Days */}
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-error-600">
                  {summary.oldestOverdue}
                </div>
                <div className="text-xs sm:text-sm text-neutral-700 mt-1">
                  {t('followUp.oldestCredit', language)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {overdueCredits.length === 0 && (
          <EmptyState
            icon={<CheckCircle className="w-12 h-12" />}
            title={t('followUp.noOverdue', language)}
          />
        )}

        {/* Overdue Credits List */}
        {overdueCredits.length > 0 && (
          <div className="space-y-3">
            {overdueCredits.map((credit) => (
              <Card
                key={credit.id}
                elevation="flat"
                density="compact"
                className="hover:shadow-md transition-shadow"
              >
                {/* Customer Name */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900 text-base sm:text-lg">
                    {credit.customerName}
                  </h3>
                  <span className="text-error-600 font-bold text-base sm:text-lg">
                    {formatAmount(credit.amount)}
                  </span>
                </div>

                {/* Credit Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-neutral-600">
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
                    <Badge variant="error">
                      {credit.daysOverdue} {t('followUp.daysOverdue', language)}
                    </Badge>
                  </div>
                </div>

                {/* Last Reminder (if exists) */}
                {credit.lastReminderAt && (
                  <div className="mt-2 text-xs text-neutral-500">
                    {t('followUp.lastReminder', language)}: {formatDate(credit.lastReminderAt)}
                    {credit.daysSinceReminder !== null && (
                      <span className="ml-1">
                        ({credit.daysSinceReminder} {t('daily.daysAgo', language)})
                      </span>
                    )}
                  </div>
                )}

                {!credit.lastReminderAt && (
                  <div className="mt-2 text-xs text-neutral-500">
                    {t('followUp.neverReminded', language)}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  {/* WhatsApp Reminder Button (only if phone number exists) */}
                  {credit.phoneNumber && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSendReminder(credit)}
                      disabled={error.type === 'validation' && error.creditId === credit.id}
                      icon={<MessageCircle className="w-4 h-4" />}
                      iconPosition="left"
                      fullWidth
                      className="sm:flex-1"
                    >
                      {t('followUp.sendReminder', language)}
                    </Button>
                  )}
                  
                  {/* Mark as Paid Button (always displayed for overdue credits) */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleMarkAsPaid(credit)}
                    disabled={error.type !== null && error.creditId === credit.id}
                    icon={<CheckCircle className="w-4 h-4" />}
                    iconPosition="left"
                    fullWidth
                    className="sm:flex-1"
                  >
                    {t('followUp.markPaid', language)}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
