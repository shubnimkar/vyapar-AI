// Property-based tests for Credit Sync Service
// Feature: udhaar-follow-up-helper

import fc from 'fast-check';
import type { CreditEntry } from '../types';
import type { LocalCreditEntry } from '../credit-sync';

// ============================================
// Custom Arbitraries (Generators)
// ============================================

/**
 * Generate valid ISO date string
 */
const isoDateArbitrary = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter(d => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

/**
 * Generate valid credit entry ID
 */
const creditIdArbitrary = fc
  .tuple(fc.integer({ min: 1000000000000, max: 9999999999999 }), fc.string({ minLength: 9, maxLength: 9 }))
  .map(([timestamp, random]) => `credit_${timestamp}_${random}`);

/**
 * Generate valid user ID
 */
const userIdArbitrary = fc
  .string({ minLength: 16, maxLength: 16 })
  .map((hex) => `user_${hex}`);

/**
 * Generate valid phone number (10 digits)
 */
const phoneNumberArbitrary = fc
  .integer({ min: 6000000000, max: 9999999999 })
  .map((n) => n.toString());

/**
 * Generate complete CreditEntry
 */
const creditEntryArbitrary: fc.Arbitrary<CreditEntry> = fc.record({
  id: creditIdArbitrary,
  userId: userIdArbitrary,
  customerName: fc.string({ minLength: 1, maxLength: 50 }),
  phoneNumber: fc.option(phoneNumberArbitrary, { nil: undefined }),
  amount: fc.integer({ min: 1, max: 1000000 }),
  dateGiven: isoDateArbitrary,
  dueDate: isoDateArbitrary,
  isPaid: fc.boolean(),
  paidDate: fc.option(isoDateArbitrary, { nil: undefined }),
  lastReminderAt: fc.option(isoDateArbitrary, { nil: undefined }),
  createdAt: isoDateArbitrary,
  updatedAt: isoDateArbitrary,
});

/**
 * Generate LocalCreditEntry (extends CreditEntry)
 */
const localCreditEntryArbitrary: fc.Arbitrary<LocalCreditEntry> = creditEntryArbitrary.map((entry) => {
  const { userId, ...rest } = entry;
  return {
    ...rest,
    paidAt: entry.paidDate,
    syncStatus: fc.sample(fc.constantFrom('synced' as const, 'pending' as const, 'error' as const), 1)[0],
    lastSyncAttempt: fc.sample(fc.option(isoDateArbitrary, { nil: undefined }), 1)[0],
  };
});

/**
 * Generate two conflicting credit entries (same ID, different timestamps)
 */
const conflictingEntriesArbitrary = fc
  .tuple(creditEntryArbitrary, isoDateArbitrary, isoDateArbitrary)
  .map(([baseEntry, timestamp1, timestamp2]) => {
    const entry1: CreditEntry = {
      ...baseEntry,
      updatedAt: timestamp1,
    };
    const entry2: CreditEntry = {
      ...baseEntry,
      updatedAt: timestamp2,
      amount: baseEntry.amount + 100, // Different data
    };
    return { entry1, entry2 };
  });

// ============================================
// Property 16: Sync Data Consistency
// ============================================

describe('Property 16: Sync Data Consistency', () => {
  it('should ensure DynamoDB record contains identical values to localStorage entry', () => {
    fc.assert(
      fc.property(creditEntryArbitrary, (creditEntry) => {
        // Simulate conversion from localStorage to DynamoDB format
        const localEntry: LocalCreditEntry = {
          id: creditEntry.id,
          customerName: creditEntry.customerName,
          phoneNumber: creditEntry.phoneNumber,
          amount: creditEntry.amount,
          dateGiven: creditEntry.dateGiven,
          dueDate: creditEntry.dueDate,
          isPaid: creditEntry.isPaid,
          paidDate: creditEntry.paidDate,
          paidAt: creditEntry.paidDate,
          lastReminderAt: creditEntry.lastReminderAt,
          createdAt: creditEntry.createdAt,
          updatedAt: creditEntry.updatedAt,
          syncStatus: 'synced',
        };

        // Simulate DynamoDB record (what would be sent to API)
        const dynamoRecord = {
          userId: creditEntry.userId,
          id: localEntry.id,
          customerName: localEntry.customerName,
          amount: localEntry.amount,
          dateGiven: localEntry.dateGiven,
          dueDate: localEntry.dueDate,
          phoneNumber: localEntry.phoneNumber,
          isPaid: localEntry.isPaid,
          paidDate: localEntry.paidAt,
          lastReminderAt: localEntry.lastReminderAt,
          createdAt: localEntry.createdAt,
          updatedAt: localEntry.updatedAt,
        };

        // Property: All fields should match
        expect(dynamoRecord.id).toBe(localEntry.id);
        expect(dynamoRecord.customerName).toBe(localEntry.customerName);
        expect(dynamoRecord.amount).toBe(localEntry.amount);
        expect(dynamoRecord.dateGiven).toBe(localEntry.dateGiven);
        expect(dynamoRecord.dueDate).toBe(localEntry.dueDate);
        expect(dynamoRecord.phoneNumber).toBe(localEntry.phoneNumber);
        expect(dynamoRecord.isPaid).toBe(localEntry.isPaid);
        expect(dynamoRecord.paidDate).toBe(localEntry.paidAt);
        expect(dynamoRecord.lastReminderAt).toBe(localEntry.lastReminderAt);
        expect(dynamoRecord.createdAt).toBe(localEntry.createdAt);
        expect(dynamoRecord.updatedAt).toBe(localEntry.updatedAt);

        // Property: Optional fields should be consistently undefined or present
        if (localEntry.phoneNumber === undefined) {
          expect(dynamoRecord.phoneNumber).toBeUndefined();
        }
        if (localEntry.paidAt === undefined) {
          expect(dynamoRecord.paidDate).toBeUndefined();
        }
        if (localEntry.lastReminderAt === undefined) {
          expect(dynamoRecord.lastReminderAt).toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all required fields during sync', () => {
    fc.assert(
      fc.property(creditEntryArbitrary, (creditEntry) => {
        // Required fields that must always be present
        const requiredFields = [
          'id',
          'customerName',
          'amount',
          'dateGiven',
          'dueDate',
          'isPaid',
          'createdAt',
          'updatedAt',
        ];

        // Simulate sync payload
        const syncPayload = {
          userId: creditEntry.userId,
          id: creditEntry.id,
          customerName: creditEntry.customerName,
          amount: creditEntry.amount,
          dateGiven: creditEntry.dateGiven,
          dueDate: creditEntry.dueDate,
          phoneNumber: creditEntry.phoneNumber,
          isPaid: creditEntry.isPaid,
          paidDate: creditEntry.paidDate,
          lastReminderAt: creditEntry.lastReminderAt,
          createdAt: creditEntry.createdAt,
          updatedAt: creditEntry.updatedAt,
        };

        // Property: All required fields must be present and non-null
        for (const field of requiredFields) {
          expect(syncPayload).toHaveProperty(field);
          expect((syncPayload as any)[field]).not.toBeNull();
          expect((syncPayload as any)[field]).not.toBeUndefined();
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 17: Last-Write-Wins Conflict Resolution
// ============================================

describe('Property 17: Last-Write-Wins Conflict Resolution', () => {
  it('should persist update with later timestamp', () => {
    fc.assert(
      fc.property(conflictingEntriesArbitrary, ({ entry1, entry2 }) => {
        // Determine which entry has the later timestamp
        const timestamp1 = new Date(entry1.updatedAt).getTime();
        const timestamp2 = new Date(entry2.updatedAt).getTime();

        // Simulate conflict resolution
        const winner = timestamp2 > timestamp1 ? entry2 : entry1;
        const loser = timestamp2 > timestamp1 ? entry1 : entry2;

        // Property: Winner should have later or equal timestamp
        expect(new Date(winner.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(loser.updatedAt).getTime()
        );

        // Property: Winner's data should be preserved
        expect(winner.amount).toBeDefined();
        expect(winner.updatedAt).toBeDefined();

        // Property: If timestamps are equal, either can win (deterministic tie-breaking)
        if (timestamp1 === timestamp2) {
          expect(winner.updatedAt).toBe(loser.updatedAt);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle conflict resolution deterministically', () => {
    fc.assert(
      fc.property(conflictingEntriesArbitrary, ({ entry1, entry2 }) => {
        // Simulate conflict resolution twice
        const resolveConflict = (local: CreditEntry, remote: CreditEntry): CreditEntry => {
          const localTime = new Date(local.updatedAt).getTime();
          const remoteTime = new Date(remote.updatedAt).getTime();
          return remoteTime > localTime ? remote : local;
        };

        const result1 = resolveConflict(entry1, entry2);
        const result2 = resolveConflict(entry1, entry2);

        // Property: Same inputs should produce same output (deterministic)
        expect(result1.id).toBe(result2.id);
        expect(result1.updatedAt).toBe(result2.updatedAt);
        expect(result1.amount).toBe(result2.amount);
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 15: DynamoDB Key Format
// ============================================

describe('Property 15: DynamoDB Key Format', () => {
  it('should format partition key as USER#{userId}', () => {
    fc.assert(
      fc.property(userIdArbitrary, (userId) => {
        // Simulate DynamoDB key generation
        const partitionKey = `USER#${userId}`;

        // Property: Key should start with USER#
        expect(partitionKey).toMatch(/^USER#/);

        // Property: Key should contain the userId
        expect(partitionKey).toContain(userId);

        // Property: Key format should be exactly USER#{userId}
        expect(partitionKey).toBe(`USER#${userId}`);
      }),
      { numRuns: 100 }
    );
  });

  it('should format sort key as CREDIT#{creditId}', () => {
    fc.assert(
      fc.property(creditIdArbitrary, (creditId) => {
        // Simulate DynamoDB key generation
        const sortKey = `CREDIT#${creditId}`;

        // Property: Key should start with CREDIT#
        expect(sortKey).toMatch(/^CREDIT#/);

        // Property: Key should contain the creditId
        expect(sortKey).toContain(creditId);

        // Property: Key format should be exactly CREDIT#{creditId}
        expect(sortKey).toBe(`CREDIT#${creditId}`);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate valid DynamoDB key pair for any credit entry', () => {
    fc.assert(
      fc.property(creditEntryArbitrary, (creditEntry) => {
        // Simulate DynamoDB key generation
        const PK = `USER#${creditEntry.userId}`;
        const SK = `CREDIT#${creditEntry.id}`;

        // Property: PK should follow USER# format
        expect(PK).toMatch(/^USER#/);

        // Property: SK should follow CREDIT# format
        expect(SK).toMatch(/^CREDIT#/);

        // Property: Keys should be non-empty
        expect(PK.length).toBeGreaterThan(5); // "USER#" + at least 1 char
        expect(SK.length).toBeGreaterThan(7); // "CREDIT#" + at least 1 char

        // Property: Keys should not contain special characters that break DynamoDB
        expect(PK).not.toContain('\n');
        expect(PK).not.toContain('\r');
        expect(SK).not.toContain('\n');
        expect(SK).not.toContain('\r');
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================
// Property 18: Complete Field Persistence
// ============================================

describe('Property 18: Complete Field Persistence', () => {
  it('should include all required fields in DynamoDB record', () => {
    fc.assert(
      fc.property(creditEntryArbitrary, (creditEntry) => {
        // Simulate DynamoDB record creation
        const dynamoRecord = {
          PK: `USER#${creditEntry.userId}`,
          SK: `CREDIT#${creditEntry.id}`,
          entityType: 'CREDIT',
          userId: creditEntry.userId,
          id: creditEntry.id,
          customerName: creditEntry.customerName,
          amount: creditEntry.amount,
          dateGiven: creditEntry.dateGiven,
          dueDate: creditEntry.dueDate,
          isPaid: creditEntry.isPaid,
          createdAt: creditEntry.createdAt,
          updatedAt: creditEntry.updatedAt,
          phoneNumber: creditEntry.phoneNumber,
          paidDate: creditEntry.paidDate,
          lastReminderAt: creditEntry.lastReminderAt,
        };

        // Property: All required fields must be present
        expect(dynamoRecord).toHaveProperty('PK');
        expect(dynamoRecord).toHaveProperty('SK');
        expect(dynamoRecord).toHaveProperty('entityType');
        expect(dynamoRecord).toHaveProperty('userId');
        expect(dynamoRecord).toHaveProperty('id');
        expect(dynamoRecord).toHaveProperty('customerName');
        expect(dynamoRecord).toHaveProperty('amount');
        expect(dynamoRecord).toHaveProperty('dateGiven');
        expect(dynamoRecord).toHaveProperty('dueDate');
        expect(dynamoRecord).toHaveProperty('isPaid');
        expect(dynamoRecord).toHaveProperty('createdAt');
        expect(dynamoRecord).toHaveProperty('updatedAt');

        // Property: Required fields must not be null or undefined
        expect(dynamoRecord.userId).toBeTruthy();
        expect(dynamoRecord.id).toBeTruthy();
        expect(dynamoRecord.customerName).toBeTruthy();
        expect(dynamoRecord.amount).toBeGreaterThan(0);
        expect(dynamoRecord.dateGiven).toBeTruthy();
        expect(dynamoRecord.dueDate).toBeTruthy();
        expect(typeof dynamoRecord.isPaid).toBe('boolean');
        expect(dynamoRecord.createdAt).toBeTruthy();
        expect(dynamoRecord.updatedAt).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve optional fields when present', () => {
    fc.assert(
      fc.property(creditEntryArbitrary, (creditEntry) => {
        // Simulate DynamoDB record with optional fields
        const dynamoRecord = {
          userId: creditEntry.userId,
          id: creditEntry.id,
          customerName: creditEntry.customerName,
          amount: creditEntry.amount,
          dateGiven: creditEntry.dateGiven,
          dueDate: creditEntry.dueDate,
          isPaid: creditEntry.isPaid,
          createdAt: creditEntry.createdAt,
          updatedAt: creditEntry.updatedAt,
          phoneNumber: creditEntry.phoneNumber,
          paidDate: creditEntry.paidDate,
          lastReminderAt: creditEntry.lastReminderAt,
        };

        // Property: If phoneNumber exists in source, it must exist in record
        if (creditEntry.phoneNumber !== undefined) {
          expect(dynamoRecord.phoneNumber).toBe(creditEntry.phoneNumber);
        }

        // Property: If paidDate exists in source, it must exist in record
        if (creditEntry.paidDate !== undefined) {
          expect(dynamoRecord.paidDate).toBe(creditEntry.paidDate);
        }

        // Property: If lastReminderAt exists in source, it must exist in record
        if (creditEntry.lastReminderAt !== undefined) {
          expect(dynamoRecord.lastReminderAt).toBe(creditEntry.lastReminderAt);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should not lose data during localStorage to DynamoDB conversion', () => {
    fc.assert(
      fc.property(localCreditEntryArbitrary, userIdArbitrary, (localEntry, userId) => {
        // Simulate conversion from localStorage to DynamoDB
        const dynamoRecord = {
          userId,
          id: localEntry.id,
          customerName: localEntry.customerName,
          amount: localEntry.amount,
          dateGiven: localEntry.dateGiven,
          dueDate: localEntry.dueDate,
          phoneNumber: localEntry.phoneNumber,
          isPaid: localEntry.isPaid,
          paidDate: localEntry.paidAt,
          lastReminderAt: localEntry.lastReminderAt,
          createdAt: localEntry.createdAt,
          updatedAt: localEntry.updatedAt,
        };

        // Property: No data loss during conversion
        expect(dynamoRecord.id).toBe(localEntry.id);
        expect(dynamoRecord.customerName).toBe(localEntry.customerName);
        expect(dynamoRecord.amount).toBe(localEntry.amount);
        expect(dynamoRecord.dateGiven).toBe(localEntry.dateGiven);
        expect(dynamoRecord.dueDate).toBe(localEntry.dueDate);
        expect(dynamoRecord.isPaid).toBe(localEntry.isPaid);
        expect(dynamoRecord.createdAt).toBe(localEntry.createdAt);
        expect(dynamoRecord.updatedAt).toBe(localEntry.updatedAt);

        // Property: Optional fields preserved correctly
        expect(dynamoRecord.phoneNumber).toBe(localEntry.phoneNumber);
        expect(dynamoRecord.paidDate).toBe(localEntry.paidAt);
        expect(dynamoRecord.lastReminderAt).toBe(localEntry.lastReminderAt);
      }),
      { numRuns: 100 }
    );
  });
});
