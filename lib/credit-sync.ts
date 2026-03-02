// Credit Entry Hybrid Sync Manager
// Manages offline-first credit entries with DynamoDB cloud backup

import { CreditEntry, CreditEntryService } from './dynamodb-client';
import { v4 as uuidv4 } from 'uuid';

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
    console.error('[CreditSync] Failed to load local entries:', error);
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
    console.log('[CreditSync] Saved', entries.length, 'entries to localStorage');
  } catch (error) {
    console.error('[CreditSync] Failed to save local entries:', error);
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
    console.error('[CreditSync] Failed to load sync status:', error);
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
    console.error('[CreditSync] Failed to update sync status:', error);
  }
}

/**
 * Sync pending credit entries to DynamoDB
 */
export async function syncPendingEntries(userId: string): Promise<{ success: number; failed: number }> {
  const entries = getLocalEntries();
  const pending = entries.filter(e => e.syncStatus === 'pending' || e.syncStatus === 'error');
  
  if (pending.length === 0) {
    console.log('[CreditSync] No pending entries to sync');
    return { success: 0, failed: 0 };
  }
  
  console.log('[CreditSync] Syncing', pending.length, 'pending entries');
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const localEntry of pending) {
    try {
      // Convert local entry to DynamoDB entry
      const dbEntry: CreditEntry = {
        userId,
        id: localEntry.id,
        customerName: localEntry.customerName,
        amount: localEntry.amount,
        dueDate: localEntry.dueDate,
        isPaid: localEntry.isPaid,
        createdAt: localEntry.createdAt,
        paidAt: localEntry.paidAt,
      };
      
      await CreditEntryService.saveEntry(dbEntry);
      
      // Update local entry status
      localEntry.syncStatus = 'synced';
      localEntry.lastSyncAttempt = new Date().toISOString();
      saveLocalEntry(localEntry);
      
      successCount++;
    } catch (error) {
      console.error('[CreditSync] Failed to sync entry:', localEntry.id, error);
      
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
  
  console.log('[CreditSync] Sync complete:', successCount, 'success,', failedCount, 'failed');
  
  return { success: successCount, failed: failedCount };
}

/**
 * Pull credit entries from DynamoDB and merge with local
 */
export async function pullEntriesFromCloud(userId: string): Promise<void> {
  try {
    console.log('[CreditSync] Pulling entries from cloud');
    
    // Get all entries from DynamoDB
    const cloudEntries = await CreditEntryService.getEntries(userId);
    
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
    
    console.log('[CreditSync] Pull complete, merged', cloudEntries.length, 'cloud entries');
  } catch (error) {
    console.error('[CreditSync] Failed to pull entries from cloud:', error);
    throw error;
  }
}

/**
 * Full sync: pull from cloud, then push pending
 */
export async function fullSync(userId: string): Promise<{ pulled: number; pushed: number; failed: number }> {
  try {
    console.log('[CreditSync] Starting full sync');
    
    // Pull from cloud first
    await pullEntriesFromCloud(userId);
    const cloudEntries = await CreditEntryService.getEntries(userId);
    
    // Push pending entries
    const { success, failed } = await syncPendingEntries(userId);
    
    console.log('[CreditSync] Full sync complete');
    
    return {
      pulled: cloudEntries.length,
      pushed: success,
      failed,
    };
  } catch (error) {
    console.error('[CreditSync] Full sync failed:', error);
    throw error;
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
    console.log('[CreditSync] Cleared all local data');
  } catch (error) {
    console.error('[CreditSync] Failed to clear local data:', error);
  }
}
