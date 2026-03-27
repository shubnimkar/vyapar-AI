// Custom hook to track pending transaction count
// Subscribes to localStorage changes and returns counts

import { useState, useEffect } from 'react';
import { getLocalPendingTransactions } from '../pending-transaction-store';
import { SessionManager } from '../session-manager';
import { isUserScopedKey } from '../user-scoped-storage';

interface PendingTransactionCount {
  total: number;      // Total pending transactions (including deferred)
  badge: number;      // Count for badge display (excluding deferred)
  deferred: number;   // Count of deferred transactions
}

/**
 * Custom hook to track pending transaction counts
 * Subscribes to localStorage changes and updates reactively
 * 
 * @returns {PendingTransactionCount} Object with total, badge, and deferred counts
 * 
 * Badge count excludes deferred transactions to show only actionable items
 * Total count includes all pending transactions
 */
export function usePendingTransactionCount(): PendingTransactionCount {
  const [counts, setCounts] = useState<PendingTransactionCount>({
    total: 0,
    badge: 0,
    deferred: 0
  });

  const updateCounts = () => {
    const transactions = getLocalPendingTransactions(SessionManager.getCurrentUser()?.userId);
    
    const total = transactions.length;
    const deferred = transactions.filter(t => t.deferred_at).length;
    const badge = total - deferred; // Exclude deferred from badge count

    setCounts({ total, badge, deferred });
  };

  useEffect(() => {
    // Initial count
    updateCounts();

    // Subscribe to localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (isUserScopedKey(e.key, 'pending_transactions') || e.key === null) {
        updateCounts();
      }
    };

    // Subscribe to custom event for same-window updates
    const handleCustomUpdate = () => {
      updateCounts();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pendingTransactionsUpdated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pendingTransactionsUpdated', handleCustomUpdate);
    };
  }, []);

  return counts;
}
