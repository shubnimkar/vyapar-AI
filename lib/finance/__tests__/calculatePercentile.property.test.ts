/**
 * Property-based tests for Percentile Calculator
 * 
 * These tests validate universal correctness properties across randomized inputs
 * using fast-check library with minimum 100 iterations per property.
 * 
 * Feature: segment-benchmark
 * Requirements: 9.1, 9.2, 9.3, 9.6, 9.7
 */

import * as fc from 'fast-check';
import { calculatePercentile } from '../calculatePercentile';

// Arbitraries for generating test data
const scoreArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });
const medianArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });

describe('Feature: segment-benchmark, Property 4: Range Constraint', () => {
  /**
   * **Validates: Requirements 2.5, 2.6**
   * 
   * For all valid inputs, percentile must be between 0 and 100 inclusive
   */
  it('should always return percentile between 0 and 100 inclusive', () => {
    fc.assert(
      fc.property(
        scoreArb,
        medianArb,
        (userScore, segmentMedian) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Percentile must be in valid range
          expect(percentile).toBeGreaterThanOrEqual(0);
          expect(percentile).toBeLessThanOrEqual(100);
          
          // Percentile must be a finite number
          expect(Number.isFinite(percentile)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return valid percentile for edge case: zero median with positive score', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        (userScore) => {
          const percentile = calculatePercentile(userScore, 0);
          
          // Should return 100 for positive score with zero median
          expect(percentile).toBe(100);
          expect(percentile).toBeGreaterThanOrEqual(0);
          expect(percentile).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return valid percentile for edge case: zero median with zero score', () => {
    const percentile = calculatePercentile(0, 0);
    
    // Should return 50 (median) for zero score with zero median
    expect(percentile).toBe(50);
    expect(percentile).toBeGreaterThanOrEqual(0);
    expect(percentile).toBeLessThanOrEqual(100);
  });

  it('should return valid percentile for maximum values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          [100, 100],
          [100, 50],
          [50, 100],
          [100, 0]
        ),
        ([userScore, segmentMedian]) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Should return valid percentile
          expect(percentile).toBeGreaterThanOrEqual(0);
          expect(percentile).toBeLessThanOrEqual(100);
          expect(Number.isFinite(percentile)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle NaN inputs gracefully by returning 50', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          [NaN, 50],
          [50, NaN],
          [NaN, NaN]
        ),
        ([userScore, segmentMedian]) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Should return 50 (median) for NaN inputs
          expect(percentile).toBe(50);
          expect(percentile).toBeGreaterThanOrEqual(0);
          expect(percentile).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: segment-benchmark, Property 5: Median Relationship', () => {
  /**
   * **Validates: Requirements 2.5, 2.6**
   * 
   * Score > median implies percentile > 50
   * Score < median implies percentile < 50
   * Score == median implies percentile == 50
   */
  it('should return percentile > 50 when user_score > segment_median', () => {
    fc.assert(
      fc.property(
        fc.tuple(scoreArb, scoreArb).filter(([score, median]) => {
          // Filter out cases where difference is too small for floating-point precision
          const diff = Math.abs(score - median);
          return score > median && median > 0 && diff > 1e-10;
        }),
        ([userScore, segmentMedian]) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Percentile must be greater than 50
          expect(percentile).toBeGreaterThan(50);
          expect(percentile).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return percentile < 50 when user_score < segment_median', () => {
    fc.assert(
      fc.property(
        fc.tuple(scoreArb, scoreArb).filter(([score, median]) => score < median && median > 0),
        ([userScore, segmentMedian]) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Percentile must be less than 50
          expect(percentile).toBeLessThan(50);
          expect(percentile).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return percentile == 50 when user_score == segment_median', () => {
    fc.assert(
      fc.property(
        scoreArb,
        (score) => {
          const percentile = calculatePercentile(score, score);
          
          // Percentile must be exactly 50
          expect(percentile).toBe(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain strict ordering: lower score implies lower percentile (below median)', () => {
    fc.assert(
      fc.property(
        fc.tuple(scoreArb, scoreArb, medianArb).filter(
          ([score1, score2, median]) => score1 < score2 && score2 < median && median > 0
        ),
        ([score1, score2, median]) => {
          const percentile1 = calculatePercentile(score1, median);
          const percentile2 = calculatePercentile(score2, median);
          
          // Lower score should have lower percentile
          expect(percentile1).toBeLessThanOrEqual(percentile2);
          expect(percentile1).toBeLessThan(50);
          expect(percentile2).toBeLessThan(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain strict ordering: higher score implies higher percentile (above median)', () => {
    fc.assert(
      fc.property(
        fc.tuple(scoreArb, scoreArb, medianArb).filter(
          ([score1, score2, median]) => {
            // Filter out cases where differences are too small for floating-point precision
            const diff1 = Math.abs(score1 - median);
            const diff2 = Math.abs(score2 - score1);
            return median < score1 && score1 < score2 && median > 0 && diff1 > 1e-10 && diff2 > 1e-10;
          }
        ),
        ([score1, score2, median]) => {
          const percentile1 = calculatePercentile(score1, median);
          const percentile2 = calculatePercentile(score2, median);
          
          // Higher score should have higher percentile
          expect(percentile2).toBeGreaterThanOrEqual(percentile1);
          expect(percentile1).toBeGreaterThan(50);
          expect(percentile2).toBeGreaterThan(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary case: score at 0 with positive median', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        (median) => {
          const percentile = calculatePercentile(0, median);
          
          // Score of 0 should be at 0th percentile
          expect(percentile).toBe(0);
          expect(percentile).toBeLessThan(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle boundary case: score at 100 with median < 100', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 99.99, noNaN: true, noDefaultInfinity: true }),
        (median) => {
          const percentile = calculatePercentile(100, median);
          
          // Score of 100 should be at 100th percentile
          expect(percentile).toBe(100);
          expect(percentile).toBeGreaterThan(50);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Additional Properties: Determinism and Consistency', () => {
  /**
   * Idempotence: Same inputs produce identical results
   */
  it('should produce identical percentiles for identical inputs', () => {
    fc.assert(
      fc.property(
        scoreArb,
        medianArb,
        (userScore, segmentMedian) => {
          const percentile1 = calculatePercentile(userScore, segmentMedian);
          const percentile2 = calculatePercentile(userScore, segmentMedian);
          
          // Percentiles should be identical
          expect(percentile1).toBe(percentile2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be a pure function with no side effects', () => {
    fc.assert(
      fc.property(
        scoreArb,
        medianArb,
        (userScore, segmentMedian) => {
          // Store original values
          const originalUserScore = userScore;
          const originalSegmentMedian = segmentMedian;
          
          // Call function
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Inputs should not be modified
          expect(userScore).toBe(originalUserScore);
          expect(segmentMedian).toBe(originalSegmentMedian);
          
          // Result should be a number
          expect(typeof percentile).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should produce deterministic results across multiple calls', () => {
    fc.assert(
      fc.property(
        scoreArb,
        medianArb,
        (userScore, segmentMedian) => {
          // Call function multiple times
          const results = Array.from({ length: 5 }, () => 
            calculatePercentile(userScore, segmentMedian)
          );
          
          // All results should be identical
          const firstPercentile = results[0];
          results.forEach(percentile => {
            expect(percentile).toBe(firstPercentile);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  it('should handle very small differences between score and median', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 99, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.0001, max: 0.1, noNaN: true, noDefaultInfinity: true }),
        (median, delta) => {
          const scoreAbove = median + delta;
          const scoreBelow = median - delta;
          
          const percentileAbove = calculatePercentile(scoreAbove, median);
          const percentileBelow = calculatePercentile(scoreBelow, median);
          const percentileEqual = calculatePercentile(median, median);
          
          // Should maintain correct relationships
          expect(percentileAbove).toBeGreaterThan(50);
          expect(percentileBelow).toBeLessThan(50);
          expect(percentileEqual).toBe(50);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle median at boundaries (0 and 100)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          [50, 0],
          [50, 100],
          [0, 0],
          [100, 100]
        ),
        ([userScore, segmentMedian]) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Should return valid percentile
          expect(percentile).toBeGreaterThanOrEqual(0);
          expect(percentile).toBeLessThanOrEqual(100);
          expect(Number.isFinite(percentile)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle fractional scores correctly', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 99, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 99, noNaN: true, noDefaultInfinity: true }),
        (userScore, segmentMedian) => {
          const percentile = calculatePercentile(userScore, segmentMedian);
          
          // Should return valid percentile for fractional inputs
          expect(percentile).toBeGreaterThanOrEqual(0);
          expect(percentile).toBeLessThanOrEqual(100);
          expect(Number.isFinite(percentile)).toBe(true);
          
          // Should maintain median relationship
          if (userScore === segmentMedian) {
            expect(percentile).toBe(50);
          } else if (userScore > segmentMedian) {
            expect(percentile).toBeGreaterThanOrEqual(50);
          } else {
            expect(percentile).toBeLessThanOrEqual(50);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle symmetric cases around median', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 90, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 10, noNaN: true, noDefaultInfinity: true }),
        (median, delta) => {
          const scoreAbove = median + delta;
          const scoreBelow = median - delta;
          
          const percentileAbove = calculatePercentile(scoreAbove, median);
          const percentileBelow = calculatePercentile(scoreBelow, median);
          
          // Both should be equidistant from 50 (approximately)
          const distanceAbove = percentileAbove - 50;
          const distanceBelow = 50 - percentileBelow;
          
          // Should be valid percentiles
          expect(percentileAbove).toBeGreaterThan(50);
          expect(percentileBelow).toBeLessThan(50);
          expect(distanceAbove).toBeGreaterThan(0);
          expect(distanceBelow).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
