import { buildPersonaPrompt, formatMetricsForPrompt } from '@/lib/ai/prompt-builder';
import { PersonaContext } from '@/lib/ai/types';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Prompt Builder - Unit Tests', () => {
  describe('Edge Cases', () => {
    it('should handle city_tier as null (optional field not set)', () => {
      const context: PersonaContext = {
        business_type: 'kirana',
        city_tier: null,
        explanation_mode: 'simple',
        language: 'en',
      };

      const prompt = buildPersonaPrompt(context, 'explain', {
        metric: 'healthScore',
        value: 75,
      });

      expect(prompt.system).toBeDefined();
      expect(prompt.user).toBeDefined();
      // Should not contain tier-specific context
      expect(prompt.system).not.toMatch(/tier-1|tier-2|tier-3/);
    });

    it('should handle empty calculatedMetrics object', () => {
      const context: PersonaContext = {
        business_type: 'salon',
        explanation_mode: 'detailed',
        language: 'en',
      };

      const prompt = buildPersonaPrompt(context, 'analyze', {
        calculatedMetrics: {},
      });

      expect(prompt.system).toBeDefined();
      expect(prompt.user).toBeDefined();
    });

    it('should handle all three promptType values', () => {
      const context: PersonaContext = {
        business_type: 'pharmacy',
        explanation_mode: 'simple',
        language: 'en',
      };

      const explainPrompt = buildPersonaPrompt(context, 'explain', {
        metric: 'margin',
        value: 25,
      });
      expect(explainPrompt.user).toContain('explain');

      const analyzePrompt = buildPersonaPrompt(context, 'analyze', {
        calculatedMetrics: { healthScore: 75 },
      });
      expect(analyzePrompt.user).toContain('analyze');

      const askPrompt = buildPersonaPrompt(context, 'ask', {
        question: 'How can I improve my margins?',
      });
      expect(askPrompt.user).toContain('How can I improve my margins?');
    });

    it('should handle all language values (en, hi, mr)', () => {
      const baseContext = {
        business_type: 'restaurant' as const,
        explanation_mode: 'simple' as const,
      };

      const enPrompt = buildPersonaPrompt(
        { ...baseContext, language: 'en' },
        'explain',
        { metric: 'healthScore', value: 75 }
      );
      expect(enPrompt.system).toContain('business advisor');

      const hiPrompt = buildPersonaPrompt(
        { ...baseContext, language: 'hi' },
        'explain',
        { metric: 'healthScore', value: 75 }
      );
      expect(hiPrompt.system).toContain('सलाहकार');

      const mrPrompt = buildPersonaPrompt(
        { ...baseContext, language: 'mr' },
        'explain',
        { metric: 'healthScore', value: 75 }
      );
      expect(mrPrompt.system).toContain('सल्लागार');
    });
  });

  describe('Explanation Mode', () => {
    it('should instruct simple mode with 2-3 bullets and no jargon', () => {
      const context: PersonaContext = {
        business_type: 'kirana',
        explanation_mode: 'simple',
        language: 'en',
      };

      const prompt = buildPersonaPrompt(context, 'explain', {
        metric: 'healthScore',
        value: 75,
      });

      expect(prompt.system).toContain('2-3 bullet points');
      expect(prompt.system.toLowerCase()).toContain('simple');
    });

    it('should instruct detailed mode with 5-7 bullets and explanations', () => {
      const context: PersonaContext = {
        business_type: 'kirana',
        explanation_mode: 'detailed',
        language: 'en',
      };

      const prompt = buildPersonaPrompt(context, 'explain', {
        metric: 'healthScore',
        value: 75,
      });

      expect(prompt.system).toContain('5-7 bullet');
      expect(prompt.system.toLowerCase()).toContain('detailed');
    });
  });

  describe('formatMetricsForPrompt', () => {
    it('should format metrics as bullet list', () => {
      const metrics = {
        healthScore: 75,
        margin: 25,
        cashFlow: 10000,
      };

      const formatted = formatMetricsForPrompt(metrics);

      expect(formatted).toContain('- healthScore: 75');
      expect(formatted).toContain('- margin: 25');
      expect(formatted).toContain('- cashFlow: 10000');
    });

    it('should handle empty metrics object', () => {
      const formatted = formatMetricsForPrompt({});
      expect(formatted).toBe('');
    });
  });
});
