/**
 * Suggestion Context Builder
 * 
 * Builds the SuggestionContext from daily entries and credit data.
 * Pure function with no side effects, following the Hybrid Intelligence principle.
 * 
 * @module suggestionContext
 */

import { DailyEntry, CreditEntry, SuggestionContext, Language } from '../types';
import { calculateHealthScore, calculateCreditSummary } from '../calculations';

/**
 * Checks if a date is within the last N days of a reference date
 * 
 * @param dateStr - ISO date string to check
 * @param referenceDate - Reference date string
 * @param days - Number of days to look back
 * @returns True if date is within the last N days
 */
function isWithinLastNDays(dateStr: string, referenceDate: string, days: number): boolean {
  const date = new Date(dateStr);
  const reference = new Date(referenceDate);
  const diffTime = reference.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Builds suggestion context from daily entries and credit data
 * 
 * This function:
 * - Calculates average margin from last 30 days
 * - Calculates cash buffer days from current cash and average daily expenses
 * - Calculates total outstanding credit from unpaid credit entries
 * - Calculates health score using existing deterministic function
 * 
 * @param currentEntry - The current daily entry
 * @param historicalEntries - Array of historical daily entries (should be sorted by date desc)
 * @param creditEntries - Array of credit entries
 * @param language - User's preferred language
 * @returns SuggestionContext ready for suggestion generation
 * 
 * @example
 * const context = buildSuggestionContext(
 *   todayEntry,
 *   last30DaysEntries,
 *   allCreditEntries,
 *   'en'
 * );
 * const suggestions = generateDailySuggestions(context);
 */
export function buildSuggestionContext(
  currentEntry: DailyEntry,
  historicalEntries: DailyEntry[],
  creditEntries: CreditEntry[],
  language: Language
): SuggestionContext {
  // Filter entries from last 30 days (excluding current entry)
  const last30Days = historicalEntries
    .filter(e => e.date !== currentEntry.date && isWithinLastNDays(e.date, currentEntry.date, 30))
    .slice(0, 30);
  
  // Calculate average margin from last 30 days
  let avgMargin: number | null = null;
  if (last30Days.length >= 7) { // Require at least 7 days of data
    const totalMargin = last30Days.reduce((sum, e) => sum + e.profitMargin, 0);
    avgMargin = totalMargin / last30Days.length;
  }
  
  // Calculate average daily expenses from last 30 days
  let avgDailyExpenses: number | null = null;
  if (last30Days.length >= 7) { // Require at least 7 days of data
    const totalExpenses = last30Days.reduce((sum, e) => sum + e.totalExpense, 0);
    avgDailyExpenses = totalExpenses / last30Days.length;
  }
  
  // Calculate cash buffer days
  let cashBufferDays: number | null = null;
  if (currentEntry.cashInHand !== undefined && avgDailyExpenses !== null && avgDailyExpenses > 0) {
    cashBufferDays = currentEntry.cashInHand / avgDailyExpenses;
  }
  
  // Calculate total outstanding credit from unpaid entries
  const totalCreditOutstanding = creditEntries
    .filter(c => !c.isPaid)
    .reduce((sum, c) => sum + c.amount, 0);
  
  // Calculate health score using existing deterministic function
  const creditSummary = calculateCreditSummary(creditEntries.map(c => ({
    amount: c.amount,
    dueDate: c.dueDate,
    isPaid: c.isPaid
  })));
  
  const healthScoreResult = calculateHealthScore(
    currentEntry.profitMargin,
    currentEntry.expenseRatio,
    currentEntry.cashInHand,
    creditSummary
  );
  
  return {
    health_score: healthScoreResult.score,
    total_sales: currentEntry.totalSales,
    total_expenses: currentEntry.totalExpense,
    total_credit_outstanding: totalCreditOutstanding,
    current_margin: currentEntry.profitMargin,
    avg_margin_last_30_days: avgMargin,
    cash_buffer_days: cashBufferDays,
    language,
    date: currentEntry.date
  };
}

/**
 * Validates that a daily entry has the minimum required fields
 * 
 * @param entry - Daily entry to validate
 * @returns True if entry is valid
 */
export function isValidDailyEntry(entry: DailyEntry): boolean {
  return (
    typeof entry.date === 'string' &&
    entry.date.length > 0 &&
    typeof entry.totalSales === 'number' &&
    !isNaN(entry.totalSales) &&
    typeof entry.totalExpense === 'number' &&
    !isNaN(entry.totalExpense) &&
    typeof entry.profitMargin === 'number' &&
    !isNaN(entry.profitMargin) &&
    typeof entry.expenseRatio === 'number' &&
    !isNaN(entry.expenseRatio)
  );
}
