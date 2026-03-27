/**
 * Index Sync Manager - localStorage and DynamoDB functions for Stress & Affordability Index
 * 
 * Provides offline-first storage for index data with automatic pruning
 * and sync status tracking.
 */

import type { IndexData } from './types';
import { DynamoDBService } from './dynamodb-client';
import { logger } from './logger';

const STORAGE_KEY = 'vyapar_indices';
const MAX_AGE_DAYS = 90;

/**
 * Get localStorage instance (works in both browser and test environments)
 */
function getStorage(): Storage | null {
  // Try global first (test environment)
  try {
    if (typeof global !== 'undefined') {
      const globalStorage = (global as any).localStorage;
      if (globalStorage && typeof globalStorage.getItem === 'function') {
        return globalStorage;
      }
    }
  } catch (e) {
    // Ignore errors accessing global
  }
  
  // Try window (browser environment)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (e) {
    // Ignore errors accessing window
  }
  
  return null;
}

/**
 * Internal storage format with sync metadata
 */
interface StoredIndexData extends IndexData {
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSyncAttempt?: string;
}

/**
 * Get all indices from localStorage (internal use)
 */
export function getLocalIndices(): StoredIndexData[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const data = storage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read indices from localStorage:', error);
    return [];
  }
}

/**
 * Save all indices to localStorage (internal use)
 */
function setLocalIndices(indices: StoredIndexData[]): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(indices));
  } catch (error) {
    console.error('Failed to save indices to localStorage:', error);
  }
}

/**
 * Prune entries older than MAX_AGE_DAYS
 */
function pruneOldEntries(indices: StoredIndexData[]): StoredIndexData[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_AGE_DAYS);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  return indices.filter(index => index.date >= cutoffDateStr);
}

/**
 * Remove sync metadata from IndexData
 */
function stripSyncMetadata(data: StoredIndexData): IndexData {
  const { syncStatus, lastSyncAttempt, ...cleanData } = data;
  return cleanData;
}

/**
 * Save index data to localStorage
 * 
 * - Automatically prunes entries older than 90 days
 * - Updates existing entry if same userId and date
 * - Marks new entries as 'pending' sync
 * 
 * @param indexData - Index data to save
 */
export function saveIndexToLocalStorage(
  indexData: IndexData,
  syncStatus: StoredIndexData['syncStatus'] = 'pending'
): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  let indices = getLocalIndices();

  // Find existing entry for same user and date
  const existingIndex = indices.findIndex(
    item => item.userId === indexData.userId && item.date === indexData.date
  );

  const storedData: StoredIndexData = {
    ...indexData,
    syncStatus,
  };

  if (existingIndex >= 0) {
    // Update existing entry
    indices[existingIndex] = storedData;
  } else {
    // Add new entry
    indices.push(storedData);
  }

  // Prune old entries
  indices = pruneOldEntries(indices);

  // Save to localStorage
  setLocalIndices(indices);
}

/**
 * Merge indices from cloud into localStorage.
 *
 * Cloud data is treated as already synced and replaces older local data for the
 * same user/date pair.
 */
export function mergeIndicesFromCloud(indicesFromCloud: IndexData[]): void {
  if (indicesFromCloud.length === 0) {
    return;
  }

  let indices = getLocalIndices();

  for (const indexData of indicesFromCloud) {
    const existingIndex = indices.findIndex(
      item => item.userId === indexData.userId && item.date === indexData.date
    );

    const storedData: StoredIndexData = {
      ...indexData,
      syncStatus: 'synced',
      lastSyncAttempt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      indices[existingIndex] = storedData;
    } else {
      indices.push(storedData);
    }
  }

  setLocalIndices(pruneOldEntries(indices));
}

/**
 * Get the latest index for a user from localStorage
 * 
 * Returns the most recent index entry (by date) for the specified user.
 * Sync metadata is stripped from the returned data.
 * 
 * @param userId - User ID to filter by
 * @returns Latest index data or null if none found
 */
export function getLatestIndexFromLocalStorage(userId: string): IndexData | null {
  const indices = getLocalIndices();
  
  // Filter by userId and sort by date descending
  const userIndices = indices
    .filter(index => index.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (userIndices.length === 0) {
    return null;
  }

  return stripSyncMetadata(userIndices[0]);
}

/**
 * Get historical indices for a user within a date range
 * 
 * Returns indices sorted by date descending (newest first).
 * Sync metadata is stripped from the returned data.
 * 
 * @param userId - User ID to filter by
 * @param startDate - Start date (inclusive, ISO format YYYY-MM-DD)
 * @param endDate - End date (inclusive, ISO format YYYY-MM-DD)
 * @returns Array of index data within the date range
 */
export function getHistoricalIndicesFromLocalStorage(
  userId: string,
  startDate: string,
  endDate: string
): IndexData[] {
  const indices = getLocalIndices();

  // Filter by userId and date range
  const filtered = indices
    .filter(index => 
      index.userId === userId &&
      index.date >= startDate &&
      index.date <= endDate
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return filtered.map(stripSyncMetadata);
}

/**
 * Clear all index data from localStorage
 * 
 * Useful for testing and user data deletion.
 */
export function clearLocalData(): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear index data from localStorage:', error);
  }
}

// ============================================
// DynamoDB Functions
// ============================================

/**
 * Generate partition key for index data
 */
function generateIndexPK(userId: string): string {
  return `USER#${userId}`;
}

/**
 * Generate sort key for index data
 */
function generateIndexSK(date: string): string {
  return `INDEX#${date}`;
}

/**
 * Save index data to DynamoDB
 * 
 * Uses single-table design with:
 * - PK = USER#{user_id}
 * - SK = INDEX#{date}
 * 
 * @param indexData - Index data to save
 */
export async function saveIndexToDynamoDB(indexData: IndexData): Promise<void> {
  try {
    const item = {
      PK: generateIndexPK(indexData.userId),
      SK: generateIndexSK(indexData.date),
      entityType: 'INDEX',
      userId: indexData.userId,
      date: indexData.date,
      stressIndex: indexData.stressIndex,
      affordabilityIndex: indexData.affordabilityIndex,
      dataPoints: indexData.dataPoints,
      calculationPeriod: indexData.calculationPeriod,
      createdAt: indexData.createdAt,
      syncedAt: new Date().toISOString(),
    };

    await DynamoDBService.putItem(item);
    logger.debug('Index saved to DynamoDB', { userId: indexData.userId, date: indexData.date });
  } catch (error) {
    logger.error('Failed to save index to DynamoDB', { error, userId: indexData.userId });
    throw new Error('Failed to save index to DynamoDB');
  }
}

/**
 * Get the latest index for a user from DynamoDB
 * 
 * Queries with descending sort to get the most recent entry.
 * 
 * @param userId - User ID to filter by
 * @returns Latest index data or null if none found
 */
export async function getLatestIndexFromDynamoDB(userId: string): Promise<IndexData | null> {
  try {
    const items = await DynamoDBService.queryByPK(
      generateIndexPK(userId),
      'INDEX#'
    );

    if (!items || items.length === 0) {
      return null;
    }

    // Sort by date descending (newest first)
    const sortedItems = items.sort((a, b) => b.date.localeCompare(a.date));
    const latestItem = sortedItems[0];

    return {
      userId: latestItem.userId,
      date: latestItem.date,
      stressIndex: latestItem.stressIndex,
      affordabilityIndex: latestItem.affordabilityIndex,
      dataPoints: latestItem.dataPoints,
      calculationPeriod: latestItem.calculationPeriod,
      createdAt: latestItem.createdAt,
      syncedAt: latestItem.syncedAt,
    };
  } catch (error) {
    logger.error('Failed to get latest index from DynamoDB', { error, userId });
    throw new Error('Failed to retrieve latest index from DynamoDB');
  }
}

/**
 * Get historical indices for a user within a date range from DynamoDB
 * 
 * Returns indices sorted by date descending (newest first).
 * 
 * @param userId - User ID to filter by
 * @param startDate - Start date (inclusive, ISO format YYYY-MM-DD)
 * @param endDate - End date (inclusive, ISO format YYYY-MM-DD)
 * @returns Array of index data within the date range
 */
export async function getHistoricalIndicesFromDynamoDB(
  userId: string,
  startDate: string,
  endDate: string
): Promise<IndexData[]> {
  try {
    const items = await DynamoDBService.queryByPK(
      generateIndexPK(userId),
      'INDEX#'
    );

    if (!items || items.length === 0) {
      return [];
    }

    // Filter by date range
    const filtered = items
      .filter(item => 
        item.date >= startDate &&
        item.date <= endDate
      )
      .sort((a, b) => b.date.localeCompare(a.date));

    return filtered.map(item => ({
      userId: item.userId,
      date: item.date,
      stressIndex: item.stressIndex,
      affordabilityIndex: item.affordabilityIndex,
      dataPoints: item.dataPoints,
      calculationPeriod: item.calculationPeriod,
      createdAt: item.createdAt,
      syncedAt: item.syncedAt,
    }));
  } catch (error) {
    logger.error('Failed to get historical indices from DynamoDB', { error, userId, startDate, endDate });
    throw new Error('Failed to retrieve historical indices from DynamoDB');
  }
}

// ============================================
// Sync Manager Class
// ============================================

/**
 * Sync result with success/failure details
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Index Sync Manager
 * 
 * Orchestrates offline-first storage with automatic sync to DynamoDB when online.
 * Uses last-write-wins conflict resolution based on createdAt timestamp.
 */
export class IndexSyncManager {
  /**
   * Check if online and DynamoDB is accessible
   * 
   * @returns True if online and DynamoDB is accessible
   */
  async isOnline(): Promise<boolean> {
    // Check browser online status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    // Try a lightweight DynamoDB operation to verify connectivity
    try {
      // Attempt to query with a non-existent key (minimal cost)
      await DynamoDBService.queryByPK('HEALTH_CHECK', 'PING');
      return true;
    } catch (error) {
      logger.debug('DynamoDB connectivity check failed', { error });
      return false;
    }
  }

  /**
   * Save index data (localStorage always, DynamoDB when online)
   * 
   * Implements offline-first strategy:
   * - Always saves to localStorage immediately
   * - Attempts DynamoDB save if online
   * - Marks as pending sync if DynamoDB fails
   * 
   * @param indexData - Index data to save
   */
  async saveIndex(indexData: IndexData): Promise<void> {
    // Always save to localStorage first
    saveIndexToLocalStorage(indexData);
    logger.debug('Index saved to localStorage', { userId: indexData.userId, date: indexData.date });

    // Attempt DynamoDB save if online
    const online = await this.isOnline();
    if (online) {
      try {
        await saveIndexToDynamoDB(indexData);
        
        // Update sync status in localStorage
        const indices = getLocalIndices();
        const index = indices.find(
          item => item.userId === indexData.userId && item.date === indexData.date
        );
        if (index) {
          index.syncStatus = 'synced';
          index.lastSyncAttempt = new Date().toISOString();
          setLocalIndices(indices);
        }
        
        logger.info('Index synced to DynamoDB', { userId: indexData.userId, date: indexData.date });
      } catch (error) {
        logger.warn('Failed to sync index to DynamoDB, will retry later', { 
          error, 
          userId: indexData.userId, 
          date: indexData.date 
        });
        
        // Update sync status to failed
        const indices = getLocalIndices();
        const index = indices.find(
          item => item.userId === indexData.userId && item.date === indexData.date
        );
        if (index) {
          index.syncStatus = 'failed';
          index.lastSyncAttempt = new Date().toISOString();
          setLocalIndices(indices);
        }
      }
    } else {
      logger.debug('Offline - index will sync when connection is restored', { 
        userId: indexData.userId, 
        date: indexData.date 
      });
    }
  }

  /**
   * Get latest index from localStorage or DynamoDB
   * 
   * Strategy:
   * - Try localStorage first (faster)
   * - If not found or online, check DynamoDB
   * - Return the most recent based on createdAt timestamp
   * 
   * @param userId - User ID to filter by
   * @returns Latest index data or null if none found
   */
  async getLatestIndex(userId: string): Promise<IndexData | null> {
    // Try localStorage first
    const localIndex = getLatestIndexFromLocalStorage(userId);
    
    // Check if online
    const online = await this.isOnline();
    
    if (!online) {
      // Offline - return localStorage result
      return localIndex;
    }

    // Online - check DynamoDB as well
    try {
      const dynamoIndex = await getLatestIndexFromDynamoDB(userId);
      
      // If no DynamoDB data, return local
      if (!dynamoIndex) {
        return localIndex;
      }
      
      // If no local data, return DynamoDB
      if (!localIndex) {
        return dynamoIndex;
      }
      
      // Both exist - return the most recent based on createdAt
      const localTime = new Date(localIndex.createdAt).getTime();
      const dynamoTime = new Date(dynamoIndex.createdAt).getTime();
      
      return dynamoTime > localTime ? dynamoIndex : localIndex;
    } catch (error) {
      logger.warn('Failed to get index from DynamoDB, using localStorage', { error, userId });
      return localIndex;
    }
  }

  /**
   * Sync pending localStorage indices to DynamoDB
   * 
   * Implements last-write-wins conflict resolution:
   * - Compares createdAt timestamps
   * - Newer entries overwrite older ones
   * - Syncs all pending entries for the user
   * 
   * @param userId - User ID to sync indices for
   * @returns Sync result with counts and errors
   */
  async syncPendingIndices(userId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
    };

    // Check if online
    const online = await this.isOnline();
    if (!online) {
      result.success = false;
      result.errors.push('Cannot sync while offline');
      return result;
    }

    // Get all local indices for the user
    const localIndices = getLocalIndices().filter(
      index => index.userId === userId && (index.syncStatus === 'pending' || index.syncStatus === 'failed')
    );

    if (localIndices.length === 0) {
      logger.debug('No pending indices to sync', { userId });
      return result;
    }

    logger.info('Starting sync of pending indices', { userId, count: localIndices.length });

    // Sync each pending index
    for (const localIndex of localIndices) {
      try {
        // Check if entry exists in DynamoDB
        const dynamoIndices = await getHistoricalIndicesFromDynamoDB(
          userId,
          localIndex.date,
          localIndex.date
        );
        
        const dynamoIndex = dynamoIndices.length > 0 ? dynamoIndices[0] : null;

        // Last-write-wins conflict resolution
        if (dynamoIndex) {
          const localTime = new Date(localIndex.createdAt).getTime();
          const dynamoTime = new Date(dynamoIndex.createdAt).getTime();
          
          if (dynamoTime > localTime) {
            // DynamoDB has newer data - skip sync but mark as synced
            logger.debug('DynamoDB has newer data, skipping sync', { 
              userId, 
              date: localIndex.date,
              localTime,
              dynamoTime
            });
            
            // Update local entry to match DynamoDB
            const indices = getLocalIndices();
            const index = indices.find(
              item => item.userId === userId && item.date === localIndex.date
            );
            if (index) {
              Object.assign(index, dynamoIndex, { syncStatus: 'synced' });
              setLocalIndices(indices);
            }
            
            result.syncedCount++;
            continue;
          }
        }

        // Sync to DynamoDB (local is newer or doesn't exist in DynamoDB)
        const cleanData = stripSyncMetadata(localIndex);
        await saveIndexToDynamoDB(cleanData);
        
        // Update sync status in localStorage
        const indices = getLocalIndices();
        const index = indices.find(
          item => item.userId === userId && item.date === localIndex.date
        );
        if (index) {
          index.syncStatus = 'synced';
          index.lastSyncAttempt = new Date().toISOString();
          setLocalIndices(indices);
        }
        
        result.syncedCount++;
        logger.debug('Index synced successfully', { userId, date: localIndex.date });
      } catch (error) {
        result.failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to sync ${localIndex.date}: ${errorMsg}`);
        
        logger.error('Failed to sync index', { 
          error, 
          userId, 
          date: localIndex.date 
        });
        
        // Update sync status to failed
        const indices = getLocalIndices();
        const index = indices.find(
          item => item.userId === userId && item.date === localIndex.date
        );
        if (index) {
          index.syncStatus = 'failed';
          index.lastSyncAttempt = new Date().toISOString();
          setLocalIndices(indices);
        }
      }
    }

    result.success = result.failedCount === 0;
    
    logger.info('Sync completed', { 
      userId, 
      syncedCount: result.syncedCount, 
      failedCount: result.failedCount 
    });

    return result;
  }
}

/**
 * Default singleton instance
 */
export const indexSyncManager = new IndexSyncManager();

/**
 * Pull historical indices from cloud and mirror them into localStorage so the
 * dashboard can keep working offline after the user has synced once.
 */
export async function pullIndicesFromCloud(
  userId: string,
  rangeDays: number = MAX_AGE_DAYS
): Promise<IndexData[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - rangeDays);

    const response = await fetch(
      `/api/indices/history?userId=${encodeURIComponent(userId)}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
    );
    const result = await response.json();

    if (!response.ok || !result.success || !Array.isArray(result.data)) {
      logger.warn('Failed to pull indices from cloud', { userId, error: result.error });
      return [];
    }

    mergeIndicesFromCloud(result.data as IndexData[]);
    return result.data as IndexData[];
  } catch (error) {
    logger.warn('Failed to pull indices from cloud', { error, userId });
    return [];
  }
}
