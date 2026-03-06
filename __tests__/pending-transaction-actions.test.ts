// Unit tests for Later and Discard actions
// Tests the defer and discard functionality for pending transactions

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import {
  getLocalPendingTransactions,
  savePendingTransaction,
  updatePendingTransaction,
  removePendingTransaction,
} from '@/lib/pending-transaction-store';
import { InferredTransaction } from '@/lib/types';
import { logger } from '@/lib/logger';

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
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Later (Defer) Action Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Defer transaction', () => {
    it('should add deferred_at timestamp when deferring', () => {
      const transaction: InferredTransaction = {
        id: 'txn_defer_test',
        date: '2024-01-15',
        type: 'expense',
        amount: 1000,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z',
      };

      // Save transaction
      savePendingTransaction(transaction);

      // Defer it
      const deferredAt = new Date().toISOString();
      const success = updatePendingTransaction(transaction.id, {
        deferred_at: deferredAt,
      });

      expect(success).toBe(true);

      // Verify deferred_at was added
      const transactions = getLocalPendingTransactions();
      const deferred = transactions.find(t => t.id === transaction.id);
      expect(deferred?.deferred_at).toBeDefined();
    });

    it('should preserve transaction data when deferring', () => {
      const transaction: InferredTransaction = {
        id: 'txn_preserve_test',
        date: '2024-01-16',
        type: 'sale',
        vendor_name: 'Test Vendor',
        category: 'sales',
        amount: 2500,
        source: 'csv',
        created_at: '2024-01-16T11:00:00.000Z',
      };

      savePendingTransaction(transaction);

      // Defer it
      updatePendingTransaction(transaction.id, {
        deferred_at: new Date().toISOString(),
      });

      // Verify all data preserved
      const transactions = getLocalPendingTransactions();
      const deferred = transactions.find(t => t.id === transaction.id);
      expect(deferred?.date).toBe(transaction.date);
      expect(deferred?.type).toBe(transaction.type);
      expect(deferred?.vendor_name).toBe(transaction.vendor_name);
      expect(deferred?.category).toBe(transaction.category);
      expect(deferred?.amount).toBe(transaction.amount);
      expect(deferred?.source).toBe(transaction.source);
    });

    it('should persist deferred state across sessions', () => {
      const transaction: InferredTransaction = {
        id: 'txn_persist_test',
        date: '2024-01-17',
        type: 'expense',
        amount: 500,
        source: 'receipt',
        created_at: '2024-01-17T12:00:00.000Z',
      };

      savePendingTransaction(transaction);
      updatePendingTransaction(transaction.id, {
        deferred_at: new Date().toISOString(),
      });

      // Simulate page reload by getting fresh data
      const transactions = getLocalPendingTransactions();
      const deferred = transactions.find(t => t.id === transaction.id);
      expect(deferred?.deferred_at).toBeDefined();
    });
  });
});

describe('Discard Action Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Discard transaction', () => {
    it('should permanently remove transaction from store', () => {
      const transaction: InferredTransaction = {
        id: 'txn_discard_test',
        date: '2024-01-18',
        type: 'expense',
        amount: 750,
        source: 'receipt',
        created_at: '2024-01-18T13:00:00.000Z',
      };

      // Save transaction
      savePendingTransaction(transaction);
      expect(getLocalPendingTransactions()).toHaveLength(1);

      // Discard it
      const success = removePendingTransaction(transaction.id);
      expect(success).toBe(true);

      // Verify it's gone
      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(0);
      expect(transactions.find(t => t.id === transaction.id)).toBeUndefined();
    });

    it('should not affect other pending transactions', () => {
      const transaction1: InferredTransaction = {
        id: 'txn_keep_1',
        date: '2024-01-19',
        type: 'expense',
        amount: 1000,
        source: 'receipt',
        created_at: '2024-01-19T10:00:00.000Z',
      };

      const transaction2: InferredTransaction = {
        id: 'txn_discard_2',
        date: '2024-01-19',
        type: 'sale',
        amount: 2000,
        source: 'csv',
        created_at: '2024-01-19T11:00:00.000Z',
      };

      const transaction3: InferredTransaction = {
        id: 'txn_keep_3',
        date: '2024-01-19',
        type: 'expense',
        amount: 500,
        source: 'receipt',
        created_at: '2024-01-19T12:00:00.000Z',
      };

      // Save all transactions
      savePendingTransaction(transaction1);
      savePendingTransaction(transaction2);
      savePendingTransaction(transaction3);
      expect(getLocalPendingTransactions()).toHaveLength(3);

      // Discard middle one
      removePendingTransaction(transaction2.id);

      // Verify only the discarded one is gone
      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(2);
      expect(transactions.find(t => t.id === transaction1.id)).toBeDefined();
      expect(transactions.find(t => t.id === transaction2.id)).toBeUndefined();
      expect(transactions.find(t => t.id === transaction3.id)).toBeDefined();
    });

    it('should return false when discarding non-existent transaction', () => {
      const success = removePendingTransaction('non_existent_id');
      expect(success).toBe(false);
    });

    it('should handle discarding from empty store', () => {
      expect(getLocalPendingTransactions()).toHaveLength(0);
      const success = removePendingTransaction('any_id');
      expect(success).toBe(false);
    });
  });
});

describe('Queue management after actions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should return next transaction after defer', () => {
    const transaction1: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-20',
      type: 'expense',
      amount: 1000,
      source: 'receipt',
      created_at: '2024-01-20T10:00:00.000Z',
    };

    const transaction2: InferredTransaction = {
      id: 'txn_2',
      date: '2024-01-20',
      type: 'sale',
      amount: 2000,
      source: 'csv',
      created_at: '2024-01-20T11:00:00.000Z',
    };

    savePendingTransaction(transaction1);
    savePendingTransaction(transaction2);

    // Defer first transaction
    updatePendingTransaction(transaction1.id, {
      deferred_at: new Date().toISOString(),
    });

    // Get all transactions
    const transactions = getLocalPendingTransactions();
    expect(transactions).toHaveLength(2);

    // Both should still be in the list
    expect(transactions.find(t => t.id === transaction1.id)).toBeDefined();
    expect(transactions.find(t => t.id === transaction2.id)).toBeDefined();
  });

  it('should return next transaction after discard', () => {
    const transaction1: InferredTransaction = {
      id: 'txn_1',
      date: '2024-01-21',
      type: 'expense',
      amount: 1000,
      source: 'receipt',
      created_at: '2024-01-21T10:00:00.000Z',
    };

    const transaction2: InferredTransaction = {
      id: 'txn_2',
      date: '2024-01-21',
      type: 'sale',
      amount: 2000,
      source: 'csv',
      created_at: '2024-01-21T11:00:00.000Z',
    };

    savePendingTransaction(transaction1);
    savePendingTransaction(transaction2);

    // Discard first transaction
    removePendingTransaction(transaction1.id);

    // Get remaining transactions
    const transactions = getLocalPendingTransactions();
    expect(transactions).toHaveLength(1);
    expect(transactions[0].id).toBe(transaction2.id);
  });
});
