// Unit Tests for Reminder Tracker
// Feature: udhaar-follow-up-helper
// Tests specific examples and edge cases

import { recordReminder, getLastReminder, calculateDaysSinceReminder } from '../reminder-tracker';
import { getLocalEntry, saveLocalEntry, clearLocalData } from '../credit-sync';
import type { LocalCreditEntry } from '../credit-sync';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'window', { value: { localStorage: localStorageMock }, writable: true });

describe('Reminder Tracker - Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    clearLocalData();
  });

  describe('recordReminder', () => {
    it('should record reminder with valid credit entry', async () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action
      await recordReminder('credit_123', 'user_456');

      // Verify
      const updated = getLocalEntry('credit_123');
      expect(updated).not.toBeNull();
      expect(updated!.lastReminderAt).toBeDefined();
      expect(updated!.syncStatus).toBe('pending');
      expect(updated!.lastSyncAttempt).toBeUndefined();
    });

    it('should update existing lastReminderAt timestamp', async () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        lastReminderAt: '2024-01-10T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action
      await recordReminder('credit_123', 'user_456');

      // Verify
      const updated = getLocalEntry('credit_123');
      expect(updated).not.toBeNull();
      expect(updated!.lastReminderAt).toBeDefined();
      expect(updated!.lastReminderAt).not.toBe('2024-01-10T10:00:00Z');
      
      // New timestamp should be more recent
      const oldTime = new Date('2024-01-10T10:00:00Z').getTime();
      const newTime = new Date(updated!.lastReminderAt!).getTime();
      expect(newTime).toBeGreaterThan(oldTime);
    });

    it('should throw error for non-existent credit entry', async () => {
      // Action & Verify
      await expect(recordReminder('nonexistent_id', 'user_456')).rejects.toThrow(
        'Credit entry not found: nonexistent_id'
      );
    });

    it('should record reminder while offline (no network dependency)', async () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action (no network calls, purely localStorage)
      await recordReminder('credit_123', 'user_456');

      // Verify
      const updated = getLocalEntry('credit_123');
      expect(updated).not.toBeNull();
      expect(updated!.lastReminderAt).toBeDefined();
      expect(updated!.syncStatus).toBe('pending'); // Marked for sync when online
    });

    it('should preserve all other credit entry fields', async () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        phoneNumber: '9876543210',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        paidDate: undefined,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action
      await recordReminder('credit_123', 'user_456');

      // Verify all fields preserved
      const updated = getLocalEntry('credit_123');
      expect(updated).not.toBeNull();
      expect(updated!.id).toBe('credit_123');
      expect(updated!.customerName).toBe('Rajesh Kumar');
      expect(updated!.phoneNumber).toBe('9876543210');
      expect(updated!.amount).toBe(5000);
      expect(updated!.dateGiven).toBe('2024-01-01');
      expect(updated!.dueDate).toBe('2024-01-15');
      expect(updated!.isPaid).toBe(false);
      expect(updated!.createdAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('getLastReminder', () => {
    it('should return Date object when lastReminderAt exists', () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        lastReminderAt: '2024-01-10T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-10T10:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action
      const lastReminder = getLastReminder('credit_123');

      // Verify
      expect(lastReminder).toBeInstanceOf(Date);
      expect(lastReminder!.toISOString()).toBe('2024-01-10T10:00:00.000Z');
    });

    it('should return null when lastReminderAt is missing', () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action
      const lastReminder = getLastReminder('credit_123');

      // Verify
      expect(lastReminder).toBeNull();
    });

    it('should return null for non-existent credit entry', () => {
      // Action
      const lastReminder = getLastReminder('nonexistent_id');

      // Verify
      expect(lastReminder).toBeNull();
    });

    it('should handle invalid date format gracefully', () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        lastReminderAt: 'invalid-date',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action
      const lastReminder = getLastReminder('credit_123');

      // Verify - should return Date object (even if Invalid Date)
      expect(lastReminder).toBeInstanceOf(Date);
    });
  });

  describe('calculateDaysSinceReminder', () => {
    it('should calculate 0 days for same-day reminder', () => {
      const reminderAt = '2024-01-15T10:00:00Z';
      const currentDate = new Date('2024-01-15T18:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(0);
    });

    it('should calculate 1 day for next-day reminder', () => {
      const reminderAt = '2024-01-15T10:00:00Z';
      const currentDate = new Date('2024-01-16T08:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(1);
    });

    it('should calculate 7 days for week-old reminder', () => {
      const reminderAt = '2024-01-08T10:00:00Z';
      const currentDate = new Date('2024-01-15T10:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(7);
    });

    it('should calculate 30 days for month-old reminder', () => {
      const reminderAt = '2024-01-01T10:00:00Z';
      const currentDate = new Date('2024-01-31T10:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(30);
    });

    it('should return 0 for future reminder date', () => {
      const reminderAt = '2024-01-20T10:00:00Z';
      const currentDate = new Date('2024-01-15T10:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(0);
    });

    it('should ignore time component (use calendar days only)', () => {
      // Reminder at end of day, current at start of next day
      const reminderAt = '2024-01-15T00:00:00Z';
      const currentDate = new Date('2024-01-16T00:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(1);
    });

    it('should handle leap year correctly', () => {
      const reminderAt = '2024-02-28T10:00:00Z';
      const currentDate = new Date('2024-03-01T10:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(2); // 2024 is a leap year, so Feb 29 exists
    });

    it('should handle year boundary correctly', () => {
      const reminderAt = '2023-12-31T10:00:00Z';
      const currentDate = new Date('2024-01-01T10:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      expect(days).toBe(1);
    });

    it('should handle invalid date format gracefully', () => {
      const reminderAt = 'invalid-date';
      const currentDate = new Date('2024-01-15T10:00:00Z');

      const days = calculateDaysSinceReminder(reminderAt, currentDate);

      // Should return 0 on error
      expect(days).toBe(0);
    });
  });

  describe('Integration: recordReminder + getLastReminder + calculateDaysSinceReminder', () => {
    it('should work together for complete reminder flow', async () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // Action 1: Record reminder
      await recordReminder('credit_123', 'user_456');

      // Action 2: Get last reminder
      const lastReminder = getLastReminder('credit_123');
      expect(lastReminder).not.toBeNull();

      // Action 3: Calculate days since reminder
      const currentDate = new Date();
      const daysSince = calculateDaysSinceReminder(lastReminder!.toISOString(), currentDate);

      // Verify
      expect(daysSince).toBe(0); // Same day
    });

    it('should track multiple reminders over time', async () => {
      // Setup
      const creditEntry: LocalCreditEntry = {
        id: 'credit_123',
        customerName: 'Rajesh Kumar',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        syncStatus: 'synced',
      };
      saveLocalEntry(creditEntry);

      // First reminder
      await recordReminder('credit_123', 'user_456');
      const firstReminder = getLastReminder('credit_123');
      expect(firstReminder).not.toBeNull();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      // Second reminder
      await recordReminder('credit_123', 'user_456');
      const secondReminder = getLastReminder('credit_123');
      expect(secondReminder).not.toBeNull();

      // Verify second reminder is later
      expect(secondReminder!.getTime()).toBeGreaterThan(firstReminder!.getTime());
    });
  });
});
