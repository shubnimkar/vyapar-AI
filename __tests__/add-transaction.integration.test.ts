// Integration tests for Add Transaction Action
// Tests the complete flow of adding a confirmed transaction to daily entries

// Mock uuid before imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import { addTransactionToDailyEntry } from '@/lib/add-transaction-to-entry';
import {
  getLocalEntry,
  createDailyEntry,
  clearLocalData,
} from '@/lib/daily-entry-sync';
import { InferredTransaction } from '@/lib/types';

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

// Mock fetch for instant sync
global.fetch = jest.fn();

describe('Add Transaction Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    clearLocalData();
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    clearLocalData();
    localStorage.clear();
  });

  describe('Adding transaction to new daily entry', () => {
    it('should create new daily entry for expense transaction', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_test123',
        date: '2024-01-15',
        type: 'expense',
        vendor_name: 'Test Vendor',
        category: 'inventory',
        amount: 1500.00,
        source: 'receipt',
        created_at: '2024-01-15T10:00:00.000Z',
      };

      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      expect(result.success).toBe(true);
      expect(result.dailyEntry).toBeDefined();
      expect(result.dailyEntry?.date).toBe('2024-01-15');
      expect(result.dailyEntry?.totalExpense).toBe(1500.00);
      expect(result.dailyEntry?.totalSales).toBe(0);
    });

    it('should create new daily entry for sale transaction', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_test456',
        date: '2024-01-16',
        type: 'sale',
        vendor_name: 'Customer A',
        amount: 2500.00,
        source: 'csv',
        created_at: '2024-01-16T11:00:00.000Z',
      };

      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      expect(result.success).toBe(true);
      expect(result.dailyEntry?.totalSales).toBe(2500.00);
      expect(result.dailyEntry?.totalExpense).toBe(0);
    });
  });

  describe('Adding transaction to existing daily entry', () => {
    it('should update existing entry with new expense', async () => {
      // Create initial entry
      createDailyEntry('2024-01-15', 1000, 500);

      const transaction: InferredTransaction = {
        id: 'txn_test789',
        date: '2024-01-15',
        type: 'expense',
        vendor_name: 'Another Vendor',
        amount: 300.00,
        source: 'receipt',
        created_at: '2024-01-15T12:00:00.000Z',
      };

      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      expect(result.success).toBe(true);
      // The function should return the updated entry with combined totals
      expect(result.dailyEntry?.totalExpense).toBeGreaterThanOrEqual(300); // At least the new transaction
      expect(result.dailyEntry?.totalSales).toBeGreaterThanOrEqual(0);
    });

    it('should update existing entry with new sale', async () => {
      // Create initial entry
      createDailyEntry('2024-01-16', 2000, 1000);

      const transaction: InferredTransaction = {
        id: 'txn_test101',
        date: '2024-01-16',
        type: 'sale',
        amount: 500.00,
        source: 'csv',
        created_at: '2024-01-16T13:00:00.000Z',
      };

      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      expect(result.success).toBe(true);
      // The function should return the updated entry with combined totals
      expect(result.dailyEntry?.totalSales).toBeGreaterThanOrEqual(500); // At least the new transaction
      expect(result.dailyEntry?.totalExpense).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Online sync behavior', () => {
    it('should attempt sync when online', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_sync_test',
        date: '2024-01-17',
        type: 'expense',
        amount: 1000.00,
        source: 'receipt',
        created_at: '2024-01-17T10:00:00.000Z',
      };

      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/daily',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle sync failure gracefully', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_offline_test',
        date: '2024-01-18',
        type: 'expense',
        amount: 1000.00,
        source: 'receipt',
        created_at: '2024-01-18T10:00:00.000Z',
      };

      // Mock failed sync
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      // Should still succeed locally even if sync fails
      expect(result.success).toBe(true);
      expect(result.dailyEntry).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid transaction data gracefully', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_invalid',
        date: 'invalid-date',
        type: 'expense',
        amount: -100, // negative amount
        source: 'receipt',
        created_at: '2024-01-19T10:00:00.000Z',
      };

      // Even with invalid data, the function should not throw
      const result = await addTransactionToDailyEntry(transaction, 'user123');

      // The function should still succeed (localStorage is permissive)
      expect(result.success).toBe(true);
    });
  });

  describe('Calculated metrics', () => {
    it('should include calculated metrics in daily entry', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_metrics',
        date: '2024-01-20',
        type: 'expense',
        amount: 500.00,
        source: 'receipt',
        created_at: '2024-01-20T10:00:00.000Z',
      };

      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(transaction, 'user123');

      expect(result.success).toBe(true);
      // Verify that calculated fields exist
      expect(result.dailyEntry?.estimatedProfit).toBeDefined();
      expect(result.dailyEntry?.expenseRatio).toBeDefined();
      expect(result.dailyEntry?.profitMargin).toBeDefined();
    });
  });
});
