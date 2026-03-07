/**
 * Unit tests for statistical utility functions
 */

import {
  sum,
  mean,
  standardDeviation,
  filterEntriesByDateRange,
} from '../statisticsUtils';

describe('statisticsUtils', () => {
  describe('sum', () => {
    it('should return 0 for empty array', () => {
      expect(sum([])).toBe(0);
    });

    it('should return the value for single element array', () => {
      expect(sum([5])).toBe(5);
    });

    it('should sum positive numbers correctly', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });

    it('should sum negative numbers correctly', () => {
      expect(sum([-1, -2, -3])).toBe(-6);
    });

    it('should sum mixed positive and negative numbers', () => {
      expect(sum([10, -5, 3, -2])).toBe(6);
    });

    it('should handle zero values', () => {
      expect(sum([0, 0, 0])).toBe(0);
      expect(sum([1, 0, -1])).toBe(0);
    });

    it('should handle decimal numbers', () => {
      expect(sum([1.5, 2.5, 3.0])).toBe(7.0);
    });
  });

  describe('mean', () => {
    it('should return 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('should return the value for single element array', () => {
      expect(mean([7])).toBe(7);
    });

    it('should calculate mean of positive numbers', () => {
      expect(mean([2, 4, 6, 8])).toBe(5);
    });

    it('should calculate mean of negative numbers', () => {
      expect(mean([-2, -4, -6])).toBe(-4);
    });

    it('should calculate mean of mixed numbers', () => {
      expect(mean([10, -10, 5, -5])).toBe(0);
    });

    it('should handle decimal results', () => {
      expect(mean([1, 2, 3])).toBeCloseTo(2, 5);
    });

    it('should calculate mean with known dataset', () => {
      // Dataset: [100, 200, 300, 400, 500]
      // Expected mean: 300
      expect(mean([100, 200, 300, 400, 500])).toBe(300);
    });
  });

  describe('standardDeviation', () => {
    it('should return 0 for empty array', () => {
      expect(standardDeviation([])).toBe(0);
    });

    it('should return 0 for single element array', () => {
      expect(standardDeviation([5])).toBe(0);
    });

    it('should return 0 for identical values', () => {
      expect(standardDeviation([3, 3, 3, 3])).toBe(0);
    });

    it('should calculate standard deviation for simple dataset', () => {
      // Dataset: [2, 4, 6, 8]
      // Mean: 5
      // Variance: ((2-5)^2 + (4-5)^2 + (6-5)^2 + (8-5)^2) / 3 = (9 + 1 + 1 + 9) / 3 = 20/3
      // StdDev: sqrt(20/3) ≈ 2.582
      expect(standardDeviation([2, 4, 6, 8])).toBeCloseTo(2.582, 2);
    });

    it('should calculate standard deviation for known dataset', () => {
      // Dataset: [10, 12, 23, 23, 16, 23, 21, 16]
      // Expected sample std dev ≈ 5.237
      expect(standardDeviation([10, 12, 23, 23, 16, 23, 21, 16])).toBeCloseTo(5.237, 2);
    });

    it('should handle two values', () => {
      // Dataset: [1, 3]
      // Mean: 2
      // Variance: ((1-2)^2 + (3-2)^2) / 1 = 2
      // StdDev: sqrt(2) ≈ 1.414
      expect(standardDeviation([1, 3])).toBeCloseTo(1.414, 2);
    });

    it('should handle negative numbers', () => {
      // Dataset: [-5, -3, -1, 1, 3, 5]
      // Mean: 0
      // Sample std dev ≈ 3.742
      expect(standardDeviation([-5, -3, -1, 1, 3, 5])).toBeCloseTo(3.742, 2);
    });

    it('should handle decimal numbers', () => {
      expect(standardDeviation([1.5, 2.5, 3.5, 4.5])).toBeCloseTo(1.291, 2);
    });
  });

  describe('filterEntriesByDateRange', () => {
    const createEntry = (date: string) => ({ date, value: 100 });

    it('should return empty array for empty input', () => {
      const result = filterEntriesByDateRange([], 30);
      expect(result).toEqual([]);
    });

    it('should filter entries within last N days', () => {
      const referenceDate = new Date('2024-01-15');
      const entries = [
        createEntry('2024-01-15'), // 0 days ago - included
        createEntry('2024-01-10'), // 5 days ago - included
        createEntry('2024-01-05'), // 10 days ago - included
        createEntry('2023-12-31'), // 15 days ago - included
        createEntry('2023-12-20'), // 26 days ago - included
        createEntry('2023-12-10'), // 36 days ago - excluded
      ];

      const result = filterEntriesByDateRange(entries, 30, referenceDate);
      expect(result).toHaveLength(5);
      expect(result.map(e => e.date)).toEqual([
        '2024-01-15',
        '2024-01-10',
        '2024-01-05',
        '2023-12-31',
        '2023-12-20',
      ]);
    });

    it('should include entries exactly N days ago', () => {
      const referenceDate = new Date('2024-01-15');
      const entries = [
        createEntry('2024-01-15'), // 0 days ago
        createEntry('2023-12-16'), // 30 days ago - should be included
        createEntry('2023-12-15'), // 31 days ago - should be excluded
      ];

      const result = filterEntriesByDateRange(entries, 30, referenceDate);
      expect(result).toHaveLength(2);
      expect(result.map(e => e.date)).toEqual(['2024-01-15', '2023-12-16']);
    });

    it('should use current date as default reference', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const entries = [
        createEntry(today.toISOString().split('T')[0]),
        createEntry(yesterday.toISOString().split('T')[0]),
      ];

      const result = filterEntriesByDateRange(entries, 7);
      expect(result).toHaveLength(2);
    });

    it('should handle single day range', () => {
      const referenceDate = new Date('2024-01-15');
      const entries = [
        createEntry('2024-01-15'), // today - included
        createEntry('2024-01-14'), // yesterday - included
        createEntry('2024-01-13'), // 2 days ago - excluded
      ];

      const result = filterEntriesByDateRange(entries, 1, referenceDate);
      expect(result).toHaveLength(2);
    });

    it('should handle entries on reference date', () => {
      const referenceDate = new Date('2024-01-15');
      const entries = [
        createEntry('2024-01-15'),
        createEntry('2024-01-16'), // future date - excluded
      ];

      const result = filterEntriesByDateRange(entries, 7, referenceDate);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('should handle 90 day range', () => {
      const referenceDate = new Date('2024-03-15');
      const entries = [
        createEntry('2024-03-15'), // 0 days
        createEntry('2024-01-15'), // ~60 days
        createEntry('2023-12-16'), // 90 days - included
        createEntry('2023-12-15'), // 91 days - excluded
      ];

      const result = filterEntriesByDateRange(entries, 90, referenceDate);
      expect(result).toHaveLength(3);
    });

    it('should preserve entry properties', () => {
      const referenceDate = new Date('2024-01-15');
      const entries = [
        { date: '2024-01-15', value: 100, name: 'test' },
        { date: '2024-01-10', value: 200, name: 'test2' },
      ];

      const result = filterEntriesByDateRange(entries, 30, referenceDate);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2024-01-15', value: 100, name: 'test' });
      expect(result[1]).toEqual({ date: '2024-01-10', value: 200, name: 'test2' });
    });

    it('should handle zero days range', () => {
      const referenceDate = new Date('2024-01-15');
      const entries = [
        createEntry('2024-01-15'), // today - included
        createEntry('2024-01-14'), // yesterday - excluded
      ];

      const result = filterEntriesByDateRange(entries, 0, referenceDate);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });
  });
});
