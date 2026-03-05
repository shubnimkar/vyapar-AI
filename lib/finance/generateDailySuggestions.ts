/**
 * Daily Health Coach - Suggestion Engine
 * 
 * Pure, deterministic rule-based engine for generating daily financial suggestions.
 * Follows the Hybrid Intelligence principle: deterministic core, no AI involvement.
 * 
 * @module generateDailySuggestions
 */

import { DailySuggestion, SuggestionContext, Language } from '../types';
import { t } from '../translations';
import { logger } from '../logger';

/**
 * Optimization tips for healthy state rotation
 */
const OPTIMIZATION_TIPS = [
  'suggestions.healthy_state.tip_inventory',
  'suggestions.healthy_state.tip_credit_terms',
  'suggestions.healthy_state.tip_bulk_buying',
  'suggestions.healthy_state.tip_expense_review'
];

/**
 * Evaluates high credit ratio rule
 * 
 * Triggers when credit outstanding exceeds 40% of total sales.
 * 
 * @param context - Financial context for evaluation
 * @returns Suggestion if rule triggers, null otherwise
 */
export function evaluateHighCreditRule(context: SuggestionContext): DailySuggestion | null {
  // Skip if no sales or no credit
  if (context.total_sales === 0 || context.total_credit_outstanding === 0) {
    return null;
  }
  
  const creditRatio = context.total_credit_outstanding / context.total_sales;
  
  // Trigger if credit exceeds 40% of sales
  if (creditRatio > 0.4) {
    const ratioPercent = Math.round(creditRatio * 100);
    
    return {
      id: `suggestion_high_credit_${context.date}`,
      created_at: new Date().toISOString(),
      severity: 'critical',
      title: t('suggestions.high_credit.title', context.language),
      description: t('suggestions.high_credit.description', context.language).replace('{ratio}', ratioPercent.toString()),
      rule_type: 'high_credit',
      context_data: {
        credit_ratio: creditRatio,
        credit_outstanding: context.total_credit_outstanding,
        total_sales: context.total_sales
      }
    };
  }
  
  return null;
}

/**
 * Evaluates margin drop rule
 * 
 * Triggers when current margin is less than 70% of the 30-day average.
 * 
 * @param context - Financial context for evaluation
 * @returns Suggestion if rule triggers, null otherwise
 */
export function evaluateMarginDropRule(context: SuggestionContext): DailySuggestion | null {
  // Skip if no historical data
  if (context.avg_margin_last_30_days === null || context.avg_margin_last_30_days === 0) {
    return null;
  }
  
  // Trigger if current margin is less than 70% of average
  if (context.current_margin < 0.7 * context.avg_margin_last_30_days) {
    const currentPercent = Math.round(context.current_margin * 100);
    const avgPercent = Math.round(context.avg_margin_last_30_days * 100);
    
    return {
      id: `suggestion_margin_drop_${context.date}`,
      created_at: new Date().toISOString(),
      severity: 'warning',
      title: t('suggestions.margin_drop.title', context.language),
      description: t('suggestions.margin_drop.description', context.language)
        .replace('{current}', currentPercent.toString())
        .replace('{avg}', avgPercent.toString()),
      rule_type: 'margin_drop',
      context_data: {
        current_margin: context.current_margin,
        avg_margin: context.avg_margin_last_30_days,
        drop_percentage: ((context.avg_margin_last_30_days - context.current_margin) / context.avg_margin_last_30_days) * 100
      }
    };
  }
  
  return null;
}

/**
 * Evaluates low cash buffer rule
 * 
 * Triggers when cash buffer is less than 7 days.
 * 
 * @param context - Financial context for evaluation
 * @returns Suggestion if rule triggers, null otherwise
 */
export function evaluateLowCashBufferRule(context: SuggestionContext): DailySuggestion | null {
  // Skip if cash buffer cannot be calculated
  if (context.cash_buffer_days === null) {
    return null;
  }
  
  // Trigger if less than 7 days of cash buffer
  if (context.cash_buffer_days < 7) {
    const daysRounded = Math.round(context.cash_buffer_days);
    
    return {
      id: `suggestion_low_cash_${context.date}`,
      created_at: new Date().toISOString(),
      severity: 'critical',
      title: t('suggestions.low_cash.title', context.language),
      description: t('suggestions.low_cash.description', context.language).replace('{days}', daysRounded.toString()),
      rule_type: 'low_cash',
      context_data: {
        cash_buffer_days: context.cash_buffer_days
      }
    };
  }
  
  return null;
}

/**
 * Evaluates healthy state rule
 * 
 * Triggers when health score >= 70 and no other suggestions exist.
 * Rotates through different optimization tips for variety.
 * 
 * @param context - Financial context for evaluation
 * @param hasOtherSuggestions - Whether other suggestions were generated
 * @returns Suggestion if rule triggers, null otherwise
 */
export function evaluateHealthyStateRule(
  context: SuggestionContext, 
  hasOtherSuggestions: boolean
): DailySuggestion | null {
  // Only show if health score is good and no other suggestions
  if (context.health_score >= 70 && !hasOtherSuggestions) {
    // Rotate tips based on date for variety
    const tipIndex = new Date(context.date).getDate() % OPTIMIZATION_TIPS.length;
    const tipKey = OPTIMIZATION_TIPS[tipIndex];
    
    return {
      id: `suggestion_healthy_state_${context.date}`,
      created_at: new Date().toISOString(),
      severity: 'info',
      title: t('suggestions.healthy_state.title', context.language),
      description: t(tipKey, context.language),
      rule_type: 'healthy_state',
      context_data: {
        health_score: context.health_score,
        tip_index: tipIndex
      }
    };
  }
  
  return null;
}

/**
 * Sorts suggestions by severity (critical > warning > info)
 * 
 * @param suggestions - Array of suggestions to sort
 * @returns Sorted array with critical first, then warning, then info
 */
function sortBySeverity(suggestions: DailySuggestion[]): DailySuggestion[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return [...suggestions].sort((a, b) => 
    severityOrder[a.severity] - severityOrder[b.severity]
  );
}

/**
 * Validates suggestion context for required fields and valid values
 * 
 * @param context - Context to validate
 * @returns True if context is valid, false otherwise
 */
function isValidContext(context: SuggestionContext): boolean {
  return (
    typeof context.health_score === 'number' &&
    !isNaN(context.health_score) &&
    typeof context.total_sales === 'number' &&
    !isNaN(context.total_sales) &&
    typeof context.total_expenses === 'number' &&
    !isNaN(context.total_expenses) &&
    ['en', 'hi', 'mr'].includes(context.language)
  );
}

/**
 * Generates daily financial suggestions based on rule evaluation
 * 
 * This is a pure, deterministic function that:
 * - Evaluates all financial rules in sequence
 * - Collects triggered suggestions
 * - Sorts by severity (critical > warning > info)
 * - Returns sorted array
 * 
 * Rules evaluated:
 * 1. High Credit Ratio (> 40% of sales)
 * 2. Margin Drop (< 70% of 30-day average)
 * 3. Low Cash Buffer (< 7 days)
 * 4. Healthy State (score >= 70, no other issues)
 * 
 * @param context - Financial metrics and user context
 * @returns Array of suggestions sorted by severity
 * 
 * @example
 * const context: SuggestionContext = {
 *   health_score: 65,
 *   total_sales: 10000,
 *   total_expenses: 7000,
 *   total_credit_outstanding: 5000,
 *   current_margin: 0.3,
 *   avg_margin_last_30_days: 0.35,
 *   cash_buffer_days: 5,
 *   language: 'en',
 *   date: '2024-01-15'
 * };
 * 
 * const suggestions = generateDailySuggestions(context);
 * // Returns: [critical suggestions, warning suggestions, info suggestions]
 */
export function generateDailySuggestions(context: SuggestionContext): DailySuggestion[] {
  const suggestions: DailySuggestion[] = [];
  
  try {
    // Validate context
    if (!isValidContext(context)) {
      logger.warn('Invalid suggestion context', { context });
      return [];
    }
    
    // Evaluate each rule with individual error handling
    try {
      const highCreditSuggestion = evaluateHighCreditRule(context);
      if (highCreditSuggestion) suggestions.push(highCreditSuggestion);
    } catch (error) {
      logger.error('High credit rule failed', { error: error instanceof Error ? error.message : String(error), context });
    }
    
    try {
      const marginDropSuggestion = evaluateMarginDropRule(context);
      if (marginDropSuggestion) suggestions.push(marginDropSuggestion);
    } catch (error) {
      logger.error('Margin drop rule failed', { error: error instanceof Error ? error.message : String(error), context });
    }
    
    try {
      const lowCashSuggestion = evaluateLowCashBufferRule(context);
      if (lowCashSuggestion) suggestions.push(lowCashSuggestion);
    } catch (error) {
      logger.error('Low cash rule failed', { error: error instanceof Error ? error.message : String(error), context });
    }
    
    // Healthy state rule depends on other suggestions
    const hasOtherSuggestions = suggestions.length > 0;
    try {
      const healthySuggestion = evaluateHealthyStateRule(context, hasOtherSuggestions);
      if (healthySuggestion) suggestions.push(healthySuggestion);
    } catch (error) {
      logger.error('Healthy state rule failed', { error: error instanceof Error ? error.message : String(error), context });
    }
    
    // Sort by severity
    return sortBySeverity(suggestions);
    
  } catch (error) {
    logger.error('Suggestion generation failed', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context 
    });
    return [];
  }
}
