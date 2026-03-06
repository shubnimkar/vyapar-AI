// Unit tests for pending transaction store

import {
  getLocalPendingTransactions,
  savePendingTransaction,
  updatePendingTransaction,
  removePendingTransaction
} from '../pending-transaction-store';
import { InferredTransaction } from '../types';

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

// Define localStorage globally before importing the module
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true
});

describe('Pending Transaction Store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getLocalPendingTransactions', () => {
    it('should return empty array when no transactions exist', () => {
      const transactions = getLocalPendingTransactions();
      expect(transactions).toEqual([]);
    });

    it('should return transactions sorted by created_at descending', () => {
      const transaction1: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      const transaction2: InferredTransaction = {
        id: 'txn_2',
        date: '2024-01-16',
        type: 'expense',
        amount: 200,
        source: 'csv',
        created_at: '2024-01-16T10:00:00.000Z'
      };

      savePendingTransaction(transaction1);
      savePendingTransaction(transaction2);

      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(2);
      expect(transactions[0].id).toBe('txn_2'); // Newest first
      expect(transactions[1].id).toBe('txn_1');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('pending_transactions', 'invalid json');
      const transactions = getLocalPendingTransactions();
      expect(transactions).toEqual([]);
    });
  });

  describe('savePendingTransaction', () => {
    it('should save a new transaction to localStorage', () => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      const result = savePendingTransaction(transaction);
      expect(result).toBe(true);

      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(1);
      expect(transactions[0]).toEqual(transaction);
    });

    it('should enforce maximum 100 transactions limit', () => {
      // Add 100 transactions
      for (let i = 0; i < 100; i++) {
        const transaction: InferredTransaction = {
          id: `txn_${i}`,
          date: '2024-01-15',
          type: 'expense',
          amount: 100,
          source: 'receipt',
          created_at: new Date().toISOString()
        };
        savePendingTransaction(transaction);
      }

      // Try to add 101st transaction
      const transaction101: InferredTransaction = {
        id: 'txn_101',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: new Date().toISOString()
      };

      const result = savePendingTransaction(transaction101);
      expect(result).toBe(false);

      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(100);
    });

    it('should persist transactions across multiple operations', () => {
      const transaction1: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      const transaction2: InferredTransaction = {
        id: 'txn_2',
        date: '2024-01-16',
        type: 'sale',
        amount: 200,
        source: 'csv',
        created_at: '2024-01-16T10:00:00.000Z'
      };

      savePendingTransaction(transaction1);
      savePendingTransaction(transaction2);

      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(2);
    });
  });

  describe('updatePendingTransaction', () => {
    it('should update transaction with deferred_at timestamp', () => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      savePendingTransaction(transaction);

      const deferredAt = '2024-01-15T11:00:00.000Z';
      const result = updatePendingTransaction('txn_1', { deferred_at: deferredAt });
      expect(result).toBe(true);

      const transactions = getLocalPendingTransactions();
      expect(transactions[0].deferred_at).toBe(deferredAt);
    });

    it('should return false for non-existent transaction', () => {
      const result = updatePendingTransaction('non_existent', { deferred_at: new Date().toISOString() });
      expect(result).toBe(false);
    });

    it('should allow updating multiple fields', () => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      savePendingTransaction(transaction);

      const result = updatePendingTransaction('txn_1', {
        amount: 150,
        vendor_name: 'Updated Vendor'
      });
      expect(result).toBe(true);

      const transactions = getLocalPendingTransactions();
      expect(transactions[0].amount).toBe(150);
      expect(transactions[0].vendor_name).toBe('Updated Vendor');
    });
  });

  describe('removePendingTransaction', () => {
    it('should remove transaction from localStorage', () => {
      const transaction: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      savePendingTransaction(transaction);
      expect(getLocalPendingTransactions()).toHaveLength(1);

      const result = removePendingTransaction('txn_1');
      expect(result).toBe(true);
      expect(getLocalPendingTransactions()).toHaveLength(0);
    });

    it('should return false for non-existent transaction', () => {
      const result = removePendingTransaction('non_existent');
      expect(result).toBe(false);
    });

    it('should only remove specified transaction', () => {
      const transaction1: InferredTransaction = {
        id: 'txn_1',
        date: '2024-01-15',
        type: 'expense',
        amount: 100,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z'
      };

      const transaction2: InferredTransaction = {
        id: 'txn_2',
        date: '2024-01-16',
        type: 'expense',
        amount: 200,
        source: 'csv',
        created_at: '2024-01-16T10:00:00.000Z'
      };

      savePendingTransaction(transaction1);
      savePendingTransaction(transaction2);

      removePendingTransaction('txn_1');

      const transactions = getLocalPendingTransactions();
      expect(transactions).toHaveLength(1);
      expect(transactions[0].id).toBe('txn_2');
    });
  });
});
