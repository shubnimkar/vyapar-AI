import fc from 'fast-check';
import { compareWithSegment, UserMetrics, SegmentData } from '../compareWithSegment';

/**
 * Property-Based Tests for Comparison Engine
 * 
 * These tests validate universal properties that should hold true
 * across all valid inputs using the fast-check library.
 */

describe('Feature: segment-benchmark, Property 7: Idempotence', () => {
  /**
   * Property 7: Comparison Engine Idempotence
   * 
   * For any valid user_metrics and segment_data, calling compareWithSegment()
   * multiple times with the same inputs must produce identical results
   * (same percentiles, same categories).
   * 
   * Validates: Requirements 2.4
   */
  it('should produce identical results for same inputs (excluding timestamp)', () => {
    fc.assert(
      fc.property(
        // Generate random user metrics
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        // Generate random segment data
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          // Call the function twice with same inputs
          const result1 = compareWithSegment(userMetrics, segmentData);
          const result2 = compareWithSegment(userMetrics, segmentData);

          // Verify percentiles are identical
          expect(result1.healthScoreComparison.percentile).toBe(
            result2.healthScoreComparison.percentile
          );
          expect(result1.marginComparison.percentile).toBe(
            result2.marginComparison.percentile
          );

          // Verify categories are identical
          expect(result1.healthScoreComparison.category).toBe(
            result2.healthScoreComparison.category
          );
          expect(result1.marginComparison.category).toBe(
            result2.marginComparison.category
          );

          // Verify user values are preserved
          expect(result1.healthScoreComparison.userValue).toBe(
            result2.healthScoreComparison.userValue
          );
          expect(result1.marginComparison.userValue).toBe(
            result2.marginComparison.userValue
          );

          // Verify segment medians are preserved
          expect(result1.healthScoreComparison.segmentMedian).toBe(
            result2.healthScoreComparison.segmentMedian
          );
          expect(result1.marginComparison.segmentMedian).toBe(
            result2.marginComparison.segmentMedian
          );

          // Verify segment info is preserved
          expect(result1.segmentInfo.segmentKey).toBe(result2.segmentInfo.segmentKey);
          expect(result1.segmentInfo.sampleSize).toBe(result2.segmentInfo.sampleSize);
          expect(result1.segmentInfo.lastUpdated).toBe(result2.segmentInfo.lastUpdated);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: segment-benchmark, Property 8: Completeness', () => {
  /**
   * Property 8: Comparison Completeness
   * 
   * For any valid user_metrics and segment_data, the comparison result
   * must include both health_score_comparison and margin_comparison
   * with all required fields (userValue, segmentMedian, percentile, category).
   * 
   * Validates: Requirements 2.5, 2.6
   */
  it('should include all required fields in health score comparison', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy',
            'SEGMENT#tier1#restaurant',
            'SEGMENT#tier3#other'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify health score comparison has all required fields
          expect(result.healthScoreComparison).toBeDefined();
          expect(typeof result.healthScoreComparison.userValue).toBe('number');
          expect(typeof result.healthScoreComparison.segmentMedian).toBe('number');
          expect(typeof result.healthScoreComparison.percentile).toBe('number');
          expect(typeof result.healthScoreComparison.category).toBe('string');
          
          // Verify category is one of the valid values
          expect(['above_average', 'at_average', 'below_average']).toContain(
            result.healthScoreComparison.category
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all required fields in margin comparison', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify margin comparison has all required fields
          expect(result.marginComparison).toBeDefined();
          expect(typeof result.marginComparison.userValue).toBe('number');
          expect(typeof result.marginComparison.segmentMedian).toBe('number');
          expect(typeof result.marginComparison.percentile).toBe('number');
          expect(typeof result.marginComparison.category).toBe('string');
          
          // Verify category is one of the valid values
          expect(['above_average', 'at_average', 'below_average']).toContain(
            result.marginComparison.category
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all required segment info fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify segment info has all required fields
          expect(result.segmentInfo).toBeDefined();
          expect(typeof result.segmentInfo.segmentKey).toBe('string');
          expect(typeof result.segmentInfo.sampleSize).toBe('number');
          expect(typeof result.segmentInfo.lastUpdated).toBe('string');
          
          // Verify segment info matches input
          expect(result.segmentInfo.segmentKey).toBe(segmentData.segmentKey);
          expect(result.segmentInfo.sampleSize).toBe(segmentData.sampleSize);
          expect(result.segmentInfo.lastUpdated).toBe(segmentData.lastUpdated);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include valid calculatedAt timestamp', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify calculatedAt is present and valid
          expect(result.calculatedAt).toBeDefined();
          expect(typeof result.calculatedAt).toBe('string');
          
          // Verify it's a valid ISO timestamp
          const timestamp = new Date(result.calculatedAt);
          expect(timestamp.getTime()).toBeGreaterThan(0);
          expect(isNaN(timestamp.getTime())).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve user metric values in comparison result', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify user values are preserved exactly
          expect(result.healthScoreComparison.userValue).toBe(userMetrics.healthScore);
          expect(result.marginComparison.userValue).toBe(userMetrics.profitMargin);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve segment median values in comparison result', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify segment medians are preserved exactly
          expect(result.healthScoreComparison.segmentMedian).toBe(
            segmentData.medianHealthScore
          );
          expect(result.marginComparison.segmentMedian).toBe(segmentData.medianMargin);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: segment-benchmark, Additional Validation Properties', () => {
  /**
   * Additional property: Percentile values should be valid numbers
   * 
   * Ensures that percentile calculations never produce NaN or Infinity
   */
  it('should produce valid percentile values (not NaN or Infinity)', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify percentiles are valid numbers
          expect(isNaN(result.healthScoreComparison.percentile)).toBe(false);
          expect(isFinite(result.healthScoreComparison.percentile)).toBe(true);
          expect(isNaN(result.marginComparison.percentile)).toBe(false);
          expect(isFinite(result.marginComparison.percentile)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Percentile values should be in valid range [0, 100]
   * 
   * This validates that the underlying calculatePercentile function
   * is working correctly within the comparison engine
   */
  it('should produce percentile values in range [0, 100]', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.record({
          segmentKey: fc.constantFrom(
            'SEGMENT#tier1#kirana',
            'SEGMENT#tier2#salon',
            'SEGMENT#tier3#pharmacy'
          ),
          medianHealthScore: fc.integer({ min: 0, max: 100 }),
          medianMargin: fc.float({ min: 0, max: 1, noNaN: true }),
          sampleSize: fc.integer({ min: 1, max: 1000 }),
          lastUpdated: fc.constant('2024-01-15T10:00:00Z')
        }),
        (userMetrics: UserMetrics, segmentData: SegmentData) => {
          const result = compareWithSegment(userMetrics, segmentData);

          // Verify percentiles are in valid range
          expect(result.healthScoreComparison.percentile).toBeGreaterThanOrEqual(0);
          expect(result.healthScoreComparison.percentile).toBeLessThanOrEqual(100);
          expect(result.marginComparison.percentile).toBeGreaterThanOrEqual(0);
          expect(result.marginComparison.percentile).toBeLessThanOrEqual(100);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Test with various segment combinations
   * 
   * Ensures the function works correctly with all valid segment types
   */
  it('should work with all valid segment key combinations', () => {
    const allSegmentKeys = [
      'SEGMENT#tier1#kirana',
      'SEGMENT#tier1#salon',
      'SEGMENT#tier1#pharmacy',
      'SEGMENT#tier1#restaurant',
      'SEGMENT#tier1#other',
      'SEGMENT#tier2#kirana',
      'SEGMENT#tier2#salon',
      'SEGMENT#tier2#pharmacy',
      'SEGMENT#tier2#restaurant',
      'SEGMENT#tier2#other',
      'SEGMENT#tier3#kirana',
      'SEGMENT#tier3#salon',
      'SEGMENT#tier3#pharmacy',
      'SEGMENT#tier3#restaurant',
      'SEGMENT#tier3#other'
    ];

    fc.assert(
      fc.property(
        fc.record({
          healthScore: fc.integer({ min: 0, max: 100 }),
          profitMargin: fc.float({ min: 0, max: 1, noNaN: true })
        }),
        fc.constantFrom(...allSegmentKeys),
        fc.integer({ min: 0, max: 100 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 1, max: 1000 }),
        (userMetrics: UserMetrics, segmentKey: string, medianHealthScore: number, medianMargin: number, sampleSize: number) => {
          const segmentData: SegmentData = {
            segmentKey,
            medianHealthScore,
            medianMargin,
            sampleSize,
            lastUpdated: '2024-01-15T10:00:00Z'
          };

          const result = compareWithSegment(userMetrics, segmentData);

          // Verify result is valid
          expect(result).toBeDefined();
          expect(result.segmentInfo.segmentKey).toBe(segmentKey);
          expect(result.healthScoreComparison).toBeDefined();
          expect(result.marginComparison).toBeDefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
