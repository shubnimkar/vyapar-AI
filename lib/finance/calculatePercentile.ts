/**
 * Calculate percentile rank of user score relative to segment median
 * 
 * Pure function - no side effects, deterministic output
 * 
 * Uses simplified percentile calculation:
 * - If user_score > median: percentile = 50 + ((user_score - median) / (100 - median)) * 50
 * - If user_score < median: percentile = (user_score / median) * 50
 * - If user_score == median: percentile = 50
 * 
 * @param userScore - User's metric value (0-100 for health score, 0-1 for margin)
 * @param segmentMedian - Segment's median value
 * @returns Percentile rank (0-100)
 */
export function calculatePercentile(
  userScore: number,
  segmentMedian: number
): number {
  // Handle edge cases
  if (isNaN(userScore) || isNaN(segmentMedian)) {
    return 50; // Default to median if invalid input
  }
  
  if (segmentMedian === 0) {
    return userScore > 0 ? 100 : 50;
  }
  
  // Equal to median
  if (userScore === segmentMedian) {
    return 50;
  }
  
  // Above median
  if (userScore > segmentMedian) {
    const maxValue = 100; // Assuming health score scale
    const range = maxValue - segmentMedian;
    if (range === 0) return 100;
    
    const percentile = 50 + ((userScore - segmentMedian) / range) * 50;
    return Math.min(100, Math.max(50, percentile));
  }
  
  // Below median
  const percentile = (userScore / segmentMedian) * 50;
  return Math.max(0, Math.min(50, percentile));
}
