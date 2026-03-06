/**
 * @jest-environment jsdom
 */

// Unit tests for usePendingTransactionCount hook

import { renderHook, act, waitFor } from '@testing-library/react';
import { usePendingTransactionCount } from '../usePendingTransactionCount';
import { 
  savePendingTransaction, 
  updatePendingTransaction, 
  removePendingTransaction 
} from '../../pending-transaction-store';
import { InferredTransaction } from '../../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('usePendingTransactionCount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return zero counts initially when no transactions exist', () => {
    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(0);
    expect(result.current.badge).toBe(0);
    expect(result.current.deferred).toBe(0);
  });

  it('should return correct counts when transactions exist', () => {
    // Add some transactions
    const transaction1: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-15',
      type: 'expense',
      amount: 100,
      source: 'receipt',
      created_at: new Date().toISOString()
    };

    const transaction2: InferredTransaction = {
      id: 'txn_2',
      date: '2024-01-16',
      type: 'sale',
      amount: 200,
      source: 'csv',
      created_at: new Date().toISOString()
    };

    savePendingTransaction(transaction1);
    savePendingTransaction(transaction2);

    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(2);
    expect(result.current.badge).toBe(2);
    expect(result.current.deferred).toBe(0);
  });

  it('should exclude deferred transactions from badge count', () => {
    // Add transactions
    const transaction1: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-15',
      type: 'expense',
      amount: 100,
      source: 'receipt',
      created_at: new Date().toISOString()
    };

    const transaction2: InferredTransaction = {
      id: 'txn_2',
      date: '2024-01-16',
      type: 'sale',
      amount: 200,
      source: 'csv',
      created_at: new Date().toISOString()
    };

    savePendingTransaction(transaction1);
    savePendingTransaction(transaction2);

    // Defer one transaction
    updatePendingTransaction('txn_1', { deferred_at: new Date().toISOString() });

    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(2);
    expect(result.current.badge).toBe(1); // Only non-deferred
    expect(result.current.deferred).toBe(1);
  });

  it('should update counts when transaction is added', async () => {
    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(0);

    // Add transaction
    act(() => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: new Date().toISOString()
      };
      savePendingTransaction(transaction);
    });

    await waitFor(() => {
      expect(result.current.total).toBe(1);
      expect(result.current.badge).toBe(1);
    });
  });

  it('should update counts when transaction is removed', async () => {
    // Add transaction first
    const transaction: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-15',
      type: 'expense',
      amount: 100,
      source: 'receipt',
      created_at: new Date().toISOString()
    };
    savePendingTransaction(transaction);

    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(1);

    // Remove transaction
    act(() => {
      removePendingTransaction('txn_1');
    });

    await waitFor(() => {
      expect(result.current.total).toBe(0);
      expect(result.current.badge).toBe(0);
    });
  });

  it('should update counts when transaction is deferred', async () => {
    // Add transaction first
    const transaction: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-15',
      type: 'expense',
      amount: 100,
      source: 'receipt',
      created_at: new Date().toISOString()
    };
    savePendingTransaction(transaction);

    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.badge).toBe(1);
    expect(result.current.deferred).toBe(0);

    // Defer transaction
    act(() => {
      updatePendingTransaction('txn_1', { deferred_at: new Date().toISOString() });
    });

    await waitFor(() => {
      expect(result.current.total).toBe(1);
      expect(result.current.badge).toBe(0); // Excluded from badge
      expect(result.current.deferred).toBe(1);
    });
  });

  it('should handle multiple deferred transactions correctly', () => {
    // Add multiple transactions
    const transactions: InferredTransaction[] = [
      {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: new Date().toISOString()
      },
      {
        id: 'txn_2',
        date: '2024-01-16',
        type: 'sale',
        amount: 200,
        source: 'csv',
        created_at: new Date().toISOString()
      },
      {
        id: 'txn_3',
        date: '2024-01-17',
        type: 'expense',
        amount: 150,
        source: 'receipt',
        created_at: new Date().toISOString()
      }
    ];

    transactions.forEach(t => savePendingTransaction(t));

    // Defer two transactions
    updatePendingTransaction('txn_1', { deferred_at: new Date().toISOString() });
    updatePendingTransaction('txn_3', { deferred_at: new Date().toISOString() });

    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(3);
    expect(result.current.badge).toBe(1); // Only txn_2 is not deferred
    expect(result.current.deferred).toBe(2);
  });

  it('should respond to storage events from other windows', async () => {
    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(0);

    // Simulate storage event from another window
    act(() => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: new Date().toISOString()
      };
      
      // Manually update localStorage
      const store = {
        transactions: [transaction],
        last_updated: new Date().toISOString()
      };
      localStorage.setItem('pending_transactions', JSON.stringify(store));

      // Dispatch storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'pending_transactions',
        newValue: JSON.stringify(store)
      }));
    });

    await waitFor(() => {
      expect(result.current.total).toBe(1);
    });
  });

  it('should respond to custom pendingTransactionsUpdated event', async () => {
    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(0);

    // Add transaction and dispatch custom event
    act(() => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: new Date().toISOString()
      };
      savePendingTransaction(transaction);
    });

    await waitFor(() => {
      expect(result.current.total).toBe(1);
      expect(result.current.badge).toBe(1);
    });
  });

  it('should handle all transactions being deferred', () => {
    // Add transactions
    const transaction1: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-15',
      type: 'expense',
      amount: 100,
      source: 'receipt',
      created_at: new Date().toISOString()
    };

    const transaction2: InferredTransaction = {
      id: 'txn_2',
      date: '2024-01-16',
      type: 'sale',
      amount: 200,
      source: 'csv',
      created_at: new Date().toISOString()
    };

    savePendingTransaction(transaction1);
    savePendingTransaction(transaction2);

    // Defer all transactions
    updatePendingTransaction('txn_1', { deferred_at: new Date().toISOString() });
    updatePendingTransaction('txn_2', { deferred_at: new Date().toISOString() });

    const { result } = renderHook(() => usePendingTransactionCount());

    expect(result.current.total).toBe(2);
    expect(result.current.badge).toBe(0); // No actionable items
    expect(result.current.deferred).toBe(2);
  });
});
