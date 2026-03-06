// Unit tests for duplicate detector

import { isDuplicate, generateHash } from '../duplicate-detector';
import { savePendingTransaction } from '../pending-transaction-store';
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

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock
  },
  writable: true
});

describe('Duplicate Detector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('generateHash', () => {
    it('should generate same hash for same transaction data', () => {
      const transaction = {
        date: '2024-01-15',
        amount: 100,
        type: 'expense' as const,
        vendor_name: 'Test Vendor',
        source: 'receipt' as const
      };

      const hash1 = generateHash(transaction);
      const hash2 = generateHash(transaction);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different transaction data', () => {
      const transaction1 = {
        date: '2024-01-15',
        amount: 100,
        type: 'expense' as const,
        vendor_name: 'Test Vendor',
        source: 'receipt' as const
      };

      const transaction2 = {
        date: '2024-01-15',
        amount: 200,
        type: 'expense' as const,
        vendor_name: 'Test Vendor',
        source: 'receipt' as const
      };

      const hash1 = generateHash(transaction1);
      const hash2 = generateHash(transaction2);

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize vendor name (case insensitive)', () => {
      const transaction1 = {
        date: '2024-01-15',
        amount: 100,
        type: 'expense' as const,
        vendor_name: 'Test Vendor',
        source: 'receipt' as const
      };

      const transaction2 = {
        date: '2024-01-15',
        amount: 100,
        type: 'expense' as const,
        vendor_name: 'test vendor',
        source: 'receipt' as const
      };

      const hash1 = generateHash(transaction1);
      const hash2 = generateHash(transaction2);

      expect(hash1).toBe(hash2);
    });

    it('should handle missing vendor name', () => {
      const transaction = {
        date: '2024-01-15',
        amount: 100,
        type: 'expense' as const,
        source: 'receipt' as const
      };

      const hash = generateHash(transaction);
      expect(hash).toMatch(/^txn_[a-f0-9]{16}$/);
    });
  });

  describe('isDuplicate - pending transactions', () => {
    it('should detect duplicate in pending transactions', () => {
      const transaction: InferredTransaction = {
        id: 'txn_123',
        date: '2024-01-15',
        amount: 100,
        type: 'expense',
        vendor_name: 'Test Vendor',
        source: 'receipt',
        created_at: new Date().toISOString()
      };

      savePendingTransaction(transaction);

      const isDupe = isDuplicate({
        date: '2024-01-15',
        amount: 100,
        type: 'expense',
        vendor_name: 'Test Vendor',
        source: 'receipt'
      });

      expect(isDupe).toBe(true);
    });

    it('should not detect duplicate for unique transaction', () => {
      const transaction: InferredTransaction = {
        id: 'txn_123',
        date: '2024-01-15',
        amount: 100,
        type: 'expense',
        vendor_name: 'Test Vendor',
        source: 'receipt',
        created_at: new Date().toISOString()
      };

      savePendingTransaction(transaction);

      const isDupe = isDuplicate({
        date: '2024-01-16',
        amount: 200,
        type: 'sale',
        vendor_name: 'Different Vendor',
        source: 'csv'
      });

      expect(isDupe).toBe(false);
    });
  });

  describe('isDuplicate - recent daily entries', () => {
    it('should detect duplicate in recent daily entries (last 30 days)', () => {
      // Setup daily entries with a transaction
      const today = new Date().toISOString().split('T')[0];
      const dailyEntries = [
        {
          date: today,
          totalSales: 0,
          totalExpense: 100,
          transactions: [
            {
              amount: 100,
              type: 'expense',
              vendor_name: 'Test Vendor',
              source: 'receipt'
            }
          ]
        }
      ];

      localStorage.setItem('daily_entries', JSON.stringify(dailyEntries));

      const isDupe = isDuplicate({
        date: today,
        amount: 100,
        type: 'expense',
        vendor_name: 'Test Vendor',
        source: 'receipt'
      });

      expect(isDupe).toBe(true);
    });

    it('should not detect duplicate for entries older than 30 days', () => {
      // Setup daily entries with old transaction
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldDateStr = oldDate.toISOString().split('T')[0];

      const dailyEntries = [
        {
          date: oldDateStr,
          totalSales: 0,
          totalExpense: 100,
          transactions: [
            {
              amount: 100,
              type: 'expense',
              vendor_name: 'Test Vendor',
              source: 'receipt'
            }
          ]
        }
      ];

      localStorage.setItem('daily_entries', JSON.stringify(dailyEntries));

      const isDupe = isDuplicate({
        date: oldDateStr,
        amount: 100,
        type: 'expense',
        vendor_name: 'Test Vendor',
        source: 'receipt'
      });

      expect(isDupe).toBe(false);
    });

    it('should return false when no daily entries exist', () => {
      const isDupe = isDuplicate({
        date: '2024-01-15',
        amount: 100,
        type: 'expense',
        vendor_name: 'Test Vendor',
        source: 'receipt'
      });

      expect(isDupe).toBe(false);
    });
  });

  describe('date range filtering', () => {
    it('should only check entries within last 30 days', () => {
      const today = new Date();
      const date25DaysAgo = new Date(today);
      date25DaysAgo.setDate(today.getDate() - 25);
      const date35DaysAgo = new Date(today);
      date35DaysAgo.setDate(today.getDate() - 35);

      const dailyEntries = [
        {
          date: date25DaysAgo.toISOString().split('T')[0],
          totalSales: 0,
          totalExpense: 100,
          transactions: [
            {
              amount: 100,
              type: 'expense',
              vendor_name: 'Recent Vendor',
              source: 'receipt'
            }
          ]
        },
        {
          date: date35DaysAgo.toISOString().split('T')[0],
          totalSales: 0,
          totalExpense: 100,
          transactions: [
            {
              amount: 100,
              type: 'expense',
              vendor_name: 'Old Vendor',
              source: 'receipt'
            }
          ]
        }
      ];

      localStorage.setItem('daily_entries', JSON.stringify(dailyEntries));

      // Should detect recent transaction
      const isDupeRecent = isDuplicate({
        date: date25DaysAgo.toISOString().split('T')[0],
        amount: 100,
        type: 'expense',
        vendor_name: 'Recent Vendor',
        source: 'receipt'
      });
      expect(isDupeRecent).toBe(true);

      // Should not detect old transaction
      const isDupeOld = isDuplicate({
        date: date35DaysAgo.toISOString().split('T')[0],
        amount: 100,
        type: 'expense',
        vendor_name: 'Old Vendor',
        source: 'receipt'
      });
      expect(isDupeOld).toBe(false);
    });
  });
});
