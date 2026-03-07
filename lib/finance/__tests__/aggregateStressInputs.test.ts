/**
 * Unit tests for aggregateStressInputs
 * 
 * Tests data aggregation logic for stress index calculation
 * Validates: Requirements 9.4, 9.5
 */

import { aggregateStressInputs, HistoricalData } from '../aggregateStressInputs';
import { DailyEntry, CreditEntry } from '../../types';

describe('aggregateStressInputs', () => {
  // Helper to create daily entries
  const createDailyEntry = (
    date: string,
    totalSales: number,
    totalExpense: number,
    cashInHand: number,
    estimatedProfit: number
  ): DailyEntry => ({
    date,
    totalSales,
    totalExpense,
    cashInHand,
    estimatedProfit,
    expenseRatio: totalExpense / totalSales,
    profitMargin: estimatedProfit / totalSales
  });

  // Helper to create credit entry
  const createCreditEntry = (
    id: string,
    amount: number,
    isPaid: boolean,
    dateGiven: string
  ): CreditEntry => ({
    id,
    userId: 'user123',
    customerName: `Customer ${id}`,
    amount,
    dateGiven,
    dueDate: dateGiven,
    isPaid,
    createdAt: dateGiven,
    updatedAt: dateGiven
  });

  describe('Data Sufficiency', () => {
    it('should return null when less than 7 daily entries', () => {
      const data: HistoricalData = {
        dailyEntries: [
          createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-04', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-03', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-02', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-01', 1000, 500, 5000, 500)
        ],
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-06'));
      expect(result).toBeNull();
    });

    it('should return null when less than 7 entries in 30-day window', () => {
      // Create entries but spread them out so only 6 are in the 30-day window
      const data: HistoricalData = {
        dailyEntries: [
          createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-04', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-03', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-02', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-01', 1000, 500, 5000, 500),
          // This entry is more than 30 days old
          createDailyEntry('2023-11-01', 1000, 500, 5000, 500)
        ],
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-06'));
      expect(result).toBeNull();
    });

    it('should calculate when exactly 7 entries available', () => {
      const data: HistoricalData = {
        dailyEntries: [
          createDailyEntry('2024-01-07', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-04', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-03', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-02', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-01', 1000, 500, 5000, 500)
        ],
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-07'));
      expect(result).not.toBeNull();
      expect(result?.dataPoints).toBe(7);
    });
  });

  describe('Credit Ratio Calculation', () => {
    it('should calculate credit ratio with mixed paid/unpaid credits', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            1000,
            500,
            5000,
            500
          )
        ),
        creditEntries: [
          createCreditEntry('c1', 2000, false, '2024-01-05'), // Unpaid
          createCreditEntry('c2', 1500, false, '2024-01-03'), // Unpaid
          createCreditEntry('c3', 1000, true, '2024-01-02'),  // Paid - should not count
          createCreditEntry('c4', 500, true, '2024-01-01')    // Paid - should not count
        ]
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Total sales = 1000 * 10 = 10000
      // Unpaid credits = 2000 + 1500 = 3500
      // Credit ratio = 3500 / 10000 = 0.35
      expect(result?.creditRatio).toBeCloseTo(0.35, 2);
    });

    it('should only count unpaid credits', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            1000,
            500,
            5000,
            500
          )
        ),
        creditEntries: [
          createCreditEntry('c1', 1000, true, '2024-01-05'),  // Paid
          createCreditEntry('c2', 1000, true, '2024-01-03'),  // Paid
          createCreditEntry('c3', 1000, true, '2024-01-02')   // Paid
        ]
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // All credits are paid, so credit ratio should be 0
      expect(result?.creditRatio).toBe(0);
    });

    it('should return credit ratio of 0 when total sales is 0', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            0, // Zero sales
            500,
            5000,
            -500
          )
        ),
        creditEntries: [
          createCreditEntry('c1', 2000, false, '2024-01-05')
        ]
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Zero sales means credit ratio is 0 (no credit exposure)
      expect(result?.creditRatio).toBe(0);
    });

    it('should calculate credit ratio with no credits', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            1000,
            500,
            5000,
            500
          )
        ),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // No credits means credit ratio is 0
      expect(result?.creditRatio).toBe(0);
    });
  });

  describe('Cash Buffer Calculation', () => {
    it('should calculate cash buffer with 90 days of data', () => {
      // Create 90 days of entries with consistent expenses
      const referenceDate = new Date('2024-04-30');
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 90 }, (_, i) => {
          const entryDate = new Date(referenceDate);
          entryDate.setDate(entryDate.getDate() - i);
          return createDailyEntry(
            entryDate.toISOString().split('T')[0],
            1000,
            500, // 500 per day
            10000, // Latest cash in hand
            500
          );
        }),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, referenceDate);
      
      expect(result).not.toBeNull();
      // Average daily expenses = 500
      // Average monthly expenses = 500 * 30 = 15000
      // Latest cash in hand = 10000 (from first entry)
      // Cash buffer = 10000 / 15000 = 0.6667
      expect(result?.cashBuffer).toBeCloseTo(0.6667, 2);
    });

    it('should use latest cash in hand value', () => {
      const data: HistoricalData = {
        dailyEntries: [
          createDailyEntry('2024-01-10', 1000, 500, 8000, 500), // Latest - should use this
          createDailyEntry('2024-01-09', 1000, 500, 7000, 500),
          createDailyEntry('2024-01-08', 1000, 500, 6000, 500),
          createDailyEntry('2024-01-07', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-06', 1000, 500, 4000, 500),
          createDailyEntry('2024-01-05', 1000, 500, 3000, 500),
          createDailyEntry('2024-01-04', 1000, 500, 2000, 500)
        ],
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Should use 8000 (latest cash in hand)
      // Average monthly expenses = 500 * 30 = 15000
      // Cash buffer = 8000 / 15000 = 0.5333
      expect(result?.cashBuffer).toBeCloseTo(0.5333, 2);
    });

    it('should return cash buffer of 0 when average expenses is 0', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            1000,
            0, // Zero expenses
            5000,
            1000
          )
        ),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Zero expenses means cash buffer is 0 (can't calculate buffer)
      expect(result?.cashBuffer).toBe(0);
    });

    it('should handle missing cashInHand gracefully', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) => ({
          date: `2024-01-${String(10 - i).padStart(2, '0')}`,
          totalSales: 1000,
          totalExpense: 500,
          // cashInHand is undefined
          estimatedProfit: 500,
          expenseRatio: 0.5,
          profitMargin: 0.5
        })),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Missing cashInHand should default to 0
      expect(result?.cashBuffer).toBe(0);
    });
  });

  describe('Expense Volatility Calculation', () => {
    it('should calculate expense volatility with varying expenses', () => {
      const data: HistoricalData = {
        dailyEntries: [
          createDailyEntry('2024-01-10', 1000, 1000, 5000, 0),  // High expense
          createDailyEntry('2024-01-09', 1000, 200, 5000, 800),  // Low expense
          createDailyEntry('2024-01-08', 1000, 800, 5000, 200),  // Medium-high
          createDailyEntry('2024-01-07', 1000, 300, 5000, 700),  // Low-medium
          createDailyEntry('2024-01-06', 1000, 900, 5000, 100),  // High
          createDailyEntry('2024-01-05', 1000, 400, 5000, 600),  // Medium
          createDailyEntry('2024-01-04', 1000, 600, 5000, 400)   // Medium
        ],
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Expenses: [1000, 200, 800, 300, 900, 400, 600]
      // Mean = 600
      // Std dev ≈ 303.11
      // Volatility = 303.11 / 600 ≈ 0.505
      expect(result?.expenseVolatility).toBeGreaterThan(0.4);
      expect(result?.expenseVolatility).toBeLessThan(0.6);
    });

    it('should return low volatility for stable expenses', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            1000,
            500, // Consistent expenses
            5000,
            500
          )
        ),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // All expenses are 500, so std dev = 0
      // Volatility = 0 / 500 = 0
      expect(result?.expenseVolatility).toBe(0);
    });

    it('should return volatility of 0 when average expense is 0', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 10 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(10 - i).padStart(2, '0')}`,
            1000,
            0, // Zero expenses
            5000,
            1000
          )
        ),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Zero average expense means volatility is 0
      expect(result?.expenseVolatility).toBe(0);
    });
  });

  describe('Metadata', () => {
    it('should return correct data points count', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 15 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(15 - i).padStart(2, '0')}`,
            1000,
            500,
            5000,
            500
          )
        ),
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-15'));
      
      expect(result).not.toBeNull();
      expect(result?.dataPoints).toBe(15);
    });

    it('should return correct calculation period', () => {
      const data: HistoricalData = {
        dailyEntries: [
          createDailyEntry('2024-01-10', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-09', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-08', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-07', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
          createDailyEntry('2024-01-04', 1000, 500, 5000, 500)
        ],
        creditEntries: []
      };

      const result = aggregateStressInputs(data, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      expect(result?.calculationPeriod.startDate).toBe('2024-01-04');
      expect(result?.calculationPeriod.endDate).toBe('2024-01-10');
    });
  });

  describe('Integration', () => {
    it('should calculate all metrics correctly with realistic data', () => {
      const data: HistoricalData = {
        dailyEntries: Array.from({ length: 30 }, (_, i) => {
          const day = 30 - i;
          return createDailyEntry(
            `2024-01-${String(day).padStart(2, '0')}`,
            5000 + Math.random() * 1000, // Sales vary 5000-6000
            2000 + Math.random() * 500,  // Expenses vary 2000-2500
            50000, // Consistent cash
            3000
          );
        }),
        creditEntries: [
          createCreditEntry('c1', 10000, false, '2024-01-15'),
          createCreditEntry('c2', 5000, false, '2024-01-10'),
          createCreditEntry('c3', 3000, true, '2024-01-05')
        ]
      };

      const result = aggregateStressInputs(data, new Date('2024-01-30'));
      
      expect(result).not.toBeNull();
      expect(result?.creditRatio).toBeGreaterThan(0);
      expect(result?.cashBuffer).toBeGreaterThan(0);
      expect(result?.expenseVolatility).toBeGreaterThan(0);
      expect(result?.dataPoints).toBe(30);
    });
  });
});
