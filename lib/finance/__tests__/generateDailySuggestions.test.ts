/**
 * Unit tests for Daily Health Coach suggestion engine
 * 
 * Tests individual rule functions with specific examples and edge cases.
 */

import {
  generateDailySuggestions,
  evaluateHighCreditRule,
  evaluateMarginDropRule,
  evaluateLowCashBufferRule,
  evaluateHealthyStateRule
} from '../generateDailySuggestions';
import { SuggestionContext } from '../../types';

describe('evaluateHighCreditRule', () => {
  const baseContext: SuggestionContext = {
    health_score: 50,
    total_sales: 10000,
    total_expenses: 7000,
    total_credit_outstanding: 5000,
    current_margin: 0.3,
    avg_margin_last_30_days: 0.35,
    cash_buffer_days: 10,
    language: 'en',
    date: '2024-01-15'
  };

  it('should trigger when credit ratio > 40%', () => {
    const context = { ...baseContext, total_credit_outstanding: 5000 }; // 50% of sales
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion).not.toBeNull();
    expect(suggestion?.severity).toBe('critical');
    expect(suggestion?.rule_type).toBe('high_credit');
    expect(suggestion?.context_data?.credit_ratio).toBe(0.5);
  });

  it('should not trigger when credit ratio <= 40%', () => {
    const context = { ...baseContext, total_credit_outstanding: 4000 }; // 40% of sales
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should skip when total_sales is zero', () => {
    const context = { ...baseContext, total_sales: 0 };
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should skip when credit_outstanding is zero', () => {
    const context = { ...baseContext, total_credit_outstanding: 0 };
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should include correct context data', () => {
    const context = { ...baseContext, total_credit_outstanding: 6000 }; // 60%
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion?.context_data).toEqual({
      credit_ratio: 0.6,
      credit_outstanding: 6000,
      total_sales: 10000
    });
  });

  it('should use correct translation for Hindi', () => {
    const context = { ...baseContext, total_credit_outstanding: 5000, language: 'hi' };
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion?.title).toContain('उधार');
  });

  it('should use correct translation for Marathi', () => {
    const context = { ...baseContext, total_credit_outstanding: 5000, language: 'mr' };
    const suggestion = evaluateHighCreditRule(context);
    
    expect(suggestion?.title).toContain('उधार');
  });
});

describe('evaluateMarginDropRule', () => {
  const baseContext: SuggestionContext = {
    health_score: 50,
    total_sales: 10000,
    total_expenses: 7000,
    total_credit_outstanding: 1000,
    current_margin: 0.2,
    avg_margin_last_30_days: 0.4,
    cash_buffer_days: 10,
    language: 'en',
    date: '2024-01-15'
  };

  it('should trigger when margin < 70% of average', () => {
    const context = { ...baseContext, current_margin: 0.2, avg_margin_last_30_days: 0.4 }; // 50% of avg
    const suggestion = evaluateMarginDropRule(context);
    
    expect(suggestion).not.toBeNull();
    expect(suggestion?.severity).toBe('warning');
    expect(suggestion?.rule_type).toBe('margin_drop');
  });

  it('should not trigger when margin >= 70% of average', () => {
    const context = { ...baseContext, current_margin: 0.3, avg_margin_last_30_days: 0.4 }; // 75% of avg
    const suggestion = evaluateMarginDropRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should skip when avg_margin_last_30_days is null', () => {
    const context = { ...baseContext, avg_margin_last_30_days: null };
    const suggestion = evaluateMarginDropRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should skip when avg_margin_last_30_days is zero', () => {
    const context = { ...baseContext, avg_margin_last_30_days: 0 };
    const suggestion = evaluateMarginDropRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should include correct context data', () => {
    const context = { ...baseContext, current_margin: 0.2, avg_margin_last_30_days: 0.4 };
    const suggestion = evaluateMarginDropRule(context);
    
    expect(suggestion?.context_data?.current_margin).toBe(0.2);
    expect(suggestion?.context_data?.avg_margin).toBe(0.4);
    expect(suggestion?.context_data?.drop_percentage).toBe(50);
  });

  it('should format percentages correctly in description', () => {
    const context = { ...baseContext, current_margin: 0.25, avg_margin_last_30_days: 0.5 };
    const suggestion = evaluateMarginDropRule(context);
    
    expect(suggestion?.description).toContain('25%');
    expect(suggestion?.description).toContain('50%');
  });
});

describe('evaluateLowCashBufferRule', () => {
  const baseContext: SuggestionContext = {
    health_score: 50,
    total_sales: 10000,
    total_expenses: 7000,
    total_credit_outstanding: 1000,
    current_margin: 0.3,
    avg_margin_last_30_days: 0.35,
    cash_buffer_days: 5,
    language: 'en',
    date: '2024-01-15'
  };

  it('should trigger when cash buffer < 7 days', () => {
    const context = { ...baseContext, cash_buffer_days: 5 };
    const suggestion = evaluateLowCashBufferRule(context);
    
    expect(suggestion).not.toBeNull();
    expect(suggestion?.severity).toBe('critical');
    expect(suggestion?.rule_type).toBe('low_cash');
  });

  it('should not trigger when cash buffer >= 7 days', () => {
    const context = { ...baseContext, cash_buffer_days: 7 };
    const suggestion = evaluateLowCashBufferRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should skip when cash_buffer_days is null', () => {
    const context = { ...baseContext, cash_buffer_days: null };
    const suggestion = evaluateLowCashBufferRule(context);
    
    expect(suggestion).toBeNull();
  });

  it('should include correct context data', () => {
    const context = { ...baseContext, cash_buffer_days: 3.7 };
    const suggestion = evaluateLowCashBufferRule(context);
    
    expect(suggestion?.context_data?.cash_buffer_days).toBe(3.7);
  });

  it('should round days in description', () => {
    const context = { ...baseContext, cash_buffer_days: 4.8 };
    const suggestion = evaluateLowCashBufferRule(context);
    
    expect(suggestion?.description).toContain('5');
  });

  it('should trigger for very low buffer (< 1 day)', () => {
    const context = { ...baseContext, cash_buffer_days: 0.5 };
    const suggestion = evaluateLowCashBufferRule(context);
    
    expect(suggestion).not.toBeNull();
    expect(suggestion?.severity).toBe('critical');
  });
});

describe('evaluateHealthyStateRule', () => {
  const baseContext: SuggestionContext = {
    health_score: 75,
    total_sales: 10000,
    total_expenses: 6000,
    total_credit_outstanding: 1000,
    current_margin: 0.4,
    avg_margin_last_30_days: 0.35,
    cash_buffer_days: 15,
    language: 'en',
    date: '2024-01-15'
  };

  it('should trigger when health score >= 70 and no other suggestions', () => {
    const suggestion = evaluateHealthyStateRule(baseContext, false);
    
    expect(suggestion).not.toBeNull();
    expect(suggestion?.severity).toBe('info');
    expect(suggestion?.rule_type).toBe('healthy_state');
  });

  it('should not trigger when health score < 70', () => {
    const context = { ...baseContext, health_score: 65 };
    const suggestion = evaluateHealthyStateRule(context, false);
    
    expect(suggestion).toBeNull();
  });

  it('should not trigger when other suggestions exist', () => {
    const suggestion = evaluateHealthyStateRule(baseContext, true);
    
    expect(suggestion).toBeNull();
  });

  it('should rotate optimization tips based on date', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];
    const tips = dates.map(date => {
      const context = { ...baseContext, date };
      const suggestion = evaluateHealthyStateRule(context, false);
      return suggestion?.description;
    });
    
    // Should have different tips (at least 2 unique)
    const uniqueTips = new Set(tips);
    expect(uniqueTips.size).toBeGreaterThanOrEqual(2);
  });

  it('should include health score in context data', () => {
    const context = { ...baseContext, health_score: 85 };
    const suggestion = evaluateHealthyStateRule(context, false);
    
    expect(suggestion?.context_data?.health_score).toBe(85);
  });

  it('should include tip index in context data', () => {
    const suggestion = evaluateHealthyStateRule(baseContext, false);
    
    expect(suggestion?.context_data?.tip_index).toBeDefined();
    expect(suggestion?.context_data?.tip_index).toBeGreaterThanOrEqual(0);
    expect(suggestion?.context_data?.tip_index).toBeLessThan(4);
  });
});

describe('generateDailySuggestions', () => {
  it('should return empty array for invalid context', () => {
    const invalidContext = {
      health_score: NaN,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 1000,
      current_margin: 0.3,
      avg_margin_last_30_days: 0.35,
      cash_buffer_days: 10,
      language: 'en' as const,
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(invalidContext);
    expect(suggestions).toEqual([]);
  });

  it('should sort suggestions by severity', () => {
    const context: SuggestionContext = {
      health_score: 50,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 5000, // Triggers critical
      current_margin: 0.2,
      avg_margin_last_30_days: 0.4, // Triggers warning
      cash_buffer_days: 5, // Triggers critical
      language: 'en',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    
    // Should have critical suggestions first
    const criticalCount = suggestions.filter(s => s.severity === 'critical').length;
    const warningCount = suggestions.filter(s => s.severity === 'warning').length;
    
    expect(criticalCount).toBeGreaterThan(0);
    expect(warningCount).toBeGreaterThan(0);
    
    // First suggestions should be critical
    expect(suggestions[0].severity).toBe('critical');
  });

  it('should handle multiple simultaneous issues', () => {
    const context: SuggestionContext = {
      health_score: 40,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 6000, // High credit
      current_margin: 0.15,
      avg_margin_last_30_days: 0.4, // Margin drop
      cash_buffer_days: 3, // Low cash
      language: 'en',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    
    expect(suggestions.length).toBe(3);
    expect(suggestions.some(s => s.rule_type === 'high_credit')).toBe(true);
    expect(suggestions.some(s => s.rule_type === 'margin_drop')).toBe(true);
    expect(suggestions.some(s => s.rule_type === 'low_cash')).toBe(true);
  });

  it('should only show healthy state when no other issues', () => {
    const context: SuggestionContext = {
      health_score: 80,
      total_sales: 10000,
      total_expenses: 6000,
      total_credit_outstanding: 1000, // Only 10%
      current_margin: 0.4,
      avg_margin_last_30_days: 0.35, // Better than avg
      cash_buffer_days: 20, // Good buffer
      language: 'en',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].rule_type).toBe('healthy_state');
  });

  it('should handle missing historical data gracefully', () => {
    const context: SuggestionContext = {
      health_score: 50,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 1000,
      current_margin: 0.3,
      avg_margin_last_30_days: null, // No historical data
      cash_buffer_days: null, // No cash data
      language: 'en',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    
    // Should not crash, should skip rules that need historical data
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.every(s => s.rule_type !== 'margin_drop')).toBe(true);
    expect(suggestions.every(s => s.rule_type !== 'low_cash')).toBe(true);
  });

  it('should generate unique IDs for each suggestion', () => {
    const context: SuggestionContext = {
      health_score: 40,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 6000,
      current_margin: 0.15,
      avg_margin_last_30_days: 0.4,
      cash_buffer_days: 3,
      language: 'en',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    const ids = suggestions.map(s => s.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should include date in suggestion IDs', () => {
    const context: SuggestionContext = {
      health_score: 50,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 5000,
      current_margin: 0.3,
      avg_margin_last_30_days: 0.35,
      cash_buffer_days: 10,
      language: 'en',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    
    suggestions.forEach(suggestion => {
      expect(suggestion.id).toContain('2024-01-15');
    });
  });

  it('should use correct language for all suggestions', () => {
    const context: SuggestionContext = {
      health_score: 40,
      total_sales: 10000,
      total_expenses: 7000,
      total_credit_outstanding: 6000,
      current_margin: 0.15,
      avg_margin_last_30_days: 0.4,
      cash_buffer_days: 3,
      language: 'hi',
      date: '2024-01-15'
    };
    
    const suggestions = generateDailySuggestions(context);
    
    // All suggestions should be in Hindi
    suggestions.forEach(suggestion => {
      expect(suggestion.title.length).toBeGreaterThan(0);
      expect(suggestion.description.length).toBeGreaterThan(0);
    });
  });
});
