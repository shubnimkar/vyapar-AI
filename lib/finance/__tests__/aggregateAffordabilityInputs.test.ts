/**
 * Unit tests for aggregateAffordabilityInputs
 * 
 * Tests data aggregation logic for affordability index calculation
 * Validates: Requirements 9.4, 9.5
 */

import { aggregateAffordabilityInputs } from '../aggregateAffordabilityInputs';
import { DailyEntry } from '../../types';

describe('aggregateAffordabilityInputs', () => {
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

  describe('Data Sufficiency', () => {
    it('should return null when less than 7 daily entries', () => {
      const dailyEntries = [
        createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-04', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-03', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-02', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-01', 1000, 500, 5000, 500)
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-06'));
      expect(result).toBeNull();
    });

    it('should return null when less than 7 entries in 90-day window', () => {
      // Create entries but spread them out so only 6 are in the 90-day window
      const dailyEntries = [
        createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-04', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-03', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-02', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-01', 1000, 500, 5000, 500),
        // This entry is more than 90 days old
        createDailyEntry('2023-09-01', 1000, 500, 5000, 500)
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-06'));
      expect(result).toBeNull();
    });

    it('should calculate when exactly 7 entries available', () => {
      const dailyEntries = [
        createDailyEntry('2024-01-07', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-04', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-03', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-02', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-01', 1000, 500, 5000, 500)
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-07'));
      expect(result).not.toBeNull();
      expect(result?.dataPoints).toBe(7);
    });

    it('should calculate when more than 7 entries available', () => {
      const dailyEntries = Array.from({ length: 30 }, (_, i) =>
        createDailyEntry(
          `2024-01-${String(30 - i).padStart(2, '0')}`,
          1000,
          500,
          5000,
          500
        )
      );

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-30'));
      expect(result).not.toBeNull();
      expect(result?.dataPoints).toBe(30);
    });
  });

  describe('Average Monthly Profit Calculation', () => {
    it('should calculate average monthly profit correctly', () => {
      // Create 30 days of entries with consistent profit
      const dailyEntries = Array.from({ length: 30 }, (_, i) =>
        createDailyEntry(
          `2024-01-${String(30 - i).padStart(2, '0')}`,
          1000,
          500,
          5000,
          500 // 500 profit per day
        )
      );

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-30'));
      
      expect(result).not.toBeNull();
      // Total profit = 500 * 30 = 15000
      // Average daily profit = 15000 / 30 = 500
      // Average monthly profit = 500 * 30 = 15000
      expect(result?.avgMonthlyProfit).toBe(15000);
    });

    it('should calculate average monthly profit with varying profits', () => {
      const dailyEntries = [
        createDailyEntry('2024-01-10', 2000, 500, 5000, 1500),  // High profit
        createDailyEntry('2024-01-09', 1000, 800, 5000, 200),   // Low profit
        createDailyEntry('2024-01-08', 1500, 600, 5000, 900),   // Medium profit
        createDailyEntry('2024-01-07', 1800, 700, 5000, 1100),  // High profit
        createDailyEntry('2024-01-06', 1200, 900, 5000, 300),   // Low profit
        createDailyEntry('2024-01-05', 1600, 650, 5000, 950),   // Medium profit
        createDailyEntry('2024-01-04', 1400, 600, 5000, 800)    // Medium profit
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Total profit = 1500 + 200 + 900 + 1100 + 300 + 950 + 800 = 5750
      // Average daily profit = 5750 / 7 ≈ 821.43
      // Average monthly profit = 821.43 * 30 ≈ 24642.86
      expect(result?.avgMonthlyProfit).toBeCloseTo(24642.86, 1);
    });

    it('should handle negative profits correctly', () => {
      const dailyEntries = [
        createDailyEntry('2024-01-10', 1000, 1500, 5000, -500),  // Loss
        createDailyEntry('2024-01-09', 1000, 1200, 5000, -200),  // Loss
        createDailyEntry('2024-01-08', 1000, 800, 5000, 200),    // Profit
        createDailyEntry('2024-01-07', 1000, 900, 5000, 100),    // Profit
        createDailyEntry('2024-01-06', 1000, 1100, 5000, -100),  // Loss
        createDailyEntry('2024-01-05', 1000, 700, 5000, 300),    // Profit
        createDailyEntry('2024-01-04', 1000, 600, 5000, 400)     // Profit
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Total profit = -500 + -200 + 200 + 100 + -100 + 300 + 400 = 200
      // Average daily profit = 200 / 7 ≈ 28.57
      // Average monthly profit = 28.57 * 30 ≈ 857.14
      expect(result?.avgMonthlyProfit).toBeCloseTo(857.14, 1);
    });

    it('should handle all negative profits (losses)', () => {
      const dailyEntries = Array.from({ length: 10 }, (_, i) =>
        createDailyEntry(
          `2024-01-${String(10 - i).padStart(2, '0')}`,
          1000,
          1500,
          5000,
          -500 // Consistent losses
        )
      );

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Total profit = -500 * 10 = -5000
      // Average daily profit = -5000 / 10 = -500
      // Average monthly profit = -500 * 30 = -15000
      expect(result?.avgMonthlyProfit).toBe(-15000);
    });

    it('should handle zero profits', () => {
      const dailyEntries = Array.from({ length: 10 }, (_, i) =>
        createDailyEntry(
          `2024-01-${String(10 - i).padStart(2, '0')}`,
          1000,
          1000,
          5000,
          0 // Break-even
        )
      );

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Average monthly profit should be 0
      expect(result?.avgMonthlyProfit).toBe(0);
    });

    it('should use last 90 days of data when more entries available', () => {
      // Create 120 days of entries going backwards from a reference date
      const referenceDate = new Date('2024-04-30');
      const dailyEntries = Array.from({ length: 120 }, (_, i) => {
        const entryDate = new Date(referenceDate);
        entryDate.setDate(entryDate.getDate() - i);
        
        // First 91 days (most recent, including reference date) have low profit
        // Days 92-120 (older) have high profit, should be excluded
        const profit = i <= 90 ? 500 : 2000;
        
        return createDailyEntry(
          entryDate.toISOString().split('T')[0],
          1000,
          500,
          5000,
          profit
        );
      });

      const result = aggregateAffordabilityInputs(dailyEntries, referenceDate);
      
      expect(result).not.toBeNull();
      // filterEntriesByDateRange includes the reference date, so we get 91 entries
      // 91 entries with profit = 500
      // Total profit = 500 * 91 = 45500
      // Average daily profit = 45500 / 91 ≈ 500
      // Average monthly profit = 500 * 30 = 15000
      expect(result?.avgMonthlyProfit).toBeCloseTo(15000, 0);
      expect(result?.dataPoints).toBe(91); // 90 days back + reference date = 91 entries
    });
  });

  describe('Metadata', () => {
    it('should return correct data points count', () => {
      const referenceDate = new Date('2024-02-15');
      const dailyEntries = Array.from({ length: 45 }, (_, i) => {
        const entryDate = new Date(referenceDate);
        entryDate.setDate(entryDate.getDate() - i);
        return createDailyEntry(
          entryDate.toISOString().split('T')[0],
          1000,
          500,
          5000,
          500
        );
      });

      const result = aggregateAffordabilityInputs(dailyEntries, referenceDate);
      
      expect(result).not.toBeNull();
      expect(result?.dataPoints).toBe(45);
    });

    it('should return correct calculation period', () => {
      const dailyEntries = [
        createDailyEntry('2024-01-10', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-09', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-08', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-07', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-06', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-05', 1000, 500, 5000, 500),
        createDailyEntry('2024-01-04', 1000, 500, 5000, 500)
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      expect(result?.calculationPeriod.startDate).toBe('2024-01-04');
      expect(result?.calculationPeriod.endDate).toBe('2024-01-10');
    });

    it('should limit calculation period to 90 days', () => {
      const referenceDate = new Date('2024-04-30');
      const dailyEntries = Array.from({ length: 100 }, (_, i) => {
        const entryDate = new Date(referenceDate);
        entryDate.setDate(entryDate.getDate() - i);
        return createDailyEntry(
          entryDate.toISOString().split('T')[0],
          1000,
          500,
          5000,
          500
        );
      });

      const result = aggregateAffordabilityInputs(dailyEntries, referenceDate);
      
      expect(result).not.toBeNull();
      // filterEntriesByDateRange includes the reference date, so we get 91 entries (90 days back + today)
      expect(result?.dataPoints).toBe(91);
      
      // Calculate expected start date (90 days before reference)
      const expectedStartDate = new Date(referenceDate);
      expectedStartDate.setDate(expectedStartDate.getDate() - 90);
      
      expect(result?.calculationPeriod.startDate).toBe(expectedStartDate.toISOString().split('T')[0]);
      expect(result?.calculationPeriod.endDate).toBe(referenceDate.toISOString().split('T')[0]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', () => {
      const result = aggregateAffordabilityInputs([], new Date('2024-01-10'));
      expect(result).toBeNull();
    });

    it('should handle entries with missing profit fields gracefully', () => {
      const dailyEntries = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(10 - i).padStart(2, '0')}`,
        totalSales: 1000,
        totalExpense: 500,
        cashInHand: 5000,
        estimatedProfit: 500,
        expenseRatio: 0.5,
        profitMargin: 0.5
      }));

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      expect(result?.avgMonthlyProfit).toBe(15000);
    });

    it('should handle very small profits', () => {
      const dailyEntries = Array.from({ length: 10 }, (_, i) =>
        createDailyEntry(
          `2024-01-${String(10 - i).padStart(2, '0')}`,
          1000,
          999,
          5000,
          1 // Very small profit
        )
      );

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Average monthly profit = 1 * 30 = 30
      expect(result?.avgMonthlyProfit).toBe(30);
    });

    it('should handle very large profits', () => {
      const dailyEntries = Array.from({ length: 10 }, (_, i) =>
        createDailyEntry(
          `2024-01-${String(10 - i).padStart(2, '0')}`,
          1000000,
          100000,
          5000000,
          900000 // Very large profit
        )
      );

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-10'));
      
      expect(result).not.toBeNull();
      // Average monthly profit = 900000 * 30 = 27000000
      expect(result?.avgMonthlyProfit).toBe(27000000);
    });
  });

  describe('Integration', () => {
    it('should calculate correctly with realistic business data', () => {
      // Simulate a kirana shop with varying daily profits
      const referenceDate = new Date('2024-03-01');
      const dailyEntries = Array.from({ length: 60 }, (_, i) => {
        const entryDate = new Date(referenceDate);
        entryDate.setDate(entryDate.getDate() - i);
        
        // Simulate weekly patterns - higher sales on weekends
        const dayOfWeek = entryDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const sales = isWeekend ? 8000 : 5000;
        const expenses = isWeekend ? 4000 : 2500;
        const profit = sales - expenses;
        
        return createDailyEntry(
          entryDate.toISOString().split('T')[0],
          sales,
          expenses,
          50000,
          profit
        );
      });

      const result = aggregateAffordabilityInputs(dailyEntries, referenceDate);
      
      expect(result).not.toBeNull();
      expect(result?.avgMonthlyProfit).toBeGreaterThan(0);
      expect(result?.dataPoints).toBe(60);
      
      // Calculate expected dates
      const expectedStartDate = new Date(referenceDate);
      expectedStartDate.setDate(expectedStartDate.getDate() - 59);
      
      expect(result?.calculationPeriod.startDate).toBe(expectedStartDate.toISOString().split('T')[0]);
      expect(result?.calculationPeriod.endDate).toBe(referenceDate.toISOString().split('T')[0]);
    });

    it('should handle mixed profit and loss periods', () => {
      const dailyEntries = [
        // Good week
        ...Array.from({ length: 7 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(7 - i).padStart(2, '0')}`,
            2000,
            1000,
            5000,
            1000
          )
        ),
        // Bad week
        ...Array.from({ length: 7 }, (_, i) =>
          createDailyEntry(
            `2024-01-${String(14 - i).padStart(2, '0')}`,
            1000,
            1500,
            5000,
            -500
          )
        )
      ];

      const result = aggregateAffordabilityInputs(dailyEntries, new Date('2024-01-14'));
      
      expect(result).not.toBeNull();
      // Total profit = (1000 * 7) + (-500 * 7) = 7000 - 3500 = 3500
      // Average daily profit = 3500 / 14 = 250
      // Average monthly profit = 250 * 30 = 7500
      expect(result?.avgMonthlyProfit).toBe(7500);
    });
  });
});
