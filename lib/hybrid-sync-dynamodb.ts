// Hybrid Sync Engine for DynamoDB
// Replaces MongoDB hybrid sync with DynamoDB for hackathon requirement
// Maintains offline-first approach with localStorage + DynamoDB cloud backup

import {
  ProfileService,
  DailyEntryService,
  CreditEntryService,
  type UserProfile,
  type DailyEntry,
  type CreditEntry,
} from './dynamodb-client';

// ============================================
// Sync Status Types
// ============================================

export interface SyncStatus {
  lastSync: string | null;
  pendingChanges: number;
  syncing: boolean;
  error: string | null;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// ============================================
// LocalStorage Keys
// ============================================

const STORAGE_KEYS = {
  PROFILE: 'vyapar_profile',
  DAILY_ENTRIES: 'vyapar_daily_entries',
  CREDITS: 'vyapar_credits',
  SYNC_STATUS: 'vyapar_sync_status',
  PENDING_SYNC: 'vyapar_pending_sync',
};

// ============================================
// Hybrid Sync Manager
// ============================================

export class HybridSyncManager {
  private static syncInProgress = false;

  /**
   * Get sync status
   */
  static getSyncStatus(): SyncStatus {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Hybrid Sync] Error reading sync status:', error);
    }

    return {
      lastSync: null,
      pendingChanges: 0,
      syncing: false,
      error: null,
    };
  }

  /**
   * Update sync status
   */
  static updateSyncStatus(status: Partial<SyncStatus>): void {
    try {
      const current = this.getSyncStatus();
      const updated = { ...current, ...status };
      localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify(updated));
    } catch (error) {
      console.error('[Hybrid Sync] Error updating sync status:', error);
    }
  }

  /**
   * Check if online
   */
  static isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Sync all data to DynamoDB
   */
  static async syncToCloud(userId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('[Hybrid Sync] Sync already in progress');
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Sync already in progress'],
      };
    }

    if (!this.isOnline()) {
      console.log('[Hybrid Sync] Offline - skipping sync');
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Device is offline'],
      };
    }

    this.syncInProgress = true;
    this.updateSyncStatus({ syncing: true, error: null });

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log('[Hybrid Sync] Starting sync to DynamoDB...');

      // Sync profile
      await this.syncProfile(userId, result);

      // Sync daily entries
      await this.syncDailyEntries(userId, result);

      // Sync credits
      await this.syncCredits(userId, result);

      // Update sync status
      this.updateSyncStatus({
        lastSync: new Date().toISOString(),
        pendingChanges: 0,
        syncing: false,
        error: null,
      });

      console.log('[Hybrid Sync] Sync completed:', result);
    } catch (error) {
      console.error('[Hybrid Sync] Sync error:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      this.updateSyncStatus({
        syncing: false,
        error: 'Sync failed',
      });
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync profile to DynamoDB
   */
  private static async syncProfile(userId: string, result: SyncResult): Promise<void> {
    try {
      const profileData = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!profileData) {
        console.log('[Hybrid Sync] No profile data to sync');
        return;
      }

      const profile: UserProfile = JSON.parse(profileData);
      await ProfileService.saveProfile({ ...profile, userId });
      result.synced++;
      console.log('[Hybrid Sync] Profile synced');
    } catch (error) {
      console.error('[Hybrid Sync] Profile sync error:', error);
      result.failed++;
      result.errors.push('Failed to sync profile');
    }
  }

  /**
   * Sync daily entries to DynamoDB
   */
  private static async syncDailyEntries(userId: string, result: SyncResult): Promise<void> {
    try {
      const entriesData = localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES);
      if (!entriesData) {
        console.log('[Hybrid Sync] No daily entries to sync');
        return;
      }

      const entries: DailyEntry[] = JSON.parse(entriesData);
      
      for (const entry of entries) {
        try {
          await DailyEntryService.saveEntry({ ...entry, userId });
          result.synced++;
        } catch (error) {
          console.error('[Hybrid Sync] Entry sync error:', error);
          result.failed++;
          result.errors.push(`Failed to sync entry ${entry.entryId}`);
        }
      }

      console.log('[Hybrid Sync] Daily entries synced:', entries.length);
    } catch (error) {
      console.error('[Hybrid Sync] Daily entries sync error:', error);
      result.failed++;
      result.errors.push('Failed to sync daily entries');
    }
  }

  /**
   * Sync credits to DynamoDB
   */
  private static async syncCredits(userId: string, result: SyncResult): Promise<void> {
    try {
      const creditsData = localStorage.getItem(STORAGE_KEYS.CREDITS);
      if (!creditsData) {
        console.log('[Hybrid Sync] No credits to sync');
        return;
      }

      const credits: CreditEntry[] = JSON.parse(creditsData);
      
      for (const credit of credits) {
        try {
          await CreditEntryService.saveEntry({ ...credit, userId });
          result.synced++;
        } catch (error) {
          console.error('[Hybrid Sync] Credit sync error:', error);
          result.failed++;
          result.errors.push(`Failed to sync credit ${credit.id}`);
        }
      }

      console.log('[Hybrid Sync] Credits synced:', credits.length);
    } catch (error) {
      console.error('[Hybrid Sync] Credits sync error:', error);
      result.failed++;
      result.errors.push('Failed to sync credits');
    }
  }

  /**
   * Pull data from DynamoDB to localStorage
   */
  static async pullFromCloud(userId: string): Promise<SyncResult> {
    if (!this.isOnline()) {
      console.log('[Hybrid Sync] Offline - skipping pull');
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Device is offline'],
      };
    }

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      console.log('[Hybrid Sync] Pulling data from DynamoDB...');

      // Pull profile
      const profile = await ProfileService.getProfile(userId);
      if (profile) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
        result.synced++;
      }

      // Pull daily entries
      const entries = await DailyEntryService.getEntries(userId);
      if (entries.length > 0) {
        localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(entries));
        result.synced += entries.length;
      }

      // Pull credits
      const credits = await CreditEntryService.getEntries(userId);
      if (credits.length > 0) {
        localStorage.setItem(STORAGE_KEYS.CREDITS, JSON.stringify(credits));
        result.synced += credits.length;
      }

      console.log('[Hybrid Sync] Pull completed:', result);
    } catch (error) {
      console.error('[Hybrid Sync] Pull error:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Auto-sync on interval (call this on app load)
   */
  static startAutoSync(userId: string, intervalMs: number = 5 * 60 * 1000): void {
    // Initial sync
    this.syncToCloud(userId);

    // Set up interval
    setInterval(() => {
      if (this.isOnline() && !this.syncInProgress) {
        this.syncToCloud(userId);
      }
    }, intervalMs);

    // Sync on online event
    window.addEventListener('online', () => {
      console.log('[Hybrid Sync] Device back online - syncing...');
      this.syncToCloud(userId);
    });
  }

  /**
   * Mark data as pending sync
   */
  static markPendingSync(): void {
    const status = this.getSyncStatus();
    this.updateSyncStatus({
      pendingChanges: status.pendingChanges + 1,
    });
  }

  /**
   * Clear all local data
   */
  static clearLocalData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.DAILY_ENTRIES);
      localStorage.removeItem(STORAGE_KEYS.CREDITS);
      localStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
      localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
      console.log('[Hybrid Sync] Local data cleared');
    } catch (error) {
      console.error('[Hybrid Sync] Error clearing local data:', error);
    }
  }
}

// ============================================
// Export
// ============================================

export default HybridSyncManager;
