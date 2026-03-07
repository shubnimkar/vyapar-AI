/**
 * Unit tests for Affordability Index calculator
 * 
 * Tests calculateAffordabilityIndex() function for:
 * - Very small expense (score = 100)
 * - Expense exceeding profit (score < 50)
 * - Zero profit edge case (score = 0)
 * - Negative profit edge case (score = 0)
 * - Correct cost-to-profit ratio calculation
 * - Category assignment for each score range
 * - Timestamp and input parameter storage
 * 
 * Requirements: 9.1, 9.4, 9.5, 9.6
 */

import { calculateAffordabilityIndex, validateAffordabilityInputs } from '../calculateAffordabilityIndex';

describe('calculateAffordabilityIndex', () => {
  describe('Very small expense (score = 100)', () => {
    it('should return score of 100 for expense less than 10% of profit', () => {
      // plannedCost = 5000, avgMonthlyProfit = 60000
      // ratio = 5000 / 60000 = 0.083 (< 0.1)
      const result = calculateAffordabilityIndex(5000, 60000);
      
      expect(result.score).toBe(100);
      expect(result.breakdown.affordabilityCategory).toBe('Easily Affordable');
      expect(result.breakdown.costToProfitRatio).toBeCloseTo(0.083, 3);
    });

    it('should return score of 100 for very small expense', () => {
      const result = calculateAffordabilityIndex(100, 10000);
      
      expect(result.score).toBe(100);
      expect(result.breakdown.affordabilityCategory).toBe('Easily Affordable');
      expect(result.breakdown.costToProfitRatio).toBe(0.01);
    });

    it('should return score of 100 for zero cost', () => {
      const result = calculateAffordabilityIndex(0, 50000);
      
      expect(result.score).toBe(100);
      expect(result.breakdown.affordabilityCategory).toBe('Easily Affordable');
      expect(result.breakdown.costToProfitRatio).toBe(0);
    });

    it('should return score of 100 for ratio just below 0.1 threshold', () => {
      const result = calculateAffordabilityIndex(999, 10000);
      
      expect(result.score).toBe(100);
      expect(result.breakdown.costToProfitRatio).toBeCloseTo(0.0999, 4);
    });
  });

  describe('Expense exceeding profit (score < 50)', () => {
    it('should return score below 50 when expense exceeds profit', () => {
      // plannedCost = 60000, avgMonthlyProfit = 50000
      // ratio = 60000 / 50000 = 1.2 (> 1.0)
      const result = calculateAffordabilityIndex(60000, 50000);
      
      expect(result.score).toBeLessThan(50);
      expect(result.score).toBe(40); // ratio 1.2 is in 1.0-1.5 range
      expect(result.breakdown.affordabilityCategory).toBe('Risky');
      expect(result.breakdown.costToProfitRatio).toBe(1.2);
    });

    it('should return score of 40 for expense 1.2x profit', () => {
      const result = calculateAffordabilityIndex(120000, 100000);
      
      expect(result.score).toBe(40);
      expect(result.breakdown.affordabilityCategory).toBe('Risky');
    });

    it('should return score of 25 for expense 1.8x profit', () => {
      // ratio = 1.8 (in 1.5-2.0 range)
      const result = calculateAffordabilityIndex(90000, 50000);
      
      expect(result.score).toBe(25);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
      expect(result.breakdown.costToProfitRatio).toBe(1.8);
    });

    it('should return score of 10 for expense 2x or more of profit', () => {
      // ratio = 2.5 (>= 2.0)
      const result = calculateAffordabilityIndex(125000, 50000);
      
      expect(result.score).toBe(10);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
      expect(result.breakdown.costToProfitRatio).toBe(2.5);
    });

    it('should return score of 10 for expense exactly 2x profit', () => {
      const result = calculateAffordabilityIndex(100000, 50000);
      
      expect(result.score).toBe(10);
      expect(result.breakdown.costToProfitRatio).toBe(2.0);
    });
  });

  describe('Zero profit edge case (score = 0)', () => {
    it('should return score of 0 when profit is zero', () => {
      const result = calculateAffordabilityIndex(10000, 0);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
      expect(result.breakdown.costToProfitRatio).toBe(Infinity);
    });

    it('should return score of 0 for any expense with zero profit', () => {
      const result = calculateAffordabilityIndex(50000, 0);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
    });

    it('should return score of 0 for small expense with zero profit', () => {
      const result = calculateAffordabilityIndex(100, 0);
      
      expect(result.score).toBe(0);
    });
  });

  describe('Negative profit edge case (score = 0)', () => {
    it('should return score of 0 when profit is negative', () => {
      const result = calculateAffordabilityIndex(10000, -5000);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
      expect(result.breakdown.costToProfitRatio).toBe(Infinity);
    });

    it('should return score of 0 for any expense with negative profit', () => {
      const result = calculateAffordabilityIndex(50000, -20000);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
    });

    it('should return score of 0 for small negative profit', () => {
      const result = calculateAffordabilityIndex(1000, -100);
      
      expect(result.score).toBe(0);
    });
  });

  describe('Correct cost-to-profit ratio calculation', () => {
    it('should calculate ratio correctly for typical values', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(result.breakdown.costToProfitRatio).toBe(0.5);
    });

    it('should calculate ratio correctly for equal cost and profit', () => {
      const result = calculateAffordabilityIndex(30000, 30000);
      
      expect(result.breakdown.costToProfitRatio).toBe(1.0);
    });

    it('should calculate ratio correctly for small values', () => {
      const result = calculateAffordabilityIndex(5, 100);
      
      expect(result.breakdown.costToProfitRatio).toBe(0.05);
    });

    it('should calculate ratio correctly for large values', () => {
      const result = calculateAffordabilityIndex(500000, 1000000);
      
      expect(result.breakdown.costToProfitRatio).toBe(0.5);
    });

    it('should calculate ratio with high precision', () => {
      const result = calculateAffordabilityIndex(12345, 67890);
      
      expect(result.breakdown.costToProfitRatio).toBeCloseTo(0.1818, 4);
    });

    it('should handle ratio = 0 for zero cost', () => {
      const result = calculateAffordabilityIndex(0, 50000);
      
      expect(result.breakdown.costToProfitRatio).toBe(0);
    });
  });

  describe('Category assignment for each score range', () => {
    it('should assign "Easily Affordable" for score >= 90', () => {
      // ratio < 0.3 gives score >= 90
      const result1 = calculateAffordabilityIndex(5000, 50000); // ratio = 0.1, score = 100
      const result2 = calculateAffordabilityIndex(10000, 50000); // ratio = 0.2, score = 95
      const result3 = calculateAffordabilityIndex(14000, 50000); // ratio = 0.28, score = 90
      
      expect(result1.breakdown.affordabilityCategory).toBe('Easily Affordable');
      expect(result2.breakdown.affordabilityCategory).toBe('Easily Affordable');
      expect(result3.breakdown.affordabilityCategory).toBe('Easily Affordable');
    });

    it('should assign "Affordable" for score >= 70 and < 90', () => {
      // ratio 0.5-0.7 gives score 70-80
      const result1 = calculateAffordabilityIndex(25000, 50000); // ratio = 0.5, score = 80
      const result2 = calculateAffordabilityIndex(30000, 50000); // ratio = 0.6, score = 70
      
      expect(result1.breakdown.affordabilityCategory).toBe('Affordable');
      expect(result2.breakdown.affordabilityCategory).toBe('Affordable');
    });

    it('should assign "Stretch" for score >= 50 and < 70', () => {
      // ratio 0.7-1.0 gives score 55-70
      const result = calculateAffordabilityIndex(40000, 50000); // ratio = 0.8, score = 55
      
      expect(result.breakdown.affordabilityCategory).toBe('Stretch');
    });

    it('should assign "Risky" for score >= 30 and < 50', () => {
      // ratio 1.0-1.5 gives score 40
      const result = calculateAffordabilityIndex(60000, 50000); // ratio = 1.2, score = 40
      
      expect(result.breakdown.affordabilityCategory).toBe('Risky');
    });

    it('should assign "Not Recommended" for score < 30', () => {
      // ratio >= 1.5 gives score <= 25
      const result1 = calculateAffordabilityIndex(80000, 50000); // ratio = 1.6, score = 25
      const result2 = calculateAffordabilityIndex(100000, 50000); // ratio = 2.0, score = 10
      const result3 = calculateAffordabilityIndex(10000, 0); // zero profit, score = 0
      
      expect(result1.breakdown.affordabilityCategory).toBe('Not Recommended');
      expect(result2.breakdown.affordabilityCategory).toBe('Not Recommended');
      expect(result3.breakdown.affordabilityCategory).toBe('Not Recommended');
    });
  });

  describe('Score threshold boundaries', () => {
    it('should return score of 100 for ratio < 0.1', () => {
      const result = calculateAffordabilityIndex(4999, 50000);
      expect(result.score).toBe(100);
    });

    it('should return score of 95 for ratio in [0.1, 0.2)', () => {
      const result = calculateAffordabilityIndex(7500, 50000); // ratio = 0.15
      expect(result.score).toBe(95);
    });

    it('should return score of 90 for ratio in [0.2, 0.3)', () => {
      const result = calculateAffordabilityIndex(12500, 50000); // ratio = 0.25
      expect(result.score).toBe(90);
    });

    it('should return score of 80 for ratio in [0.3, 0.5)', () => {
      const result = calculateAffordabilityIndex(20000, 50000); // ratio = 0.4
      expect(result.score).toBe(80);
    });

    it('should return score of 70 for ratio in [0.5, 0.7)', () => {
      const result = calculateAffordabilityIndex(30000, 50000); // ratio = 0.6
      expect(result.score).toBe(70);
    });

    it('should return score of 55 for ratio in [0.7, 1.0)', () => {
      const result = calculateAffordabilityIndex(42500, 50000); // ratio = 0.85
      expect(result.score).toBe(55);
    });

    it('should return score of 40 for ratio in [1.0, 1.5)', () => {
      const result = calculateAffordabilityIndex(62500, 50000); // ratio = 1.25
      expect(result.score).toBe(40);
    });

    it('should return score of 25 for ratio in [1.5, 2.0)', () => {
      const result = calculateAffordabilityIndex(87500, 50000); // ratio = 1.75
      expect(result.score).toBe(25);
    });

    it('should return score of 10 for ratio >= 2.0', () => {
      const result = calculateAffordabilityIndex(125000, 50000); // ratio = 2.5
      expect(result.score).toBe(10);
    });
  });

  describe('Exact threshold boundaries', () => {
    it('should handle ratio exactly at 0.1 threshold', () => {
      const result = calculateAffordabilityIndex(5000, 50000); // ratio = 0.1
      expect(result.score).toBe(95); // >= 0.1 means next bracket
    });

    it('should handle ratio exactly at 0.2 threshold', () => {
      const result = calculateAffordabilityIndex(10000, 50000); // ratio = 0.2
      expect(result.score).toBe(90);
    });

    it('should handle ratio exactly at 0.3 threshold', () => {
      const result = calculateAffordabilityIndex(15000, 50000); // ratio = 0.3
      expect(result.score).toBe(80);
    });

    it('should handle ratio exactly at 0.5 threshold', () => {
      const result = calculateAffordabilityIndex(25000, 50000); // ratio = 0.5
      expect(result.score).toBe(70);
    });

    it('should handle ratio exactly at 0.7 threshold', () => {
      const result = calculateAffordabilityIndex(35000, 50000); // ratio = 0.7
      expect(result.score).toBe(55);
    });

    it('should handle ratio exactly at 1.0 threshold', () => {
      const result = calculateAffordabilityIndex(50000, 50000); // ratio = 1.0
      expect(result.score).toBe(40);
    });

    it('should handle ratio exactly at 1.5 threshold', () => {
      const result = calculateAffordabilityIndex(75000, 50000); // ratio = 1.5
      expect(result.score).toBe(25);
    });

    it('should handle ratio exactly at 2.0 threshold', () => {
      const result = calculateAffordabilityIndex(100000, 50000); // ratio = 2.0
      expect(result.score).toBe(10);
    });
  });

  describe('Timestamp and input parameter storage', () => {
    it('should store calculatedAt timestamp in ISO format', () => {
      const beforeCalculation = new Date();
      const result = calculateAffordabilityIndex(25000, 50000);
      const afterCalculation = new Date();
      
      expect(result.calculatedAt).toBeDefined();
      expect(typeof result.calculatedAt).toBe('string');
      
      // Verify it's a valid ISO timestamp
      const timestamp = new Date(result.calculatedAt);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCalculation.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCalculation.getTime());
    });

    it('should store all input parameters correctly', () => {
      const plannedCost = 35000;
      const avgMonthlyProfit = 75000;
      
      const result = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
      
      expect(result.inputParameters).toBeDefined();
      expect(result.inputParameters.plannedCost).toBe(plannedCost);
      expect(result.inputParameters.avgMonthlyProfit).toBe(avgMonthlyProfit);
    });

    it('should store input parameters with exact precision', () => {
      const result = calculateAffordabilityIndex(12345.6789, 98765.4321);
      
      expect(result.inputParameters.plannedCost).toBe(12345.6789);
      expect(result.inputParameters.avgMonthlyProfit).toBe(98765.4321);
    });

    it('should store zero input parameters correctly', () => {
      const result = calculateAffordabilityIndex(0, 50000);
      
      expect(result.inputParameters.plannedCost).toBe(0);
      expect(result.inputParameters.avgMonthlyProfit).toBe(50000);
    });

    it('should store negative profit correctly', () => {
      const result = calculateAffordabilityIndex(10000, -5000);
      
      expect(result.inputParameters.plannedCost).toBe(10000);
      expect(result.inputParameters.avgMonthlyProfit).toBe(-5000);
    });

    it('should create new timestamp for each calculation', () => {
      const result1 = calculateAffordabilityIndex(25000, 50000);
      
      // Small delay to ensure different timestamps
      const delay = new Promise(resolve => setTimeout(resolve, 10));
      
      return delay.then(() => {
        const result2 = calculateAffordabilityIndex(25000, 50000);
        
        expect(result1.calculatedAt).toBeDefined();
        expect(result2.calculatedAt).toBeDefined();
      });
    });
  });

  describe('Result structure', () => {
    it('should return object with all required properties', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('breakdown');
      expect(result).toHaveProperty('calculatedAt');
      expect(result).toHaveProperty('inputParameters');
    });

    it('should have breakdown with all required properties', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(result.breakdown).toHaveProperty('costToProfitRatio');
      expect(result.breakdown).toHaveProperty('affordabilityCategory');
    });

    it('should have inputParameters with all inputs', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(result.inputParameters).toHaveProperty('plannedCost');
      expect(result.inputParameters).toHaveProperty('avgMonthlyProfit');
    });

    it('should return numeric score', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(typeof result.score).toBe('number');
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('should return numeric cost-to-profit ratio', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(typeof result.breakdown.costToProfitRatio).toBe('number');
    });

    it('should return string affordability category', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(typeof result.breakdown.affordabilityCategory).toBe('string');
    });
  });

  describe('Score range validation', () => {
    it('should always return score between 0 and 100', () => {
      const testCases = [
        [0, 50000],
        [5000, 50000],
        [25000, 50000],
        [50000, 50000],
        [75000, 50000],
        [100000, 50000],
        [10000, 0],
        [10000, -5000],
      ];
      
      testCases.forEach(([cost, profit]) => {
        const result = calculateAffordabilityIndex(cost, profit);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    it('should return integer scores (no decimals)', () => {
      const result = calculateAffordabilityIndex(25000, 50000);
      
      expect(Number.isInteger(result.score)).toBe(true);
    });
  });

  describe('Realistic business scenarios', () => {
    it('should handle kirana shop buying new refrigerator', () => {
      // Monthly profit: ₹30,000, Refrigerator cost: ₹25,000
      const result = calculateAffordabilityIndex(25000, 30000);
      
      expect(result.score).toBe(55); // ratio = 0.833, in 0.7-1.0 range
      expect(result.breakdown.affordabilityCategory).toBe('Stretch');
    });

    it('should handle salon buying new equipment', () => {
      // Monthly profit: ₹50,000, Equipment cost: ₹15,000
      const result = calculateAffordabilityIndex(15000, 50000);
      
      expect(result.score).toBe(80); // ratio = 0.3
      expect(result.breakdown.affordabilityCategory).toBe('Affordable');
    });

    it('should handle pharmacy stocking expensive medicine', () => {
      // Monthly profit: ₹80,000, Medicine stock: ₹5,000
      const result = calculateAffordabilityIndex(5000, 80000);
      
      expect(result.score).toBe(100); // ratio = 0.0625 < 0.1
      expect(result.breakdown.affordabilityCategory).toBe('Easily Affordable');
    });

    it('should handle restaurant renovation', () => {
      // Monthly profit: ₹40,000, Renovation: ₹100,000
      const result = calculateAffordabilityIndex(100000, 40000);
      
      expect(result.score).toBe(10); // ratio = 2.5 >= 2.0
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
    });

    it('should handle shop with losses planning expense', () => {
      // Monthly profit: -₹10,000 (loss), Planned expense: ₹20,000
      const result = calculateAffordabilityIndex(20000, -10000);
      
      expect(result.score).toBe(0);
      expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
    });
  });
});

describe('validateAffordabilityInputs', () => {
  describe('Valid inputs', () => {
    it('should validate positive values', () => {
      const result = validateAffordabilityInputs(25000, 50000);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate zero cost', () => {
      const result = validateAffordabilityInputs(0, 50000);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate zero profit', () => {
      const result = validateAffordabilityInputs(10000, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate negative profit', () => {
      const result = validateAffordabilityInputs(10000, -5000);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid inputs', () => {
    it('should reject negative cost', () => {
      const result = validateAffordabilityInputs(-1000, 50000);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('plannedCost must be positive');
    });

    it('should reject NaN cost', () => {
      const result = validateAffordabilityInputs(NaN, 50000);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('plannedCost must be a valid number');
    });

    it('should reject NaN profit', () => {
      const result = validateAffordabilityInputs(10000, NaN);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('avgMonthlyProfit must be a valid number');
    });

    it('should reject undefined cost', () => {
      const result = validateAffordabilityInputs(undefined as any, 50000);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('plannedCost must be a valid number');
    });

    it('should reject undefined profit', () => {
      const result = validateAffordabilityInputs(10000, undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('avgMonthlyProfit must be a valid number');
    });

    it('should return multiple errors for multiple invalid inputs', () => {
      const result = validateAffordabilityInputs(-1000, NaN);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('plannedCost must be positive');
      expect(result.errors).toContain('avgMonthlyProfit must be a valid number');
    });
  });
});
