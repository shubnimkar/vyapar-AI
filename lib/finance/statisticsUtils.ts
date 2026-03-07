/**
 * Statistical utility functions for financial calculations
 * 
 * Pure functions with no side effects - deterministic and offline-capable
 */

/**
 * Calculate the sum of an array of numbers
 * 
 * @param values - Array of numbers to sum
 * @returns Sum of all values, or 0 for empty array
 */
export function sum(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate the mean (average) of an array of numbers
 * 
 * @param values - Array of numbers
 * @returns Mean value, or 0 for empty array
 */
export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return sum(values) / values.length;
}

/**
 * Calculate the standard deviation of an array of numbers
 * 
 * Uses sample standard deviation (n-1 denominator)
 * 
 * @param values - Array of numbers
 * @returns Standard deviation, or 0 for empty array or single value
 */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  
  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = sum(squaredDiffs) / (values.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * Filter entries by date range (last N days from reference date)
 * 
 * @param entries - Array of entries with date field (ISO format YYYY-MM-DD)
 * @param days - Number of days to include (from reference date backwards)
 * @param referenceDate - Reference date (defaults to today)
 * @returns Filtered array of entries within the date range
 */
export function filterEntriesByDateRange<T extends { date: string }>(
  entries: T[],
  days: number,
  referenceDate: Date = new Date()
): T[] {
  // Calculate cutoff date (N days before reference date)
  const cutoffDate = new Date(referenceDate);
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0); // Start of day
  
  // Filter entries with date >= cutoff date
  return entries.filter(entry => {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0); // Start of day
    return entryDate >= cutoffDate && entryDate <= referenceDate;
  });
}
