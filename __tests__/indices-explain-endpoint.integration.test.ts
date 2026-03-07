/**
 * Integration tests for /api/indices/explain endpoint with FallbackOrchestrator
 * Tests indices explanation with deterministic index calculations
 */

import { POST } from '@/app/api/indices/explain/route';
import { NextRequest } from 'next/server';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { AIProviderResponse } from '@/lib/ai/provider-abstraction';

// Mock dependencies
jest.mock('@/lib/ai/fallback-orchestrator');

const mockGetFallbackOrchestrator = getFallbackOrchestrator as jest.MockedFunction<typeof getFallbackOrchestrator>;

describe('/api/indices/explain endpoint integration tests', () => {
  let mockOrchestrator: any;

  const mockStressIndex = {
    score: 45,
    breakdown: {
      creditRatioScore: 15,
      cashBufferScore: 20,
      expenseVolatilityScore: 10,
    },
    inputParameters: {
      creditRatio: 0.25,
      cashBuffer: 0.05,
      expenseVolatility: 0.15,
    },
  };

  const mockAffordabilityIndex = {
    score: 75,
    breakdown: {
      affordabilityCategory: 'affordable',
      costToProfitRatio: 0.25,
    },
    inputParameters: {
      plannedCost: 25000,
      avgMonthlyProfit: 100000,
    },
  };

  const mockUserProfile = {
    userId: 'user-123',
    business_type: 'kirana',
    city_tier: 'tier-2',
    explanation_mode: 'simple',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock orchestrator
    mockOrchestrator = {
      generateResponse: jest.fn(),
      getConfig: jest.fn(() => ({ enableFallback: true, totalTimeout: 10000 })),
      reset: jest.fn(),
    };
    
    mockGetFallbackOrchestrator.mockReturnValue(mockOrchestrator);
  });

  describe('Deterministic calculation ordering', () => {
    it('should use pre-calculated index values before calling AI', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your stress index is moderate. Focus on improving cash reserves.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          affordabilityIndex: mockAffordabilityIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify AI was called AFTER indices were calculated
      expect(mockOrchestrator.generateResponse).toHaveBeenCalled();
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      
      // Prompt should include pre-calculated index values
      expect(promptCall).toContain('45'); // stress score
      expect(promptCall).toContain('75'); // affordability score
    });
  });

  describe('Bedrock success path', () => {
    it('should return AI explanation when Bedrock succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your stress index of 45 is moderate. Consider reducing credit exposure and building cash reserves.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBe(mockResponse.content);
      expect(data.stressIndex).toEqual(mockStressIndex);
      
      // Verify orchestrator was called with correct parameters
      expect(mockOrchestrator.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        { language: 'en' },
        { endpoint: '/api/indices/explain', userId: 'user-123' }
      );
    });

    it('should handle affordability index explanation', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your affordability index of 75 indicates this expense is manageable.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          affordabilityIndex: mockAffordabilityIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.affordabilityIndex).toEqual(mockAffordabilityIndex);
    });
  });

  describe('Fallback to Puter path', () => {
    it('should return AI explanation when Bedrock fails but Puter succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your financial stress is moderate. Monitor your expenses closely.',
        provider: 'puter',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBe(mockResponse.content);
    });
  });

  describe('Both providers fail path', () => {
    it('should return deterministic fallback explanation when both providers fail', async () => {
      const mockResponse: AIProviderResponse = {
        success: false,
        error: 'AI service temporarily unavailable.',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          affordabilityIndex: mockAffordabilityIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fallback).toBe(true);
      expect(data.explanation).toBeDefined();
      expect(typeof data.explanation).toBe('string');
      expect(data.explanation.length).toBeGreaterThan(0);
    });

    it('should provide localized fallback explanation in Hindi', async () => {
      const mockResponse: AIProviderResponse = {
        success: false,
        error: 'AI service unavailable',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          userProfile: mockUserProfile,
          language: 'hi',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fallback).toBe(true);
      expect(data.explanation).toContain('तनाव'); // Hindi word for stress
    });
  });

  describe('Prompt building preservation', () => {
    it('should preserve existing prompt building with persona context', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Test explanation',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      await POST(request);
      
      // Verify prompt includes persona context
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      expect(promptCall).toContain('kirana'); // business type
    });
  });

  describe('Response format preservation', () => {
    it('should maintain existing response format structure', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Test explanation content',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          affordabilityIndex: mockAffordabilityIndex,
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      // Verify response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('explanation');
      expect(data).toHaveProperty('stressIndex');
      expect(data).toHaveProperty('affordabilityIndex');
      expect(data.success).toBe(true);
      expect(typeof data.explanation).toBe('string');
    });
  });

  describe('Error handling', () => {
    it('should return 400 when both indices are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          userProfile: mockUserProfile,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_INDEX_DATA');
    });

    it('should return 400 when user profile is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify({
          stressIndex: mockStressIndex,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_USER_PROFILE');
    });
  });
});
