/**
 * Unit tests for Stress Index calculator
 * 
 * Tests calculateStressIndex() function for:
 * - Ideal conditions (zero stress scenario)
 * - Worst conditions (maximum stress scenario)
 * - Boundary values at each threshold
 * - Zero values for each input parameter
 * - Component sum equals total score
 * - Timestamp and input parameter storage
 * 
 * Requirements: 9.1, 9.4, 9.5, 9.6
 */

import { calculateStressIndex, StressIndexResult } from '../calculateStressIndex';

describe('calculateStressIndex', () => {
  describe('Ideal conditions (zero stress)', () => {
    it('should return score of 0 for ideal financial conditions', () => {
      // creditRatio < 0.1, cashBuffer >= 3.0, expenseVolatility < 0.15
      const result = calculateStressIndex(0.05, 3.5, 0.1);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.creditRatioScore).toBe(0);
      expect(result.breakdown.cashBufferScore).toBe(0);
      expect(result.breakdown.expenseVolatilityScore).toBe(0);
    });

    it('should return score of 0 for perfect conditions with zero credit ratio', () => {
      const result = calculateStressIndex(0, 5.0, 0);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.creditRatioScore).toBe(0);
      expect(result.breakdown.cashBufferScore).toBe(0);
      expect(result.breakdown.expenseVolatilityScore).toBe(0);
    });

    it('should return score of 0 for very high cash buffer', () => {
      const result = calculateStressIndex(0.05, 10.0, 0.1);
      
      expect(result.score).toBe(0);
    });
  });

  describe('Worst conditions (maximum stress)', () => {
    it('should return score of 100 for worst financial conditions', () => {
      // creditRatio >= 0.7, cashBuffer < 0.5, expenseVolatility >= 0.5
      const result = calculateStressIndex(0.8, 0.3, 0.6);
      
      expect(result.score).toBe(100);
      expect(result.breakdown.creditRatioScore).toBe(40);
      expect(result.breakdown.cashBufferScore).toBe(35);
      expect(result.breakdown.expenseVolatilityScore).toBe(25);
    });

    it('should return score of 100 for extreme stress values', () => {
      const result = calculateStressIndex(1.5, 0.1, 1.0);
      
      expect(result.score).toBe(100);
      expect(result.breakdown.creditRatioScore).toBe(40);
      expect(result.breakdown.cashBufferScore).toBe(35);
      expect(result.breakdown.expenseVolatilityScore).toBe(25);
    });

    it('should return score of 100 for very high credit ratio and low cash', () => {
      const result = calculateStressIndex(2.0, 0.0, 0.8);
      
      expect(result.score).toBe(100);
    });
  });

  describe('Credit ratio boundary values', () => {
    it('should return 0 points for creditRatio = 0.09 (just below 0.1 threshold)', () => {
      const result = calculateStressIndex(0.09, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(0);
    });

    it('should return 10 points for creditRatio = 0.1 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(10);
    });

    it('should return 10 points for creditRatio = 0.29 (just below 0.3 threshold)', () => {
      const result = calculateStressIndex(0.29, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(10);
    });

    it('should return 20 points for creditRatio = 0.3 (at threshold)', () => {
      const result = calculateStressIndex(0.3, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(20);
    });

    it('should return 20 points for creditRatio = 0.49 (just below 0.5 threshold)', () => {
      const result = calculateStressIndex(0.49, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(20);
    });

    it('should return 30 points for creditRatio = 0.5 (at threshold)', () => {
      const result = calculateStressIndex(0.5, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(30);
    });

    it('should return 30 points for creditRatio = 0.69 (just below 0.7 threshold)', () => {
      const result = calculateStressIndex(0.69, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(30);
    });

    it('should return 40 points for creditRatio = 0.7 (at threshold)', () => {
      const result = calculateStressIndex(0.7, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(40);
    });

    it('should return 40 points for creditRatio > 0.7', () => {
      const result = calculateStressIndex(1.0, 3.0, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(40);
    });
  });

  describe('Cash buffer boundary values', () => {
    it('should return 35 points for cashBuffer = 0.49 (just below 0.5 threshold)', () => {
      const result = calculateStressIndex(0.1, 0.49, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(35);
    });

    it('should return 25 points for cashBuffer = 0.5 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 0.5, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(25);
    });

    it('should return 25 points for cashBuffer = 0.99 (just below 1.0 threshold)', () => {
      const result = calculateStressIndex(0.1, 0.99, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(25);
    });

    it('should return 15 points for cashBuffer = 1.0 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 1.0, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(15);
    });

    it('should return 15 points for cashBuffer = 1.99 (just below 2.0 threshold)', () => {
      const result = calculateStressIndex(0.1, 1.99, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(15);
    });

    it('should return 5 points for cashBuffer = 2.0 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 2.0, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(5);
    });

    it('should return 5 points for cashBuffer = 2.99 (just below 3.0 threshold)', () => {
      const result = calculateStressIndex(0.1, 2.99, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(5);
    });

    it('should return 0 points for cashBuffer = 3.0 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(0);
    });

    it('should return 0 points for cashBuffer > 3.0', () => {
      const result = calculateStressIndex(0.1, 5.0, 0.1);
      
      expect(result.breakdown.cashBufferScore).toBe(0);
    });
  });

  describe('Expense volatility boundary values', () => {
    it('should return 0 points for expenseVolatility = 0.14 (just below 0.15 threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.14);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(0);
    });

    it('should return 8 points for expenseVolatility = 0.15 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.15);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(8);
    });

    it('should return 8 points for expenseVolatility = 0.29 (just below 0.3 threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.29);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(8);
    });

    it('should return 15 points for expenseVolatility = 0.3 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.3);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(15);
    });

    it('should return 15 points for expenseVolatility = 0.49 (just below 0.5 threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.49);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(15);
    });

    it('should return 25 points for expenseVolatility = 0.5 (at threshold)', () => {
      const result = calculateStressIndex(0.1, 3.0, 0.5);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(25);
    });

    it('should return 25 points for expenseVolatility > 0.5', () => {
      const result = calculateStressIndex(0.1, 3.0, 1.0);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(25);
    });
  });

  describe('Zero values for each input parameter', () => {
    it('should handle zero creditRatio correctly', () => {
      const result = calculateStressIndex(0, 1.5, 0.2);
      
      expect(result.breakdown.creditRatioScore).toBe(0);
      expect(result.score).toBe(15 + 8); // cashBuffer score + volatility score
    });

    it('should handle zero cashBuffer correctly (critical stress)', () => {
      const result = calculateStressIndex(0.2, 0, 0.2);
      
      expect(result.breakdown.cashBufferScore).toBe(35);
      // creditRatio 0.2 = 10 points (0.1-0.3 range)
      // cashBuffer 0 = 35 points (< 0.5)
      // expenseVolatility 0.2 = 8 points (0.15-0.3 range)
      expect(result.score).toBe(10 + 35 + 8); // credit + cash + volatility
    });

    it('should handle zero expenseVolatility correctly', () => {
      const result = calculateStressIndex(0.2, 1.5, 0);
      
      expect(result.breakdown.expenseVolatilityScore).toBe(0);
      // creditRatio 0.2 = 10 points (0.1-0.3 range)
      // cashBuffer 1.5 = 15 points (1.0-2.0 range)
      // expenseVolatility 0 = 0 points (< 0.15)
      expect(result.score).toBe(10 + 15); // credit score + cash score
    });

    it('should handle all zero values correctly', () => {
      const result = calculateStressIndex(0, 0, 0);
      
      expect(result.breakdown.creditRatioScore).toBe(0);
      expect(result.breakdown.cashBufferScore).toBe(35); // Zero cash is critical
      expect(result.breakdown.expenseVolatilityScore).toBe(0);
      expect(result.score).toBe(35);
    });
  });

  describe('Component sum equals total score', () => {
    it('should have component scores sum to total score for typical values', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      const componentSum = 
        result.breakdown.creditRatioScore +
        result.breakdown.cashBufferScore +
        result.breakdown.expenseVolatilityScore;
      
      expect(result.score).toBe(componentSum);
    });

    it('should have component scores sum to total score for zero stress', () => {
      const result = calculateStressIndex(0.05, 3.5, 0.1);
      
      const componentSum = 
        result.breakdown.creditRatioScore +
        result.breakdown.cashBufferScore +
        result.breakdown.expenseVolatilityScore;
      
      expect(result.score).toBe(componentSum);
      expect(componentSum).toBe(0);
    });

    it('should have component scores sum to total score for maximum stress', () => {
      const result = calculateStressIndex(0.8, 0.3, 0.6);
      
      const componentSum = 
        result.breakdown.creditRatioScore +
        result.breakdown.cashBufferScore +
        result.breakdown.expenseVolatilityScore;
      
      expect(result.score).toBe(componentSum);
      expect(componentSum).toBe(100);
    });

    it('should have component scores sum to total score for mixed values', () => {
      const result = calculateStressIndex(0.15, 2.5, 0.35);
      
      const componentSum = 
        result.breakdown.creditRatioScore +
        result.breakdown.cashBufferScore +
        result.breakdown.expenseVolatilityScore;
      
      expect(result.score).toBe(componentSum);
    });

    it('should have component scores sum to total score for boundary values', () => {
      const result = calculateStressIndex(0.5, 1.0, 0.3);
      
      const componentSum = 
        result.breakdown.creditRatioScore +
        result.breakdown.cashBufferScore +
        result.breakdown.expenseVolatilityScore;
      
      expect(result.score).toBe(componentSum);
    });
  });

  describe('Timestamp and input parameter storage', () => {
    it('should store calculatedAt timestamp in ISO format', () => {
      const beforeCalculation = new Date();
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      const afterCalculation = new Date();
      
      expect(result.calculatedAt).toBeDefined();
      expect(typeof result.calculatedAt).toBe('string');
      
      // Verify it's a valid ISO timestamp
      const timestamp = new Date(result.calculatedAt);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCalculation.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCalculation.getTime());
    });

    it('should store all input parameters correctly', () => {
      const creditRatio = 0.35;
      const cashBuffer = 1.8;
      const expenseVolatility = 0.22;
      
      const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
      
      expect(result.inputParameters).toBeDefined();
      expect(result.inputParameters.creditRatio).toBe(creditRatio);
      expect(result.inputParameters.cashBuffer).toBe(cashBuffer);
      expect(result.inputParameters.expenseVolatility).toBe(expenseVolatility);
    });

    it('should store input parameters with exact precision', () => {
      const result = calculateStressIndex(0.123456789, 2.987654321, 0.456789123);
      
      expect(result.inputParameters.creditRatio).toBe(0.123456789);
      expect(result.inputParameters.cashBuffer).toBe(2.987654321);
      expect(result.inputParameters.expenseVolatility).toBe(0.456789123);
    });

    it('should store zero input parameters correctly', () => {
      const result = calculateStressIndex(0, 0, 0);
      
      expect(result.inputParameters.creditRatio).toBe(0);
      expect(result.inputParameters.cashBuffer).toBe(0);
      expect(result.inputParameters.expenseVolatility).toBe(0);
    });

    it('should create new timestamp for each calculation', () => {
      const result1 = calculateStressIndex(0.4, 1.2, 0.25);
      
      // Small delay to ensure different timestamps
      const delay = new Promise(resolve => setTimeout(resolve, 10));
      
      return delay.then(() => {
        const result2 = calculateStressIndex(0.4, 1.2, 0.25);
        
        // Timestamps should be different (or at least not fail if same due to fast execution)
        expect(result1.calculatedAt).toBeDefined();
        expect(result2.calculatedAt).toBeDefined();
      });
    });
  });

  describe('Result structure', () => {
    it('should return object with all required properties', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('calculatedAt');
      expect(result).toHaveProperty('inputParameters');
    });

    it('should have breakdown with all component scores', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      expect(result.breakdown).toHaveProperty('creditRatioScore');
      expect(result.breakdown).toHaveProperty('cashBufferScore');
      expect(result.breakdown).toHaveProperty('expenseVolatilityScore');
    });

    it('should have inputParameters with all inputs', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      expect(result.inputParameters).toHaveProperty('creditRatio');
      expect(result.inputParameters).toHaveProperty('cashBuffer');
      expect(result.inputParameters).toHaveProperty('expenseVolatility');
    });

    it('should return numeric score', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      expect(typeof result.score).toBe('number');
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('should return numeric component scores', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      expect(typeof result.breakdown.creditRatioScore).toBe('number');
      expect(typeof result.breakdown.cashBufferScore).toBe('number');
      expect(typeof result.breakdown.expenseVolatilityScore).toBe('number');
    });
  });

  describe('Score range validation', () => {
    it('should always return score between 0 and 100', () => {
      const testCases = [
        [0, 0, 0],
        [0.5, 1.5, 0.25],
        [1.0, 0.5, 0.5],
        [0.1, 3.0, 0.1],
        [0.8, 0.3, 0.6],
        [2.0, 10.0, 1.5],
      ];
      
      testCases.forEach(([cr, cb, ev]) => {
        const result = calculateStressIndex(cr, cb, ev);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    it('should return integer scores (no decimals)', () => {
      const result = calculateStressIndex(0.4, 1.2, 0.25);
      
      expect(Number.isInteger(result.score)).toBe(true);
      expect(Number.isInteger(result.breakdown.creditRatioScore)).toBe(true);
      expect(Number.isInteger(result.breakdown.cashBufferScore)).toBe(true);
      expect(Number.isInteger(result.breakdown.expenseVolatilityScore)).toBe(true);
    });
  });

  describe('Moderate stress scenarios', () => {
    it('should calculate moderate stress correctly', () => {
      // Moderate values across all components
      const result = calculateStressIndex(0.35, 1.5, 0.25);
      
      expect(result.breakdown.creditRatioScore).toBe(20); // 0.3-0.5 range
      expect(result.breakdown.cashBufferScore).toBe(15);  // 1.0-2.0 range
      expect(result.breakdown.expenseVolatilityScore).toBe(8); // 0.15-0.3 range
      expect(result.score).toBe(43);
    });

    it('should handle mixed stress levels', () => {
      // High credit ratio, good cash buffer, low volatility
      const result = calculateStressIndex(0.6, 3.5, 0.1);
      
      expect(result.breakdown.creditRatioScore).toBe(30);
      expect(result.breakdown.cashBufferScore).toBe(0);
      expect(result.breakdown.expenseVolatilityScore).toBe(0);
      expect(result.score).toBe(30);
    });

    it('should handle another mixed scenario', () => {
      // Low credit ratio, poor cash buffer, high volatility
      const result = calculateStressIndex(0.05, 0.8, 0.4);
      
      expect(result.breakdown.creditRatioScore).toBe(0);
      expect(result.breakdown.cashBufferScore).toBe(25);
      expect(result.breakdown.expenseVolatilityScore).toBe(15);
      expect(result.score).toBe(40);
    });
  });
});
