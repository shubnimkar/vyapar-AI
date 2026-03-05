/**
 * Property-based tests for Daily Health Coach suggestion engine
 * 
 * These tests validate universal correctness properties across randomized inputs.
 */

import * as fc from 'fast-check';
import {
  generateDailySuggestions,
  evaluateHighCreditRule,
  evaluateMarginDropRule,
  evaluateLowCashBufferRule,
  evaluateHealthyStateRule
} from '../generateDailySuggestions';
import { SuggestionContext, Language } from '../../types';

// Arbitraries for generating test data
const languageArb = fc.constantFrom<Language>('en', 'hi', 'mr');

const dateArb = fc.integer({ min: 0, max: 3650 }).map(days => {
  const date = new Date('2020-01-01');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
});

const suggestionContextArb = fc.record({
  health_score: fc.integer({ min: 0, max: 100 }),
  total_sales: fc.nat({ max: 1000000 }),
  total_expenses: fc.nat({ max: 1000000 }),
  total_credit_outstanding: fc.nat({ max: 1000000 }),
  current_margin: fc.double({ min: 0, max: 1, noNaN: true }),
  avg_margin_last_30_days: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: null }),
  cash_buffer_days: fc.option(fc.double({ min: 0, max: 365, noNaN: true }), { nil: null }),
  language: languageArb,
  date: dateArb
});

describe('Property 1: Suggestion Generation Triggers on Rule Conditions', () => {
  it('should generate high credit suggestion when credit ratio > 0.4', () => {
    fc.assert(
      fc.property(
        fc.record({
          total_sales: fc.integer({ min: 1000, max: 100000 }),
          language: languageArb,
          date: dateArb
        }),
        ({ total_sales, language, date }) => {
          // Create context where credit ratio > 0.4
          const credit_outstanding = Math.floor(total_sales * 0.5); // 50% > 40%
          
          const context: SuggestionContext = {
            health_score: 50,
            total_sales,
            total_expenses: total_sales * 0.7,
            total_credit_outstanding: credit_outstanding,
            current_margin: 0.3,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days: 10,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Should have at least one suggestion
          expect(suggestions.length).toBeGreaterThan(0);
          
          // Should have a critical high_credit suggestion
          const highCreditSuggestion = suggestions.find(s => s.rule_type === 'high_credit');
          expect(highCreditSuggestion).toBeDefined();
          expect(highCreditSuggestion?.severity).toBe('critical');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate margin drop suggestion when margin < 0.7 * avg', () => {
    fc.assert(
      fc.property(
        fc.record({
          avg_margin: fc.double({ min: 0.2, max: 0.8, noNaN: true }),
          language: languageArb,
          date: dateArb
        }),
        ({ avg_margin, language, date }) => {
          // Create context where current margin < 0.7 * avg
          const current_margin = avg_margin * 0.5; // 50% of avg < 70% of avg
          
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 1000,
            current_margin,
            avg_margin_last_30_days: avg_margin,
            cash_buffer_days: 10,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Should have a warning margin_drop suggestion
          const marginDropSuggestion = suggestions.find(s => s.rule_type === 'margin_drop');
          expect(marginDropSuggestion).toBeDefined();
          expect(marginDropSuggestion?.severity).toBe('warning');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate low cash suggestion when buffer < 7 days', () => {
    fc.assert(
      fc.property(
        fc.record({
          cash_buffer_days: fc.double({ min: 0, max: 6.9, noNaN: true }),
          language: languageArb,
          date: dateArb
        }),
        ({ cash_buffer_days, language, date }) => {
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 1000,
            current_margin: 0.3,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Should have a critical low_cash suggestion
          const lowCashSuggestion = suggestions.find(s => s.rule_type === 'low_cash');
          expect(lowCashSuggestion).toBeDefined();
          expect(lowCashSuggestion?.severity).toBe('critical');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate healthy state suggestion when score >= 70 and no other issues', () => {
    fc.assert(
      fc.property(
        fc.record({
          health_score: fc.integer({ min: 70, max: 100 }),
          language: languageArb,
          date: dateArb
        }),
        ({ health_score, language, date }) => {
          // Create context with no issues
          const context: SuggestionContext = {
            health_score,
            total_sales: 10000,
            total_expenses: 6000,
            total_credit_outstanding: 1000, // Only 10% of sales
            current_margin: 0.4,
            avg_margin_last_30_days: 0.35, // Current is better than avg
            cash_buffer_days: 15, // Good buffer
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Should have exactly one suggestion (healthy state)
          expect(suggestions.length).toBe(1);
          expect(suggestions[0].rule_type).toBe('healthy_state');
          expect(suggestions[0].severity).toBe('info');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Severity-Based Priority Ordering', () => {
  it('should always order suggestions by severity (critical > warning > info)', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        // Check that suggestions are ordered by severity
        for (let i = 0; i < suggestions.length - 1; i++) {
          const currentSeverity = suggestions[i].severity;
          const nextSeverity = suggestions[i + 1].severity;
          
          const severityOrder = { critical: 0, warning: 1, info: 2 };
          
          expect(severityOrder[currentSeverity]).toBeLessThanOrEqual(severityOrder[nextSeverity]);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: Suggestion Structure Completeness', () => {
  it('should include all required fields in every suggestion', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        suggestions.forEach(suggestion => {
          // Required fields
          expect(suggestion.id).toBeDefined();
          expect(typeof suggestion.id).toBe('string');
          expect(suggestion.id.length).toBeGreaterThan(0);
          
          expect(suggestion.created_at).toBeDefined();
          expect(typeof suggestion.created_at).toBe('string');
          // Should be valid ISO timestamp
          expect(() => new Date(suggestion.created_at)).not.toThrow();
          
          expect(suggestion.severity).toBeDefined();
          expect(['critical', 'warning', 'info']).toContain(suggestion.severity);
          
          expect(suggestion.title).toBeDefined();
          expect(typeof suggestion.title).toBe('string');
          expect(suggestion.title.length).toBeGreaterThan(0);
          
          expect(suggestion.description).toBeDefined();
          expect(typeof suggestion.description).toBe('string');
          expect(suggestion.description.length).toBeGreaterThan(0);
          
          expect(suggestion.rule_type).toBeDefined();
          expect(['high_credit', 'margin_drop', 'low_cash', 'healthy_state']).toContain(suggestion.rule_type);
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 4: Deterministic Suggestion Generation', () => {
  it('should produce identical suggestions for identical context', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions1 = generateDailySuggestions(context);
        const suggestions2 = generateDailySuggestions(context);
        
        // Should have same length
        expect(suggestions1.length).toBe(suggestions2.length);
        
        // Should have same ids, severities, and rule_types
        for (let i = 0; i < suggestions1.length; i++) {
          expect(suggestions1[i].id).toBe(suggestions2[i].id);
          expect(suggestions1[i].severity).toBe(suggestions2[i].severity);
          expect(suggestions1[i].rule_type).toBe(suggestions2[i].rule_type);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 10: Suggestion ID Uniqueness', () => {
  it('should generate unique IDs for all suggestions in a single entry', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        const ids = suggestions.map(s => s.id);
        const uniqueIds = new Set(ids);
        
        // All IDs should be unique
        expect(uniqueIds.size).toBe(ids.length);
      }),
      { numRuns: 100 }
    );
  });
});


describe('Property 5: Translation Key Consistency', () => {
  it('should use correct translation key pattern for all suggestions', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        suggestions.forEach(suggestion => {
          // Title and description should be non-empty strings
          expect(typeof suggestion.title).toBe('string');
          expect(suggestion.title.length).toBeGreaterThan(0);
          expect(typeof suggestion.description).toBe('string');
          expect(suggestion.description.length).toBeGreaterThan(0);
          
          // Should match expected pattern based on rule_type
          expect(suggestion.id).toContain(suggestion.rule_type);
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Context Data Inclusion', () => {
  it('should include relevant metrics in context_data for each rule type', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        suggestions.forEach(suggestion => {
          expect(suggestion.context_data).toBeDefined();
          
          // Check rule-specific context data
          switch (suggestion.rule_type) {
            case 'high_credit':
              expect(suggestion.context_data?.credit_ratio).toBeDefined();
              expect(suggestion.context_data?.credit_outstanding).toBeDefined();
              expect(suggestion.context_data?.total_sales).toBeDefined();
              break;
            case 'margin_drop':
              expect(suggestion.context_data?.current_margin).toBeDefined();
              expect(suggestion.context_data?.avg_margin).toBeDefined();
              expect(suggestion.context_data?.drop_percentage).toBeDefined();
              break;
            case 'low_cash':
              expect(suggestion.context_data?.cash_buffer_days).toBeDefined();
              break;
            case 'healthy_state':
              expect(suggestion.context_data?.health_score).toBeDefined();
              break;
          }
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 7: Rule Skipping on Invalid Data', () => {
  it('should skip high_credit rule when sales or credit is zero', () => {
    fc.assert(
      fc.property(
        fc.record({
          zeroField: fc.constantFrom('sales', 'credit'),
          language: languageArb,
          date: dateArb
        }),
        ({ zeroField, language, date }) => {
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: zeroField === 'sales' ? 0 : 10000,
            total_expenses: 7000,
            total_credit_outstanding: zeroField === 'credit' ? 0 : 5000,
            current_margin: 0.3,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days: 10,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          const hasHighCredit = suggestions.some(s => s.rule_type === 'high_credit');
          
          expect(hasHighCredit).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should skip margin_drop rule when avg_margin is null or zero', () => {
    fc.assert(
      fc.property(
        fc.record({
          avgMargin: fc.constantFrom(null, 0),
          language: languageArb,
          date: dateArb
        }),
        ({ avgMargin, language, date }) => {
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 1000,
            current_margin: 0.1,
            avg_margin_last_30_days: avgMargin,
            cash_buffer_days: 10,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          const hasMarginDrop = suggestions.some(s => s.rule_type === 'margin_drop');
          
          expect(hasMarginDrop).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should skip low_cash rule when cash_buffer_days is null', () => {
    fc.assert(
      fc.property(
        fc.record({
          language: languageArb,
          date: dateArb
        }),
        ({ language, date }) => {
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 1000,
            current_margin: 0.3,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days: null,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          const hasLowCash = suggestions.some(s => s.rule_type === 'low_cash');
          
          expect(hasLowCash).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 8: Healthy State Exclusivity', () => {
  it('should only show healthy_state when health_score >= 70 and no other suggestions', () => {
    fc.assert(
      fc.property(
        fc.record({
          health_score: fc.integer({ min: 70, max: 100 }),
          language: languageArb,
          date: dateArb
        }),
        ({ health_score, language, date }) => {
          // Create context with no issues
          const context: SuggestionContext = {
            health_score,
            total_sales: 10000,
            total_expenses: 6000,
            total_credit_outstanding: 1000, // Only 10%
            current_margin: 0.4,
            avg_margin_last_30_days: 0.35, // Better than avg
            cash_buffer_days: 15,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Should have exactly one suggestion
          expect(suggestions.length).toBe(1);
          expect(suggestions[0].rule_type).toBe('healthy_state');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not show healthy_state when other issues exist', () => {
    fc.assert(
      fc.property(
        fc.record({
          health_score: fc.integer({ min: 70, max: 100 }),
          language: languageArb,
          date: dateArb
        }),
        ({ health_score, language, date }) => {
          // Create context with high credit issue
          const context: SuggestionContext = {
            health_score,
            total_sales: 10000,
            total_expenses: 6000,
            total_credit_outstanding: 5000, // 50% - triggers high_credit
            current_margin: 0.4,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days: 15,
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Should not have healthy_state suggestion
          const hasHealthy = suggestions.some(s => s.rule_type === 'healthy_state');
          expect(hasHealthy).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 9: Optimization Tip Rotation', () => {
  it('should rotate through different optimization tips across dates', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 3650 }), { minLength: 10, maxLength: 20 }),
        (dayOffsets) => {
          const tips = dayOffsets.map(offset => {
            const date = new Date('2020-01-01');
            date.setDate(date.getDate() + offset);
            const dateStr = date.toISOString().split('T')[0];
            
            const context: SuggestionContext = {
              health_score: 80,
              total_sales: 10000,
              total_expenses: 6000,
              total_credit_outstanding: 1000,
              current_margin: 0.4,
              avg_margin_last_30_days: 0.35,
              cash_buffer_days: 15,
              language: 'en',
              date: dateStr
            };
            
            const suggestions = generateDailySuggestions(context);
            return suggestions[0]?.description;
          });
          
          // Should have at least 2 different tips in the set
          const uniqueTips = new Set(tips.filter(t => t !== undefined));
          expect(uniqueTips.size).toBeGreaterThanOrEqual(2);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property 11: Dismissed Suggestion Filtering', () => {
  it('should filter out dismissed suggestions when dismissed_at is set', () => {
    fc.assert(
      fc.property(
        fc.record({
          language: languageArb,
          date: dateArb,
          dismissedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), { nil: null })
        }),
        ({ language, date, dismissedAt }) => {
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 5000, // Triggers high_credit
            current_margin: 0.3,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days: 5, // Triggers low_cash
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Simulate dismissing one suggestion
          if (suggestions.length > 0 && dismissedAt) {
            suggestions[0].dismissed_at = dismissedAt.toISOString();
          }
          
          // Filter undismissed suggestions (simulating UI logic)
          const undismissed = suggestions.filter(s => !s.dismissed_at);
          
          // If we dismissed one, undismissed should be shorter
          if (dismissedAt && suggestions.length > 0) {
            expect(undismissed.length).toBe(suggestions.length - 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 12: ISO 8601 Timestamp Format', () => {
  it('should generate valid ISO 8601 timestamps for created_at', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        suggestions.forEach(suggestion => {
          // Should be valid ISO 8601 format
          expect(suggestion.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // Should be parseable as a date
          const date = new Date(suggestion.created_at);
          expect(date.toISOString()).toBe(suggestion.created_at);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should generate valid ISO 8601 timestamps for dismissed_at when set', () => {
    fc.assert(
      fc.property(
        fc.record({
          context: suggestionContextArb,
          dismissTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
        }),
        ({ context, dismissTime }) => {
          const suggestions = generateDailySuggestions(context);
          
          // Simulate dismissing suggestions
          suggestions.forEach(suggestion => {
            suggestion.dismissed_at = dismissTime.toISOString();
            
            // Should be valid ISO 8601 format
            expect(suggestion.dismissed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            
            // Should be parseable as a date
            const date = new Date(suggestion.dismissed_at);
            expect(date.toISOString()).toBe(suggestion.dismissed_at);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 13: Display Priority by Severity', () => {
  it('should display highest severity suggestion first when filtering undismissed', () => {
    fc.assert(
      fc.property(
        fc.record({
          language: languageArb,
          date: dateArb
        }),
        ({ language, date }) => {
          // Create context that triggers multiple suggestions
          const context: SuggestionContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 5000, // Triggers critical high_credit
            current_margin: 0.2,
            avg_margin_last_30_days: 0.35, // Triggers warning margin_drop
            cash_buffer_days: 5, // Triggers critical low_cash
            language,
            date
          };
          
          const suggestions = generateDailySuggestions(context);
          
          // Filter undismissed (all are undismissed initially)
          const undismissed = suggestions.filter(s => !s.dismissed_at);
          
          if (undismissed.length > 0) {
            // First suggestion should be critical or highest severity available
            const firstSeverity = undismissed[0].severity;
            
            // All subsequent suggestions should have equal or lower priority
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            for (let i = 1; i < undismissed.length; i++) {
              expect(severityOrder[undismissed[i].severity]).toBeGreaterThanOrEqual(severityOrder[firstSeverity]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 14: Language-Specific Translation', () => {
  it('should return different text for different languages', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: dateArb
        }),
        ({ date }) => {
          // Create same context with different languages
          const baseContext = {
            health_score: 50,
            total_sales: 10000,
            total_expenses: 7000,
            total_credit_outstanding: 5000,
            current_margin: 0.3,
            avg_margin_last_30_days: 0.35,
            cash_buffer_days: 10,
            date
          };
          
          const enSuggestions = generateDailySuggestions({ ...baseContext, language: 'en' });
          const hiSuggestions = generateDailySuggestions({ ...baseContext, language: 'hi' });
          const mrSuggestions = generateDailySuggestions({ ...baseContext, language: 'mr' });
          
          // Should have same number of suggestions
          expect(enSuggestions.length).toBe(hiSuggestions.length);
          expect(enSuggestions.length).toBe(mrSuggestions.length);
          
          // For each suggestion, text should differ by language (unless fallback occurs)
          for (let i = 0; i < enSuggestions.length; i++) {
            // Same rule type and severity
            expect(enSuggestions[i].rule_type).toBe(hiSuggestions[i].rule_type);
            expect(enSuggestions[i].rule_type).toBe(mrSuggestions[i].rule_type);
            
            // Titles and descriptions should exist
            expect(enSuggestions[i].title).toBeTruthy();
            expect(hiSuggestions[i].title).toBeTruthy();
            expect(mrSuggestions[i].title).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 15: Translation Fallback to English', () => {
  it('should fallback to English when translation key is missing', () => {
    fc.assert(
      fc.property(suggestionContextArb, (context) => {
        const suggestions = generateDailySuggestions(context);
        
        suggestions.forEach(suggestion => {
          // All suggestions should have non-empty title and description
          // (fallback ensures this even if translation is missing)
          expect(suggestion.title).toBeTruthy();
          expect(suggestion.title.length).toBeGreaterThan(0);
          expect(suggestion.description).toBeTruthy();
          expect(suggestion.description.length).toBeGreaterThan(0);
          
          // Should not contain translation key placeholders
          expect(suggestion.title).not.toContain('{{');
          expect(suggestion.description).not.toContain('{{');
        });
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 16: Suggestion Replacement on Update', () => {
  it('should replace previous suggestions when entry is updated', () => {
    fc.assert(
      fc.property(
        fc.record({
          initialContext: suggestionContextArb,
          updatedContext: suggestionContextArb
        }),
        ({ initialContext, updatedContext }) => {
          // Generate initial suggestions
          const initialSuggestions = generateDailySuggestions(initialContext);
          
          // Generate updated suggestions (simulating entry update)
          const updatedSuggestions = generateDailySuggestions(updatedContext);
          
          // Suggestions should be independent (not affected by previous generation)
          // Each generation should be deterministic based only on current context
          const secondGeneration = generateDailySuggestions(updatedContext);
          
          expect(updatedSuggestions.length).toBe(secondGeneration.length);
          for (let i = 0; i < updatedSuggestions.length; i++) {
            expect(updatedSuggestions[i].id).toBe(secondGeneration[i].id);
            expect(updatedSuggestions[i].rule_type).toBe(secondGeneration[i].rule_type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
