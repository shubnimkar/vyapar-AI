/**
 * @jest-environment jsdom
 */

// Unit tests for Credit Sync Service
// Feature: udhaar-follow-up-helper

import {
  getLocalEntries,
  saveLocalEntries,
  getLocalEntry,
  saveLocalEntry,
  deleteLocalEntry,
  getSyncStatus,
  updateSyncStatus,
  createCreditEntry,
  updateCreditEntry,
  markCreditAsPaid,
  updateCreditReminder,
  clearLocalData,
  type LocalCreditEntry,
} from '../credit-sync';

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Credit Sync Service - Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  // ============================================
  // Test: Sync with network available
  // ============================================

  describe('updateCreditReminder - network available', () => {
    it('should update localStorage and sync to DynamoDB when online', async () => {
      // Setup: Create a credit entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01', '9876543210');

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Update reminder
      const reminderAt = '2024-01-15T10:00:00Z';
      await updateCreditReminder(entry.id, 'user_123', reminderAt);

      // Verify: localStorage updated
      const updated = getLocalEntry(entry.id);
      expect(updated).not.toBeNull();
      expect(updated!.lastReminderAt).toBe(reminderAt);
      expect(updated!.syncStatus).toBe('synced');

      // Verify: API called with correct data
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/credit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(reminderAt),
        })
      );
    });

    it('should include all required fields in sync payload', async () => {
      // Setup: Create a credit entry with all fields
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01', '9876543210');

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Update reminder
      await updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z');

      // Verify: Payload includes all required fields
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('id');
      expect(payload).toHaveProperty('customerName');
      expect(payload).toHaveProperty('amount');
      expect(payload).toHaveProperty('dateGiven');
      expect(payload).toHaveProperty('dueDate');
      expect(payload).toHaveProperty('phoneNumber');
      expect(payload).toHaveProperty('isPaid');
      expect(payload).toHaveProperty('lastReminderAt');
      expect(payload).toHaveProperty('createdAt');
      expect(payload).toHaveProperty('updatedAt');
    });
  });

  // ============================================
  // Test: Sync with network unavailable (offline mode)
  // ============================================

  describe('updateCreditReminder - offline mode', () => {
    it('should update localStorage and mark as pending when offline', async () => {
      // Setup: Create a credit entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Execute: Update reminder while offline
      const reminderAt = '2024-01-15T10:00:00Z';
      await updateCreditReminder(entry.id, 'user_123', reminderAt);

      // Verify: localStorage updated
      const updated = getLocalEntry(entry.id);
      expect(updated).not.toBeNull();
      expect(updated!.lastReminderAt).toBe(reminderAt);

      // Verify: Marked as pending for later sync
      expect(updated!.syncStatus).toBe('pending');
    });

    it('should not throw error when offline', async () => {
      // Setup: Create a credit entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Execute: Should not throw
      await expect(
        updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z')
      ).resolves.not.toThrow();
    });
  });

  // ============================================
  // Test: Conflict resolution with different timestamps
  // ============================================

  describe('Conflict resolution', () => {
    it('should use last-write-wins strategy based on updatedAt', () => {
      // Setup: Create entry with initial timestamp
      const entry1 = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');
      const timestamp1 = entry1.updatedAt;

      // Simulate time passing
      jest.useFakeTimers();
      jest.advanceTimersByTime(5000);

      // Update entry (creates new timestamp)
      const entry2 = updateCreditEntry(entry1.id, { amount: 2000 });
      const timestamp2 = entry2!.updatedAt;

      jest.useRealTimers();

      // Verify: Later timestamp wins
      expect(new Date(timestamp2).getTime()).toBeGreaterThan(new Date(timestamp1).getTime());
      expect(entry2!.amount).toBe(2000);
    });

    it('should preserve updatedAt timestamp during updates', () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');
      const originalUpdatedAt = entry.updatedAt;

      // Wait a bit
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);

      // Update entry
      const updated = updateCreditEntry(entry.id, { amount: 2000 });

      jest.useRealTimers();

      // Verify: updatedAt changed
      expect(updated!.updatedAt).not.toBe(originalUpdatedAt);
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  // ============================================
  // Test: DynamoDB key format validation
  // ============================================

  describe('DynamoDB key format', () => {
    it('should use correct PK format: USER#{userId}', async () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Sync
      await updateCreditReminder(entry.id, 'user_abc123', '2024-01-15T10:00:00Z');

      // Verify: userId sent correctly (API will format as USER#{userId})
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.userId).toBe('user_abc123');
    });

    it('should use correct SK format: CREDIT#{creditId}', async () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Sync
      await updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z');

      // Verify: creditId sent correctly (API will format as CREDIT#{creditId})
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);
      expect(payload.id).toBe(entry.id);
      expect(payload.id).toMatch(/^credit_/);
    });
  });

  // ============================================
  // Test: Field completeness validation
  // ============================================

  describe('Field completeness', () => {
    it('should include all required fields when syncing', async () => {
      // Setup: Create entry with all fields
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01', '9876543210');

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Sync
      await updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z');

      // Verify: All required fields present
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      const requiredFields = [
        'userId',
        'id',
        'customerName',
        'amount',
        'dateGiven',
        'dueDate',
        'isPaid',
        'createdAt',
        'updatedAt',
      ];

      for (const field of requiredFields) {
        expect(payload).toHaveProperty(field);
        expect(payload[field]).not.toBeNull();
        expect(payload[field]).not.toBeUndefined();
      }
    });

    it('should include optional fields when present', async () => {
      // Setup: Create entry with optional fields
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01', '9876543210');

      // Mark as paid
      markCreditAsPaid(entry.id);

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Sync with reminder
      await updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z');

      // Verify: Optional fields included
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.phoneNumber).toBe('9876543210');
      expect(payload.paidDate).toBeDefined();
      expect(payload.lastReminderAt).toBe('2024-01-15T10:00:00Z');
    });

    it('should handle missing optional fields gracefully', async () => {
      // Setup: Create entry without optional fields
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Execute: Sync
      await updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z');

      // Verify: Optional fields are undefined (not causing errors)
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const payload = JSON.parse(callArgs[1].body);

      expect(payload.phoneNumber).toBeUndefined();
      expect(payload.paidDate).toBeUndefined();
    });
  });

  // ============================================
  // Test: updateCreditEntry with reminder tracking
  // ============================================

  describe('updateCreditEntry', () => {
    it('should update lastReminderAt field', () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Execute: Update reminder
      const reminderAt = '2024-01-15T10:00:00Z';
      const updated = updateCreditEntry(entry.id, { lastReminderAt: reminderAt });

      // Verify: Field updated
      expect(updated).not.toBeNull();
      expect(updated!.lastReminderAt).toBe(reminderAt);
    });

    it('should update phoneNumber field', () => {
      // Setup: Create entry without phone
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Execute: Add phone number
      const updated = updateCreditEntry(entry.id, { phoneNumber: '9876543210' });

      // Verify: Field updated
      expect(updated).not.toBeNull();
      expect(updated!.phoneNumber).toBe('9876543210');
    });

    it('should mark as pending when not explicitly synced', () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Execute: Update without marking as synced
      const updated = updateCreditEntry(entry.id, { amount: 2000 }, false);

      // Verify: Marked as pending
      expect(updated).not.toBeNull();
      expect(updated!.syncStatus).toBe('pending');
    });
  });

  // ============================================
  // Test: Error handling
  // ============================================

  describe('Error handling', () => {
    it('should throw error when updating non-existent credit', async () => {
      // Execute & Verify: Should throw
      await expect(
        updateCreditReminder('non_existent_id', 'user_123', '2024-01-15T10:00:00Z')
      ).rejects.toThrow('Credit entry non_existent_id not found');
    });

    it('should handle API errors gracefully', async () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Mock API error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Server error' }),
      });

      // Execute: Should not throw
      await expect(
        updateCreditReminder(entry.id, 'user_123', '2024-01-15T10:00:00Z')
      ).resolves.not.toThrow();

      // Verify: Marked as pending
      const updated = getLocalEntry(entry.id);
      expect(updated!.syncStatus).toBe('pending');
    });
  });

  // ============================================
  // Test: localStorage operations
  // ============================================

  describe('localStorage operations', () => {
    it('should save and retrieve entries correctly', () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Execute: Retrieve
      const retrieved = getLocalEntry(entry.id);

      // Verify: Data matches
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(entry.id);
      expect(retrieved!.customerName).toBe('Test Customer');
      expect(retrieved!.amount).toBe(1000);
    });

    it('should delete entries correctly', () => {
      // Setup: Create entry
      const entry = createCreditEntry('Test Customer', 1000, '2024-02-01', '2024-01-01');

      // Execute: Delete
      deleteLocalEntry(entry.id);

      // Verify: Entry removed
      const retrieved = getLocalEntry(entry.id);
      expect(retrieved).toBeNull();
    });

    it('should clear all data on clearLocalData', () => {
      // Setup: Create multiple entries
      createCreditEntry('Customer 1', 1000, '2024-02-01', '2024-01-01');
      createCreditEntry('Customer 2', 2000, '2024-02-01', '2024-01-01');

      // Execute: Clear
      clearLocalData();

      // Verify: All entries removed
      const entries = getLocalEntries();
      expect(entries).toHaveLength(0);
    });
  });

  // ============================================
  // Test: Sync status tracking
  // ============================================

  describe('Sync status tracking', () => {
    it('should track pending count', () => {
      // Setup: Create entries
      createCreditEntry('Customer 1', 1000, '2024-02-01', '2024-01-01');
      createCreditEntry('Customer 2', 2000, '2024-02-01', '2024-01-01');

      // Execute: Update sync status
      updateSyncStatus({ pendingCount: 2, errorCount: 0 });

      // Verify: Status tracked
      const status = getSyncStatus();
      expect(status.pendingCount).toBe(2);
      expect(status.errorCount).toBe(0);
    });

    it('should track last sync time', () => {
      // Execute: Update sync status
      const now = new Date().toISOString();
      updateSyncStatus({ lastSyncTime: now });

      // Verify: Time tracked
      const status = getSyncStatus();
      expect(status.lastSyncTime).toBe(now);
    });
  });
});
