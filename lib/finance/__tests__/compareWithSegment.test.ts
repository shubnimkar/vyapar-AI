import { compareWithSegment, UserMetrics, SegmentData } from '../compareWithSegment';

describe('compareWithSegment', () => {
  const mockSegmentData: SegmentData = {
    segmentKey: 'SEGMENT#tier1#kirana',
    medianHealthScore: 70,
    medianMargin: 0.20,
    sampleSize: 350,
    lastUpdated: '2024-01-15T10:00:00Z'
  };

  it('should calculate comparison for user above median', () => {
    const userMetrics: UserMetrics = {
      healthScore: 85,
      profitMargin: 0.40 // Much higher margin to ensure above_average category (40% vs 20% median)
    };

    const result = compareWithSegment(userMetrics, mockSegmentData);

    // Health score comparison
    expect(result.healthScoreComparison.userValue).toBe(85);
    expect(result.healthScoreComparison.segmentMedian).toBe(70);
    expect(result.healthScoreComparison.percentile).toBeGreaterThan(50);
    expect(result.healthScoreComparison.category).toBe('above_average');

    // Margin comparison - 40% vs 20% median should be well above average
    expect(result.marginComparison.userValue).toBe(0.40);
    expect(result.marginComparison.segmentMedian).toBe(0.20);
    expect(result.marginComparison.percentile).toBeGreaterThan(60);
    expect(result.marginComparison.category).toBe('above_average');

    // Segment info
    expect(result.segmentInfo.segmentKey).toBe('SEGMENT#tier1#kirana');
    expect(result.segmentInfo.sampleSize).toBe(350);
    expect(result.segmentInfo.lastUpdated).toBe('2024-01-15T10:00:00Z');

    // Calculated at timestamp
    expect(result.calculatedAt).toBeDefined();
    expect(new Date(result.calculatedAt).getTime()).toBeGreaterThan(0);
  });

  it('should calculate comparison for user below median', () => {
    const userMetrics: UserMetrics = {
      healthScore: 50,
      profitMargin: 0.15
    };

    const result = compareWithSegment(userMetrics, mockSegmentData);

    // Health score comparison
    expect(result.healthScoreComparison.percentile).toBeLessThan(50);
    expect(result.healthScoreComparison.category).toBe('below_average');

    // Margin comparison
    expect(result.marginComparison.percentile).toBeLessThan(50);
    expect(result.marginComparison.category).toBe('below_average');
  });

  it('should calculate comparison for user at median', () => {
    const userMetrics: UserMetrics = {
      healthScore: 70,
      profitMargin: 0.20
    };

    const result = compareWithSegment(userMetrics, mockSegmentData);

    // Health score comparison
    expect(result.healthScoreComparison.percentile).toBe(50);
    expect(result.healthScoreComparison.category).toBe('at_average');

    // Margin comparison
    expect(result.marginComparison.percentile).toBe(50);
    expect(result.marginComparison.category).toBe('at_average');
  });

  it('should include all required fields in result', () => {
    const userMetrics: UserMetrics = {
      healthScore: 75,
      profitMargin: 0.22
    };

    const result = compareWithSegment(userMetrics, mockSegmentData);

    // Verify all required fields exist
    expect(result.healthScoreComparison).toBeDefined();
    expect(result.healthScoreComparison.userValue).toBeDefined();
    expect(result.healthScoreComparison.segmentMedian).toBeDefined();
    expect(result.healthScoreComparison.percentile).toBeDefined();
    expect(result.healthScoreComparison.category).toBeDefined();

    expect(result.marginComparison).toBeDefined();
    expect(result.marginComparison.userValue).toBeDefined();
    expect(result.marginComparison.segmentMedian).toBeDefined();
    expect(result.marginComparison.percentile).toBeDefined();
    expect(result.marginComparison.category).toBeDefined();

    expect(result.segmentInfo).toBeDefined();
    expect(result.segmentInfo.segmentKey).toBeDefined();
    expect(result.segmentInfo.sampleSize).toBeDefined();
    expect(result.segmentInfo.lastUpdated).toBeDefined();

    expect(result.calculatedAt).toBeDefined();
  });

  it('should be idempotent - same inputs produce identical results', () => {
    const userMetrics: UserMetrics = {
      healthScore: 75,
      profitMargin: 0.22
    };

    const result1 = compareWithSegment(userMetrics, mockSegmentData);
    const result2 = compareWithSegment(userMetrics, mockSegmentData);

    // Compare percentiles and categories (timestamps will differ)
    expect(result1.healthScoreComparison.percentile).toBe(result2.healthScoreComparison.percentile);
    expect(result1.healthScoreComparison.category).toBe(result2.healthScoreComparison.category);
    expect(result1.marginComparison.percentile).toBe(result2.marginComparison.percentile);
    expect(result1.marginComparison.category).toBe(result2.marginComparison.category);
  });

  it('should correctly scale margin values for percentile calculation', () => {
    const userMetrics: UserMetrics = {
      healthScore: 70,
      profitMargin: 0.30 // 30% margin, well above 20% median
    };

    const result = compareWithSegment(userMetrics, mockSegmentData);

    // Margin should be above average since 30% > 20%
    expect(result.marginComparison.percentile).toBeGreaterThan(50);
    expect(result.marginComparison.userValue).toBe(0.30);
    expect(result.marginComparison.segmentMedian).toBe(0.20);
  });
});
