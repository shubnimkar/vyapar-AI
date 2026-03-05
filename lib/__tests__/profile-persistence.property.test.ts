import fc from 'fast-check';
import { ProfileService } from '@/lib/dynamodb-client';

// Mock DynamoDB
jest.mock('@/lib/dynamodb-client', () => {
  const mockStorage = new Map<string, any>();
  
  return {
    ProfileService: {
      saveProfile: jest.fn(async (profile: any) => {
        mockStorage.set(profile.userId, profile);
      }),
      getProfile: jest.fn(async (userId: string) => {
        return mockStorage.get(userId) || null;
      }),
      validateBusinessType: jest.fn((type: string) => {
        return ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'].includes(type);
      }),
      validateCityTier: jest.fn((tier: string | null) => {
        if (tier === null) return true;
        return ['tier-1', 'tier-2', 'tier-3', 'rural'].includes(tier);
      }),
      validateExplanationMode: jest.fn((mode: string) => {
        return ['simple', 'detailed'].includes(mode);
      }),
    },
  };
});

// Feature: persona-aware-ai, Property 2: Profile Persistence Round-Trip
describe('ProfileService - Persona Persistence Round-Trip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should persist and retrieve persona fields with equivalent values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
        fc.option(fc.constantFrom('tier-1', 'tier-2', 'tier-3', 'rural'), { nil: null }),
        fc.constantFrom('simple', 'detailed'),
        async (userId, businessType, cityTier, explanationMode) => {
          const profile = {
            userId,
            shopName: 'Test Shop',
            userName: 'Test User',
            language: 'en',
            business_type: businessType,
            city_tier: cityTier,
            explanation_mode: explanationMode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Save profile
          await ProfileService.saveProfile(profile);

          // Retrieve profile
          const retrieved = await ProfileService.getProfile(userId);

          // Verify persona fields match
          expect(retrieved).not.toBeNull();
          expect(retrieved?.business_type).toBe(businessType);
          expect(retrieved?.city_tier).toBe(cityTier);
          expect(retrieved?.explanation_mode).toBe(explanationMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle null city_tier correctly in round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom('kirana', 'salon', 'pharmacy', 'restaurant', 'other'),
        fc.constantFrom('simple', 'detailed'),
        async (userId, businessType, explanationMode) => {
          const profile = {
            userId,
            shopName: 'Test Shop',
            userName: 'Test User',
            language: 'en',
            business_type: businessType,
            city_tier: null,
            explanation_mode: explanationMode,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await ProfileService.saveProfile(profile);
          const retrieved = await ProfileService.getProfile(userId);

          expect(retrieved?.city_tier).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
