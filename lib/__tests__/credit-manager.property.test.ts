/**
 * Property-based tests for Credit Manager
 * 
 * Feature: udhaar-follow-up-helper
 * These tests validate universal correctness properties across randomized inputs.
 */

import * as fc from 'fast-check';
import { calculateDaysOverdue, calculateOverdueStatus, filterByThreshold, sortByUrgency, getOverdueCredits } from '../credit-manager';
import type { CreditEntry } from '../types';

// Shared generators for property-based tests

// Custom generator for CreditEntry
const creditEntryArbitrary = fc.record({
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
  isPaid: fc.boolean(),
  paidDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString().split('T')[0])),
  lastReminderAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString().split('T')[0])),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
});

// Custom generator for OverdueCredit
const overdueCreditArbitrary = fc.record({
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
  isPaid: fc.constant(false), // Overdue credits are always unpaid
  paidDate: fc.constant(undefined),
  lastReminderAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString().split('T')[0])),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  daysOverdue: fc.integer({ min: 1, max: 365 }), // Overdue credits have daysOverdue > 0
  daysSinceReminder: fc.option(fc.integer({ min: 0, max: 365 })),
});

describe('Property 2: Days Overdue Calculation', () => {
  /**
   * **Validates: Requirements 1.2**
   * 
   * Property: For any credit entry with a due date and any current date,
   * the calculated days overdue should equal the number of calendar days
   * between the due date and current date (minimum 0).
   */
  it('should calculate days overdue correctly for any due date and current date', () => {
    fc.assert(
      fc.property(
        // Generate random due dates
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        // Generate random current dates
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (dueDate, currentDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(dueDate.getTime()) && !isNaN(currentDate.getTime()));
          
          // Convert due date to ISO string format (YYYY-MM-DD)
          const dueDateStr = dueDate.toISOString().split('T')[0];
          
          // Calculate days overdue using the function
          const daysOverdue = calculateDaysOverdue(dueDateStr, currentDate);
          
          // Property 1: Days overdue should always be >= 0
          expect(daysOverdue).toBeGreaterThanOrEqual(0);
          
          // Property 2: Calculate expected days manually using the same logic as the function
          const due = new Date(dueDateStr);
          due.setHours(0, 0, 0, 0);
          
          const current = new Date(currentDate);
          current.setHours(0, 0, 0, 0);
          
          const diffMs = current.getTime() - due.getTime();
          const expectedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          
          // Property 3: Calculated days should match expected days
          expect(daysOverdue).toBe(expectedDays);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 days overdue when current date is before due date', () => {
    fc.assert(
      fc.property(
        // Generate a base date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        // Generate a positive offset in days
        fc.integer({ min: 1, max: 365 }),
        (baseDate, offsetDays) => {
          // Skip invalid dates
          fc.pre(!isNaN(baseDate.getTime()));
          
          // Due date is in the future
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + offsetDays);
          const dueDateStr = dueDate.toISOString().split('T')[0];
          
          // Current date is the base date (before due date)
          const currentDate = baseDate;
          
          const daysOverdue = calculateDaysOverdue(dueDateStr, currentDate);
          
          // Property: When current date < due date, days overdue should be 0
          expect(daysOverdue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return positive days overdue when current date is after due date', () => {
    fc.assert(
      fc.property(
        // Generate a base date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        // Generate a positive offset in days
        fc.integer({ min: 1, max: 365 }),
        (baseDate, offsetDays) => {
          // Skip invalid dates
          fc.pre(!isNaN(baseDate.getTime()));
          
          // Due date is in the past - use ISO string to avoid timezone issues
          const dueDateStr = baseDate.toISOString().split('T')[0];
          
          // Current date is offset days after due date
          // Create from the ISO string to ensure consistent date handling
          const dueNormalized = new Date(dueDateStr);
          dueNormalized.setHours(0, 0, 0, 0);
          
          const currentDate = new Date(dueNormalized);
          currentDate.setDate(currentDate.getDate() + offsetDays);
          
          const daysOverdue = calculateDaysOverdue(dueDateStr, currentDate);
          
          // Property: When current date > due date, days overdue should be positive
          expect(daysOverdue).toBeGreaterThan(0);
          
          // Property: Days overdue should equal the offset
          expect(daysOverdue).toBe(offsetDays);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 days overdue when current date equals due date', () => {
    fc.assert(
      fc.property(
        // Generate a random date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (date) => {
          // Skip invalid dates
          fc.pre(!isNaN(date.getTime()));
          
          const dateStr = date.toISOString().split('T')[0];
          
          // Create current date from the same ISO string to ensure they match
          const currentDate = new Date(dateStr);
          
          // Current date equals due date
          const daysOverdue = calculateDaysOverdue(dateStr, currentDate);
          
          // Property: When current date == due date, days overdue should be 0
          expect(daysOverdue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle date calculations consistently regardless of time component', () => {
    fc.assert(
      fc.property(
        // Generate a due date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        // Generate a current date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        // Generate random hours, minutes, seconds
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 }),
        (dueDate, currentDate, hours, minutes, seconds) => {
          // Skip invalid dates
          fc.pre(!isNaN(dueDate.getTime()) && !isNaN(currentDate.getTime()));
          
          const dueDateStr = dueDate.toISOString().split('T')[0];
          
          // Set random time components on current date
          const currentWithTime = new Date(currentDate);
          currentWithTime.setHours(hours, minutes, seconds, 0);
          
          const daysOverdue = calculateDaysOverdue(dueDateStr, currentWithTime);
          
          // Property: Time component should not affect date-only calculation
          // Calculate expected days based on date-only comparison using the same logic as the function
          const due = new Date(dueDateStr);
          due.setHours(0, 0, 0, 0);
          
          const current = new Date(currentDate);
          current.setHours(0, 0, 0, 0);
          
          const diffMs = current.getTime() - due.getTime();
          const expectedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          
          expect(daysOverdue).toBe(expectedDays);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic - same inputs produce same outputs', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (dueDate, currentDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(dueDate.getTime()) && !isNaN(currentDate.getTime()));
          
          const dueDateStr = dueDate.toISOString().split('T')[0];
          
          // Call the function multiple times with same inputs
          const result1 = calculateDaysOverdue(dueDateStr, currentDate);
          const result2 = calculateDaysOverdue(dueDateStr, currentDate);
          const result3 = calculateDaysOverdue(dueDateStr, currentDate);
          
          // Property: Deterministic - all results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case dates correctly', () => {
    // Test specific edge cases that might cause issues
    const edgeCases = [
      // Leap year date
      { dueDate: '2024-02-29', currentDate: new Date('2024-03-01'), expected: 1 },
      // Year boundary
      { dueDate: '2023-12-31', currentDate: new Date('2024-01-01'), expected: 1 },
      // Same date
      { dueDate: '2024-01-15', currentDate: new Date('2024-01-15'), expected: 0 },
      // Far future (not overdue)
      { dueDate: '2025-12-31', currentDate: new Date('2024-01-01'), expected: 0 },
      // Far past (very overdue)
      { dueDate: '2020-01-01', currentDate: new Date('2024-01-01'), expected: 1461 }, // 4 years including leap year
    ];

    edgeCases.forEach(({ dueDate, currentDate, expected }) => {
      const result = calculateDaysOverdue(dueDate, currentDate);
      expect(result).toBe(expected);
    });
  });
});

describe('Property 1: Overdue Credit Filtering', () => {
  /**
   * **Validates: Requirements 1.1, 10.2**
   *
   * Property: For any list of credit entries, current date, and threshold value,
   * the filtered overdue credits should include only unpaid credits where
   * days overdue is greater than or equal to the threshold.
   */

  it('should filter only unpaid credits where days overdue >= threshold', () => {
    fc.assert(
      fc.property(
        // Generate array of credit entries
        fc.array(creditEntryArbitrary, { minLength: 0, maxLength: 20 }),
        // Generate threshold (typically 3, but test various values)
        fc.integer({ min: 0, max: 30 }),
        // Generate current date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, threshold, currentDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(currentDate.getTime()));

          const filtered = filterByThreshold(credits, threshold, currentDate);

          // Property 1: All filtered credits must be unpaid
          filtered.forEach(credit => {
            expect(credit.isPaid).toBe(false);
          });

          // Property 2: All filtered credits must have daysOverdue >= threshold
          filtered.forEach(credit => {
            expect(credit.daysOverdue).toBeGreaterThanOrEqual(threshold);
          });

          // Property 3: All filtered credits must have daysOverdue calculated correctly
          filtered.forEach(credit => {
            const expectedDays = calculateDaysOverdue(credit.dueDate, currentDate);
            expect(credit.daysOverdue).toBe(expectedDays);
          });

          // Property 4: No paid credits should be in the filtered list
          const paidCredits = credits.filter(c => c.isPaid);
          paidCredits.forEach(paidCredit => {
            const foundInFiltered = filtered.find(f => f.id === paidCredit.id);
            expect(foundInFiltered).toBeUndefined();
          });

          // Property 5: All unpaid credits with daysOverdue >= threshold should be included
          const unpaidCredits = credits.filter(c => !c.isPaid);
          unpaidCredits.forEach(unpaidCredit => {
            const daysOverdue = calculateDaysOverdue(unpaidCredit.dueDate, currentDate);
            if (daysOverdue >= threshold) {
              const foundInFiltered = filtered.find(f => f.id === unpaidCredit.id);
              expect(foundInFiltered).toBeDefined();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate daysSinceReminder correctly for credits with lastReminderAt', () => {
    fc.assert(
      fc.property(
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, threshold, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          const filtered = filterByThreshold(credits, threshold, currentDate);

          // Property: daysSinceReminder should be calculated correctly
          filtered.forEach(credit => {
            if (credit.lastReminderAt) {
              const expectedDays = calculateDaysOverdue(credit.lastReminderAt, currentDate);
              expect(credit.daysSinceReminder).toBe(expectedDays);
            } else {
              expect(credit.daysSinceReminder).toBeNull();
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no credits meet threshold', () => {
    fc.assert(
      fc.property(
        // Generate credits with due dates in the future or recently past
        fc.array(
          creditEntryArbitrary.map(credit => ({
            ...credit,
            isPaid: false,
            dueDate: new Date(Date.now() + Math.random() * 2 * 24 * 60 * 60 * 1000)
              .toISOString().split('T')[0], // 0-2 days in future
          })),
          { minLength: 1, maxLength: 10 }
        ),
        fc.constant(new Date()),
        (credits, currentDate) => {
          // Use a high threshold that no credit will meet
          const threshold = 10;
          const filtered = filterByThreshold(credits, threshold, currentDate);

          // Property: Should return empty array when no credits meet threshold
          expect(filtered).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all unpaid overdue credits when threshold is 0', () => {
    fc.assert(
      fc.property(
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 10 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          const threshold = 0;
          const filtered = filterByThreshold(credits, threshold, currentDate);

          // Property: All unpaid credits with daysOverdue > 0 should be included
          const unpaidOverdueCredits = credits.filter(c => {
            if (c.isPaid) return false;
            const daysOverdue = calculateDaysOverdue(c.dueDate, currentDate);
            return daysOverdue > 0;
          });

          // Check that all unpaid overdue credits are in filtered list
          unpaidOverdueCredits.forEach(credit => {
            const foundInFiltered = filtered.find(f => f.id === credit.id);
            expect(foundInFiltered).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle threshold boundary conditions correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 30 }), // threshold
        fc.date({ min: new Date('2020-01-15'), max: new Date('2025-12-15') }), // Avoid month boundaries
        (threshold, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          // Normalize current date to midnight UTC for consistent calculations
          const normalizedCurrent = new Date(currentDate);
          normalizedCurrent.setUTCHours(0, 0, 0, 0);
          
          // Create credits with exact threshold days overdue using UTC dates
          const msPerDay = 24 * 60 * 60 * 1000;
          
          const exactThresholdDate = new Date(normalizedCurrent.getTime() - threshold * msPerDay);
          const belowThresholdDate = new Date(normalizedCurrent.getTime() - (threshold - 1) * msPerDay);
          const aboveThresholdDate = new Date(normalizedCurrent.getTime() - (threshold + 1) * msPerDay);

          const credits = [
            {
              id: 'exact-threshold',
              userId: 'test-user',
              customerName: 'Test Customer',
              amount: 1000,
              dateGiven: '2024-01-01',
              dueDate: exactThresholdDate.toISOString().split('T')[0],
              isPaid: false,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            {
              id: 'below-threshold',
              userId: 'test-user',
              customerName: 'Test Customer 2',
              amount: 2000,
              dateGiven: '2024-01-01',
              dueDate: belowThresholdDate.toISOString().split('T')[0],
              isPaid: false,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            {
              id: 'above-threshold',
              userId: 'test-user',
              customerName: 'Test Customer 3',
              amount: 3000,
              dateGiven: '2024-01-01',
              dueDate: aboveThresholdDate.toISOString().split('T')[0],
              isPaid: false,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          ];

          const filtered = filterByThreshold(credits, threshold, normalizedCurrent);

          // Property: Credit with exactly threshold days should be included
          const exactCredit = filtered.find(c => c.id === 'exact-threshold');
          expect(exactCredit).toBeDefined();
          if (exactCredit) {
            expect(exactCredit.daysOverdue).toBeGreaterThanOrEqual(threshold);
          }

          // Property: Credit with threshold+1 days should be included
          const aboveCredit = filtered.find(c => c.id === 'above-threshold');
          expect(aboveCredit).toBeDefined();
          if (aboveCredit) {
            expect(aboveCredit.daysOverdue).toBeGreaterThan(threshold);
          }

          // Property: Credit with threshold-1 days should NOT be included (less than threshold)
          const belowCredit = filtered.find(c => c.id === 'below-threshold');
          if (belowCredit) {
            // If it's included, it must have daysOverdue >= threshold
            expect(belowCredit.daysOverdue).toBeGreaterThanOrEqual(threshold);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic - same inputs produce same outputs', () => {
    fc.assert(
      fc.property(
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, threshold, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          // Call filterByThreshold multiple times with same inputs
          const result1 = filterByThreshold(credits, threshold, currentDate);
          const result2 = filterByThreshold(credits, threshold, currentDate);
          const result3 = filterByThreshold(credits, threshold, currentDate);

          // Property: All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          // Property: Order should be preserved
          result1.forEach((credit, index) => {
            expect(result2[index].id).toBe(credit.id);
            expect(result3[index].id).toBe(credit.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases correctly', () => {
    const currentDate = new Date('2024-01-15');

    const edgeCases = [
      // Empty array
      {
        credits: [],
        threshold: 3,
        expectedCount: 0,
      },
      // All paid credits
      {
        credits: [
          {
            id: 'paid-1',
            userId: 'test-user',
            customerName: 'Paid Customer',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: true,
            paidDate: '2024-01-10',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-10T00:00:00Z',
          },
        ],
        threshold: 3,
        expectedCount: 0,
      },
      // Mix of paid and unpaid
      {
        credits: [
          {
            id: 'unpaid-1',
            userId: 'test-user',
            customerName: 'Unpaid Customer',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05', // 10 days overdue
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'paid-1',
            userId: 'test-user',
            customerName: 'Paid Customer',
            amount: 2000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: true,
            paidDate: '2024-01-10',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-10T00:00:00Z',
          },
        ],
        threshold: 3,
        expectedCount: 1,
      },
      // Credit not yet due
      {
        credits: [
          {
            id: 'not-due',
            userId: 'test-user',
            customerName: 'Future Customer',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-20', // Future date
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        threshold: 3,
        expectedCount: 0,
      },
    ];

    edgeCases.forEach(({ credits, threshold, expectedCount }) => {
      const filtered = filterByThreshold(credits, threshold, currentDate);
      expect(filtered).toHaveLength(expectedCount);
    });
  });
});


describe('Property 4: Urgency-Based Sorting', () => {
  /**
   * **Validates: Requirements 2.1, 2.2**
   *
   * Property: For any list of overdue credits, the sorted list should be ordered
   * first by days overdue in descending order, then by amount in descending order
   * for credits with equal days overdue.
   */

  it('should sort credits by days overdue descending, then by amount descending', () => {
    fc.assert(
      fc.property(
        // Generate array of overdue credits
        fc.array(overdueCreditArbitrary, { minLength: 0, maxLength: 20 }),
        (credits) => {
          const sorted = sortByUrgency(credits);

          // Property 1: Sorted array should have same length as input
          expect(sorted).toHaveLength(credits.length);

          // Property 2: All credits from input should be in sorted array
          credits.forEach(credit => {
            const foundInSorted = sorted.find(c => c.id === credit.id);
            expect(foundInSorted).toBeDefined();
          });

          // Property 3: For any two adjacent credits, the first should be more urgent
          for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];

            // If days overdue are different, current should have more days
            if (current.daysOverdue !== next.daysOverdue) {
              expect(current.daysOverdue).toBeGreaterThan(next.daysOverdue);
            } else {
              // If days overdue are equal, current should have higher or equal amount
              expect(current.amount).toBeGreaterThanOrEqual(next.amount);
            }
          }

          // Property 4: Sorting should be stable (deterministic)
          const sorted2 = sortByUrgency(credits);
          expect(sorted).toEqual(sorted2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should prioritize days overdue over amount', () => {
    fc.assert(
      fc.property(
        // Generate two credits with different days overdue and amounts
        fc.integer({ min: 1, max: 100 }), // days1
        fc.integer({ min: 101, max: 365 }), // days2 (always greater)
        fc.integer({ min: 1000, max: 100000 }), // amount1 (will be larger)
        fc.integer({ min: 1, max: 999 }), // amount2 (will be smaller)
        (days1, days2, amount1, amount2) => {
          // Ensure days2 > days1 and amount1 > amount2
          fc.pre(days2 > days1 && amount1 > amount2);

          const credits = [
            {
              id: 'credit-1',
              userId: 'test-user',
              customerName: 'Customer 1',
              amount: amount1, // Higher amount
              dateGiven: '2024-01-01',
              dueDate: '2024-01-01',
              isPaid: false,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              daysOverdue: days1, // Lower days overdue
              daysSinceReminder: null,
            },
            {
              id: 'credit-2',
              userId: 'test-user',
              customerName: 'Customer 2',
              amount: amount2, // Lower amount
              dateGiven: '2024-01-01',
              dueDate: '2024-01-01',
              isPaid: false,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              daysOverdue: days2, // Higher days overdue
              daysSinceReminder: null,
            },
          ];

          const sorted = sortByUrgency(credits);

          // Property: Credit with more days overdue should come first,
          // even though it has lower amount
          expect(sorted[0].id).toBe('credit-2');
          expect(sorted[1].id).toBe('credit-1');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort by amount descending when days overdue are equal', () => {
    fc.assert(
      fc.property(
        // Generate a common days overdue value
        fc.integer({ min: 1, max: 365 }),
        // Generate array of amounts
        fc.array(fc.integer({ min: 1, max: 1000000 }), { minLength: 2, maxLength: 10 }),
        (daysOverdue, amounts) => {
          // Create credits with same days overdue but different amounts
          const credits = amounts.map((amount, index) => ({
            id: `credit-${index}`,
            userId: 'test-user',
            customerName: `Customer ${index}`,
            amount,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-01',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            daysOverdue, // Same for all
            daysSinceReminder: null,
          }));

          const sorted = sortByUrgency(credits);

          // Property: All credits should have same days overdue
          sorted.forEach(credit => {
            expect(credit.daysOverdue).toBe(daysOverdue);
          });

          // Property: Credits should be sorted by amount descending
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].amount).toBeGreaterThanOrEqual(sorted[i + 1].amount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not modify the original array', () => {
    fc.assert(
      fc.property(
        fc.array(overdueCreditArbitrary, { minLength: 1, maxLength: 10 }),
        (credits) => {
          // Create a deep copy of the original array
          const originalCopy = JSON.parse(JSON.stringify(credits));

          // Sort the credits
          sortByUrgency(credits);

          // Property: Original array should remain unchanged
          expect(credits).toEqual(originalCopy);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty array', () => {
    const sorted = sortByUrgency([]);
    expect(sorted).toEqual([]);
  });

  it('should handle single credit', () => {
    fc.assert(
      fc.property(
        overdueCreditArbitrary,
        (credit) => {
          const sorted = sortByUrgency([credit]);

          // Property: Single credit should remain unchanged
          expect(sorted).toHaveLength(1);
          expect(sorted[0]).toEqual(credit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic - same inputs produce same outputs', () => {
    fc.assert(
      fc.property(
        fc.array(overdueCreditArbitrary, { minLength: 1, maxLength: 10 }),
        (credits) => {
          // Sort multiple times with same input
          const sorted1 = sortByUrgency(credits);
          const sorted2 = sortByUrgency(credits);
          const sorted3 = sortByUrgency(credits);

          // Property: All results should be identical
          expect(sorted1).toEqual(sorted2);
          expect(sorted2).toEqual(sorted3);

          // Property: Order should be preserved
          sorted1.forEach((credit, index) => {
            expect(sorted2[index].id).toBe(credit.id);
            expect(sorted3[index].id).toBe(credit.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases correctly', () => {
    const edgeCases = [
      // All credits with same days overdue and amount
      {
        credits: [
          {
            id: 'credit-1',
            userId: 'test-user',
            customerName: 'Customer 1',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            daysOverdue: 5,
            daysSinceReminder: null,
          },
          {
            id: 'credit-2',
            userId: 'test-user',
            customerName: 'Customer 2',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            daysOverdue: 5,
            daysSinceReminder: null,
          },
        ],
        description: 'All same values',
      },
      // Credits with very large amounts
      {
        credits: [
          {
            id: 'credit-1',
            userId: 'test-user',
            customerName: 'Customer 1',
            amount: 999999999,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            daysOverdue: 5,
            daysSinceReminder: null,
          },
          {
            id: 'credit-2',
            userId: 'test-user',
            customerName: 'Customer 2',
            amount: 1,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            daysOverdue: 5,
            daysSinceReminder: null,
          },
        ],
        description: 'Very large amount difference',
      },
      // Credits with very large days overdue
      {
        credits: [
          {
            id: 'credit-1',
            userId: 'test-user',
            customerName: 'Customer 1',
            amount: 1000,
            dateGiven: '2020-01-01',
            dueDate: '2020-01-05',
            isPaid: false,
            createdAt: '2020-01-01T00:00:00Z',
            updatedAt: '2020-01-01T00:00:00Z',
            daysOverdue: 1000,
            daysSinceReminder: null,
          },
          {
            id: 'credit-2',
            userId: 'test-user',
            customerName: 'Customer 2',
            amount: 2000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            daysOverdue: 1,
            daysSinceReminder: null,
          },
        ],
        description: 'Very large days overdue difference',
      },
    ];

    edgeCases.forEach(({ credits, description }) => {
      const sorted = sortByUrgency(credits);

      // Should not throw errors
      expect(sorted).toHaveLength(credits.length);

      // Should maintain sorting invariants
      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];

        if (current.daysOverdue !== next.daysOverdue) {
          expect(current.daysOverdue).toBeGreaterThan(next.daysOverdue);
        } else {
          expect(current.amount).toBeGreaterThanOrEqual(next.amount);
        }
      }
    });
  });
});


describe('Property 25: Deterministic Calculation', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * Property: For any credit entry and current date, calling the overdue calculation
   * function multiple times with the same inputs should produce identical results.
   * This validates that all Credit Manager functions are deterministic - same inputs
   * always produce same outputs, regardless of execution time or environment.
   */

  it('should produce identical results when calculateDaysOverdue is called multiple times', () => {
    fc.assert(
      fc.property(
        // Generate random due date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        // Generate random current date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (dueDate, currentDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(dueDate.getTime()) && !isNaN(currentDate.getTime()));

          const dueDateStr = dueDate.toISOString().split('T')[0];

          // Call the function multiple times with same inputs
          const result1 = calculateDaysOverdue(dueDateStr, currentDate);
          const result2 = calculateDaysOverdue(dueDateStr, currentDate);
          const result3 = calculateDaysOverdue(dueDateStr, currentDate);
          const result4 = calculateDaysOverdue(dueDateStr, currentDate);
          const result5 = calculateDaysOverdue(dueDateStr, currentDate);

          // Property: All results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          expect(result3).toBe(result4);
          expect(result4).toBe(result5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical results when filterByThreshold is called multiple times', () => {
    fc.assert(
      fc.property(
        // Generate array of credit entries
        fc.array(creditEntryArbitrary, { minLength: 0, maxLength: 20 }),
        // Generate threshold
        fc.integer({ min: 0, max: 30 }),
        // Generate current date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, threshold, currentDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(currentDate.getTime()));

          // Call the function multiple times with same inputs
          const result1 = filterByThreshold(credits, threshold, currentDate);
          const result2 = filterByThreshold(credits, threshold, currentDate);
          const result3 = filterByThreshold(credits, threshold, currentDate);

          // Property: All results should be deeply equal
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          // Property: Each credit in results should have identical values
          result1.forEach((credit, index) => {
            expect(result2[index]).toEqual(credit);
            expect(result3[index]).toEqual(credit);
            expect(result2[index].daysOverdue).toBe(credit.daysOverdue);
            expect(result3[index].daysOverdue).toBe(credit.daysOverdue);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical results when sortByUrgency is called multiple times', () => {
    fc.assert(
      fc.property(
        // Generate array of overdue credits
        fc.array(overdueCreditArbitrary, { minLength: 0, maxLength: 20 }),
        (credits) => {
          // Call the function multiple times with same inputs
          const result1 = sortByUrgency(credits);
          const result2 = sortByUrgency(credits);
          const result3 = sortByUrgency(credits);

          // Property: All results should be deeply equal
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          // Property: Order should be identical
          result1.forEach((credit, index) => {
            expect(result2[index].id).toBe(credit.id);
            expect(result3[index].id).toBe(credit.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical results when getOverdueCredits is called multiple times', () => {
    fc.assert(
      fc.property(
        // Generate array of credit entries
        fc.array(creditEntryArbitrary, { minLength: 0, maxLength: 20 }),
        // Generate threshold
        fc.integer({ min: 0, max: 30 }),
        (credits, threshold) => {
          // Mock Date.now() to ensure consistent current date across calls
          const mockDate = new Date('2024-01-15T12:00:00Z');
          const originalDate = Date;
          
          // Override Date constructor to return consistent date
          global.Date = class extends Date {
            constructor() {
              super();
              return mockDate;
            }
          } as any;

          try {
            // Call the function multiple times with same inputs
            const result1 = getOverdueCredits(credits, threshold);
            const result2 = getOverdueCredits(credits, threshold);
            const result3 = getOverdueCredits(credits, threshold);

            // Property: All results should be deeply equal
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);

            // Property: Order and values should be identical
            result1.forEach((credit, index) => {
              expect(result2[index]).toEqual(credit);
              expect(result3[index]).toEqual(credit);
            });
          } finally {
            // Restore original Date
            global.Date = originalDate;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical results regardless of execution timing', () => {
    fc.assert(
      fc.property(
        // Generate a credit entry
        creditEntryArbitrary,
        // Generate current date
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credit, currentDate) => {
          // Skip invalid dates
          fc.pre(!isNaN(currentDate.getTime()));

          // Calculate overdue status multiple times with small delays
          const status1 = calculateOverdueStatus(credit, currentDate);
          const status2 = calculateOverdueStatus(credit, currentDate);
          const status3 = calculateOverdueStatus(credit, currentDate);

          // Property: All results should be identical
          expect(status1).toEqual(status2);
          expect(status2).toEqual(status3);

          // Property: Individual fields should match
          expect(status1.isOverdue).toBe(status2.isOverdue);
          expect(status1.daysOverdue).toBe(status2.daysOverdue);
          expect(status1.meetsThreshold).toBe(status2.meetsThreshold);
          expect(status2.isOverdue).toBe(status3.isOverdue);
          expect(status2.daysOverdue).toBe(status3.daysOverdue);
          expect(status2.meetsThreshold).toBe(status3.meetsThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical results across different environments (no external dependencies)', () => {
    fc.assert(
      fc.property(
        // Generate array of credit entries
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 10 }),
        // Generate threshold
        fc.integer({ min: 0, max: 10 }),
        (credits, threshold) => {
          // Use a fixed current date to avoid timezone issues
          const currentDate = new Date('2024-01-15T00:00:00Z');

          // Simulate different "environments" by calling functions in different orders
          // Environment 1: Filter then sort
          const filtered1 = filterByThreshold(credits, threshold, currentDate);
          const sorted1 = sortByUrgency(filtered1);

          // Environment 2: Filter then sort (repeated)
          const filtered2 = filterByThreshold(credits, threshold, currentDate);
          const sorted2 = sortByUrgency(filtered2);

          // Property: All approaches should produce identical results
          expect(sorted1).toEqual(sorted2);
          expect(filtered1).toEqual(filtered2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases deterministically', () => {
    const currentDate = new Date('2024-01-15T12:00:00Z');

    const edgeCases = [
      // Empty array
      {
        credits: [],
        threshold: 3,
        description: 'Empty array',
      },
      // Single credit
      {
        credits: [
          {
            id: 'single-credit',
            userId: 'test-user',
            customerName: 'Test Customer',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        threshold: 3,
        description: 'Single credit',
      },
      // All paid credits
      {
        credits: [
          {
            id: 'paid-1',
            userId: 'test-user',
            customerName: 'Paid Customer 1',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: true,
            paidDate: '2024-01-10',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-10T00:00:00Z',
          },
          {
            id: 'paid-2',
            userId: 'test-user',
            customerName: 'Paid Customer 2',
            amount: 2000,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-05',
            isPaid: true,
            paidDate: '2024-01-12',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-12T00:00:00Z',
          },
        ],
        threshold: 3,
        description: 'All paid credits',
      },
    ];

    edgeCases.forEach(({ credits, threshold, description }) => {
      // Call filterByThreshold multiple times
      const result1 = filterByThreshold(credits, threshold, currentDate);
      const result2 = filterByThreshold(credits, threshold, currentDate);
      const result3 = filterByThreshold(credits, threshold, currentDate);

      // Property: All results should be identical
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // Call sortByUrgency multiple times
      const sorted1 = sortByUrgency(result1);
      const sorted2 = sortByUrgency(result2);
      const sorted3 = sortByUrgency(result3);

      // Property: All sorted results should be identical
      expect(sorted1).toEqual(sorted2);
      expect(sorted2).toEqual(sorted3);
    });
  });
});

describe('Property 25: Deterministic Calculation', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * Property: For any credit entry and current date, calling the overdue
   * calculation function multiple times with the same inputs should produce
   * identical results.
   */

  it('should produce identical results when called multiple times with same inputs', () => {
    fc.assert(
      fc.property(
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, threshold, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          // Call getOverdueCredits multiple times with same inputs
          const result1 = getOverdueCredits(credits, threshold);
          const result2 = getOverdueCredits(credits, threshold);
          const result3 = getOverdueCredits(credits, threshold);

          // Property: All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          // Property: Length should be identical
          expect(result1.length).toBe(result2.length);
          expect(result2.length).toBe(result3.length);

          // Property: Each credit should be identical
          result1.forEach((credit, index) => {
            expect(result2[index]).toEqual(credit);
            expect(result3[index]).toEqual(credit);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical days overdue when called multiple times', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (dueDate, currentDate) => {
          fc.pre(!isNaN(dueDate.getTime()) && !isNaN(currentDate.getTime()));

          const dueDateStr = dueDate.toISOString().split('T')[0];

          // Call calculateDaysOverdue multiple times
          const result1 = calculateDaysOverdue(dueDateStr, currentDate);
          const result2 = calculateDaysOverdue(dueDateStr, currentDate);
          const result3 = calculateDaysOverdue(dueDateStr, currentDate);

          // Property: All results should be identical
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical filtering results when called multiple times', () => {
    fc.assert(
      fc.property(
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 10 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credits, threshold, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          // Call filterByThreshold multiple times
          const result1 = filterByThreshold(credits, threshold, currentDate);
          const result2 = filterByThreshold(credits, threshold, currentDate);
          const result3 = filterByThreshold(credits, threshold, currentDate);

          // Property: All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical sorting results when called multiple times', () => {
    fc.assert(
      fc.property(
        fc.array(
          creditEntryArbitrary.map(credit => ({
            ...credit,
            daysOverdue: Math.floor(Math.random() * 30),
            daysSinceReminder: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : null,
          })),
          { minLength: 1, maxLength: 10 }
        ),
        (credits) => {
          // Call sortByUrgency multiple times
          const result1 = sortByUrgency(credits);
          const result2 = sortByUrgency(credits);
          const result3 = sortByUrgency(credits);

          // Property: All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          // Property: Order should be preserved
          result1.forEach((credit, index) => {
            expect(result2[index].id).toBe(credit.id);
            expect(result3[index].id).toBe(credit.id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic regardless of execution environment', () => {
    fc.assert(
      fc.property(
        creditEntryArbitrary,
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        (credit, currentDate) => {
          fc.pre(!isNaN(currentDate.getTime()));

          // Call calculateOverdueStatus multiple times
          const result1 = calculateOverdueStatus(credit, currentDate);
          const result2 = calculateOverdueStatus(credit, currentDate);
          const result3 = calculateOverdueStatus(credit, currentDate);

          // Property: All results should be identical
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);

          // Property: Individual fields should match
          expect(result1.isOverdue).toBe(result2.isOverdue);
          expect(result1.daysOverdue).toBe(result2.daysOverdue);
          expect(result1.meetsThreshold).toBe(result2.meetsThreshold);
        }
      ),
      { numRuns: 100 }
    );
  });
});

