// Property-based tests for benchmark prompt builder
// Validates correctness properties across all inputs

import fc from 'fast-check';
import { buildBenchmarkExplanationPrompt } from '../benchmarkPromptBuilder';
import { PersonaContext } from '../types';
import { BenchmarkComparison } from '@/lib/types';

describe('Feature: segment-benchmark, Property 24: Metric Preservation', () => {
  /**
   * Property 24: AI Explanation Metric Preservation
   * 
   * For any valid comparison result, the prompt must include the exact
   * pre-calculated values without modification. AI must NEVER recalculate.
   * 
   * Validates: Requirements 6.2
   */
  it('should preserve exact metric values in prompt (no recalculation)', () => {
    fc.assert(
      fc.property(
        // Generate random but valid comparison data
        fc.record({
          healthScoreComparison: fc.record({
            userValue: fc.integer({ min: 0, max: 100 }),
            segmentMedian: fc.integer({ min: 0, max: 100 }),
            percentile: fc.integer({ min: 0, max: 100 }),
            category: fc.constantFrom('above_average', 'at_average', 'below_average'),
          }),
          marginComparison: fc.record({
            userValue: fc.float({ min: 0, max: 1, noNaN: true }),
            segmentMedian: fc.float({ min: 0, max: 1, noNaN: true }),
            percentile: fc.integer({ min: 0, max: 100 }),
            category: fc.constantFrom('above_average', 'at_average', 'below_average'),
          }),
          segmentInfo: fc.record({
            segmentKey: fc.constantFrom(
              'SEGMENT#tier1#kirana',
              'SEGMENT#tier2#salon',
              'SEGMENT#tier3#pharmacy'
            ),
            sampleSize: fc.integer({ min: 10, max: 500 }),
            lastUpdated: fc.constant('2024-01-15T10:00:00Z'),
          }),
          calculatedAt: fc.constant('2024-01-15T10:30:00Z'),
        }),
        fc.constantFrom<'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other'>(
          'kirana',
          'salon',
          'pharmacy',
          'restaurant',
          'other'
        ),
        (comparison, businessType) => {
          const context: PersonaContext = {
            business_type: businessType,
            city_tier: 'tier-1',
            explanation_mode: 'simple',
            language: 'en',
          };

          const result = buildBenchmarkExplanationPrompt(
            comparison as BenchmarkComparison,
            context
          );

          // Verify exact values are in the prompt
          const healthScoreStr = comparison.healthScoreComparison.userValue.toString();
          const segmentMedianStr = comparison.healthScoreComparison.segmentMedian.toString();
          const marginPercentStr = (comparison.marginComparison.userValue * 100).toFixed(1);
          const segmentMarginStr = (comparison.marginComparison.segmentMedian * 100).toFixed(1);

          // All exact values must be present in user prompt
          return (
            result.user.includes(healthScoreStr) &&
            result.user.includes(segmentMedianStr) &&
            result.user.includes(marginPercentStr) &&
            result.user.includes(segmentMarginStr)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: segment-benchmark, Property 25: Context Inclusion', () => {
  /**
   * Property 25: Prompt Context Inclusion
   * 
   * For any valid persona context, the prompt must include the user's
   * city_tier and business_type to enable persona-aware explanations.
   * 
   * Validates: Requirements 6.9
   */
  it('should include city_tier and business_type in prompt context', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other'>(
          'kirana',
          'salon',
          'pharmacy',
          'restaurant',
          'other'
        ),
        fc.constantFrom<'tier-1' | 'tier-2' | 'tier-3'>('tier-1', 'tier-2', 'tier-3'),
        fc.constantFrom<'simple' | 'detailed'>('simple', 'detailed'),
        fc.constantFrom<'en' | 'hi' | 'mr'>('en', 'hi', 'mr'),
        (businessType, cityTier, explanationMode, language) => {
          const mockComparison: BenchmarkComparison = {
            healthScoreComparison: {
              userValue: 70,
              segmentMedian: 65,
              percentile: 60,
              category: 'at_average',
            },
            marginComparison: {
              userValue: 0.20,
              segmentMedian: 0.18,
              percentile: 55,
              category: 'at_average',
            },
            segmentInfo: {
              segmentKey: `SEGMENT#${cityTier}#${businessType}`,
              sampleSize: 150,
              lastUpdated: '2024-01-15T10:00:00Z',
            },
            calculatedAt: '2024-01-15T10:30:00Z',
          };

          const context: PersonaContext = {
            business_type: businessType,
            city_tier: cityTier,
            explanation_mode: explanationMode,
            language: language,
          };

          const result = buildBenchmarkExplanationPrompt(mockComparison, context);

          // Verify context is included in metadata
          const hasMetadata =
            result.metadata?.business_type === businessType &&
            result.metadata?.city_tier === cityTier &&
            result.metadata?.explanation_mode === explanationMode;

          // Verify system prompt is not empty (contains persona context)
          const hasSystemPrompt = result.system.length > 100;

          return hasMetadata && hasSystemPrompt;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should adapt system prompt based on business type', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other'>(
          'kirana',
          'salon',
          'pharmacy',
          'restaurant',
          'other'
        ),
        (businessType) => {
          const mockComparison: BenchmarkComparison = {
            healthScoreComparison: {
              userValue: 70,
              segmentMedian: 65,
              percentile: 60,
              category: 'at_average',
            },
            marginComparison: {
              userValue: 0.20,
              segmentMedian: 0.18,
              percentile: 55,
              category: 'at_average',
            },
            segmentInfo: {
              segmentKey: `SEGMENT#tier1#${businessType}`,
              sampleSize: 150,
              lastUpdated: '2024-01-15T10:00:00Z',
            },
            calculatedAt: '2024-01-15T10:30:00Z',
          };

          const context: PersonaContext = {
            business_type: businessType,
            city_tier: 'tier-1',
            explanation_mode: 'simple',
            language: 'en',
          };

          const result = buildBenchmarkExplanationPrompt(mockComparison, context);

          // System prompt should contain business-specific context
          // For "other", it uses "retail shop" instead of "other"
          const businessKeywords: Record<string, string[]> = {
            kirana: ['kirana', 'grocery'],
            salon: ['salon', 'beauty'],
            pharmacy: ['pharmacy', 'medical'],
            restaurant: ['restaurant', 'food'],
            other: ['retail', 'shop'],
          };

          const keywords = businessKeywords[businessType];
          const systemLower = result.system.toLowerCase();
          
          // At least one keyword should be present
          return keywords.some(keyword => systemLower.includes(keyword));
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Feature: segment-benchmark, Prompt Structure Validation', () => {
  /**
   * Validate that prompt structure is always complete and well-formed
   */
  it('should always return complete prompt structure', () => {
    fc.assert(
      fc.property(
        fc.record({
          healthScoreComparison: fc.record({
            userValue: fc.integer({ min: 0, max: 100 }),
            segmentMedian: fc.integer({ min: 0, max: 100 }),
            percentile: fc.integer({ min: 0, max: 100 }),
            category: fc.constantFrom('above_average', 'at_average', 'below_average'),
          }),
          marginComparison: fc.record({
            userValue: fc.float({ min: 0, max: 1, noNaN: true }),
            segmentMedian: fc.float({ min: 0, max: 1, noNaN: true }),
            percentile: fc.integer({ min: 0, max: 100 }),
            category: fc.constantFrom('above_average', 'at_average', 'below_average'),
          }),
          segmentInfo: fc.record({
            segmentKey: fc.constantFrom(
              'SEGMENT#tier1#kirana',
              'SEGMENT#tier2#salon',
              'SEGMENT#tier3#pharmacy'
            ),
            sampleSize: fc.integer({ min: 10, max: 500 }),
            lastUpdated: fc.constant('2024-01-15T10:00:00Z'),
          }),
          calculatedAt: fc.constant('2024-01-15T10:30:00Z'),
        }),
        fc.constantFrom<'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other'>(
          'kirana',
          'salon',
          'pharmacy',
          'restaurant',
          'other'
        ),
        fc.constantFrom<'simple' | 'detailed'>('simple', 'detailed'),
        fc.constantFrom<'en' | 'hi' | 'mr'>('en', 'hi', 'mr'),
        (comparison, businessType, explanationMode, language) => {
          const context: PersonaContext = {
            business_type: businessType,
            city_tier: 'tier-1',
            explanation_mode: explanationMode,
            language: language,
          };

          const result = buildBenchmarkExplanationPrompt(
            comparison as BenchmarkComparison,
            context
          );

          // Verify structure completeness
          return (
            typeof result.system === 'string' &&
            result.system.length > 0 &&
            typeof result.user === 'string' &&
            result.user.length > 0 &&
            result.metadata !== undefined &&
            result.metadata.business_type === businessType &&
            result.metadata.explanation_mode === explanationMode
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
