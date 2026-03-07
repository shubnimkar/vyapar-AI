/**
 * Stress Index Input Aggregation
 * 
 * Pure function that aggregates historical data into stress index calculation inputs.
 * Follows the Hybrid Intelligence Principle - deterministic, offline-capable, no AI.
 */

import { DailyEntry, CreditEntry } from '../types';
import { sum, mean, standardDeviation, filterEntriesByDateRange } from './statisticsUtils';

/**
 * Historical data required for stress index calculation
 */
export interface HistoricalData {
  dailyEntries: DailyEntry[];
  creditEntries: CreditEntry[];
}

/**
 * Aggregated inputs for stress index calculation
 */
export interface StressIndexInputs {
  creditRatio: number;
  cashBuffer: number;
  expenseVolatility: number;
  dataPoints: number;           // Number of days used
  calculationPeriod: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Aggregate historical data into stress index inputs
 * 
 * Pure function - no side effects, deterministic output
 * 
 * @param data - Historical daily entries and credit entries
 * @param currentDate - Reference date for calculations (defaults to today)
 * @returns Aggregated inputs or null if insufficient data
 */
export function aggregateStressInputs(
  data: HistoricalData,
  currentDate: Date = new Date()
): StressIndexInputs | null {
  const { dailyEntries, creditEntries } = data;

  // Data sufficiency check - need at least 7 days
  if (dailyEntries.length < 7) {
    return null;
  }

  // Filter entries by date ranges
  const last30Days = filterEntriesByDateRange(dailyEntries, 30, currentDate);
  const last90Days = filterEntriesByDateRange(dailyEntries, 90, currentDate);

  // Need at least 7 days in the 30-day window for calculation
  if (last30Days.length < 7) {
    return null;
  }

  // ============================================
  // Credit Ratio Calculation (last 30 days)
  // ============================================
  const totalSales = sum(last30Days.map(e => e.totalSales));
  
  // Only count unpaid credits
  const unpaidCredits = creditEntries.filter(c => !c.isPaid);
  const totalOutstanding = sum(unpaidCredits.map(c => c.amount));
  
  // Credit ratio = outstanding credits / total sales
  // If no sales, credit ratio is 0 (no credit exposure)
  const creditRatio = totalSales > 0 ? totalOutstanding / totalSales : 0;

  // ============================================
  // Cash Buffer Calculation (last 90 days for average)
  // ============================================
  const expenses90Days = last90Days.map(e => e.totalExpense);
  const avgDailyExpenses = mean(expenses90Days);
  const avgMonthlyExpenses = avgDailyExpenses * 30;
  
  // Get latest cash in hand (most recent entry)
  const latestCashInHand = dailyEntries[0]?.cashInHand ?? 0;
  
  // Cash buffer = cash in hand / avg monthly expenses
  // If no expenses, cash buffer is 0 (can't calculate buffer)
  const cashBuffer = avgMonthlyExpenses > 0 ? latestCashInHand / avgMonthlyExpenses : 0;

  // ============================================
  // Expense Volatility Calculation (last 30 days)
  // ============================================
  const expenses30Days = last30Days.map(e => e.totalExpense);
  const avgExpense = mean(expenses30Days);
  const stdDev = standardDeviation(expenses30Days);
  
  // Expense volatility = standard deviation / mean
  // If no average expense, volatility is 0 (no variation)
  const expenseVolatility = avgExpense > 0 ? stdDev / avgExpense : 0;

  // ============================================
  // Return aggregated inputs with metadata
  // ============================================
  return {
    creditRatio,
    cashBuffer,
    expenseVolatility,
    dataPoints: last30Days.length,
    calculationPeriod: {
      startDate: last30Days[last30Days.length - 1].date,
      endDate: last30Days[0].date
    }
  };
}
