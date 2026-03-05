// Reminder Tracker
// Tracks when WhatsApp reminders were sent to customers for overdue credits
// Follows offline-first architecture with DynamoDB sync

import type { CreditEntry } from './types';
import { getLocalEntry, saveLocalEntry } from './credit-sync';
import { logger } from './logger';

/**
 * Record that a reminder was sent for a credit entry
 * Updates localStorage immediately (optimistic update) and marks for DynamoDB sync
 * 
 * @param creditId - The ID of the credit entry
 * @param userId - The user ID (for sync purposes)
 * @returns Promise that resolves when update is complete
 */
export async function recordReminder(creditId: string, userId: string): Promise<void> {
  try {
    logger.info('Recording reminder', { creditId, userId });
    
    // Get the credit entry from localStorage
    const entry = getLocalEntry(creditId);
    if (!entry) {
      throw new Error(`Credit entry not found: ${creditId}`);
    }
    
    // Update with current timestamp
    const now = new Date().toISOString();
    const updated = {
      ...entry,
      lastReminderAt: now,
      updatedAt: now,
      syncStatus: 'pending' as const, // Mark for DynamoDB sync
      lastSyncAttempt: undefined, // Clear last sync attempt
    };
    
    // Save to localStorage immediately (optimistic update)
    saveLocalEntry(updated);
    
    logger.info('Reminder recorded successfully', { creditId, timestamp: now });
    
    // Note: Actual DynamoDB sync happens via background sync service
    // The 'pending' syncStatus ensures it will be synced on next sync cycle
  } catch (error) {
    logger.error('Failed to record reminder', { creditId, error });
    throw error;
  }
}

/**
 * Get the last reminder timestamp for a credit entry
 * 
 * @param creditId - The ID of the credit entry
 * @returns Date object if reminder exists, null otherwise
 */
export function getLastReminder(creditId: string): Date | null {
  try {
    const entry = getLocalEntry(creditId);
    if (!entry || !entry.lastReminderAt) {
      return null;
    }
    
    return new Date(entry.lastReminderAt);
  } catch (error) {
    logger.error('Failed to get last reminder', { creditId, error });
    return null;
  }
}

/**
 * Calculate days since last reminder was sent
 * Uses calendar days (midnight-to-midnight comparison)
 * 
 * @param lastReminderAt - ISO date string of when reminder was sent
 * @param currentDate - Current date to compare against
 * @returns Number of calendar days since reminder (minimum 0)
 */
export function calculateDaysSinceReminder(lastReminderAt: string, currentDate: Date): number {
  try {
    const reminderDate = new Date(lastReminderAt);
    const current = new Date(currentDate);
    
    // Check for invalid dates
    if (isNaN(reminderDate.getTime()) || isNaN(current.getTime())) {
      logger.error('Invalid date in calculation', { lastReminderAt, currentDate });
      return 0;
    }
    
    // Set time to midnight for date-only comparison
    reminderDate.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    const diffMs = current.getTime() - reminderDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch (error) {
    logger.error('Failed to calculate days since reminder', { lastReminderAt, error });
    return 0;
  }
}
