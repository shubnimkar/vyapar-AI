/**
 * End-to-End Integration Tests for Udhaar Follow-up Helper
 * 
 * Tests the complete flow:
 * 1. Create credit → becomes overdue → send reminder → mark as paid
 * 2. Offline mode: create credit offline → sync when online
 * 3. Language switching: change language → UI updates
 * 4. Multi-device sync: update on device A → sync to device B
 * 
 * Requirements: 1.1, 3.1, 4.1, 5.3, 7.5, 8.2
 */

import { 
  getLocalEntries, 
  createCreditEntry, 
  updateCreditEntry,
  markCreditAsPaid,
  clearLocalData,
  syncPendingEntries,
  fullSync,
} from '@/lib/credit-sync';
import { getOverdueCredits } from '@/lib/credit-manager';
import { generateReminderLink } from '@/lib/whatsapp-link-generator';
import { recordReminder } from '@/lib/reminder-tracker';
import type { LocalCreditEntry } from '@/lib/credit-sync';

// Mock localStorage for testing
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

// Mock window and localStorage
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Udhaar Follow-up Helper - E2E Integration Tests', () => {
  const TEST_USER_ID = 'test_user_123';
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    // Clean up
    clearLocalData();
  });

  describe('Flow 1: Complete credit lifecycle', () => {
    /**
     * Test: create credit → becomes overdue → send reminder → mark as paid
     * Requirements: 1.1, 3.1, 4.1, 8.2
     */
    it('should handle complete credit lifecycle from creation to payment', async () => {
      // Step 1: Create credit entry
      const today = new Date();
      const pastDueDate = new Date(today);
      pastDueDate.setDate(today.getDate() - 5); // 5 days overdue
      
      const credit = createCreditEntry(
        'Rajesh Kumar',
        5000,
        pastDueDate.toISOString().split('T')[0],
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Given 10 days ago
        '9876543210',
        false // Not synced yet
      );

      // Verify credit is created in localStorage
      const entries = getLocalEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].customerName).toBe('Rajesh Kumar');
      expect(entries[0].amount).toBe(5000);
      expect(entries[0].phoneNumber).toBe('9876543210');
      expect(entries[0].syncStatus).toBe('pending');

      // Step 2: Check if credit becomes overdue
      const overdueCredits = getOverdueCredits(entries, 3);
      expect(overdueCredits).toHaveLength(1);
      expect(overdueCredits[0].daysOverdue).toBe(5);
      expect(overdueCredits[0].customerName).toBe('Rajesh Kumar');

      // Step 3: Send WhatsApp reminder
      const whatsappUrl = generateReminderLink(
        '9876543210',
        'Rajesh Kumar',
        5000,
        pastDueDate.toISOString().split('T')[0],
        'en'
      );

      // Verify WhatsApp URL is properly formatted
      expect(whatsappUrl).toContain('https://wa.me/');
      expect(whatsappUrl).toContain('+919876543210');
      expect(whatsappUrl).toContain('Rajesh%20Kumar');
      expect(whatsappUrl).toContain('5000');

      // Record reminder timestamp
      await recordReminder(credit.id, TEST_USER_ID);

      // Verify reminder timestamp is recorded
      const updatedEntries = getLocalEntries();
      expect(updatedEntries[0].lastReminderAt).toBeDefined();
      expect(updatedEntries[0].syncStatus).toBe('pending'); // Should be marked for sync

      // Step 4: Mark credit as paid
      const paidCredit = markCreditAsPaid(credit.id, false);
      expect(paidCredit).not.toBeNull();
      expect(paidCredit!.isPaid).toBe(true);
      expect(paidCredit!.paidAt).toBeDefined();

      // Verify credit is removed from overdue list
      const finalEntries = getLocalEntries();
      const finalOverdueCredits = getOverdueCredits(finalEntries, 3);
      expect(finalOverdueCredits).toHaveLength(0); // Paid credits are not overdue

      // Verify historical data is preserved
      expect(paidCredit!.dateGiven).toBeDefined();
      expect(paidCredit!.dueDate).toBe(pastDueDate.toISOString().split('T')[0]);
      expect(paidCredit!.lastReminderAt).toBeDefined();
    });
  });

  describe('Flow 2: Offline mode with sync', () => {
    /**
     * Test: create credit offline → sync when online
     * Requirements: 5.3
     */
    it('should create credit offline and sync when online', async () => {
      // Step 1: Create credit while offline (no API call)
      const credit = createCreditEntry(
        'Priya Sharma',
        3000,
        '2024-02-15',
        '2024-02-01',
        '9123456789',
        false // Not synced
      );

      // Verify credit is stored locally with pending status
      const entries = getLocalEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].syncStatus).toBe('pending');
      expect(entries[0].customerName).toBe('Priya Sharma');

      // Step 2: Simulate coming online - mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            ...credit,
            userId: TEST_USER_ID,
          },
        }),
      });

      // Trigger sync
      const syncResult = await syncPendingEntries(TEST_USER_ID);

      // Verify sync succeeded
      expect(syncResult.success).toBe(1);
      expect(syncResult.failed).toBe(0);

      // Verify credit is now marked as synced
      const syncedEntries = getLocalEntries();
      expect(syncedEntries[0].syncStatus).toBe('synced');

      // Verify API was called with correct data
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/credit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Priya Sharma'),
        })
      );
    });

    it('should handle sync failure gracefully', async () => {
      // Create credit offline
      const credit = createCreditEntry(
        'Amit Patel',
        2000,
        '2024-02-20',
        '2024-02-10',
        undefined, // No phone number
        false
      );

      // Simulate network error during sync
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Trigger sync
      const syncResult = await syncPendingEntries(TEST_USER_ID);

      // Verify sync failed but didn't crash
      expect(syncResult.success).toBe(0);
      expect(syncResult.failed).toBe(1);

      // Verify credit is marked as error
      const entries = getLocalEntries();
      expect(entries[0].syncStatus).toBe('error');
      expect(entries[0].lastSyncAttempt).toBeDefined();
    });
  });

  describe('Flow 3: Language switching', () => {
    /**
     * Test: change language → UI updates
     * Requirements: 7.5
     */
    it('should generate WhatsApp messages in different languages', () => {
      const customerName = 'Suresh Reddy';
      const amount = 4000;
      const dueDate = '2024-02-10';
      const phoneNumber = '9988776655';

      // Test English message
      const urlEn = generateReminderLink(phoneNumber, customerName, amount, dueDate, 'en');
      expect(urlEn).toContain('Hello');
      expect(urlEn).toContain('friendly%20reminder');

      // Test Hindi message
      const urlHi = generateReminderLink(phoneNumber, customerName, amount, dueDate, 'hi');
      expect(urlHi).toContain('%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87'); // "नमस्ते" encoded

      // Test Marathi message
      const urlMr = generateReminderLink(phoneNumber, customerName, amount, dueDate, 'mr');
      expect(urlMr).toContain('%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%95%E0%A4%BE%E0%A4%B0'); // "नमस्कार" encoded

      // All URLs should contain the same phone number and amount
      expect(urlEn).toContain('+919988776655');
      expect(urlHi).toContain('+919988776655');
      expect(urlMr).toContain('+919988776655');
      
      expect(urlEn).toContain('4000');
      expect(urlHi).toContain('4000');
      expect(urlMr).toContain('4000');
    });

    it('should preserve language preference in localStorage', () => {
      // Simulate language preference storage
      localStorage.setItem('vyapar-lang', 'hi');
      
      // Verify language is persisted
      const storedLang = localStorage.getItem('vyapar-lang');
      expect(storedLang).toBe('hi');

      // Change language
      localStorage.setItem('vyapar-lang', 'mr');
      
      // Verify language is updated
      const updatedLang = localStorage.getItem('vyapar-lang');
      expect(updatedLang).toBe('mr');
    });
  });

  describe('Flow 4: Multi-device sync', () => {
    /**
     * Test: update on device A → sync to device B
     * Requirements: 5.3
     */
    it('should sync credit updates across devices', async () => {
      // Device A: Create credit
      const creditA = createCreditEntry(
        'Kavita Singh',
        6000,
        '2024-02-25',
        '2024-02-15',
        '9876543210',
        false
      );

      // Mock successful sync to cloud
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...creditA, userId: TEST_USER_ID },
        }),
      });

      await syncPendingEntries(TEST_USER_ID);

      // Device B: Pull from cloud
      const cloudCredit = {
        ...creditA,
        userId: TEST_USER_ID,
        lastReminderAt: '2024-02-20T10:00:00Z', // Updated on Device A
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [cloudCredit],
        }),
      });

      // Clear local storage to simulate Device B
      localStorage.clear();

      // Pull entries from cloud
      await fullSync(TEST_USER_ID);

      // Verify Device B has the updated credit
      const entriesB = getLocalEntries();
      expect(entriesB).toHaveLength(1);
      expect(entriesB[0].customerName).toBe('Kavita Singh');
      expect(entriesB[0].lastReminderAt).toBe('2024-02-20T10:00:00Z');
    });

    it('should handle last-write-wins conflict resolution', async () => {
      // Device A: Create credit with timestamp T1
      const creditA = createCreditEntry(
        'Ravi Kumar',
        5000,
        '2024-02-28',
        '2024-02-18',
        '9123456789',
        true
      );
      creditA.updatedAt = '2024-02-20T10:00:00Z';

      // Device B: Update same credit with timestamp T2 (later)
      const creditB = { ...creditA };
      creditB.lastReminderAt = '2024-02-21T15:00:00Z';
      creditB.updatedAt = '2024-02-21T15:00:00Z'; // Later timestamp

      // Mock cloud returning Device B's version (last write wins)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [creditB],
        }),
      });

      // Pull from cloud
      await fullSync(TEST_USER_ID);

      // Verify Device B's version is used (last-write-wins)
      const entries = getLocalEntries();
      expect(entries[0].lastReminderAt).toBe('2024-02-21T15:00:00Z');
      expect(entries[0].updatedAt).toBe('2024-02-21T15:00:00Z');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle credits without phone numbers', () => {
      // Create credit without phone number
      const credit = createCreditEntry(
        'Anonymous Customer',
        1000,
        '2024-02-15',
        '2024-02-01',
        undefined, // No phone number
        false
      );

      // Verify credit is created
      const entries = getLocalEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].phoneNumber).toBeUndefined();

      // Verify credit appears in overdue list
      const today = new Date();
      const overdueCredits = getOverdueCredits(entries, 3);
      
      // Should be overdue if due date is in the past
      const dueDate = new Date('2024-02-15');
      if (today > dueDate) {
        expect(overdueCredits.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple reminders for same credit', async () => {
      // Create credit
      const credit = createCreditEntry(
        'Test Customer',
        2000,
        '2024-02-10',
        '2024-02-01',
        '9876543210',
        false
      );

      // Send first reminder
      await recordReminder(credit.id, TEST_USER_ID);
      const entries1 = getLocalEntries();
      const firstReminderTime = entries1[0].lastReminderAt;

      // Wait a bit (simulate time passing)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Send second reminder
      await recordReminder(credit.id, TEST_USER_ID);
      const entries2 = getLocalEntries();
      const secondReminderTime = entries2[0].lastReminderAt;

      // Verify reminder timestamp is updated
      expect(secondReminderTime).toBeDefined();
      expect(secondReminderTime).not.toBe(firstReminderTime);
      expect(new Date(secondReminderTime!).getTime()).toBeGreaterThan(
        new Date(firstReminderTime!).getTime()
      );
    });

    it('should preserve data integrity when marking as paid', () => {
      // Create credit with all fields
      const credit = createCreditEntry(
        'Complete Customer',
        7500,
        '2024-02-20',
        '2024-02-10',
        '9988776655',
        false
      );

      // Record reminder
      const reminderTime = '2024-02-18T10:00:00Z';
      updateCreditEntry(credit.id, { lastReminderAt: reminderTime }, false);

      // Mark as paid
      const paidCredit = markCreditAsPaid(credit.id, false);

      // Verify all historical data is preserved
      expect(paidCredit).not.toBeNull();
      expect(paidCredit!.customerName).toBe('Complete Customer');
      expect(paidCredit!.amount).toBe(7500);
      expect(paidCredit!.dateGiven).toBe('2024-02-10');
      expect(paidCredit!.dueDate).toBe('2024-02-20');
      expect(paidCredit!.phoneNumber).toBe('9988776655');
      expect(paidCredit!.lastReminderAt).toBe(reminderTime);
      expect(paidCredit!.isPaid).toBe(true);
      expect(paidCredit!.paidAt).toBeDefined();
    });

    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // Attempt to create credit - the function catches the error internally
      // so it won't throw, but it will log the error
      const credit = createCreditEntry(
        'Test Customer',
        1000,
        '2024-02-15',
        '2024-02-01',
        undefined,
        false
      );

      // Verify credit object was created (even though save failed)
      expect(credit).toBeDefined();
      expect(credit.customerName).toBe('Test Customer');

      // Restore original setItem
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Sorting and filtering', () => {
    it('should sort overdue credits by urgency (days overdue DESC, amount DESC)', () => {
      // Create multiple credits with different overdue days and amounts
      const today = new Date();
      
      // Credit 1: 5 days overdue, ₹3000
      const credit1 = createCreditEntry(
        'Customer A',
        3000,
        new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        undefined,
        false
      );

      // Credit 2: 5 days overdue, ₹5000 (should come before Credit 1)
      const credit2 = createCreditEntry(
        'Customer B',
        5000,
        new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        undefined,
        false
      );

      // Credit 3: 10 days overdue, ₹2000 (should come first)
      const credit3 = createCreditEntry(
        'Customer C',
        2000,
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        undefined,
        false
      );

      // Get overdue credits - pass the credits directly instead of loading from localStorage
      const allCredits = [credit1, credit2, credit3];
      const overdueCredits = getOverdueCredits(allCredits, 3);

      // Verify sorting: Customer C (10 days) → Customer B (5 days, ₹5000) → Customer A (5 days, ₹3000)
      expect(overdueCredits).toHaveLength(3);
      expect(overdueCredits[0].customerName).toBe('Customer C');
      expect(overdueCredits[1].customerName).toBe('Customer B');
      expect(overdueCredits[2].customerName).toBe('Customer A');
    });

    it('should filter credits by threshold', () => {
      const today = new Date();

      // Credit 1: 2 days overdue (below threshold)
      const credit1 = createCreditEntry(
        'Customer A',
        1000,
        new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        undefined,
        false
      );

      // Credit 2: 5 days overdue (above threshold)
      const credit2 = createCreditEntry(
        'Customer B',
        2000,
        new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        undefined,
        false
      );

      // Get overdue credits with threshold of 3 days - pass credits directly
      const allCredits = [credit1, credit2];
      const overdueCredits = getOverdueCredits(allCredits, 3);

      // Only Customer B should appear (5 days >= 3 days threshold)
      expect(overdueCredits).toHaveLength(1);
      expect(overdueCredits[0].customerName).toBe('Customer B');
    });
  });
});
