/**
 * Integration tests for /api/benchmark/explain endpoint with FallbackOrchestrator
 * Tests benchmark explanation with deterministic comparison values
 */

import { POST } from '@/app/api/benchmark/explain/route';
import { NextRequest } from 'next/server';
import { ProfileService } from '@/lib/dynamodb-client';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { AIProviderResponse } from '@/lib/ai/provider-abstraction';

// Mock dependencies
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/ai/fallback-orchestrator');

const mockGetProfile = ProfileService.getProfile as jest.MockedFunction<typeof ProfileService.getProfile>;
const mockGetFallbackOrchestrator = getFallbackOrchestrator as jest.MockedFunction<typeof getFallbackOrchestrator>;

describe('/api/benchmark/explain endpoint integration tests', () => {
  let mockOrchestrator: any;

  const mockComparison = {
    healthScoreComparison: {
      userValue: 85,
      segmentMedian: 75,
      percentile: 80,
      category: 'above_average' as const,
    },
    marginComparison: {
      userValue: 35,
      segmentMedian: 30,
      percentile: 70,
      category: 'above_average' as const,
    },
    segmentInfo: {
      business_type: 'kirana',
      city_tier: 'tier-2',
      sample_size: 150,
    },
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
    
    // Mock profile
    mockGetProfile.mockResolvedValue({
      userId: 'user-123',
      business_type: 'kirana',
      city_tier: 'tier-2',
      explanation_mode: 'simple',
      language: 'en',
    });
  });

  describe('Deterministic calculation ordering', () => {
    it('should use pre-calculated comparison values before calling AI', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your business is performing above average in your segment.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify AI was called AFTER comparison was calculated
      expect(mockOrchestrator.generateResponse).toHaveBeenCalled();
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      
      // Prompt should include pre-calculated comparison values
      expect(promptCall).toContain('85'); // health score value
      expect(promptCall).toContain('Above Average'); // category (capitalized in prompt)
    });
  });

  describe('Bedrock success path', () => {
    it('should return AI explanation when Bedrock succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Great job! Your health score of 85 is higher than 80% of similar kirana stores in tier 2 cities.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBe(mockResponse.content);
      
      // Verify orchestrator was called with correct parameters
      expect(mockOrchestrator.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        { language: 'en' },
        { endpoint: '/api/benchmark/explain', userId: 'user-123' }
      );
    });
  });

  describe('Bedrock fallback model path', () => {
    it('should return AI explanation when the fallback Bedrock model succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your performance is above average compared to similar businesses.',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-lite-v1:0',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
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

  describe('All configured Bedrock models fail path', () => {
    it('should return graceful degradation when all configured models fail', async () => {
      const mockResponse: AIProviderResponse = {
        success: false,
        error: 'AI service temporarily unavailable.',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBeNull();
      expect(data.message).toContain('AI explanation temporarily unavailable');
    });
  });

  describe('Prompt building preservation', () => {
    it('should preserve existing benchmark prompt building with persona context', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Test explanation',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
          language: 'en',
        }),
      });
      
      await POST(request);
      
      // Verify prompt includes persona context
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      expect(promptCall).toContain('kirana'); // business type
      expect(promptCall).toContain('tier-2'); // city tier (with hyphen)
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
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      // Verify response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('explanation');
      expect(data.success).toBe(true);
      expect(typeof data.explanation).toBe('string');
    });
  });

  describe('Error handling', () => {
    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          // Missing comparison
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid comparison structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: {
            // Missing required fields
            healthScoreComparison: {},
          },
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for incomplete profile', async () => {
      mockGetProfile.mockResolvedValue({
        userId: 'user-123',
        // Missing business_type and explanation_mode
      } as any);
      
      const request = new NextRequest('http://localhost:3000/api/benchmark/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          comparison: mockComparison,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
