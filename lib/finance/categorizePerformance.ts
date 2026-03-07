/**
 * Performance category classification
 */
export type ComparisonCategory = 'above_average' | 'at_average' | 'below_average';

/**
 * Categorize performance based on percentile rank
 * 
 * Pure function - deterministic output
 * 
 * Categories:
 * - above_average: percentile > 60
 * - at_average: percentile 40-60 (inclusive)
 * - below_average: percentile < 40
 * 
 * @param percentile - Percentile rank (0-100)
 * @returns Performance category
 */
export function categorizePerformance(percentile: number): ComparisonCategory {
  if (percentile > 60) {
    return 'above_average';
  }
  
  if (percentile >= 40) {
    return 'at_average';
  }
  
  return 'below_average';
}

/**
 * Get visual indicator configuration for category
 */
export interface VisualIndicator {
  color: 'green' | 'yellow' | 'red';
  icon: string;
  bgColor: string;
  borderColor: string;
}

export function getVisualIndicator(category: ComparisonCategory): VisualIndicator {
  const indicators: Record<ComparisonCategory, VisualIndicator> = {
    above_average: {
      color: 'green',
      icon: '📈',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    at_average: {
      color: 'yellow',
      icon: '➡️',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500'
    },
    below_average: {
      color: 'red',
      icon: '📉',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500'
    }
  };
  
  return indicators[category];
}
