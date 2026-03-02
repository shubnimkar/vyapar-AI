// Daily Entry Hybrid Sync Manager
// Manages offline-first daily entries with DynamoDB cloud backup

import { DailyEntry, DailyEntryService } from './dynamodb-client';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'vyapar-daily-entries';
const SYNC_STATUS_KEY = 'vyapar-daily-sync-status';

export interface LocalDailyEntry extends Omit<DailyEntry, 'userId'> {
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAttempt?: string;
}

export interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  errorCount: number;
}

/**
 * Get all entries from localStorage
 */
export function getLocalEntries(): LocalDailyEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const entries: LocalDailyEntry[] = JSON.parse(stored);
    return entries.sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  } catch (error) {
    console.error('[DailyEntrySync] Failed to load local entries:', error);
    return [];
  }
}

/**
 * Save entries to localStorage
 */
export function saveLocalEntries(entries: LocalDailyEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    console.log('[DailyEntrySync] Saved', entries.length, 'entries to localStorage');
  } catch (error) {
    console.error('[DailyEntrySync] Failed to save local entries:', error);
  }
}

/**
 * Get single entry by date from localStorage
 */
export function getLocalEntry(date: string): LocalDailyEntry | null {
  const entries = getLocalEntries();
  return entries.find(e => e.date === date) || null;
}

/**
 * Add or update entry in localStorage
 */
export function saveLocalEntry(entry: LocalDailyEntry): void {
  const entries = getLocalEntries();
  const existingIndex = entries.findIndex(e => e.date === entry.date);
  
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  
  saveLocalEntries(entries);
}

/**
 * Delete entry from localStorage
 */
export function deleteLocalEntry(date: string): void {
  const entries = getLocalEntries();
  const filtered = entries.filter(e => e.date !== date);
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
    console.error('[DailyEntrySync] Failed to load sync status:', error);
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
    console.error('[DailyEntrySync] Failed to update sync status:', error);
  }
}

/**
 * Sync pending entries to DynamoDB
 */
export async function syncPendingEntries(userId: string): Promise<{ success: number; failed: number }> {
  const entries = getLocalEntries();
  const pending = entries.filter(e => e.syncStatus === 'pending' || e.syncStatus === 'error');
  
  if (pending.length === 0) {
    console.log('[DailyEntrySync] No pending entries to sync');
    return { success: 0, failed: 0 };
  }
  
  console.log('[DailyEntrySync] Syncing', pending.length, 'pending entries');
  
  let successCount = 0;
  let failedCount = 0;
  
  for (const localEntry of pending) {
    try {
      // Convert local entry to DynamoDB entry
      const dbEntry: DailyEntry = {
        userId,
        entryId: localEntry.entryId,
        date: localEntry.date,
        totalSales: localEntry.totalSales,
        totalExpense: localEntry.totalExpense,
        cashInHand: localEntry.cashInHand,
        notes: localEntry.notes,
        estimatedProfit: localEntry.estimatedProfit,
        expenseRatio: localEntry.expenseRatio,
        profitMargin: localEntry.profitMargin,
        createdAt: localEntry.createdAt,
        updatedAt: localEntry.updatedAt,
      };
      
      await DailyEntryService.saveEntry(dbEntry);
      
      // Update local entry status
      localEntry.syncStatus = 'synced';
      localEntry.lastSyncAttempt = new Date().toISOString();
      saveLocalEntry(localEntry);
      
      successCount++;
    } catch (error) {
      console.error('[DailyEntrySync] Failed to sync entry:', localEntry.date, error);
      
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
  
  console.log('[DailyEntrySync] Sync complete:', successCount, 'success,', failedCount, 'failed');
  
  return { success: successCount, failed: failedCount };
}

/**
 * Pull entries from DynamoDB and merge with local
 */
export async function pullEntriesFromCloud(userId: string): Promise<void> {
  try {
    console.log('[DailyEntrySync] Pulling entries from cloud');
    
    // Get all entries from DynamoDB
    const cloudEntries = await DailyEntryService.getEntries(userId);
    
    // Get local entries
    const localEntries = getLocalEntries();
    const localMap = new Map(localEntries.map(e => [e.date, e]));
    
    // Merge cloud entries with local
    for (const cloudEntry of cloudEntries) {
      const localEntry = localMap.get(cloudEntry.date);
      
      if (!localEntry) {
        // New entry from cloud, add to local
        const newLocalEntry: LocalDailyEntry = {
          ...cloudEntry,
          syncStatus: 'synced',
        };
        saveLocalEntry(newLocalEntry);
      } else if (localEntry.syncStatus === 'synced') {
        // Both synced, use cloud version (source of truth)
        const updatedLocalEntry: LocalDailyEntry = {
          ...cloudEntry,
          syncStatus: 'synced',
        };
        saveLocalEntry(updatedLocalEntry);
      }
      // If local is pending/error, keep local version (will sync later)
    }
    
    console.log('[DailyEntrySync] Pull complete, merged', cloudEntries.length, 'cloud entries');
  } catch (error) {
    console.error('[DailyEntrySync] Failed to pull entries from cloud:', error);
    throw error;
  }
}

/**
 * Full sync: pull from cloud, then push pending
 */
export async function fullSync(userId: string): Promise<{ pulled: number; pushed: number; failed: number }> {
  try {
    console.log('[DailyEntrySync] Starting full sync');
    
    // Pull from cloud first
    await pullEntriesFromCloud(userId);
    const cloudEntries = await DailyEntryService.getEntries(userId);
    
    // Push pending entries
    const { success, failed } = await syncPendingEntries(userId);
    
    console.log('[DailyEntrySync] Full sync complete');
    
    return {
      pulled: cloudEntries.length,
      pushed: success,
      failed,
    };
  } catch (error) {
    console.error('[DailyEntrySync] Full sync failed:', error);
    throw error;
  }
}

/**
 * Create new daily entry (offline-first)
 * @param markAsSynced - If true, marks entry as already synced (used when API call succeeds)
 */
export function createDailyEntry(
  date: string,
  totalSales: number,
  totalExpense: number,
  cashInHand?: number,
  notes?: string,
  markAsSynced: boolean = false
): LocalDailyEntry {
  const estimatedProfit = totalSales - totalExpense;
  const expenseRatio = totalSales > 0 ? totalExpense / totalSales : 0;
  const profitMargin = totalSales > 0 ? estimatedProfit / totalSales : 0;
  
  const entry: LocalDailyEntry = {
    entryId: uuidv4(),
    date,
    totalSales,
    totalExpense,
    cashInHand,
    notes,
    estimatedProfit,
    expenseRatio,
    profitMargin,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: markAsSynced ? 'synced' : 'pending',
    lastSyncAttempt: markAsSynced ? new Date().toISOString() : undefined,
  };
  
  saveLocalEntry(entry);
  
  return entry;
}

/**
 * Update existing daily entry (offline-first)
 * @param markAsSynced - If true, marks entry as already synced (used when API call succeeds)
 */
export function updateDailyEntry(
  date: string,
  updates: {
    totalSales?: number;
    totalExpense?: number;
    cashInHand?: number;
    notes?: string;
  },
  markAsSynced: boolean = false
): LocalDailyEntry | null {
  const existing = getLocalEntry(date);
  if (!existing) return null;
  
  const totalSales = updates.totalSales ?? existing.totalSales;
  const totalExpense = updates.totalExpense ?? existing.totalExpense;
  
  const estimatedProfit = totalSales - totalExpense;
  const expenseRatio = totalSales > 0 ? totalExpense / totalSales : 0;
  const profitMargin = totalSales > 0 ? estimatedProfit / totalSales : 0;
  
  const updated: LocalDailyEntry = {
    ...existing,
    ...updates,
    totalSales,
    totalExpense,
    estimatedProfit,
    expenseRatio,
    profitMargin,
    updatedAt: new Date().toISOString(),
    syncStatus: markAsSynced ? 'synced' : 'pending',
    lastSyncAttempt: markAsSynced ? new Date().toISOString() : existing.lastSyncAttempt,
  };
  
  saveLocalEntry(updated);
  
  return updated;
}

/**
 * Clear all local data (for logout)
 */
export function clearLocalData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_STATUS_KEY);
    console.log('[DailyEntrySync] Cleared all local data');
  } catch (error) {
    console.error('[DailyEntrySync] Failed to clear local data:', error);
  }
}
