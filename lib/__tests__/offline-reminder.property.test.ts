/**
 * Property-Based Tests for Offline Reminder Persistence
 * Feature: udhaar-follow-up-helper
 * 
 * Property 14: Offline Reminder Persistence
 * Validates: Requirements 5.5
 * 
 * Tests that reminder sent while offline is stored with syncStatus='pending'
 */

import fc from 'fast-check';
import { recordReminder } from '../reminder-tracker';
import { getLocalEntry, saveLocalEntry, clearLocalData } from '../credit-sync';
import type { LocalCreditEntry } from '../credit-sync';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
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
});

// Mock window object to make credit-sync work in tests
Object.defineProperty(global, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

// Mock logger to avoid console output during tests
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Property 14: Offline Reminder Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    clearLocalData();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should store reminder with syncStatus=pending when sent offline', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random credit entry
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 30 }),
          userId: fc.string({ minLength: 10, maxLength: 30 }),
          customerName: fc.string({ minLength: 1, maxLength: 50 }),
          phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 10 })),
          amount: fc.integer({ min: 1, max: 1000000 }),
          dateGiven: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString().split('T')[0]),
          dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString().split('T')[0]),
          isPaid: fc.constant(false),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString()),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString()),
        }),
        async (creditData) => {
          // Create credit entry in localStorage with proper structure
          const creditEntry: LocalCreditEntry = {
            ...creditData,
            syncStatus: 'synced', // Start as synced
          };
          
          // Initialize localStorage with the entry
          const entries = [creditEntry];
          localStorage.setItem('vyapar-credit-entries', JSON.stringify(entries));

          // Record reminder (simulating offline operation)
          await recordReminder(creditEntry.id, creditData.userId);

          // Retrieve updated entry
          const updatedEntry = getLocalEntry(creditEntry.id);

          // Property: Entry should exist
          expect(updatedEntry).not.toBeNull();

          if (updatedEntry) {
            // Property: syncStatus should be 'pending' (marked for sync)
            expect(updatedEntry.syncStatus).toBe('pending');

            // Property: lastReminderAt should be set
            expect(updatedEntry.lastReminderAt).toBeDefined();
            expect(updatedEntry.lastReminderAt).not.toBeNull();

            // Property: lastReminderAt should be a valid ISO timestamp
            const reminderDate = new Date(updatedEntry.lastReminderAt!);
            expect(reminderDate.getTime()).not.toBeNaN();

            // Property: lastReminderAt should be recent (within last minute)
            const now = new Date();
            const timeDiff = now.getTime() - reminderDate.getTime();
            expect(timeDiff).toBeGreaterThanOrEqual(0);
            expect(timeDiff).toBeLessThan(60000); // Less than 1 minute

            // Property: updatedAt should be updated
            expect(updatedEntry.updatedAt).toBeDefined();
            const updatedDate = new Date(updatedEntry.updatedAt);
            expect(updatedDate.getTime()).not.toBeNaN();

            // Property: Other fields should remain unchanged
            expect(updatedEntry.id).toBe(creditEntry.id);
            expect(updatedEntry.customerName).toBe(creditEntry.customerName);
            expect(updatedEntry.amount).toBe(creditEntry.amount);
            expect(updatedEntry.dateGiven).toBe(creditEntry.dateGiven);
            expect(updatedEntry.dueDate).toBe(creditEntry.dueDate);
            expect(updatedEntry.isPaid).toBe(creditEntry.isPaid);
            expect(updatedEntry.phoneNumber).toBe(creditEntry.phoneNumber);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve pending status across multiple reminder updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random credit entry
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 30 }),
          userId: fc.string({ minLength: 10, maxLength: 30 }),
          customerName: fc.string({ minLength: 1, maxLength: 50 }),
          amount: fc.integer({ min: 1, max: 1000000 }),
          dateGiven: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString().split('T')[0]),
          dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString().split('T')[0]),
          isPaid: fc.constant(false),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString()),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString()),
        }),
        // Generate number of reminder updates (1-5)
        fc.integer({ min: 1, max: 5 }),
        async (creditData, numUpdates) => {
          // Create credit entry in localStorage with proper structure
          const creditEntry: LocalCreditEntry = {
            ...creditData,
            syncStatus: 'synced',
          };
          
          // Initialize localStorage with the entry
          const entries = [creditEntry];
          localStorage.setItem('vyapar-credit-entries', JSON.stringify(entries));

          // Send multiple reminders
          for (let i = 0; i < numUpdates; i++) {
            await recordReminder(creditEntry.id, creditData.userId);
            
            // Small delay to ensure timestamps differ
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Retrieve final entry
          const finalEntry = getLocalEntry(creditEntry.id);

          // Property: Entry should still exist
          expect(finalEntry).not.toBeNull();

          if (finalEntry) {
            // Property: syncStatus should still be 'pending'
            expect(finalEntry.syncStatus).toBe('pending');

            // Property: lastReminderAt should be set to most recent reminder
            expect(finalEntry.lastReminderAt).toBeDefined();
            expect(finalEntry.lastReminderAt).not.toBeNull();

            // Property: lastSyncAttempt should be undefined (cleared on pending)
            expect(finalEntry.lastSyncAttempt).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle reminder persistence with various credit states', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random credit entry with various sync states
        fc.record({
          id: fc.string({ minLength: 10, maxLength: 30 }),
          userId: fc.string({ minLength: 10, maxLength: 30 }),
          customerName: fc.string({ minLength: 1, maxLength: 50 }),
          amount: fc.integer({ min: 1, max: 1000000 }),
          dateGiven: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString().split('T')[0]),
          dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString().split('T')[0]),
          isPaid: fc.boolean(),
          syncStatus: fc.constantFrom('synced', 'pending', 'error') as fc.Arbitrary<'synced' | 'pending' | 'error'>,
          lastReminderAt: fc.option(
            fc.date({ min: new Date('2020-01-01'), max: new Date() })
              .filter(d => !isNaN(d.getTime()))
              .map(d => d.toISOString())
          ),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString()),
          updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
            .filter(d => !isNaN(d.getTime()))
            .map(d => d.toISOString()),
        }),
        async (creditData) => {
          // Create credit entry in localStorage with proper structure
          const creditEntry: LocalCreditEntry = creditData;
          
          // Initialize localStorage with the entry
          const entries = [creditEntry];
          localStorage.setItem('vyapar-credit-entries', JSON.stringify(entries));

          const initialSyncStatus = creditEntry.syncStatus;

          // Record reminder
          await recordReminder(creditEntry.id, creditData.userId);

          // Retrieve updated entry
          const updatedEntry = getLocalEntry(creditEntry.id);

          // Property: Entry should exist
          expect(updatedEntry).not.toBeNull();

          if (updatedEntry) {
            // Property: syncStatus should always be 'pending' after reminder
            // (regardless of initial state)
            expect(updatedEntry.syncStatus).toBe('pending');

            // Property: lastReminderAt should be updated
            expect(updatedEntry.lastReminderAt).toBeDefined();
            expect(updatedEntry.lastReminderAt).not.toBeNull();

            // Property: If initial state was 'synced', it should now be 'pending'
            if (initialSyncStatus === 'synced') {
              expect(updatedEntry.syncStatus).not.toBe('synced');
            }

            // Property: lastSyncAttempt should be cleared (undefined)
            expect(updatedEntry.lastSyncAttempt).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
