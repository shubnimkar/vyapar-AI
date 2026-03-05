/**
 * Unit tests for Credit Manager - Edge Cases
 * 
 * Feature: udhaar-follow-up-helper
 * Task 2.6: Test edge cases for Credit Manager functions
 * 
 * These tests validate specific examples and edge cases:
 * - Empty credit list
 * - Credit due today (0 days overdue)
 * - Credit with due date in future
 * - Credits with equal days overdue (amount sorting)
 * - Threshold boundary conditions (exactly 3 days, 2 days, 4 days)
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2, 10.1
 */

import {
  calculateDaysOverdue,
  calculateOverdueStatus,
  filterByThreshold,
  sortByUrgency,
  getOverdueCredits,
} from '../credit-manager';
import type { CreditEntry, OverdueCredit } from '../types';

describe('Credit Manager - Edge Cases', () => {
  describe('Empty credit list', () => {
    it('should return empty array when filtering empty credit list', () => {
      const credits: CreditEntry[] = [];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when sorting empty credit list', () => {
      const credits: OverdueCredit[] = [];

      const result = sortByUrgency(credits);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when getting overdue credits from empty list', () => {
      const credits: CreditEntry[] = [];
      const threshold = 3;

      const result = getOverdueCredits(credits, threshold);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Credit due today (0 days overdue)', () => {
    it('should calculate 0 days overdue when due date equals current date', () => {
      const dueDate = '2024-01-15';
      const currentDate = new Date('2024-01-15');

      const result = calculateDaysOverdue(dueDate, currentDate);

      expect(result).toBe(0);
    });

    it('should mark credit as not overdue when due date equals current date', () => {
      const credit: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        amount: 1000,
        dateGiven: '2024-01-10',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
      };
      const currentDate = new Date('2024-01-15');

      const result = calculateOverdueStatus(credit, currentDate);

      expect(result.isOverdue).toBe(false);
      expect(result.daysOverdue).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });

    it('should exclude credit due today from overdue list with threshold 3', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Test Customer',
          amount: 1000,
          dateGiven: '2024-01-10',
          dueDate: '2024-01-15', // Due today
          isPaid: false,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(0);
    });

    it('should include credit due today when threshold is 0', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Test Customer',
          amount: 1000,
          dateGiven: '2024-01-10',
          dueDate: '2024-01-15', // Due today
          isPaid: false,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];
      const threshold = 0;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      // Credit due today has 0 days overdue, which equals threshold 0
      expect(result).toHaveLength(1);
      expect(result[0].daysOverdue).toBe(0);
    });
  });

  describe('Credit with due date in future', () => {
    it('should calculate 0 days overdue when due date is in future', () => {
      const dueDate = '2024-01-20'; // Future date
      const currentDate = new Date('2024-01-15');

      const result = calculateDaysOverdue(dueDate, currentDate);

      expect(result).toBe(0);
    });

    it('should mark credit as not overdue when due date is in future', () => {
      const credit: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        amount: 1000,
        dateGiven: '2024-01-10',
        dueDate: '2024-01-20', // Future date
        isPaid: false,
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-10T00:00:00Z',
      };
      const currentDate = new Date('2024-01-15');

      const result = calculateOverdueStatus(credit, currentDate);

      expect(result.isOverdue).toBe(false);
      expect(result.daysOverdue).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });

    it('should exclude credit with future due date from overdue list', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Test Customer',
          amount: 1000,
          dateGiven: '2024-01-10',
          dueDate: '2024-01-20', // Future date
          isPaid: false,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(0);
    });

    it('should handle multiple credits with future due dates', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 1000,
          dateGiven: '2024-01-10',
          dueDate: '2024-01-20', // 5 days in future
          isPaid: false,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 2000,
          dateGiven: '2024-01-10',
          dueDate: '2024-01-25', // 10 days in future
          isPaid: false,
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(0);
    });
  });

  describe('Credits with equal days overdue (amount sorting)', () => {
    it('should sort credits by amount descending when days overdue are equal', () => {
      const credits: OverdueCredit[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5, // Same days overdue
          daysSinceReminder: null,
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 3000, // Highest amount
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5, // Same days overdue
          daysSinceReminder: null,
        },
        {
          id: 'credit-3',
          userId: 'user-1',
          customerName: 'Customer 3',
          amount: 2000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5, // Same days overdue
          daysSinceReminder: null,
        },
      ];

      const result = sortByUrgency(credits);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('credit-2'); // 3000
      expect(result[1].id).toBe('credit-3'); // 2000
      expect(result[2].id).toBe('credit-1'); // 1000
      expect(result[0].amount).toBe(3000);
      expect(result[1].amount).toBe(2000);
      expect(result[2].amount).toBe(1000);
    });

    it('should maintain stable sort when amounts are also equal', () => {
      const credits: OverdueCredit[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5,
          daysSinceReminder: null,
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 1000, // Same amount
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5, // Same days overdue
          daysSinceReminder: null,
        },
      ];

      const result = sortByUrgency(credits);

      expect(result).toHaveLength(2);
      // Both credits have same urgency, order should be stable
      expect(result[0].daysOverdue).toBe(5);
      expect(result[1].daysOverdue).toBe(5);
      expect(result[0].amount).toBe(1000);
      expect(result[1].amount).toBe(1000);
    });

    it('should prioritize days overdue over amount', () => {
      const credits: OverdueCredit[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 5000, // Higher amount
          dateGiven: '2024-01-01',
          dueDate: '2024-01-12',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 3, // Lower days overdue
          daysSinceReminder: null,
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 1000, // Lower amount
          dateGiven: '2024-01-01',
          dueDate: '2024-01-05',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 10, // Higher days overdue
          daysSinceReminder: null,
        },
      ];

      const result = sortByUrgency(credits);

      expect(result).toHaveLength(2);
      // Credit with more days overdue should come first, despite lower amount
      expect(result[0].id).toBe('credit-2');
      expect(result[1].id).toBe('credit-1');
      expect(result[0].daysOverdue).toBe(10);
      expect(result[1].daysOverdue).toBe(3);
    });
  });

  describe('Threshold boundary conditions', () => {
    const currentDate = new Date('2024-01-15');

    it('should include credit with exactly 3 days overdue when threshold is 3', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Test Customer',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-12', // Exactly 3 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(1);
      expect(result[0].daysOverdue).toBe(3);
      expect(result[0].id).toBe('credit-1');
    });

    it('should exclude credit with exactly 2 days overdue when threshold is 3', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Test Customer',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-13', // Exactly 2 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(0);
    });

    it('should include credit with exactly 4 days overdue when threshold is 3', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Test Customer',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-11', // Exactly 4 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(1);
      expect(result[0].daysOverdue).toBe(4);
      expect(result[0].id).toBe('credit-1');
    });

    it('should correctly filter mixed credits at threshold boundary', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-14', // 1 day overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 2000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-13', // 2 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'credit-3',
          userId: 'user-1',
          customerName: 'Customer 3',
          amount: 3000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-12', // 3 days overdue (exactly threshold)
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'credit-4',
          userId: 'user-1',
          customerName: 'Customer 4',
          amount: 4000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-11', // 4 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'credit-5',
          userId: 'user-1',
          customerName: 'Customer 5',
          amount: 5000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10', // 5 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;

      const result = filterByThreshold(credits, threshold, currentDate);

      // Should include only credits with >= 3 days overdue
      expect(result).toHaveLength(3);
      expect(result.find(c => c.id === 'credit-1')).toBeUndefined(); // 1 day
      expect(result.find(c => c.id === 'credit-2')).toBeUndefined(); // 2 days
      expect(result.find(c => c.id === 'credit-3')).toBeDefined(); // 3 days
      expect(result.find(c => c.id === 'credit-4')).toBeDefined(); // 4 days
      expect(result.find(c => c.id === 'credit-5')).toBeDefined(); // 5 days
    });

    it('should handle threshold of 0 (include all overdue credits)', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-15', // 0 days overdue (due today)
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 2000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-14', // 1 day overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 0;

      const result = filterByThreshold(credits, threshold, currentDate);

      // Should include both credits (0 days and 1 day overdue)
      expect(result).toHaveLength(2);
    });

    it('should handle high threshold (exclude most credits)', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10', // 5 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 2000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-05', // 10 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 15; // High threshold

      const result = filterByThreshold(credits, threshold, currentDate);

      // Should exclude both credits (neither meets threshold)
      expect(result).toHaveLength(0);
    });
  });

  describe('Additional edge cases', () => {
    it('should exclude paid credits regardless of days overdue', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Paid Customer',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-05', // 10 days overdue
          isPaid: true, // Paid
          paidDate: '2024-01-10',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(0);
    });

    it('should handle credits with lastReminderAt field', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer with reminder',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10', // 5 days overdue
          isPaid: false,
          lastReminderAt: '2024-01-12', // Reminded 3 days ago
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-12T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(1);
      expect(result[0].daysOverdue).toBe(5);
      expect(result[0].daysSinceReminder).toBe(3);
    });

    it('should handle credits without lastReminderAt field', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer without reminder',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10', // 5 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(1);
      expect(result[0].daysOverdue).toBe(5);
      expect(result[0].daysSinceReminder).toBeNull();
    });

    it('should handle single credit in list', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Single Customer',
          amount: 1000,
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10', // 5 days overdue
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('credit-1');
    });

    it('should handle very large amounts', () => {
      const credits: OverdueCredit[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Customer 1',
          amount: 999999999, // Very large amount
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5,
          daysSinceReminder: null,
        },
        {
          id: 'credit-2',
          userId: 'user-1',
          customerName: 'Customer 2',
          amount: 1, // Very small amount
          dateGiven: '2024-01-01',
          dueDate: '2024-01-10',
          isPaid: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          daysOverdue: 5,
          daysSinceReminder: null,
        },
      ];

      const result = sortByUrgency(credits);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(999999999);
      expect(result[1].amount).toBe(1);
    });

    it('should handle very old credits (many days overdue)', () => {
      const credits: CreditEntry[] = [
        {
          id: 'credit-1',
          userId: 'user-1',
          customerName: 'Very old credit',
          amount: 1000,
          dateGiven: '2020-01-01',
          dueDate: '2020-01-05', // ~4 years overdue
          isPaid: false,
          createdAt: '2020-01-01T00:00:00Z',
          updatedAt: '2020-01-01T00:00:00Z',
        },
      ];
      const threshold = 3;
      const currentDate = new Date('2024-01-15');

      const result = filterByThreshold(credits, threshold, currentDate);

      expect(result).toHaveLength(1);
      expect(result[0].daysOverdue).toBeGreaterThan(1000);
    });
  });
});
