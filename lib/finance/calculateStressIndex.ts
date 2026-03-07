/**
 * Stress Index Calculator
 * 
 * Pure, deterministic function that calculates financial stress score (0-100)
 * based on credit exposure, cash reserves, and expense volatility.
 * 
 * CRITICAL: This is a deterministic core function - NO AI, NO network calls.
 * Follows Hybrid Intelligence Principle: deterministic calculation only.
 */

/**
 * Validation result for input parameters
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Component breakdown for stress index calculation
 */
export interface StressComponentBreakdown {
  creditRatioScore: number;      // 0-40 points (40% weight)
  cashBufferScore: number;        // 0-35 points (35% weight)
  expenseVolatilityScore: number; // 0-25 points (25% weight)
}

/**
 * Result of stress index calculation
 */
export interface StressIndexResult {
  score: number;                  // 0-100 (higher = more stress)
  breakdown: StressComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    creditRatio: number;
    cashBuffer: number;
    expenseVolatility: number;
  };
}

/**
 * Validate stress index input parameters
 * 
 * Checks for NaN, undefined, and negative values
 * 
 * @param creditRatio - Outstanding credits / Total sales
 * @param cashBuffer - Cash in hand / Avg monthly expenses
 * @param expenseVolatility - Std dev of daily expenses / Avg daily expense
 * @returns Validation result with isValid flag and error messages
 * 
 * @example
 * // Valid inputs
 * validateStressInputs(0.5, 1.2, 0.3)
 * // Returns: { isValid: true, errors: [] }
 * 
 * @example
 * // Invalid inputs
 * validateStressInputs(-0.5, NaN, 0.3)
 * // Returns: { isValid: false, errors: ['creditRatio cannot be negative', 'cashBuffer must be a valid number'] }
 */
export function validateStressInputs(
  creditRatio: number,
  cashBuffer: number,
  expenseVolatility: number
): ValidationResult {
  const errors: string[] = [];
  
  // Check for NaN or undefined
  if (isNaN(creditRatio) || creditRatio === undefined) {
    errors.push('creditRatio must be a valid number');
  }
  if (isNaN(cashBuffer) || cashBuffer === undefined) {
    errors.push('cashBuffer must be a valid number');
  }
  if (isNaN(expenseVolatility) || expenseVolatility === undefined) {
    errors.push('expenseVolatility must be a valid number');
  }
  
  // Check for negative values (ratios should be non-negative)
  if (creditRatio < 0) {
    errors.push('creditRatio cannot be negative');
  }
  if (cashBuffer < 0) {
    errors.push('cashBuffer cannot be negative');
  }
  if (expenseVolatility < 0) {
    errors.push('expenseVolatility cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate credit ratio score (0-40 points)
 * 
 * Higher credit ratio = more stress
 * 
 * @param creditRatio - Outstanding credits / Total sales (0-1+ range)
 * @returns Score from 0-40 points
 */
function calculateCreditRatioScore(creditRatio: number): number {
  if (creditRatio >= 0.7) return 40; // Critical stress
  if (creditRatio >= 0.5) return 30; // High stress
  if (creditRatio >= 0.3) return 20; // Moderate stress
  if (creditRatio >= 0.1) return 10; // Low stress
  return 0; // Minimal stress
}

/**
 * Calculate cash buffer score (0-35 points)
 * 
 * Lower cash buffer = more stress
 * 
 * @param cashBuffer - Cash in hand / Avg monthly expenses (0+ range)
 * @returns Score from 0-35 points
 */
function calculateCashBufferScore(cashBuffer: number): number {
  if (cashBuffer < 0.5) return 35; // Critical - less than 2 weeks expenses
  if (cashBuffer < 1.0) return 25; // High - less than 1 month expenses
  if (cashBuffer < 2.0) return 15; // Moderate - less than 2 months
  if (cashBuffer < 3.0) return 5;  // Low - less than 3 months
  return 0; // Healthy buffer
}

/**
 * Calculate expense volatility score (0-25 points)
 * 
 * Higher volatility = more stress (unpredictable expenses)
 * 
 * @param expenseVolatility - Std dev of daily expenses / Avg daily expense (0-1+ range)
 * @returns Score from 0-25 points
 */
function calculateExpenseVolatilityScore(expenseVolatility: number): number {
  if (expenseVolatility >= 0.5) return 25; // Very unpredictable
  if (expenseVolatility >= 0.3) return 15; // Moderately unpredictable
  if (expenseVolatility >= 0.15) return 8; // Slightly unpredictable
  return 0; // Stable expenses
}

/**
 * Calculate financial stress index
 * 
 * Pure function - no side effects, deterministic output
 * 
 * Algorithm:
 * - Credit Ratio Score: 0-40 points (40% weight)
 * - Cash Buffer Score: 0-35 points (35% weight)
 * - Expense Volatility Score: 0-25 points (25% weight)
 * - Total: 0-100 points (higher = more financial stress)
 * 
 * @param creditRatio - Outstanding credits / Total sales (0-1+ range)
 * @param cashBuffer - Cash in hand / Avg monthly expenses (0+ range)
 * @param expenseVolatility - Std dev of daily expenses / Avg daily expense (0-1+ range)
 * @returns Stress index result with score and breakdown
 * 
 * @example
 * // Low stress scenario
 * calculateStressIndex(0.05, 3.5, 0.1)
 * // Returns: { score: 0, breakdown: { creditRatioScore: 0, cashBufferScore: 0, expenseVolatilityScore: 0 }, ... }
 * 
 * @example
 * // High stress scenario
 * calculateStressIndex(0.8, 0.3, 0.6)
 * // Returns: { score: 100, breakdown: { creditRatioScore: 40, cashBufferScore: 35, expenseVolatilityScore: 25 }, ... }
 */
export function calculateStressIndex(
  creditRatio: number,
  cashBuffer: number,
  expenseVolatility: number
): StressIndexResult {
  // Calculate component scores
  const creditRatioScore = calculateCreditRatioScore(creditRatio);
  const cashBufferScore = calculateCashBufferScore(cashBuffer);
  const expenseVolatilityScore = calculateExpenseVolatilityScore(expenseVolatility);

  // Total stress score
  const score = creditRatioScore + cashBufferScore + expenseVolatilityScore;

  // Build result
  return {
    score,
    breakdown: {
      creditRatioScore,
      cashBufferScore,
      expenseVolatilityScore,
    },
    calculatedAt: new Date().toISOString(),
    inputParameters: {
      creditRatio,
      cashBuffer,
      expenseVolatility,
    },
  };
}
