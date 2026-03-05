import fc from 'fast-check';
import { ProfileService } from '@/lib/dynamodb-client';

// Feature: persona-aware-ai, Property 1: Profile Field Validation
describe('ProfileService - Persona Field Validation', () => {
  describe('business_type validation', () => {
    it('should accept only valid business_type enum values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
          (businessType) => {
            expect(ProfileService.validateBusinessType(businessType)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid business_type values', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['kirana', 'salon', 'pharmacy', 'restaurant', 'other'].includes(s)),
          (invalidType) => {
            expect(ProfileService.validateBusinessType(invalidType)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('city_tier validation', () => {
    it('should accept valid city_tier enum values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('tier-1', 'tier-2', 'tier-3', 'rural'),
          (cityTier) => {
            expect(ProfileService.validateCityTier(cityTier)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept null for city_tier (optional field)', () => {
      expect(ProfileService.validateCityTier(null)).toBe(true);
    });

    it('should reject invalid city_tier values', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['tier-1', 'tier-2', 'tier-3', 'rural'].includes(s)),
          (invalidTier) => {
            expect(ProfileService.validateCityTier(invalidTier)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('explanation_mode validation', () => {
    it('should accept only valid explanation_mode enum values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('simple', 'detailed'),
          (mode) => {
            expect(ProfileService.validateExplanationMode(mode)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid explanation_mode values', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['simple', 'detailed'].includes(s)),
          (invalidMode) => {
            expect(ProfileService.validateExplanationMode(invalidMode)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
