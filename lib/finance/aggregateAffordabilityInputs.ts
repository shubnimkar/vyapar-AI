/**
 * Affordability Index Input Aggregation
 * 
 * Pure function that aggregates historical data into affordability index calculation inputs.
 * Follows the Hybrid Intelligence Principle - deterministic, offline-capable, no AI.
 */

import { DailyEntry } from '../types';
import { sum, filterEntriesByDateRange } from './statisticsUtils';

/**
 * Aggregated inputs for affordability index calculation
 */
export interface AffordabilityIndexInputs {
  avgMonthlyProfit: number;
  dataPoints: number;           // Number of days used
  calculationPeriod: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Aggregate historical data into affordability index inputs
 * 
 * Pure function - no side effects, deterministic output
 * 
 * @param dailyEntries - Historical daily entries
 * @param currentDate - Reference date for calculations (defaults to today)
 * @returns Aggregated inputs or null if insufficient data
 */
export function aggregateAffordabilityInputs(
  dailyEntries: DailyEntry[],
  currentDate: Date = new Date()
): AffordabilityIndexInputs | null {
  // Data sufficiency check - need at least 7 days
  if (dailyEntries.length < 7) {
    return null;
  }

  // Filter entries for last 90 days
  const last90Days = filterEntriesByDateRange(dailyEntries, 90, currentDate);

  // Need at least 7 days in the 90-day window for calculation
  if (last90Days.length < 7) {
    return null;
  }

  // ============================================
  // Average Monthly Profit Calculation (last 90 days)
  // ============================================
  const totalProfit = sum(last90Days.map(e => e.estimatedProfit));
  const avgDailyProfit = totalProfit / last90Days.length;
  const avgMonthlyProfit = avgDailyProfit * 30;

  // ============================================
  // Return aggregated inputs with metadata
  // ============================================
  return {
    avgMonthlyProfit,
    dataPoints: last90Days.length,
    calculationPeriod: {
      startDate: last90Days[last90Days.length - 1].date,
      endDate: last90Days[0].date
    }
  };
}
