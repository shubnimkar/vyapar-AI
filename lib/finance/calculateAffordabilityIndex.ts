/**
 * Affordability Index Calculator
 * 
 * Pure TypeScript function that calculates affordability score for planned expenses.
 * Part of the Hybrid Intelligence Principle - deterministic core, AI explains.
 * 
 * Algorithm:
 * - Calculate cost-to-profit ratio
 * - Map ratio to affordability score (0-100)
 * - Assign affordability category
 * - Handle edge cases (zero/negative profit, zero cost)
 * 
 * @module lib/finance/calculateAffordabilityIndex
 */

/**
 * Validation result for input parameters
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Component breakdown for affordability index calculation
 */
export interface AffordabilityComponentBreakdown {
  costToProfitRatio: number;      // The ratio used for calculation
  affordabilityCategory: 'Easily Affordable' | 'Affordable' | 'Stretch' | 'Risky' | 'Not Recommended';  // Category label
}

/**
 * Result of affordability index calculation
 */
export interface AffordabilityIndexResult {
  score: number;                  // 0-100 (higher = more affordable)
  breakdown: AffordabilityComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    plannedCost: number;
    avgMonthlyProfit: number;
  };
}

/**
 * Validate affordability index input parameters
 * 
 * Checks for NaN, undefined values, and validates plannedCost is positive
 * 
 * @param plannedCost - Amount of planned expense
 * @param avgMonthlyProfit - Average monthly profit from historical data
 * @returns Validation result with isValid flag and error messages
 * 
 * @example
 * // Valid inputs
 * validateAffordabilityInputs(5000, 20000)
 * // Returns: { isValid: true, errors: [] }
 * 
 * @example
 * // Invalid inputs
 * validateAffordabilityInputs(-100, NaN)
 * // Returns: { isValid: false, errors: ['plannedCost must be positive', 'avgMonthlyProfit must be a valid number'] }
 */
export function validateAffordabilityInputs(
  plannedCost: number,
  avgMonthlyProfit: number
): ValidationResult {
  const errors: string[] = [];
  
  // Check for NaN or undefined
  if (isNaN(plannedCost) || plannedCost === undefined) {
    errors.push('plannedCost must be a valid number');
  }
  if (isNaN(avgMonthlyProfit) || avgMonthlyProfit === undefined) {
    errors.push('avgMonthlyProfit must be a valid number');
  }
  
  // Validate plannedCost is positive (zero is allowed as edge case)
  if (plannedCost < 0) {
    errors.push('plannedCost must be positive');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate affordability index for a planned expense
 * 
 * Pure function - no side effects, deterministic output
 * 
 * Edge Cases:
 * - If avgMonthlyProfit <= 0: return score = 0 (unaffordable)
 * - If plannedCost <= 0: return score = 100 (no cost)
 * 
 * Scoring Algorithm:
 * - ratio < 0.1: score = 100 (easily affordable - less than 10% of monthly profit)
 * - ratio < 0.2: score = 95 (very affordable)
 * - ratio < 0.3: score = 90 (affordable)
 * - ratio < 0.5: score = 80 (reasonably affordable)
 * - ratio < 0.7: score = 70 (affordable with planning)
 * - ratio < 1.0: score = 55 (stretch - requires careful planning)
 * - ratio < 1.5: score = 40 (risky - exceeds monthly profit)
 * - ratio < 2.0: score = 25 (very risky)
 * - ratio >= 2.0: score = 10 (not recommended)
 * 
 * @param plannedCost - Amount of planned expense
 * @param avgMonthlyProfit - Average monthly profit from historical data
 * @returns Affordability index result with score and breakdown
 */
export function calculateAffordabilityIndex(
  plannedCost: number,
  avgMonthlyProfit: number
): AffordabilityIndexResult {
  const calculatedAt = new Date().toISOString();
  
  // Edge case: zero or negative cost means no expense (perfectly affordable)
  if (plannedCost <= 0) {
    return {
      score: 100,
      breakdown: {
        costToProfitRatio: 0,
        affordabilityCategory: 'Easily Affordable'
      },
      calculatedAt,
      inputParameters: {
        plannedCost,
        avgMonthlyProfit
      }
    };
  }
  
  // Edge case: zero or negative profit means unaffordable
  if (avgMonthlyProfit <= 0) {
    return {
      score: 0,
      breakdown: {
        costToProfitRatio: Infinity,
        affordabilityCategory: 'Not Recommended'
      },
      calculatedAt,
      inputParameters: {
        plannedCost,
        avgMonthlyProfit
      }
    };
  }
  
  // Calculate cost-to-profit ratio
  const costToProfitRatio = plannedCost / avgMonthlyProfit;
  
  // Calculate affordability score based on ratio thresholds
  let score: number;
  
  if (costToProfitRatio < 0.1) {
    score = 100;
  } else if (costToProfitRatio < 0.2) {
    score = 95;
  } else if (costToProfitRatio < 0.3) {
    score = 90;
  } else if (costToProfitRatio < 0.5) {
    score = 80;
  } else if (costToProfitRatio < 0.7) {
    score = 70;
  } else if (costToProfitRatio < 1.0) {
    score = 55;
  } else if (costToProfitRatio < 1.5) {
    score = 40;
  } else if (costToProfitRatio < 2.0) {
    score = 25;
  } else {
    score = 10;
  }
  
  // Assign affordability category based on score
  let affordabilityCategory: 'Easily Affordable' | 'Affordable' | 'Stretch' | 'Risky' | 'Not Recommended';
  
  if (score >= 90) {
    affordabilityCategory = 'Easily Affordable';
  } else if (score >= 70) {
    affordabilityCategory = 'Affordable';
  } else if (score >= 50) {
    affordabilityCategory = 'Stretch';
  } else if (score >= 30) {
    affordabilityCategory = 'Risky';
  } else {
    affordabilityCategory = 'Not Recommended';
  }
  
  return {
    score,
    breakdown: {
      costToProfitRatio,
      affordabilityCategory
    },
    calculatedAt,
    inputParameters: {
      plannedCost,
      avgMonthlyProfit
    }
  };
}
