// Credit Entry Hybrid Sync Manager
// Manages offline-first credit entries with DynamoDB cloud backup

import type { CreditEntry } from './dynamodb-client';
import { logger } from './logger';

const STORAGE_KEY = 'vyapar-credit-entries';
const SYNC_STATUS_KEY = 'vyapar-credit-sync-status';

export interface LocalCreditEntry extends Omit<CreditEntry, 'userId'> {
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAttempt?: string;
}

export interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  errorCount: number;
}

/**
 * Get all credit entries from localStorage
 */
export function getLocalEntries(): LocalCreditEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const entries: LocalCreditEntry[] = JSON.parse(stored);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Newest first
  } catch (error) {
    logger.error('Failed to load local entries', { error });
    return [];
  }
}

/**
 * Save credit entries to localStorage
 */
export function saveLocalEntries(entries: LocalCreditEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    logger.debug('Saved entries to localStorage', { count: entries.length });
  } catch (error) {
    logger.error('Failed to save local entries', { error });
  }
}

/**
 * Get single credit entry by ID from localStorage
 */
export function getLocalEntry(id: string): LocalCreditEntry | null {
  const entries = getLocalEntries();
  return entries.find(e => e.id === id) || null;
}

/**
 * Add or update credit entry in localStorage
 */
export function saveLocalEntry(entry: LocalCreditEntry): void {
  const entries = getLocalEntries();
  const existingIndex = entries.findIndex(e => e.id === entry.id);
  
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  
  saveLocalEntries(entries);
}

/**
 * Delete credit entry from localStorage
 */
export function deleteLocalEntry(id: string): void {
  const entries = getLocalEntries();
  const filtered = entries.filter(e => e.id !== id);
  saveLocalEntries(filtered);
}

/**
 * Get sync status
 */
export function getSyncStatus(): SyncStatus {
  if (typeof window === 'undefined') {
    return { lastSyncTime: '', pendingCount: 0, errorCount: 0 };
  }
  
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    if (!stored) {
      return { lastSyncTime: '', pendingCount: 0, errorCount: 0 };
    }
    return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to load sync status', { error });
    return { lastSyncTime: '', pendingCount: 0, errorCount: 0 };
  }
}

/**
 * Update sync status
 */
export function updateSyncStatus(status: Partial<SyncStatus>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getSyncStatus();
    const updated = { ...current, ...status };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to update sync status', { error });
  }
}

/**
 * Sync pending credit entries to DynamoDB
 */
export async function syncPendingEntries(userId: string): Promise<{ success: number; failed: number }> {
  const entries = getLocalEntries();
  const pending = entries.filter(e => e.syncStatus === 'pending' || e.syncStatus === 'error');
  
  if (pending.length === 0) {
    logger.info('No pending entries to sync');
    return { success: 0, failed: 0 };
  }
  
  logger.info('Syncing pending entries', { count: pending.length });
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const localEntry of pending) {
    try {
      // Sync via API route (server handles DynamoDB)
      const response = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          id: localEntry.id,
          customerName: localEntry.customerName,
          amount: localEntry.amount,
          dueDate: localEntry.dueDate,
          isPaid: localEntry.isPaid,
          createdAt: localEntry.createdAt,
          paidAt: localEntry.paidAt,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Credit sync failed');
      }
      
      // Update local entry status
      localEntry.syncStatus = 'synced';
      localEntry.lastSyncAttempt = new Date().toISOString();
      saveLocalEntry(localEntry);
      
      successCount++;
    } catch (error) {
      logger.error('Failed to sync entry', { id: localEntry.id, error });
      
      // Update local entry status
      localEntry.syncStatus = 'error';
      localEntry.lastSyncAttempt = new Date().toISOString();
      saveLocalEntry(localEntry);
      
      failedCount++;
    }
  }
  
  // Update sync status
  updateSyncStatus({
    lastSyncTime: new Date().toISOString(),
    pendingCount: failedCount,
    errorCount: failedCount,
  });
  
  logger.info('Sync complete', { success: successCount, failed: failedCount });
  
  return { success: successCount, failed: failedCount };
}

/**
 * Pull credit entries from DynamoDB and merge with local
 */
export async function pullEntriesFromCloud(userId: string): Promise<void> {
  try {
    logger.info('Pulling entries from cloud');
    
    // Get all entries from server API (which reads DynamoDB)
    const response = await fetch(`/api/credit?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    // Handle authentication errors gracefully
    if (response.status === 401 || response.status === 403) {
      logger.warn('Not authenticated, skipping cloud pull');
      return;
    }
    
    if (!response.ok || !result.success) {
      logger.warn('Failed to pull entries', { error: result.error });
      throw new Error(result.error || 'Failed to pull credit entries');
    }
    const cloudEntries: CreditEntry[] = result.data || [];
    
    // Get local entries
    const localEntries = getLocalEntries();
    const localMap = new Map(localEntries.map(e => [e.id, e]));
    
    // Merge cloud entries with local
    for (const cloudEntry of cloudEntries) {
      const localEntry = localMap.get(cloudEntry.id);
      
      if (!localEntry) {
        // New entry from cloud, add to local
        const newLocalEntry: LocalCreditEntry = {
          ...cloudEntry,
          syncStatus: 'synced',
        };
        saveLocalEntry(newLocalEntry);
      } else if (localEntry.syncStatus === 'synced') {
        // Both synced, use cloud version (source of truth)
        const updatedLocalEntry: LocalCreditEntry = {
          ...cloudEntry,
          syncStatus: 'synced',
        };
        saveLocalEntry(updatedLocalEntry);
      }
      // If local is pending/error, keep local version (will sync later)
    }
    
    logger.info('Pull complete, merged cloud entries', { count: cloudEntries.length });
  } catch (error) {
    logger.warn('Failed to pull entries from cloud', { error });
    // Don't throw - allow offline operation
  }
}

/**
 * Full sync: pull from cloud, then push pending
 */
export async function fullSync(userId: string): Promise<{ pulled: number; pushed: number; failed: number }> {
  try {
    logger.info('Starting full sync');
    
    // Pull from cloud first
    await pullEntriesFromCloud(userId);
    const cloudEntries = getLocalEntries().filter((entry) => entry.syncStatus === 'synced');
    
    // Push pending entries
    const { success, failed } = await syncPendingEntries(userId);
    
    logger.info('Full sync complete');
    
    return {
      pulled: cloudEntries.length,
      pushed: success,
      failed,
    };
  } catch (error) {
    logger.error('Full sync failed', { error });
    throw error;
  }
}

/**
 * Sync single credit entry instantly to DynamoDB
 * Returns true if sync succeeded, false otherwise
 */
export async function instantSyncCreditEntry(userId: string, entry: LocalCreditEntry): Promise<boolean> {
  try {
    logger.info('Instant sync for entry', { id: entry.id });
    
    const response = await fetch('/api/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        id: entry.id,
        customerName: entry.customerName,
        amount: entry.amount,
        type: entry.type,
        dueDate: entry.dueDate,
        notes: entry.notes,
        isPaid: entry.isPaid,
        paidDate: entry.paidDate,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Instant sync failed');
    }
    
    // Update local entry status
    entry.syncStatus = 'synced';
    entry.lastSyncAttempt = new Date().toISOString();
    saveLocalEntry(entry);
    
    logger.info('Instant sync succeeded');
    return true;
  } catch (error) {
    logger.error('Instant sync failed', { error });
    
    // Mark as pending for retry
    entry.syncStatus = 'pending';
    entry.lastSyncAttempt = new Date().toISOString();
    saveLocalEntry(entry);
    
    return false;
  }
}

/**
 * Create new credit entry (offline-first)
 * @param markAsSynced - If true, marks entry as already synced (used when API call succeeds)
 */
export function createCreditEntry(
  customerName: string,
  amount: number,
  dueDate: string,
  markAsSynced: boolean = false
): LocalCreditEntry {
  const entry: LocalCreditEntry = {
    id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    customerName,
    amount,
    dueDate,
    isPaid: false,
    createdAt: new Date().toISOString(),
    syncStatus: markAsSynced ? 'synced' : 'pending',
    lastSyncAttempt: markAsSynced ? new Date().toISOString() : undefined,
  };
  
  saveLocalEntry(entry);
  
  return entry;
}

/**
 * Update existing credit entry (offline-first)
 * @param markAsSynced - If true, marks entry as already synced (used when API call succeeds)
 */
export function updateCreditEntry(
  id: string,
  updates: {
    customerName?: string;
    amount?: number;
    dueDate?: string;
    isPaid?: boolean;
    paidAt?: string;
  },
  markAsSynced: boolean = false
): LocalCreditEntry | null {
  const existing = getLocalEntry(id);
  if (!existing) return null;
  
  const updated: LocalCreditEntry = {
    ...existing,
    ...updates,
    syncStatus: markAsSynced ? 'synced' : 'pending',
    lastSyncAttempt: markAsSynced ? new Date().toISOString() : existing.lastSyncAttempt,
  };
  
  saveLocalEntry(updated);
  
  return updated;
}

/**
 * Mark credit entry as paid (offline-first)
 * @param markAsSynced - If true, marks entry as already synced (used when API call succeeds)
 */
export function markCreditAsPaid(
  id: string,
  markAsSynced: boolean = false
): LocalCreditEntry | null {
  return updateCreditEntry(
    id,
    {
      isPaid: true,
      paidAt: new Date().toISOString(),
    },
    markAsSynced
  );
}

/**
 * Clear all local credit data (for logout)
 */
export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_STATUS_KEY);
    logger.info('Cleared all local data');
  } catch (error) {
    logger.error('Failed to clear local data', { error });
  }
}
