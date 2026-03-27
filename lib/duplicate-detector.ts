// Duplicate Detector for Click-to-Add Transactions
// Prevents showing the same transaction multiple times

import crypto from 'crypto';
import { InferredTransaction, TransactionSource, TransactionType } from './types';
import { getLocalPendingTransactions } from './pending-transaction-store';
import { getLocalEntries as getLocalDailyEntries, LocalDailyEntry } from './daily-entry-sync';
import { SessionManager } from './session-manager';

/**
 * Check if a transaction is a duplicate
 * Checks against:
 * 1. Pending transactions in localStorage
 * 2. Recent daily entries (last 30 days)
 */
export function isDuplicate(transaction: Omit<InferredTransaction, 'id' | 'created_at'>): boolean {
  const hash = generateHash(transaction);
  
  // Check against pending transactions
  if (checkPending(hash, transaction)) {
    return true;
  }
  
  // Check against recent daily entries
  if (checkRecentEntries(hash)) {
    return true;
  }
  
  return false;
}

/**
 * Generate deterministic hash for transaction
 */
export function generateHash(transaction: Omit<InferredTransaction, 'id' | 'created_at'>): string {
  const normalized = {
    date: transaction.date,
    amount: Math.round(transaction.amount * 100), // Convert to cents to avoid float issues
    type: transaction.type.toLowerCase(),
    vendor: (transaction.vendor_name || '').toLowerCase().trim(),
    source: transaction.source
  };
  
  const hashInput = JSON.stringify(normalized, Object.keys(normalized).sort());
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  
  return `txn_${hash.substring(0, 16)}`;
}

/**
 * Check if hash exists in pending transactions
 * Compares both by ID and by regenerating hash from transaction data
 */
function checkPending(hash: string, transaction: Omit<InferredTransaction, 'id' | 'created_at'>): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const pending = getLocalPendingTransactions(SessionManager.getCurrentUser()?.userId);
    
    // Check if any pending transaction matches by ID or by data hash
    return pending.some(t => {
      // Direct ID match
      if (t.id === hash) {
        return true;
      }
      
      // Generate hash from pending transaction data and compare
      const pendingHash = generateHash({
        date: t.date,
        amount: t.amount,
        type: t.type,
        vendor_name: t.vendor_name,
        source: t.source,
        category: t.category
      });
      
      return pendingHash === hash;
    });
  } catch (error) {
    console.error('Error checking pending transactions:', error);
    return false;
  }
}

/**
 * Check if hash exists in recent daily entries (last 30 days)
 */
function checkRecentEntries(hash: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const dailyEntries = getLocalDailyEntries(SessionManager.getCurrentUser()?.userId);
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Check if any transaction in recent entries matches the hash
    for (const entry of dailyEntries) {
      const transactions = (entry as LocalDailyEntry & {
        transactions?: Array<{
          amount: number;
          type: TransactionType;
          vendor_name?: string;
          source?: TransactionSource;
          category?: string;
        }>;
      }).transactions;

      // Skip entries older than 30 days
      if (entry.date < cutoffDate) {
        continue;
      }
      
      // Check if entry has transactions array
      if (transactions && Array.isArray(transactions)) {
        for (const txn of transactions) {
          // Generate hash for this transaction
          const txnHash = generateHash({
            date: entry.date,
            amount: txn.amount,
            type: txn.type,
            vendor_name: txn.vendor_name,
            source: txn.source || 'receipt',
            category: txn.category
          });
          
          if (txnHash === hash) {
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking recent entries:', error);
    return false;
  }
}
