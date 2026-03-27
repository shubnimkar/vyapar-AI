// Transaction Store for Click-to-Add Transactions
// Manages pending inferred transactions in localStorage

import { InferredTransaction } from './types';
import { resolveUserScopedKey } from './user-scoped-storage';

const STORAGE_KEY = 'pending_transactions';
const MAX_PENDING_TRANSACTIONS = 100;

interface PendingTransactionStore {
  transactions: InferredTransaction[];
  last_updated: string;
}

/**
 * Get all pending transactions sorted by created_at descending (newest first)
 */
export function getLocalPendingTransactions(userId?: string): InferredTransaction[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(resolveUserScopedKey(STORAGE_KEY, userId));
    if (!stored) {
      return [];
    }

    const store: PendingTransactionStore = JSON.parse(stored);
    
    // Sort by created_at descending
    return store.transactions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error reading pending transactions:', error);
    return [];
  }
}

/**
 * Dispatch custom event to notify listeners of localStorage changes
 */
function notifyStorageUpdate() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('pendingTransactionsUpdated'));
  }
}

/**
 * Save a new pending transaction to localStorage
 * Enforces maximum 100 pending transactions limit
 */
export function savePendingTransaction(transaction: InferredTransaction, userId?: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const existing = getLocalPendingTransactions(userId);
    
    // Check limit
    if (existing.length >= MAX_PENDING_TRANSACTIONS) {
      console.warn(`Cannot add transaction: limit of ${MAX_PENDING_TRANSACTIONS} reached`);
      return false;
    }

    // Add new transaction
    existing.push(transaction);

    const store: PendingTransactionStore = {
      transactions: existing,
      last_updated: new Date().toISOString()
    };

    localStorage.setItem(resolveUserScopedKey(STORAGE_KEY, userId), JSON.stringify(store));
    notifyStorageUpdate();
    return true;
  } catch (error) {
    console.error('Error saving pending transaction:', error);
    return false;
  }
}

/**
 * Update a pending transaction (e.g., to set deferred_at)
 */
export function updatePendingTransaction(
  id: string, 
  updates: Partial<InferredTransaction>,
  userId?: string
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const transactions = getLocalPendingTransactions(userId);
    const index = transactions.findIndex(t => t.id === id);
    
    if (index === -1) {
      console.warn(`Transaction not found: ${id}`);
      return false;
    }

    // Apply updates
    transactions[index] = {
      ...transactions[index],
      ...updates
    };

    const store: PendingTransactionStore = {
      transactions,
      last_updated: new Date().toISOString()
    };

    localStorage.setItem(resolveUserScopedKey(STORAGE_KEY, userId), JSON.stringify(store));
    notifyStorageUpdate();
    return true;
  } catch (error) {
    console.error('Error updating pending transaction:', error);
    return false;
  }
}

/**
 * Remove a pending transaction from localStorage
 */
export function removePendingTransaction(id: string, userId?: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const transactions = getLocalPendingTransactions(userId);
    const filtered = transactions.filter(t => t.id !== id);
    
    if (filtered.length === transactions.length) {
      console.warn(`Transaction not found: ${id}`);
      return false;
    }

    const store: PendingTransactionStore = {
      transactions: filtered,
      last_updated: new Date().toISOString()
    };

    localStorage.setItem(resolveUserScopedKey(STORAGE_KEY, userId), JSON.stringify(store));
    notifyStorageUpdate();
    return true;
  } catch (error) {
    console.error('Error removing pending transaction:', error);
    return false;
  }
}
