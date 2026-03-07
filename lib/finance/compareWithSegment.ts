import { calculatePercentile } from './calculatePercentile';
import { categorizePerformance, ComparisonCategory } from './categorizePerformance';

/**
 * User metrics for comparison
 */
export interface UserMetrics {
  healthScore: number;    // 0-100
  profitMargin: number;   // 0-1 (e.g., 0.25 = 25%)
}

/**
 * Segment aggregate statistics
 */
export interface SegmentData {
  segmentKey: string;
  medianHealthScore: number;  // 0-100
  medianMargin: number;        // 0-1
  sampleSize: number;
  lastUpdated: string;         // ISO timestamp
}

/**
 * Comparison result for a single metric
 */
export interface MetricComparison {
  userValue: number;
  segmentMedian: number;
  percentile: number;
  category: ComparisonCategory;
}

/**
 * Complete benchmark comparison result
 */
export interface BenchmarkComparison {
  healthScoreComparison: MetricComparison;
  marginComparison: MetricComparison;
  segmentInfo: {
    segmentKey: string;
    sampleSize: number;
    lastUpdated: string;
  };
  calculatedAt: string;
}

/**
 * Compare user metrics with segment data
 * 
 * Pure function - no side effects, deterministic output
 * 
 * @param userMetrics - User's health score and profit margin
 * @param segmentData - Segment aggregate statistics
 * @returns Complete benchmark comparison
 */
export function compareWithSegment(
  userMetrics: UserMetrics,
  segmentData: SegmentData
): BenchmarkComparison {
  // Calculate health score comparison
  const healthPercentile = calculatePercentile(
    userMetrics.healthScore,
    segmentData.medianHealthScore
  );
  const healthCategory = categorizePerformance(healthPercentile);
  
  // Calculate margin comparison (scale margin to 0-100 for percentile calculation)
  const marginPercentile = calculatePercentile(
    userMetrics.profitMargin * 100,
    segmentData.medianMargin * 100
  );
  const marginCategory = categorizePerformance(marginPercentile);
  
  return {
    healthScoreComparison: {
      userValue: userMetrics.healthScore,
      segmentMedian: segmentData.medianHealthScore,
      percentile: healthPercentile,
      category: healthCategory
    },
    marginComparison: {
      userValue: userMetrics.profitMargin,
      segmentMedian: segmentData.medianMargin,
      percentile: marginPercentile,
      category: marginCategory
    },
    segmentInfo: {
      segmentKey: segmentData.segmentKey,
      sampleSize: segmentData.sampleSize,
      lastUpdated: segmentData.lastUpdated
    },
    calculatedAt: new Date().toISOString()
  };
}
