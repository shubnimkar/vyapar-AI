// Daily Entry Hybrid Sync Manager
// Manages offline-first daily entries with DynamoDB cloud backup

import type { DailyEntry } from './dynamodb-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { resolveUserScopedKey } from './user-scoped-storage';

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
export function getLocalEntries(userId?: string): LocalDailyEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(resolveUserScopedKey(STORAGE_KEY, userId));
    if (!stored) return [];
    
    const entries: LocalDailyEntry[] = JSON.parse(stored);
    return entries.sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  } catch (error) {
    logger.error('Failed to load local entries', { error });
    return [];
  }
}

/**
 * Save entries to localStorage
 */
export function saveLocalEntries(entries: LocalDailyEntry[], userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(resolveUserScopedKey(STORAGE_KEY, userId), JSON.stringify(entries));
    logger.debug('Saved entries to localStorage', { count: entries.length });
  } catch (error) {
    logger.error('Failed to save local entries', { error });
  }
}

/**
 * Get single entry by date from localStorage
 */
export function getLocalEntry(date: string, userId?: string): LocalDailyEntry | null {
  const entries = getLocalEntries(userId);
  return entries.find(e => e.date === date) || null;
}

/**
 * Add or update entry in localStorage
 */
export function saveLocalEntry(entry: LocalDailyEntry, userId?: string): void {
  const entries = getLocalEntries(userId);
  const existingIndex = entries.findIndex(e => e.date === entry.date);
  
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  
  saveLocalEntries(entries, userId);
  
  // Dispatch custom event to notify other components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vyapar-daily-entries-changed', { 
      detail: { entry, action: existingIndex >= 0 ? 'updated' : 'created' } 
    }));
  }
}

/**
 * Delete entry from localStorage
 */
export function deleteLocalEntry(date: string, userId?: string): void {
  const entries = getLocalEntries(userId);
  const filtered = entries.filter(e => e.date !== date);
  saveLocalEntries(filtered, userId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vyapar-daily-entries-changed', { detail: { action: 'deleted', date } }));
  }
}

/**
 * Get sync status
 */
export function getSyncStatus(userId?: string): SyncStatus {
  if (typeof window === 'undefined') {
    return { lastSyncTime: '', pendingCount: 0, errorCount: 0 };
  }
  
  try {
    const stored = localStorage.getItem(resolveUserScopedKey(SYNC_STATUS_KEY, userId));
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
export function updateSyncStatus(status: Partial<SyncStatus>, userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getSyncStatus(userId);
    const updated = { ...current, ...status };
    localStorage.setItem(resolveUserScopedKey(SYNC_STATUS_KEY, userId), JSON.stringify(updated));
  } catch (error) {
    logger.error('Failed to update sync status', { error });
  }
}

/**
 * Sync pending entries to DynamoDB
 */
export async function syncPendingEntries(userId: string): Promise<{ success: number; failed: number }> {
  const entries = getLocalEntries(userId);
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
      const response = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          entryId: localEntry.entryId,
          date: localEntry.date,
          totalSales: localEntry.totalSales,
          totalExpense: localEntry.totalExpense,
          cashInHand: localEntry.cashInHand,
          notes: localEntry.notes,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Daily entry sync failed');
      }
      
      // Update local entry status
      localEntry.syncStatus = 'synced';
      localEntry.lastSyncAttempt = new Date().toISOString();
      saveLocalEntry(localEntry, userId);
      
      successCount++;
    } catch (error) {
      logger.error('Failed to sync entry', { date: localEntry.date, error });
      
      // Update local entry status
      localEntry.syncStatus = 'error';
      localEntry.lastSyncAttempt = new Date().toISOString();
      saveLocalEntry(localEntry, userId);
      
      failedCount++;
    }
  }
  
  // Update sync status
  updateSyncStatus({
    lastSyncTime: new Date().toISOString(),
    pendingCount: failedCount,
    errorCount: failedCount,
  }, userId);
  
  logger.info('Sync complete', { success: successCount, failed: failedCount });
  
  return { success: successCount, failed: failedCount };
}

/**
 * Pull entries from DynamoDB and merge with local
 */
export async function pullEntriesFromCloud(userId: string): Promise<void> {
  try {
    logger.info('Pulling entries from cloud');
    
    // Get all entries from server API (which reads DynamoDB)
    const response = await fetch(`/api/daily?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();
    
    // Handle authentication errors gracefully
    if (response.status === 401 || response.status === 403) {
      logger.warn('Not authenticated, skipping cloud pull');
      return;
    }
    
    if (!response.ok || !result.success) {
      logger.warn('Failed to pull entries', { error: result.error });
      throw new Error(result.error || 'Failed to pull daily entries');
    }
    const cloudEntries: DailyEntry[] = result.data || [];
    
    // Get local entries
    const localEntries = getLocalEntries(userId);
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
        saveLocalEntry(newLocalEntry, userId);
      } else if (localEntry.syncStatus === 'synced') {
        // Both synced, use cloud version (source of truth)
        const updatedLocalEntry: LocalDailyEntry = {
          ...cloudEntry,
          syncStatus: 'synced',
        };
        saveLocalEntry(updatedLocalEntry, userId);
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
    const cloudEntries = getLocalEntries(userId).filter((entry) => entry.syncStatus === 'synced');
    
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
    // Always rethrow an Error instance so callers/Next don't surface "[object Event]"
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Sync single entry instantly to DynamoDB
 * Returns true if sync succeeded, false otherwise
 */
export async function instantSyncEntry(userId: string, entry: LocalDailyEntry): Promise<boolean> {
  try {
    logger.info('Instant sync for entry', { date: entry.date });
    
    const response = await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        entryId: entry.entryId,
        date: entry.date,
        totalSales: entry.totalSales,
        totalExpense: entry.totalExpense,
        cashInHand: entry.cashInHand,
        notes: entry.notes,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Instant sync failed');
    }
    
    // Update local entry status
    entry.syncStatus = 'synced';
    entry.lastSyncAttempt = new Date().toISOString();
    saveLocalEntry(entry, userId);
    
    logger.info('Instant sync succeeded');
    return true;
  } catch (error) {
    logger.error('Instant sync failed', { error });
    
    // Mark as pending for retry
    entry.syncStatus = 'pending';
    entry.lastSyncAttempt = new Date().toISOString();
    saveLocalEntry(entry, userId);
    
    return false;
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
  markAsSynced: boolean = false,
  userId?: string
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
  
  // Generate suggestions for the entry
  try {
    const { generateSuggestionsForEntry } = require('./finance/daily-health-coach-service');
    entry.suggestions = generateSuggestionsForEntry(entry);
  } catch (error) {
    logger.error('Failed to generate suggestions during entry creation', { error, date });
    entry.suggestions = [];
  }
  
  saveLocalEntry(entry, userId);
  
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
  markAsSynced: boolean = false,
  userId?: string
): LocalDailyEntry | null {
  const existing = getLocalEntry(date, userId);
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
  
  // Regenerate suggestions for the updated entry
  try {
    const { generateSuggestionsForEntry } = require('./finance/daily-health-coach-service');
    updated.suggestions = generateSuggestionsForEntry(updated);
  } catch (error) {
    logger.error('Failed to generate suggestions during entry update', { error, date });
    updated.suggestions = existing.suggestions || [];
  }
  
  saveLocalEntry(updated, userId);
  
  return updated;
}

/**
 * Clear all local data (for logout)
 */
export function clearLocalData(userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(resolveUserScopedKey(STORAGE_KEY, userId));
    localStorage.removeItem(resolveUserScopedKey(SYNC_STATUS_KEY, userId));
    logger.info('Cleared all local data');
  } catch (error) {
    logger.error('Failed to clear local data', { error });
  }
}
