// Unit tests for benchmark prompt builder
// Tests prompt construction with persona context

import { buildBenchmarkExplanationPrompt } from '../benchmarkPromptBuilder';
import { PersonaContext } from '../types';
import { BenchmarkComparison } from '@/lib/types';

describe('buildBenchmarkExplanationPrompt', () => {
  const mockComparison: BenchmarkComparison = {
    healthScoreComparison: {
      userValue: 75,
      segmentMedian: 65,
      percentile: 65,
      category: 'above_average',
    },
    marginComparison: {
      userValue: 0.22,
      segmentMedian: 0.18,
      percentile: 62,
      category: 'above_average',
    },
    segmentInfo: {
      segmentKey: 'SEGMENT#tier1#kirana',
      sampleSize: 250,
      lastUpdated: '2024-01-15T10:00:00Z',
    },
    calculatedAt: '2024-01-15T10:30:00Z',
  };

  const mockContext: PersonaContext = {
    business_type: 'kirana',
    city_tier: 'tier-1',
    explanation_mode: 'simple',
    language: 'en',
  };

  it('should build prompt with all required sections', () => {
    const result = buildBenchmarkExplanationPrompt(mockComparison, mockContext);

    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('metadata');
    expect(result.system).toBeTruthy();
    expect(result.user).toBeTruthy();
  });

  it('should include persona identity in system prompt', () => {
    const result = buildBenchmarkExplanationPrompt(mockComparison, mockContext);

    // System prompt should include persona-specific content
    expect(result.system.length).toBeGreaterThan(0);
    expect(result.system).toContain('kirana'); // Business type should be referenced
  });

  it('should include comparison values in user prompt', () => {
    const result = buildBenchmarkExplanationPrompt(mockComparison, mockContext);

    // User prompt should include the actual comparison values
    expect(result.user).toContain('75'); // Health score
    expect(result.user).toContain('65'); // Segment median health
    expect(result.user).toContain('22'); // Margin percentage
    expect(result.user).toContain('250'); // Sample size
  });

  it('should include category labels in user prompt', () => {
    const result = buildBenchmarkExplanationPrompt(mockComparison, mockContext);

    expect(result.user).toContain('Above Average');
  });

  it('should adapt to explanation mode', () => {
    const simpleContext: PersonaContext = {
      ...mockContext,
      explanation_mode: 'simple',
    };

    const detailedContext: PersonaContext = {
      ...mockContext,
      explanation_mode: 'detailed',
    };

    const simpleResult = buildBenchmarkExplanationPrompt(mockComparison, simpleContext);
    const detailedResult = buildBenchmarkExplanationPrompt(mockComparison, detailedContext);

    // Both should have system prompts but with different instructions
    expect(simpleResult.system).toBeTruthy();
    expect(detailedResult.system).toBeTruthy();
    expect(simpleResult.system).not.toEqual(detailedResult.system);
  });

  it('should support Hindi language', () => {
    const hindiContext: PersonaContext = {
      ...mockContext,
      language: 'hi',
    };

    const result = buildBenchmarkExplanationPrompt(mockComparison, hindiContext);

    // Should contain Hindi text
    expect(result.user).toMatch(/[\u0900-\u097F]/); // Devanagari script
  });

  it('should support Marathi language', () => {
    const marathiContext: PersonaContext = {
      ...mockContext,
      language: 'mr',
    };

    const result = buildBenchmarkExplanationPrompt(mockComparison, marathiContext);

    // Should contain Marathi text (also Devanagari)
    expect(result.user).toMatch(/[\u0900-\u097F]/);
  });

  it('should include city tier context when provided', () => {
    const withTierContext: PersonaContext = {
      ...mockContext,
      city_tier: 'tier-2',
    };

    const result = buildBenchmarkExplanationPrompt(mockComparison, withTierContext);

    expect(result.system).toBeTruthy();
    // System prompt should be longer with tier context
    expect(result.system.length).toBeGreaterThan(100);
  });

  it('should handle below average performance', () => {
    const belowAverageComparison: BenchmarkComparison = {
      ...mockComparison,
      healthScoreComparison: {
        userValue: 35,
        segmentMedian: 65,
        percentile: 25,
        category: 'below_average',
      },
      marginComparison: {
        userValue: 0.08,
        segmentMedian: 0.18,
        percentile: 20,
        category: 'below_average',
      },
    };

    const result = buildBenchmarkExplanationPrompt(belowAverageComparison, mockContext);

    // Should include guidance for improvement
    expect(result.user).toContain('Below Average');
    expect(result.user.toLowerCase()).toMatch(/suggest|improve|action/);
  });

  it('should handle at average performance', () => {
    const atAverageComparison: BenchmarkComparison = {
      ...mockComparison,
      healthScoreComparison: {
        userValue: 50,
        segmentMedian: 50,
        percentile: 50,
        category: 'at_average',
      },
      marginComparison: {
        userValue: 0.18,
        segmentMedian: 0.18,
        percentile: 50,
        category: 'at_average',
      },
    };

    const result = buildBenchmarkExplanationPrompt(atAverageComparison, mockContext);

    expect(result.user).toContain('At Average');
    expect(result.user.toLowerCase()).toMatch(/optimiz/);
  });

  it('should include metadata for logging', () => {
    const result = buildBenchmarkExplanationPrompt(mockComparison, mockContext);

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.business_type).toBe('kirana');
    expect(result.metadata?.explanation_mode).toBe('simple');
    expect(result.metadata?.prompt_type).toBe('benchmark_explanation');
  });

  it('should work with different business types', () => {
    const businessTypes: Array<'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other'> = [
      'kirana',
      'salon',
      'pharmacy',
      'restaurant',
      'other',
    ];

    businessTypes.forEach((businessType) => {
      const context: PersonaContext = {
        ...mockContext,
        business_type: businessType,
      };

      const result = buildBenchmarkExplanationPrompt(mockComparison, context);

      expect(result.system).toBeTruthy();
      expect(result.user).toBeTruthy();
      expect(result.metadata?.business_type).toBe(businessType);
    });
  });

  it('should preserve numeric values exactly (no recalculation)', () => {
    const result = buildBenchmarkExplanationPrompt(mockComparison, mockContext);

    // Verify exact values are included (AI should NOT recalculate)
    expect(result.user).toContain('75'); // Exact health score
    expect(result.user).toContain('65'); // Exact segment median
    expect(result.user).toContain('22.0'); // Exact margin percentage
    expect(result.user).toContain('18.0'); // Exact segment margin
  });
});
