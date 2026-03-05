import fc from 'fast-check';
import { buildPersonaPrompt } from '@/lib/ai/prompt-builder';
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

describe('Prompt Builder - Property Tests', () => {
  // Feature: persona-aware-ai, Property 3: Prompt Structure Completeness
  describe('Property 3: Prompt Structure Completeness', () => {
    it('should return object with system and user fields for all valid inputs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.option(fc.constantFrom('tier-1', 'tier-2', 'tier-3', 'rural'), { nil: null }),
          fc.constantFrom('simple', 'detailed'),
          fc.constantFrom('en', 'hi', 'mr'),
          fc.constantFrom('explain', 'analyze', 'ask'),
          (businessType, cityTier, explanationMode, language, promptType) => {
            const context: PersonaContext = {
              business_type: businessType,
              city_tier: cityTier,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, promptType as any, {
              metric: 'healthScore',
              value: 75,
            });

            expect(prompt).toHaveProperty('system');
            expect(prompt).toHaveProperty('user');
            expect(typeof prompt.system).toBe('string');
            expect(typeof prompt.user).toBe('string');
            expect(prompt.system.length).toBeGreaterThan(0);
            expect(prompt.user.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: persona-aware-ai, Property 4: Persona Identity Injection
  describe('Property 4: Persona Identity Injection', () => {
    it('should include business-specific persona identity for all business types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('en', 'hi', 'mr'),
          fc.constantFrom('simple', 'detailed'),
          (businessType, language, explanationMode) => {
            const context: PersonaContext = {
              business_type: businessType,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            // Verify persona identity is present in system prompt (language-aware)
            const advisorKeywords = {
              en: 'business advisor',
              hi: 'सलाहकार',
              mr: 'सल्लागार',
            };
            expect(prompt.system).toContain(advisorKeywords[language]);
            
            // Check for business type mention (may be translated)
            const businessKeywords: Record<string, Record<string, string>> = {
              kirana: { en: 'kirana', hi: 'किराना', mr: 'किराणा' },
              salon: { en: 'salon', hi: 'सैलून', mr: 'सलून' },
              pharmacy: { en: 'pharmacy', hi: 'फार्मेसी', mr: 'फार्मसी' },
              restaurant: { en: 'restaurant', hi: 'रेस्तरां', mr: 'रेस्टॉरंट' },
              other: { en: 'retail', hi: 'खुदरा', mr: 'किरकोळ' },
            };
            
            const expectedKeyword = businessKeywords[businessType][language];
            expect(prompt.system.toLowerCase()).toContain(expectedKeyword.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: persona-aware-ai, Property 5: Business Context Injection
  describe('Property 5: Business Context Injection', () => {
    it('should include business-specific context for all business types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('en', 'hi', 'mr'),
          fc.constantFrom('simple', 'detailed'),
          (businessType, language, explanationMode) => {
            const context: PersonaContext = {
              business_type: businessType,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            // Verify business context is present (language-aware keywords)
            const systemPrompt = prompt.system.toLowerCase();
            
            // Check for business-specific keywords (language-aware)
            if (businessType === 'kirana') {
              if (language === 'en') {
                expect(systemPrompt).toMatch(/inventory|perishable|credit/);
              } else {
                // Hindi/Marathi will have transliterated or native terms
                expect(systemPrompt).toMatch(/इन्वेंटरी|इन्व्हेंटरी|उधार/);
              }
            } else if (businessType === 'salon') {
              if (language === 'en') {
                expect(systemPrompt).toMatch(/service|staff|appointment/);
              } else {
                expect(systemPrompt).toMatch(/सेवा|कर्मचारी/);
              }
            } else if (businessType === 'pharmacy') {
              if (language === 'en') {
                expect(systemPrompt).toMatch(/medicine|prescription|expiry/);
              } else {
                expect(systemPrompt).toMatch(/दवा|औषध|प्रिस्क्रिप्शन/);
              }
            } else if (businessType === 'restaurant') {
              if (language === 'en') {
                expect(systemPrompt).toMatch(/food|wastage|menu/);
              } else {
                expect(systemPrompt).toMatch(/खाद्य|अन्न|मेनू/);
              }
            } else if (businessType === 'other') {
              if (language === 'en') {
                expect(systemPrompt).toMatch(/profit|inventory|efficiency/);
              } else {
                expect(systemPrompt).toMatch(/लाभ|नफा|इन्वेंटरी|इन्व्हेंटरी/);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: persona-aware-ai, Property 6: Location Context Conditional Inclusion
  describe('Property 6: Location Context Conditional Inclusion', () => {
    it('should include location context when city_tier is provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('tier-1', 'tier-2', 'tier-3', 'rural'),
          fc.constantFrom('simple', 'detailed'),
          fc.constantFrom('en', 'hi', 'mr'),
          (businessType, cityTier, explanationMode, language) => {
            const context: PersonaContext = {
              business_type: businessType,
              city_tier: cityTier,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            // Verify location context is present (language-aware)
            const systemPrompt = prompt.system.toLowerCase();
            if (language === 'en') {
              expect(systemPrompt).toMatch(/tier|city|competition|rural/);
            } else {
              // Hindi/Marathi location keywords
              expect(systemPrompt).toMatch(/टियर|शहर|ग्रामीण|प्रतिस्पर्धा|स्पर्धा/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not include location context when city_tier is null', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('simple', 'detailed'),
          fc.constantFrom('en', 'hi', 'mr'),
          (businessType, explanationMode, language) => {
            const context: PersonaContext = {
              business_type: businessType,
              city_tier: null,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            // Count occurrences of tier-related keywords
            // Should be minimal or absent when city_tier is null
            const systemPrompt = prompt.system.toLowerCase();
            const tierMentions = (systemPrompt.match(/tier-1|tier-2|tier-3/g) || []).length;
            expect(tierMentions).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: persona-aware-ai, Property 7: Explanation Mode Instructions
  describe('Property 7: Explanation Mode Instructions', () => {
    it('should instruct simple mode with 2-3 bullets and no jargon', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('en', 'hi', 'mr'),
          (businessType, language) => {
            const context: PersonaContext = {
              business_type: businessType,
              explanation_mode: 'simple',
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            const systemPrompt = prompt.system.toLowerCase();
            expect(systemPrompt).toMatch(/2-3|simple|short/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should instruct detailed mode with 5-7 bullets and explanations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('en', 'hi', 'mr'),
          (businessType, language) => {
            const context: PersonaContext = {
              business_type: businessType,
              explanation_mode: 'detailed',
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            const systemPrompt = prompt.system.toLowerCase();
            expect(systemPrompt).toMatch(/5-7|detailed|explain/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: persona-aware-ai, Property 8: AI Interpretation Layer Enforcement
  describe('Property 8: AI Interpretation Layer Enforcement', () => {
    it('should explicitly state AI must explain, not calculate', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('simple', 'detailed'),
          fc.constantFrom('en', 'hi', 'mr'),
          (businessType, explanationMode, language) => {
            const context: PersonaContext = {
              business_type: businessType,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'explain', {
              metric: 'healthScore',
              value: 75,
            });

            const systemPrompt = prompt.system.toLowerCase();
            if (language === 'en') {
              expect(systemPrompt).toMatch(/explain|interpret/);
              expect(systemPrompt).toMatch(/not.*calculat|do not.*calculat/);
            } else {
              // Hindi/Marathi interpretation keywords
              expect(systemPrompt).toMatch(/व्याख्या|स्पष्टीकरण/);
              expect(systemPrompt).toMatch(/न करें|नका/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: persona-aware-ai, Property 9: Deterministic Metrics Inclusion
  describe('Property 9: Deterministic Metrics Inclusion', () => {
    it('should include all provided metric values in user message', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          fc.constantFrom('simple', 'detailed'),
          fc.constantFrom('en', 'hi', 'mr'),
          fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.integer({ min: 0, max: 100 })),
          (businessType, explanationMode, language, metrics) => {
            const context: PersonaContext = {
              business_type: businessType,
              explanation_mode: explanationMode,
              language: language,
            };

            const prompt = buildPersonaPrompt(context, 'analyze', {
              calculatedMetrics: metrics,
            });

            // Verify all metric keys appear in user prompt
            for (const key of Object.keys(metrics)) {
              expect(prompt.user).toContain(key);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
