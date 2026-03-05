// Property-Based Tests for Reminder Tracker
// Feature: udhaar-follow-up-helper
// Uses fast-check for property-based testing (100 iterations per property)

import fc from 'fast-check';
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

// Custom arbitraries for credit entries
const creditIdArbitrary = fc.string({ minLength: 10, maxLength: 30 });
const userIdArbitrary = fc.string({ minLength: 10, maxLength: 30 });
const customerNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const amountArbitrary = fc.integer({ min: 1, max: 1000000 });
// Use integer-based date generation to avoid invalid dates
const dateArbitrary = fc.integer({ min: 0, max: 2191 }) // Days from 2020-01-01 to 2025-12-31
  .map(days => {
    const baseDate = new Date('2020-01-01');
    baseDate.setDate(baseDate.getDate() + days);
    return baseDate.toISOString().split('T')[0];
  });

const isoDateTimeArbitrary = fc.integer({ min: 0, max: 2191 })
  .map(days => {
    const baseDate = new Date('2020-01-01T00:00:00Z');
    baseDate.setDate(baseDate.getDate() + days);
    return baseDate.toISOString();
  });

const creditEntryArbitrary = fc.record({
  id: creditIdArbitrary,
  customerName: customerNameArbitrary,
  amount: amountArbitrary,
  dateGiven: dateArbitrary,
  dueDate: dateArbitrary,
  isPaid: fc.boolean(),
  createdAt: isoDateTimeArbitrary,
  updatedAt: isoDateTimeArbitrary,
  syncStatus: fc.constantFrom('synced' as const, 'pending' as const, 'error' as const),
});

describe('Reminder Tracker - Property-Based Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    clearLocalData();
  });

  // Feature: udhaar-follow-up-helper, Property 10: Reminder Timestamp Recording
  describe('Property 10: Reminder Timestamp Recording', () => {
    it('should update last_reminder_at to current timestamp when reminder sent', async () => {
      await fc.assert(
        fc.asyncProperty(
          creditEntryArbitrary,
          userIdArbitrary,
          async (creditEntry, userId) => {
            // Setup: Save credit entry to localStorage
            const localEntry: LocalCreditEntry = {
              ...creditEntry,
              lastReminderAt: undefined, // Start with no reminder
            };
            saveLocalEntry(localEntry);

            // Record the time before calling recordReminder
            const beforeTime = new Date().getTime();

            // Action: Record reminder
            await recordReminder(creditEntry.id, userId);

            // Record the time after calling recordReminder
            const afterTime = new Date().getTime();

            // Verify: Get updated entry
            const updated = getLocalEntry(creditEntry.id);

            // Property: lastReminderAt should be set
            expect(updated).not.toBeNull();
            expect(updated!.lastReminderAt).toBeDefined();

            // Property: lastReminderAt should be a valid ISO timestamp
            const reminderTime = new Date(updated!.lastReminderAt!).getTime();
            expect(reminderTime).toBeGreaterThanOrEqual(beforeTime);
            expect(reminderTime).toBeLessThanOrEqual(afterTime);

            // Property: Entry should be marked for sync
            expect(updated!.syncStatus).toBe('pending');

            // Property: updatedAt should also be updated
            expect(updated!.updatedAt).toBeDefined();
            const updatedTime = new Date(updated!.updatedAt).getTime();
            expect(updatedTime).toBeGreaterThanOrEqual(beforeTime);
            expect(updatedTime).toBeLessThanOrEqual(afterTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update existing lastReminderAt when reminder sent again', async () => {
      await fc.assert(
        fc.asyncProperty(
          creditEntryArbitrary,
          userIdArbitrary,
          isoDateTimeArbitrary,
          async (creditEntry, userId, oldReminderAt) => {
            // Setup: Save credit entry with existing reminder timestamp
            const localEntry: LocalCreditEntry = {
              ...creditEntry,
              lastReminderAt: oldReminderAt,
            };
            saveLocalEntry(localEntry);

            // Wait a tiny bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Action: Record new reminder
            await recordReminder(creditEntry.id, userId);

            // Verify: Get updated entry
            const updated = getLocalEntry(creditEntry.id);

            // Property: lastReminderAt should be updated (different from old)
            expect(updated).not.toBeNull();
            expect(updated!.lastReminderAt).toBeDefined();
            expect(updated!.lastReminderAt).not.toBe(oldReminderAt);

            // Property: New timestamp should be later than old timestamp
            const oldTime = new Date(oldReminderAt).getTime();
            const newTime = new Date(updated!.lastReminderAt!).getTime();
            expect(newTime).toBeGreaterThanOrEqual(oldTime);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: udhaar-follow-up-helper, Property 13: Days Since Reminder Calculation
  describe('Property 13: Days Since Reminder Calculation', () => {
    it('should calculate days since reminder as calendar days between timestamps', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // reminderDate
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // currentDate
          (reminderDate, currentDate) => {
            // Skip invalid dates
            if (isNaN(reminderDate.getTime()) || isNaN(currentDate.getTime())) {
              return true;
            }

            const reminderAt = reminderDate.toISOString();

            // Action: Calculate days since reminder
            const daysSince = calculateDaysSinceReminder(reminderAt, currentDate);

            // Property: Result should be non-negative
            expect(daysSince).toBeGreaterThanOrEqual(0);

            // Property: Manual calculation should match
            const reminder = new Date(reminderAt);
            const current = new Date(currentDate);
            reminder.setHours(0, 0, 0, 0);
            current.setHours(0, 0, 0, 0);
            
            // Skip if dates became invalid after normalization
            if (isNaN(reminder.getTime()) || isNaN(current.getTime())) {
              return true;
            }
            
            const expectedDays = Math.max(
              0,
              Math.floor((current.getTime() - reminder.getTime()) / (1000 * 60 * 60 * 24))
            );
            expect(daysSince).toBe(expectedDays);

            // Property: If dates are on same calendar day, should be 0
            if (reminder.getTime() === current.getTime()) {
              expect(daysSince).toBe(0);
            }

            // Property: If current is before reminder (after normalization), should be 0
            if (current.getTime() < reminder.getTime()) {
              expect(daysSince).toBe(0);
            }

            // Property: If current is after reminder (after normalization), should be positive
            if (current.getTime() > reminder.getTime()) {
              expect(daysSince).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle same-day reminder (0 days)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
          (date) => {
            const reminderAt = date.toISOString();
            const currentDate = new Date(date);

            // Action: Calculate days since reminder (same day)
            const daysSince = calculateDaysSinceReminder(reminderAt, currentDate);

            // Property: Same day should be 0 days
            expect(daysSince).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: udhaar-follow-up-helper, Property 12: Dual Persistence Updates
  describe('Property 12: Dual Persistence Updates', () => {
    it('should write to localStorage and mark for DynamoDB sync', async () => {
      await fc.assert(
        fc.asyncProperty(
          creditEntryArbitrary,
          userIdArbitrary,
          async (creditEntry, userId) => {
            // Setup: Save credit entry to localStorage
            const localEntry: LocalCreditEntry = {
              ...creditEntry,
              syncStatus: 'synced', // Start as synced
            };
            saveLocalEntry(localEntry);

            // Action: Record reminder
            await recordReminder(creditEntry.id, userId);

            // Verify: Check localStorage update
            const updated = getLocalEntry(creditEntry.id);

            // Property 1: Entry should exist in localStorage
            expect(updated).not.toBeNull();

            // Property 2: lastReminderAt should be set in localStorage
            expect(updated!.lastReminderAt).toBeDefined();

            // Property 3: Entry should be marked for DynamoDB sync
            expect(updated!.syncStatus).toBe('pending');

            // Property 4: lastSyncAttempt should be cleared (ready for new sync)
            expect(updated!.lastSyncAttempt).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve other credit entry fields during update', async () => {
      await fc.assert(
        fc.asyncProperty(
          creditEntryArbitrary,
          userIdArbitrary,
          async (creditEntry, userId) => {
            // Setup: Save credit entry to localStorage
            const localEntry: LocalCreditEntry = {
              ...creditEntry,
            };
            saveLocalEntry(localEntry);

            // Action: Record reminder
            await recordReminder(creditEntry.id, userId);

            // Verify: Get updated entry
            const updated = getLocalEntry(creditEntry.id);

            // Property: All original fields should be preserved
            expect(updated).not.toBeNull();
            expect(updated!.id).toBe(creditEntry.id);
            expect(updated!.customerName).toBe(creditEntry.customerName);
            expect(updated!.amount).toBe(creditEntry.amount);
            expect(updated!.dateGiven).toBe(creditEntry.dateGiven);
            expect(updated!.dueDate).toBe(creditEntry.dueDate);
            expect(updated!.isPaid).toBe(creditEntry.isPaid);
            expect(updated!.createdAt).toBe(creditEntry.createdAt);

            // Property: Only lastReminderAt, updatedAt, and syncStatus should change
            expect(updated!.lastReminderAt).toBeDefined();
            expect(updated!.syncStatus).toBe('pending');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Additional property: getLastReminder consistency
  describe('Additional Property: getLastReminder Consistency', () => {
    it('should return null for entries without reminder timestamp', () => {
      fc.assert(
        fc.property(
          creditEntryArbitrary,
          (creditEntry) => {
            // Setup: Save credit entry without lastReminderAt
            const localEntry: LocalCreditEntry = {
              ...creditEntry,
              lastReminderAt: undefined,
            };
            saveLocalEntry(localEntry);

            // Action: Get last reminder
            const lastReminder = getLastReminder(creditEntry.id);

            // Property: Should return null
            expect(lastReminder).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return Date object for entries with reminder timestamp', () => {
      fc.assert(
        fc.property(
          creditEntryArbitrary,
          isoDateTimeArbitrary,
          (creditEntry, reminderAt) => {
            // Setup: Save credit entry with lastReminderAt
            const localEntry: LocalCreditEntry = {
              ...creditEntry,
              lastReminderAt: reminderAt,
            };
            saveLocalEntry(localEntry);

            // Action: Get last reminder
            const lastReminder = getLastReminder(creditEntry.id);

            // Property: Should return Date object
            expect(lastReminder).toBeInstanceOf(Date);

            // Property: Date should match the stored timestamp
            expect(lastReminder!.toISOString()).toBe(reminderAt);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
