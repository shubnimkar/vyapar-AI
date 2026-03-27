// Add Transaction to Daily Entry
// Handles adding confirmed inferred transactions to daily entries

import { InferredTransaction } from './types';
import {
  getLocalEntry,
  createDailyEntry,
  updateDailyEntry,
  instantSyncEntry,
  LocalDailyEntry,
} from './daily-entry-sync';
import { logger } from './logger';

export interface AddTransactionResult {
  success: boolean;
  dailyEntry?: LocalDailyEntry;
  error?: string;
}

/**
 * Add a confirmed transaction to the appropriate daily entry
 * Creates a new entry if one doesn't exist for the date
 * Updates existing entry if one exists
 * Attempts instant sync to DynamoDB when online
 */
export async function addTransactionToDailyEntry(
  transaction: InferredTransaction,
  userId: string
): Promise<AddTransactionResult> {
  try {
    logger.info('Adding transaction to daily entry', {
      transactionId: transaction.id,
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
    });

    // Get existing entry for this date
    let existingEntry = getLocalEntry(transaction.date, userId);

    let updatedEntry: LocalDailyEntry;

    if (existingEntry) {
      // Update existing entry
      const updates = calculateUpdates(existingEntry, transaction);
      const result = updateDailyEntry(transaction.date, updates, false, userId);

      if (!result) {
        throw new Error('Failed to update daily entry');
      }

      updatedEntry = result;
      logger.info('Updated existing daily entry', { date: transaction.date });
    } else {
      // Create new entry
      const { totalSales, totalExpense } = calculateTotals(transaction);
      updatedEntry = createDailyEntry(
        transaction.date,
        totalSales,
        totalExpense,
        undefined, // cashInHand
        undefined, // notes
        false, // markAsSynced
        userId
      );
      logger.info('Created new daily entry', { date: transaction.date });
    }

    // Reload the entry to ensure we have the latest version
    const finalEntry = getLocalEntry(transaction.date, userId);
    if (!finalEntry) {
      throw new Error('Failed to retrieve saved entry');
    }

    // Attempt instant sync to DynamoDB
    const syncSuccess = await instantSyncEntry(userId, finalEntry);

    if (syncSuccess) {
      logger.info('Transaction synced to DynamoDB', { transactionId: transaction.id });
    } else {
      logger.warn('Transaction queued for sync', { transactionId: transaction.id });
    }

    // Reload again after sync to get updated sync status
    const syncedEntry = getLocalEntry(transaction.date, userId);

    return {
      success: true,
      dailyEntry: syncedEntry || finalEntry,
    };
  } catch (error) {
    logger.error('Failed to add transaction to daily entry', {
      error,
      transactionId: transaction.id,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate totals for a new entry with a single transaction
 */
function calculateTotals(transaction: InferredTransaction): {
  totalSales: number;
  totalExpense: number;
} {
  if (transaction.type === 'sale') {
    return {
      totalSales: transaction.amount,
      totalExpense: 0,
    };
  } else {
    return {
      totalSales: 0,
      totalExpense: transaction.amount,
    };
  }
}

/**
 * Calculate updates for an existing entry when adding a transaction
 */
function calculateUpdates(
  existingEntry: LocalDailyEntry,
  transaction: InferredTransaction
): {
  totalSales: number;
  totalExpense: number;
} {
  let totalSales = existingEntry.totalSales;
  let totalExpense = existingEntry.totalExpense;

  if (transaction.type === 'sale') {
    totalSales += transaction.amount;
  } else {
    totalExpense += transaction.amount;
  }

  return {
    totalSales,
    totalExpense,
  };
}
