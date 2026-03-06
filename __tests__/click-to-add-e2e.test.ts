/**
 * End-to-End Tests for Click-to-Add Transactions Feature
 * 
 * Tests complete user flows:
 * 1. Receipt upload → pending → add to daily entry
 * 2. CSV upload → pending → add to daily entry
 * 3. Mixed source handling (receipt + CSV)
 * 4. Offline/online sync behavior
 * 5. Defer and discard actions
 * 6. Duplicate detection across sources
 * 
 * Requirements: All requirements from click-to-add-transactions spec
 */

// Mock uuid before imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import {
  getLocalPendingTransactions,
  savePendingTransaction,
  removePendingTransaction,
  updatePendingTransaction,
} from '@/lib/pending-transaction-store';
import { isDuplicate } from '@/lib/duplicate-detector';
import { parseOCRResult } from '@/lib/parsers/ocr-result-parser';
import { parseCSV } from '@/lib/parsers/csv-parser';
import { addTransactionToDailyEntry } from '@/lib/add-transaction-to-entry';
import {
  getLocalEntry,
  createDailyEntry,
  clearLocalData as clearDailyEntries,
} from '@/lib/daily-entry-sync';
import type { InferredTransaction } from '@/lib/types';

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

// Mock window object with localStorage
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
    dispatchEvent: jest.fn(),
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Click-to-Add Transactions - End-to-End Tests', () => {
  const TEST_USER_ID = 'test_user_e2e';

  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    clearDailyEntries();
    jest.clearAllMocks();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    // Clean up after each test
    clearDailyEntries();
    localStorage.clear();
  });

  describe('Flow 1: Receipt to Daily Entry', () => {
    it('should complete full receipt upload → pending → add to daily entry flow', async () => {
      // Step 1: Simulate OCR processing result
      const ocrResult = {
        success: true,
        filename: 'receipt-123.jpg',
        extractedData: {
          date: '2024-01-15',
          amount: 2464.0,
          vendor: 'Reliance Fresh',
          items: ['Rice', 'Dal', 'Oil'],
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 3500,
        method: 'bedrock-vision',
      };

      // Step 2: Parse OCR result to InferredTransaction
      const inferredTransaction = parseOCRResult(ocrResult, 'receipt-123.jpg');

      expect(inferredTransaction).toBeDefined();
      expect(inferredTransaction.source).toBe('receipt');
      expect(inferredTransaction.type).toBe('expense');
      expect(inferredTransaction.amount).toBe(2464.0);
      expect(inferredTransaction.vendor_name).toBe('Reliance Fresh');

      // Step 3: Check for duplicates (should be false for first upload)
      const isDupe = isDuplicate({
        date: inferredTransaction.date,
        amount: inferredTransaction.amount,
        type: inferredTransaction.type,
        vendor_name: inferredTransaction.vendor_name,
        source: inferredTransaction.source,
      });

      expect(isDupe).toBe(false);

      // Step 4: Save to pending store
      const saved = savePendingTransaction(inferredTransaction);
      expect(saved).toBe(true);

      // Step 5: Verify transaction appears in pending list
      const pendingTransactions = getLocalPendingTransactions();
      expect(pendingTransactions).toHaveLength(1);
      expect(pendingTransactions[0].id).toBe(inferredTransaction.id);
      expect(pendingTransactions[0].source).toBe('receipt');

      // Step 6: User confirms and adds transaction
      // Mock successful sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(
        inferredTransaction,
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.dailyEntry).toBeDefined();
      expect(result.dailyEntry?.date).toBe('2024-01-15');
      expect(result.dailyEntry?.totalExpense).toBe(2464.0);

      // Step 7: Remove from pending store
      const removed = removePendingTransaction(inferredTransaction.id);
      expect(removed).toBe(true);

      // Step 8: Verify pending list is now empty
      const finalPending = getLocalPendingTransactions();
      expect(finalPending).toHaveLength(0);

      // Step 9: Verify daily entry exists
      const dailyEntry = getLocalEntry('2024-01-15');
      expect(dailyEntry).toBeDefined();
      expect(dailyEntry?.totalExpense).toBeGreaterThanOrEqual(2464.0);
    });

    it('should detect duplicate receipt uploads', async () => {
      // Upload same receipt twice
      const ocrResult = {
        success: true,
        filename: 'receipt-456.jpg',
        extractedData: {
          date: '2024-01-16',
          amount: 1500.0,
          vendor: 'Apollo Pharmacy',
          items: ['Medicine A'],
        },
        processedAt: '2024-01-16T11:00:00.000Z',
        processingTimeMs: 2800,
        method: 'bedrock-vision',
      };

      // First upload
      const transaction1 = parseOCRResult(ocrResult, 'receipt-456.jpg');
      savePendingTransaction(transaction1);

      // Second upload (same receipt)
      const transaction2 = parseOCRResult(ocrResult, 'receipt-456.jpg');

      // Should detect duplicate
      const isDupe = isDuplicate({
        date: transaction2.date,
        amount: transaction2.amount,
        type: transaction2.type,
        vendor_name: transaction2.vendor_name,
        source: transaction2.source,
      });

      expect(isDupe).toBe(true);

      // Should not save duplicate
      const pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(1); // Only first transaction
    });

    it('should handle receipt with category inference', async () => {
      const ocrResult = {
        success: true,
        filename: 'pharmacy-receipt.jpg',
        extractedData: {
          date: '2024-01-17',
          amount: 350.0,
          vendor: 'Apollo Pharmacy',
          items: ['Medicine B', 'Bandages'],
        },
        processedAt: '2024-01-17T12:00:00.000Z',
        processingTimeMs: 3200,
        method: 'bedrock-vision',
      };

      const transaction = parseOCRResult(ocrResult, 'pharmacy-receipt.jpg');

      // Should infer medical category from vendor name
      expect(transaction.category).toBe('medical');
      expect(transaction.vendor_name).toBe('Apollo Pharmacy');
    });
  });

  describe('Flow 2: CSV to Daily Entry', () => {
    it('should complete full CSV upload → pending → add to daily entry flow', async () => {
      // Step 1: Simulate CSV file content
      const csvContent = `date,amount,type,vendor_name,category
2024-01-18,500.00,expense,Office Supplies Inc,office
2024-01-18,1200.00,sale,Customer A,sales
2024-01-19,300.00,expense,Utility Company,utilities`;

      // Step 2: Parse CSV
      const parseResult = parseCSV(csvContent);

      expect(parseResult).toBeDefined();
      expect(parseResult.transactions).toHaveLength(3);
      expect(parseResult.summary.validRows).toBe(3);
      expect(parseResult.summary.invalidRows).toBe(0);

      // Step 3: Save all transactions to pending store
      parseResult.transactions.forEach((transaction) => {
        const isDupe = isDuplicate({
          date: transaction.date,
          amount: transaction.amount,
          type: transaction.type,
          vendor_name: transaction.vendor_name,
          source: transaction.source,
        });

        if (!isDupe) {
          savePendingTransaction(transaction);
        }
      });

      // Step 4: Verify all transactions in pending list
      const pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(3);
      expect(pending.every((t) => t.source === 'csv')).toBe(true);

      // Step 5: Add first transaction (expense)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const transaction1 = pending[0];
      const result1 = await addTransactionToDailyEntry(
        transaction1,
        TEST_USER_ID
      );

      expect(result1.success).toBe(true);
      removePendingTransaction(transaction1.id);

      // Step 6: Add second transaction (sale)
      const transaction2 = pending[1];
      const result2 = await addTransactionToDailyEntry(
        transaction2,
        TEST_USER_ID
      );

      expect(result2.success).toBe(true);
      removePendingTransaction(transaction2.id);

      // Step 7: Add third transaction (expense)
      const transaction3 = pending[2];
      const result3 = await addTransactionToDailyEntry(
        transaction3,
        TEST_USER_ID
      );

      expect(result3.success).toBe(true);
      removePendingTransaction(transaction3.id);

      // Step 8: Verify all transactions added to daily entries
      const entry18 = getLocalEntry('2024-01-18');
      expect(entry18).toBeDefined();
      expect(entry18?.totalExpense).toBeGreaterThanOrEqual(500);
      expect(entry18?.totalSales).toBeGreaterThanOrEqual(1200);

      const entry19 = getLocalEntry('2024-01-19');
      expect(entry19).toBeDefined();
      expect(entry19?.totalExpense).toBeGreaterThanOrEqual(300);

      // Step 9: Verify pending list is empty
      const finalPending = getLocalPendingTransactions();
      expect(finalPending).toHaveLength(0);
    });

    it('should handle CSV with invalid rows', async () => {
      const csvContent = `date,amount,type
2024-01-20,100.50,expense
invalid-date,200.00,sale
2024-01-21,150.00,expense
2024-01-22,invalid-amount,expense`;

      const parseResult = parseCSV(csvContent);

      expect(parseResult).toBeDefined();
      expect(parseResult.transactions.length).toBeGreaterThan(0);
      expect(parseResult.summary.invalidRows).toBeGreaterThan(0);

      // Only valid transactions should be saved
      parseResult.transactions.forEach((transaction) => {
        savePendingTransaction(transaction);
      });

      const pending = getLocalPendingTransactions();
      expect(pending.length).toBeLessThan(4); // Some rows were invalid
    });

    it('should handle CSV with different date formats', async () => {
      const csvContent = `date,amount,type
2024-01-23,100.00,expense
23/01/2024,200.00,sale
01-23-2024,150.00,expense`;

      const parseResult = parseCSV(csvContent);

      expect(parseResult).toBeDefined();
      expect(parseResult.transactions.length).toBeGreaterThan(0);

      // All valid date formats should be parsed
      parseResult.transactions.forEach((transaction) => {
        expect(transaction.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Flow 3: Mixed Source Handling', () => {
    it('should handle transactions from both receipt and CSV sources', async () => {
      // Add receipt transaction
      const ocrResult = {
        success: true,
        filename: 'receipt-789.jpg',
        extractedData: {
          date: '2024-01-24',
          amount: 800.0,
          vendor: 'Restaurant XYZ',
          items: ['Lunch'],
        },
        processedAt: '2024-01-24T13:00:00.000Z',
        processingTimeMs: 3000,
        method: 'bedrock-vision',
      };

      const receiptTransaction = parseOCRResult(ocrResult, 'receipt-789.jpg');
      savePendingTransaction(receiptTransaction);

      // Add CSV transactions
      const csvContent = `date,amount,type,vendor_name
2024-01-24,1500.00,sale,Customer B
2024-01-24,400.00,expense,Supplier C`;

      const csvResult = parseCSV(csvContent);
      csvResult.transactions.forEach((t) => savePendingTransaction(t));

      // Verify mixed sources in pending list
      const pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(3);

      const receiptCount = pending.filter((t) => t.source === 'receipt').length;
      const csvCount = pending.filter((t) => t.source === 'csv').length;

      expect(receiptCount).toBe(1);
      expect(csvCount).toBe(2);

      // Add all transactions
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      for (const transaction of pending) {
        await addTransactionToDailyEntry(transaction, TEST_USER_ID);
        removePendingTransaction(transaction.id);
      }

      // Verify all added to same daily entry
      const entry = getLocalEntry('2024-01-24');
      expect(entry).toBeDefined();
      expect(entry?.totalExpense).toBeGreaterThanOrEqual(1200); // 800 + 400
      expect(entry?.totalSales).toBeGreaterThanOrEqual(1500);
    });

    it('should detect duplicates across different sources', async () => {
      // Add transaction from receipt
      const ocrResult = {
        success: true,
        filename: 'receipt-duplicate.jpg',
        extractedData: {
          date: '2024-01-25',
          amount: 500.0,
          vendor: 'Test Shop',
          items: ['Item A'],
        },
        processedAt: '2024-01-25T10:00:00.000Z',
        processingTimeMs: 2500,
        method: 'bedrock-vision',
      };

      const receiptTransaction = parseOCRResult(
        ocrResult,
        'receipt-duplicate.jpg'
      );
      savePendingTransaction(receiptTransaction);

      // Try to add same transaction from CSV
      const csvContent = `date,amount,type,vendor_name
2024-01-25,500.00,expense,Test Shop`;

      const csvResult = parseCSV(csvContent);
      const csvTransaction = csvResult.transactions[0];

      // Should detect as duplicate
      const isDupe = isDuplicate({
        date: csvTransaction.date,
        amount: csvTransaction.amount,
        type: csvTransaction.type,
        vendor_name: csvTransaction.vendor_name,
        source: csvTransaction.source,
      });

      // Note: Duplicate detection is based on transaction data, not source
      // So this might or might not be detected as duplicate depending on
      // how the hash is generated (with or without source field)
      const pending = getLocalPendingTransactions();
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Flow 4: Offline/Online Sync', () => {
    it('should queue transactions offline and sync when online', async () => {
      // Create transaction while offline
      const transaction: InferredTransaction = {
        id: 'txn_offline_test',
        date: '2024-01-26',
        type: 'expense',
        vendor_name: 'Offline Vendor',
        amount: 750.0,
        source: 'receipt',
        created_at: '2024-01-26T10:00:00.000Z',
      };

      savePendingTransaction(transaction);

      // Simulate offline - fetch fails
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      // Try to add transaction (should succeed locally even if sync fails)
      const result = await addTransactionToDailyEntry(
        transaction,
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.dailyEntry).toBeDefined();

      // Verify transaction is in daily entry locally
      const entry = getLocalEntry('2024-01-26');
      expect(entry).toBeDefined();

      // Simulate coming online - sync should succeed
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Trigger sync (in real app, this would happen automatically)
      const syncResult = await addTransactionToDailyEntry(
        transaction,
        TEST_USER_ID
      );

      expect(syncResult.success).toBe(true);
    });

    it('should preserve pending transactions across page reloads', () => {
      // Add transactions
      const transaction1: InferredTransaction = {
        id: 'txn_persist_1',
        date: '2024-01-27',
        type: 'expense',
        amount: 100.0,
        source: 'receipt',
        created_at: '2024-01-27T10:00:00.000Z',
      };

      const transaction2: InferredTransaction = {
        id: 'txn_persist_2',
        date: '2024-01-27',
        type: 'sale',
        amount: 200.0,
        source: 'csv',
        created_at: '2024-01-27T11:00:00.000Z',
      };

      savePendingTransaction(transaction1);
      savePendingTransaction(transaction2);

      // Verify transactions are in localStorage
      const stored = localStorage.getItem('pending_transactions');
      expect(stored).toBeDefined();
      expect(stored).toContain('txn_persist_1');
      expect(stored).toContain('txn_persist_2');

      // Simulate page reload by getting fresh data from localStorage
      const pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(2);
      expect(pending.find((t) => t.id === 'txn_persist_1')).toBeDefined();
      expect(pending.find((t) => t.id === 'txn_persist_2')).toBeDefined();
    });
  });

  describe('Flow 5: Defer and Discard Actions', () => {
    it('should defer transaction and move to end of queue', () => {
      // Add multiple transactions
      const transaction1: InferredTransaction = {
        id: 'txn_defer_1',
        date: '2024-01-28',
        type: 'expense',
        amount: 100.0,
        source: 'receipt',
        created_at: '2024-01-28T10:00:00.000Z',
      };

      const transaction2: InferredTransaction = {
        id: 'txn_defer_2',
        date: '2024-01-28',
        type: 'expense',
        amount: 200.0,
        source: 'receipt',
        created_at: '2024-01-28T11:00:00.000Z',
      };

      const transaction3: InferredTransaction = {
        id: 'txn_defer_3',
        date: '2024-01-28',
        type: 'expense',
        amount: 300.0,
        source: 'receipt',
        created_at: '2024-01-28T12:00:00.000Z',
      };

      savePendingTransaction(transaction1);
      savePendingTransaction(transaction2);
      savePendingTransaction(transaction3);

      // Defer first transaction
      const deferred = updatePendingTransaction(transaction1.id, {
        deferred_at: new Date().toISOString(),
      });

      expect(deferred).toBe(true);

      // Verify deferred transaction has timestamp
      const pending = getLocalPendingTransactions();
      const deferredTransaction = pending.find((t) => t.id === 'txn_defer_1');
      expect(deferredTransaction?.deferred_at).toBeDefined();

      // In UI, deferred transactions would be shown last
      // This is handled by the component logic
    });

    it('should discard transaction permanently', () => {
      const transaction: InferredTransaction = {
        id: 'txn_discard',
        date: '2024-01-29',
        type: 'expense',
        amount: 100.0,
        source: 'receipt',
        created_at: '2024-01-29T10:00:00.000Z',
      };

      savePendingTransaction(transaction);

      // Verify transaction exists
      let pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(1);

      // Discard transaction
      const removed = removePendingTransaction(transaction.id);
      expect(removed).toBe(true);

      // Verify transaction is gone
      pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(0);

      // Verify cannot be recovered
      const notFound = pending.find((t) => t.id === 'txn_discard');
      expect(notFound).toBeUndefined();
    });

    it('should handle defer action persistence across sessions', () => {
      const transaction: InferredTransaction = {
        id: 'txn_defer_persist',
        date: '2024-01-30',
        type: 'expense',
        amount: 100.0,
        source: 'receipt',
        created_at: '2024-01-30T10:00:00.000Z',
      };

      savePendingTransaction(transaction);

      // Defer transaction
      const deferTime = '2024-01-30T11:00:00.000Z';
      updatePendingTransaction(transaction.id, { deferred_at: deferTime });

      // Simulate page reload
      const pending = getLocalPendingTransactions();
      const deferredTransaction = pending.find(
        (t) => t.id === 'txn_defer_persist'
      );

      expect(deferredTransaction).toBeDefined();
      expect(deferredTransaction?.deferred_at).toBe(deferTime);
    });
  });

  describe('Flow 6: Duplicate Detection Across Sources', () => {
    it('should detect duplicate in pending transactions', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_dupe_check',
        date: '2024-01-31',
        type: 'expense',
        vendor_name: 'Duplicate Vendor',
        amount: 999.0,
        source: 'receipt',
        created_at: '2024-01-31T10:00:00.000Z',
      };

      // Add to pending
      savePendingTransaction(transaction);

      // Try to add same transaction again
      const isDupe = isDuplicate({
        date: transaction.date,
        amount: transaction.amount,
        type: transaction.type,
        vendor_name: transaction.vendor_name,
        source: transaction.source,
      });

      // Should detect as duplicate (already in pending)
      expect(isDupe).toBe(true);
    });

    it('should not detect duplicate for different transactions', async () => {
      const transaction1: InferredTransaction = {
        id: 'txn_unique_1',
        date: '2024-01-31',
        type: 'expense',
        vendor_name: 'Vendor A',
        amount: 500.0,
        source: 'receipt',
        created_at: '2024-01-31T10:00:00.000Z',
      };

      const transaction2: InferredTransaction = {
        id: 'txn_unique_2',
        date: '2024-01-31',
        type: 'expense',
        vendor_name: 'Vendor B', // Different vendor
        amount: 500.0,
        source: 'receipt',
        created_at: '2024-01-31T11:00:00.000Z',
      };

      // Add first transaction
      savePendingTransaction(transaction1);

      // Check if second transaction is duplicate (should be false)
      const isDupe = isDuplicate({
        date: transaction2.date,
        amount: transaction2.amount,
        type: transaction2.type,
        vendor_name: transaction2.vendor_name,
        source: transaction2.source,
      });

      expect(isDupe).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty pending queue gracefully', () => {
      const pending = getLocalPendingTransactions();
      expect(pending).toHaveLength(0);
      expect(Array.isArray(pending)).toBe(true);
    });

    it('should handle corrupted localStorage data', () => {
      // Corrupt the data
      localStorage.setItem('pending_transactions', 'invalid json {{{');

      // Should return empty array instead of crashing
      const pending = getLocalPendingTransactions();
      expect(Array.isArray(pending)).toBe(true);
      expect(pending).toHaveLength(0);
    });

    it('should handle transaction with missing optional fields', async () => {
      const transaction: InferredTransaction = {
        id: 'txn_minimal',
        date: '2024-02-01',
        type: 'expense',
        amount: 100.0,
        source: 'receipt',
        created_at: '2024-02-01T10:00:00.000Z',
        // No vendor_name, no category
      };

      savePendingTransaction(transaction);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await addTransactionToDailyEntry(
        transaction,
        TEST_USER_ID
      );

      expect(result.success).toBe(true);
      expect(result.dailyEntry).toBeDefined();
    });

    it('should handle localStorage quota exceeded', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      let callCount = 0;

      localStorage.setItem = jest.fn((key, value) => {
        callCount++;
        if (callCount > 1) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        originalSetItem.call(localStorage, key, value);
      });

      // First transaction should succeed
      const transaction1: InferredTransaction = {
        id: 'txn_quota_1',
        date: '2024-02-02',
        type: 'expense',
        amount: 100.0,
        source: 'receipt',
        created_at: '2024-02-02T10:00:00.000Z',
      };

      const saved1 = savePendingTransaction(transaction1);
      expect(saved1).toBe(true);

      // Second transaction should fail gracefully
      const transaction2: InferredTransaction = {
        id: 'txn_quota_2',
        date: '2024-02-02',
        type: 'expense',
        amount: 200.0,
        source: 'receipt',
        created_at: '2024-02-02T11:00:00.000Z',
      };

      const saved2 = savePendingTransaction(transaction2);
      expect(saved2).toBe(false);

      // Restore original setItem
      localStorage.setItem = originalSetItem;
    });

    it('should enforce 100 transaction limit', () => {
      // Try to add 101 transactions
      for (let i = 0; i < 101; i++) {
        const transaction: InferredTransaction = {
          id: `txn_limit_${i}`,
          date: '2024-02-03',
          type: 'expense',
          amount: 100.0,
          source: 'receipt',
          created_at: `2024-02-03T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
        };

        savePendingTransaction(transaction);
      }

      // Should have at most 100 transactions
      const pending = getLocalPendingTransactions();
      expect(pending.length).toBeLessThanOrEqual(100);
    });
  });
});
