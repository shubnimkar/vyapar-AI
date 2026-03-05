/**
 * Credit Manager - Deterministic Core for Udhaar Follow-up Helper
 * 
 * This module provides pure TypeScript functions for credit calculations.
 * All functions are:
 * - Pure (no side effects)
 * - Synchronous (no async operations)
 * - No network dependencies
 * - No AI dependencies
 * - Fully unit testable
 * 
 * Follows Vyapar Rules: "Deterministic Core (Authoritative Layer)"
 */

import type { CreditEntry, OverdueCredit, OverdueStatus } from './types';

/**
 * Calculate days overdue for a credit entry
 * 
 * Formula: max(0, floor((currentDate - dueDate) / 86400000))
 * 
 * @param dueDate - ISO date string (YYYY-MM-DD)
 * @param currentDate - Current date object
 * @returns Number of days overdue (minimum 0)
 * 
 * @example
 * calculateDaysOverdue('2024-01-01', new Date('2024-01-05')) // Returns 4
 * calculateDaysOverdue('2024-01-10', new Date('2024-01-05')) // Returns 0 (not overdue yet)
 */
export function calculateDaysOverdue(dueDate: string, currentDate: Date): number {
  const due = new Date(dueDate);
  const current = new Date(currentDate);
  
  // Set time to midnight for date-only comparison
  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const diffMs = current.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Calculate overdue status for a credit entry
 * 
 * @param credit - Credit entry to evaluate
 * @param currentDate - Current date object
 * @returns Overdue status with isOverdue flag and days overdue
 * 
 * @example
 * const credit = { dueDate: '2024-01-01', isPaid: false, ... };
 * calculateOverdueStatus(credit, new Date('2024-01-05'))
 * // Returns { isOverdue: true, daysOverdue: 4, meetsThreshold: true }
 */
export function calculateOverdueStatus(
  credit: CreditEntry,
  currentDate: Date
): OverdueStatus {
  const daysOverdue = calculateDaysOverdue(credit.dueDate, currentDate);
  const isOverdue = daysOverdue > 0 && !credit.isPaid;
  
  return {
    isOverdue,
    daysOverdue,
    meetsThreshold: daysOverdue >= 3, // Default threshold is 3 days
  };
}

/**
 * Filter credits by overdue threshold
 * 
 * Returns only unpaid credits where days overdue >= threshold
 * 
 * @param credits - Array of credit entries
 * @param threshold - Minimum days overdue (default: 3)
 * @param currentDate - Current date object
 * @returns Array of overdue credits with calculated fields
 * 
 * @example
 * const credits = [
 *   { dueDate: '2024-01-01', isPaid: false, ... },
 *   { dueDate: '2024-01-10', isPaid: false, ... },
 * ];
 * filterByThreshold(credits, 3, new Date('2024-01-05'))
 * // Returns only the first credit (4 days overdue >= 3)
 */
export function filterByThreshold(
  credits: CreditEntry[],
  threshold: number,
  currentDate: Date
): OverdueCredit[] {
  return credits
    .filter(credit => !credit.isPaid)
    .map(credit => {
      const daysOverdue = calculateDaysOverdue(credit.dueDate, currentDate);
      const daysSinceReminder = credit.lastReminderAt
        ? calculateDaysOverdue(credit.lastReminderAt, currentDate)
        : null;
      
      return {
        ...credit,
        daysOverdue,
        daysSinceReminder,
      };
    })
    .filter(credit => credit.daysOverdue >= threshold);
}

/**
 * Sort overdue credits by urgency
 * 
 * Sorting rules:
 * 1. Primary: days overdue (descending)
 * 2. Secondary: amount (descending)
 * 
 * @param credits - Array of overdue credits
 * @returns Sorted array (most urgent first)
 * 
 * @example
 * const credits = [
 *   { daysOverdue: 5, amount: 1000, ... },
 *   { daysOverdue: 10, amount: 500, ... },
 *   { daysOverdue: 5, amount: 2000, ... },
 * ];
 * sortByUrgency(credits)
 * // Returns: [10 days/500, 5 days/2000, 5 days/1000]
 */
export function sortByUrgency(credits: OverdueCredit[]): OverdueCredit[] {
  return [...credits].sort((a, b) => {
    // Primary: days overdue (descending)
    if (a.daysOverdue !== b.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    
    // Secondary: amount (descending)
    return b.amount - a.amount;
  });
}

/**
 * Get all overdue credits filtered and sorted by urgency
 * 
 * This is the main entry point that combines filtering and sorting.
 * 
 * @param credits - Array of all credit entries
 * @param threshold - Minimum days overdue (default: 3)
 * @returns Sorted array of overdue credits (most urgent first)
 * 
 * @example
 * const credits = [
 *   { dueDate: '2024-01-01', amount: 1000, isPaid: false, ... },
 *   { dueDate: '2023-12-20', amount: 500, isPaid: false, ... },
 *   { dueDate: '2024-01-10', amount: 2000, isPaid: false, ... },
 * ];
 * getOverdueCredits(credits, 3)
 * // Returns credits sorted by urgency (days overdue DESC, amount DESC)
 */
export function getOverdueCredits(
  credits: CreditEntry[],
  threshold: number = 3
): OverdueCredit[] {
  const currentDate = new Date();
  const filtered = filterByThreshold(credits, threshold, currentDate);
  return sortByUrgency(filtered);
}
