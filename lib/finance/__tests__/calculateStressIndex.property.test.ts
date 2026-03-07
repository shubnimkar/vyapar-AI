/**
 * Property-based tests for Stress Index calculator
 * 
 * These tests validate universal correctness properties across randomized inputs
 * using fast-check library with minimum 100 iterations per property.
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import * as fc from 'fast-check';
import { calculateStressIndex, StressIndexResult } from '../calculateStressIndex';

// Arbitraries for generating test data
const nonNegativeNumberArb = fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true });
const creditRatioArb = fc.double({ min: 0, max: 2, noNaN: true, noDefaultInfinity: true });
const cashBufferArb = fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true });
const expenseVolatilityArb = fc.double({ min: 0, max: 2, noNaN: true, noDefaultInfinity: true });

describe('Property 1: Range Constraint (Invariant)', () => {
  /**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * For all valid inputs, stress score must be in valid range [0, 100]
   */
  it('should always return score between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Score must be in valid range
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          
          // Score must be a finite number
          expect(Number.isFinite(result.score)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return integer scores (no decimals)', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Score should be an integer
          expect(Number.isInteger(result.score)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have component scores within their respective ranges', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Credit ratio score: 0-40 points
          expect(result.breakdown.creditRatioScore).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.creditRatioScore).toBeLessThanOrEqual(40);
          
          // Cash buffer score: 0-35 points
          expect(result.breakdown.cashBufferScore).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.cashBufferScore).toBeLessThanOrEqual(35);
          
          // Expense volatility score: 0-25 points
          expect(result.breakdown.expenseVolatilityScore).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.expenseVolatilityScore).toBeLessThanOrEqual(25);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Monotonicity (Metamorphic)', () => {
  /**
   * **Validates: Requirements 1.4, 1.5, 1.6**
   * 
   * Increasing credit ratio increases stress, decreasing cash buffer increases stress,
   * increasing volatility increases stress
   */
  it('should increase stress when credit ratio increases (holding other inputs constant)', () => {
    fc.assert(
      fc.property(
        fc.tuple(creditRatioArb, creditRatioArb).filter(([cr1, cr2]) => cr1 < cr2),
        cashBufferArb,
        expenseVolatilityArb,
        ([cr1, cr2], cashBuffer, expenseVolatility) => {
          const result1 = calculateStressIndex(cr1, cashBuffer, expenseVolatility);
          const result2 = calculateStressIndex(cr2, cashBuffer, expenseVolatility);
          
          // Higher credit ratio should never decrease stress
          expect(result2.score).toBeGreaterThanOrEqual(result1.score);
          
          // Credit ratio component should increase or stay same
          expect(result2.breakdown.creditRatioScore).toBeGreaterThanOrEqual(result1.breakdown.creditRatioScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increase stress when cash buffer decreases (holding other inputs constant)', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        fc.tuple(cashBufferArb, cashBufferArb).filter(([cb1, cb2]) => cb1 > cb2),
        expenseVolatilityArb,
        (creditRatio, [cb1, cb2], expenseVolatility) => {
          const result1 = calculateStressIndex(creditRatio, cb1, expenseVolatility);
          const result2 = calculateStressIndex(creditRatio, cb2, expenseVolatility);
          
          // Lower cash buffer should never decrease stress
          expect(result2.score).toBeGreaterThanOrEqual(result1.score);
          
          // Cash buffer component should increase or stay same
          expect(result2.breakdown.cashBufferScore).toBeGreaterThanOrEqual(result1.breakdown.cashBufferScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should increase stress when expense volatility increases (holding other inputs constant)', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        fc.tuple(expenseVolatilityArb, expenseVolatilityArb).filter(([ev1, ev2]) => ev1 < ev2),
        (creditRatio, cashBuffer, [ev1, ev2]) => {
          const result1 = calculateStressIndex(creditRatio, cashBuffer, ev1);
          const result2 = calculateStressIndex(creditRatio, cashBuffer, ev2);
          
          // Higher expense volatility should never decrease stress
          expect(result2.score).toBeGreaterThanOrEqual(result1.score);
          
          // Expense volatility component should increase or stay same
          expect(result2.breakdown.expenseVolatilityScore).toBeGreaterThanOrEqual(result1.breakdown.expenseVolatilityScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have maximum stress when all inputs are at worst values', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Worst case: high credit ratio, low cash buffer, high volatility
          const result = calculateStressIndex(0.8, 0.3, 0.6);
          
          // Should be maximum stress (100)
          expect(result.score).toBe(100);
          expect(result.breakdown.creditRatioScore).toBe(40);
          expect(result.breakdown.cashBufferScore).toBe(35);
          expect(result.breakdown.expenseVolatilityScore).toBe(25);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have minimum stress when all inputs are at best values', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          // Best case: low credit ratio, high cash buffer, low volatility
          const result = calculateStressIndex(0.05, 3.5, 0.1);
          
          // Should be minimum stress (0)
          expect(result.score).toBe(0);
          expect(result.breakdown.creditRatioScore).toBe(0);
          expect(result.breakdown.cashBufferScore).toBe(0);
          expect(result.breakdown.expenseVolatilityScore).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: Component Sum Consistency (Invariant)', () => {
  /**
   * **Validates: Requirements 1.3**
   * 
   * Component scores sum to total score (within 0.01 tolerance)
   */
  it('should have component scores sum exactly to total score', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          const componentSum = 
            result.breakdown.creditRatioScore +
            result.breakdown.cashBufferScore +
            result.breakdown.expenseVolatilityScore;
          
          // Components should sum to total score (within tolerance)
          expect(Math.abs(result.score - componentSum)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have all component scores as non-negative integers', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // All components should be non-negative integers
          expect(result.breakdown.creditRatioScore).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.cashBufferScore).toBeGreaterThanOrEqual(0);
          expect(result.breakdown.expenseVolatilityScore).toBeGreaterThanOrEqual(0);
          
          expect(Number.isInteger(result.breakdown.creditRatioScore)).toBe(true);
          expect(Number.isInteger(result.breakdown.cashBufferScore)).toBe(true);
          expect(Number.isInteger(result.breakdown.expenseVolatilityScore)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain component sum consistency across all possible inputs', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Verify breakdown structure exists
          expect(result.breakdown).toBeDefined();
          expect(result.breakdown.creditRatioScore).toBeDefined();
          expect(result.breakdown.cashBufferScore).toBeDefined();
          expect(result.breakdown.expenseVolatilityScore).toBeDefined();
          
          // Verify sum equals total
          const sum = 
            result.breakdown.creditRatioScore +
            result.breakdown.cashBufferScore +
            result.breakdown.expenseVolatilityScore;
          
          expect(result.score).toBe(sum);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Determinism (Idempotence)', () => {
  /**
   * **Validates: Requirements 1.7, 1.10**
   * 
   * Same inputs produce identical results
   */
  it('should produce identical scores for identical inputs', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result1 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          const result2 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Scores should be identical
          expect(result1.score).toBe(result2.score);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical breakdowns for identical inputs', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result1 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          const result2 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Breakdowns should be identical
          expect(result1.breakdown.creditRatioScore).toBe(result2.breakdown.creditRatioScore);
          expect(result1.breakdown.cashBufferScore).toBe(result2.breakdown.cashBufferScore);
          expect(result1.breakdown.expenseVolatilityScore).toBe(result2.breakdown.expenseVolatilityScore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce identical input parameters for identical inputs', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result1 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          const result2 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Input parameters should be identical
          expect(result1.inputParameters.creditRatio).toBe(result2.inputParameters.creditRatio);
          expect(result1.inputParameters.cashBuffer).toBe(result2.inputParameters.cashBuffer);
          expect(result1.inputParameters.expenseVolatility).toBe(result2.inputParameters.expenseVolatility);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be a pure function with no side effects', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          // Store original values
          const originalCreditRatio = creditRatio;
          const originalCashBuffer = cashBuffer;
          const originalExpenseVolatility = expenseVolatility;
          
          // Call function
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Inputs should not be modified
          expect(creditRatio).toBe(originalCreditRatio);
          expect(cashBuffer).toBe(originalCashBuffer);
          expect(expenseVolatility).toBe(originalExpenseVolatility);
          
          // Result should be a new object
          expect(result).toBeDefined();
          expect(typeof result).toBe('object');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce deterministic results across multiple calls', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          // Call function multiple times
          const results = Array.from({ length: 5 }, () => 
            calculateStressIndex(creditRatio, cashBuffer, expenseVolatility)
          );
          
          // All results should have identical scores
          const firstScore = results[0].score;
          results.forEach(result => {
            expect(result.score).toBe(firstScore);
          });
          
          // All results should have identical breakdowns
          const firstBreakdown = results[0].breakdown;
          results.forEach(result => {
            expect(result.breakdown.creditRatioScore).toBe(firstBreakdown.creditRatioScore);
            expect(result.breakdown.cashBufferScore).toBe(firstBreakdown.cashBufferScore);
            expect(result.breakdown.expenseVolatilityScore).toBe(firstBreakdown.expenseVolatilityScore);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Additional Properties: Result Structure', () => {
  it('should always return a complete result structure', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Required top-level properties
          expect(result).toHaveProperty('score');
          expect(result).toHaveProperty('breakdown');
          expect(result).toHaveProperty('calculatedAt');
          expect(result).toHaveProperty('inputParameters');
          
          // Breakdown properties
          expect(result.breakdown).toHaveProperty('creditRatioScore');
          expect(result.breakdown).toHaveProperty('cashBufferScore');
          expect(result.breakdown).toHaveProperty('expenseVolatilityScore');
          
          // Input parameters properties
          expect(result.inputParameters).toHaveProperty('creditRatio');
          expect(result.inputParameters).toHaveProperty('cashBuffer');
          expect(result.inputParameters).toHaveProperty('expenseVolatility');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should store input parameters with exact precision', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Input parameters should match exactly
          expect(result.inputParameters.creditRatio).toBe(creditRatio);
          expect(result.inputParameters.cashBuffer).toBe(cashBuffer);
          expect(result.inputParameters.expenseVolatility).toBe(expenseVolatility);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate valid ISO 8601 timestamps', () => {
    fc.assert(
      fc.property(
        creditRatioArb,
        cashBufferArb,
        expenseVolatilityArb,
        (creditRatio, cashBuffer, expenseVolatility) => {
          const beforeCalculation = new Date();
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          const afterCalculation = new Date();
          
          // Should be a valid ISO timestamp
          expect(result.calculatedAt).toBeDefined();
          expect(typeof result.calculatedAt).toBe('string');
          
          // Should be parseable as a date
          const timestamp = new Date(result.calculatedAt);
          expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCalculation.getTime());
          expect(timestamp.getTime()).toBeLessThanOrEqual(afterCalculation.getTime());
          
          // Should match ISO 8601 format
          expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  it('should handle zero values correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          [0, 0, 0],
          [0, 1.5, 0.2],
          [0.5, 0, 0.2],
          [0.5, 1.5, 0]
        ),
        ([creditRatio, cashBuffer, expenseVolatility]) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Should return valid result
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          
          // Component sum should equal total
          const sum = 
            result.breakdown.creditRatioScore +
            result.breakdown.cashBufferScore +
            result.breakdown.expenseVolatilityScore;
          expect(result.score).toBe(sum);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle very large values correctly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 10, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 10, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Should still return valid result
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          
          // Component sum should equal total
          const sum = 
            result.breakdown.creditRatioScore +
            result.breakdown.cashBufferScore +
            result.breakdown.expenseVolatilityScore;
          expect(result.score).toBe(sum);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle threshold boundary values correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          // Credit ratio thresholds
          [0.1, 3.0, 0.1],
          [0.3, 3.0, 0.1],
          [0.5, 3.0, 0.1],
          [0.7, 3.0, 0.1],
          // Cash buffer thresholds
          [0.1, 0.5, 0.1],
          [0.1, 1.0, 0.1],
          [0.1, 2.0, 0.1],
          [0.1, 3.0, 0.1],
          // Expense volatility thresholds
          [0.1, 3.0, 0.15],
          [0.1, 3.0, 0.3],
          [0.1, 3.0, 0.5]
        ),
        ([creditRatio, cashBuffer, expenseVolatility]) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          
          // Should return valid result at boundaries
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          
          // Component sum should equal total
          const sum = 
            result.breakdown.creditRatioScore +
            result.breakdown.cashBufferScore +
            result.breakdown.expenseVolatilityScore;
          expect(result.score).toBe(sum);
        }
      ),
      { numRuns: 100 }
    );
  });
});
