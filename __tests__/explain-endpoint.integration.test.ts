/**
 * Integration tests for /api/explain endpoint with FallbackOrchestrator
 * Tests endpoint behavior with mock Bedrock success, fallback to Puter, and both providers failing
 */

import { POST } from '@/app/api/explain/route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session-store';
import { ProfileService } from '@/lib/dynamodb-client';
import { getFallbackOrchestrator, resetFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { MockProvider } from '@/lib/ai/__tests__/mock-provider';
import { AIProviderResponse } from '@/lib/ai/provider-abstraction';

// Mock dependencies
jest.mock('@/lib/session-store');
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/ai/fallback-orchestrator');

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetProfile = ProfileService.getProfile as jest.MockedFunction<typeof ProfileService.getProfile>;
const mockGetFallbackOrchestrator = getFallbackOrchestrator as jest.MockedFunction<typeof getFallbackOrchestrator>;

describe('/api/explain endpoint integration tests', () => {
  let mockBedrockProvider: MockProvider;
  let mockPuterProvider: MockProvider;
  let mockOrchestrator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock providers
    mockBedrockProvider = new MockProvider('bedrock');
    mockPuterProvider = new MockProvider('puter');
    
    // Create mock orchestrator
    mockOrchestrator = {
      generateResponse: jest.fn(),
      getConfig: jest.fn(() => ({ enableFallback: true, totalTimeout: 10000 })),
      reset: jest.fn(),
    };
    
    mockGetFallbackOrchestrator.mockReturnValue(mockOrchestrator);
    
    // Mock session
    mockGetSession.mockResolvedValue({
      sessionId: 'test-session-123',
      userId: 'user-123',
      expiresAt: Date.now() + 3600000,
    });
    
    // Mock profile
    mockGetProfile.mockResolvedValue({
      userId: 'user-123',
      business_type: 'kirana',
      city_tier: 'tier-2',
      explanation_mode: 'simple',
      language: 'en',
    });
  });

  afterEach(() => {
    mockBedrockProvider.reset();
    mockPuterProvider.reset();
  });

  describe('Bedrock success path', () => {
    it('should return AI explanation when Bedrock succeeds', async () => {
      // Mock successful Bedrock response
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your health score of 85 is excellent! This means your business is financially healthy.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: 'user-123',
          metric: 'health_score',
          value: 85,
          context: { breakdown: { profit: 5000, expenses: 3000 } },
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation.success).toBe(true);
      expect(data.explanation.content).toBe(mockResponse.content);
      expect(data.metric).toBe('health_score');
      expect(data.value).toBe(85);
      
      // Verify orchestrator was called with correct parameters
      expect(mockOrchestrator.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('health_score'),
        { language: 'en' },
        { endpoint: '/api/explain', userId: 'user-123' }
      );
    });
  });

  describe('Fallback to Puter path', () => {
    it('should return AI explanation when Bedrock fails but Puter succeeds', async () => {
      // Mock Puter fallback response
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your health score of 85 indicates good financial health for your kirana store.',
        provider: 'puter',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: 'user-123',
          metric: 'health_score',
          value: 85,
          context: { breakdown: { profit: 5000, expenses: 3000 } },
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation.success).toBe(true);
      expect(data.explanation.content).toBe(mockResponse.content);
      
      // Verify orchestrator was called
      expect(mockOrchestrator.generateResponse).toHaveBeenCalled();
    });
  });

  describe('Both providers fail path', () => {
    it('should return graceful degradation message when both providers fail', async () => {
      // Mock both providers failing
      const mockResponse: AIProviderResponse = {
        success: false,
        error: 'AI service temporarily unavailable. Please try again later.',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: 'user-123',
          metric: 'health_score',
          value: 85,
          context: { breakdown: { profit: 5000, expenses: 3000 } },
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation.success).toBe(false);
      expect(data.explanation.content).toContain('AI explanation temporarily unavailable');
      expect(data.metric).toBe('health_score');
      expect(data.value).toBe(85);
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
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: 'user-123',
          metric: 'margin',
          value: 35.5,
          context: { breakdown: { revenue: 10000, cost: 6450 } },
          language: 'en',
        }),
      });
      
      await POST(request);
      
      // Verify prompt includes persona context
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      expect(promptCall).toContain('kirana'); // business type
      expect(promptCall).toContain('margin'); // metric
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
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: 'user-123',
          metric: 'health_score',
          value: 75,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      // Verify response structure matches existing format
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('explanation');
      expect(data).toHaveProperty('metric');
      expect(data).toHaveProperty('value');
      expect(data.explanation).toHaveProperty('success');
      expect(data.explanation).toHaveProperty('content');
    });
  });

  describe('Cashflow prediction explanation', () => {
    it('should explain cashflow predictions without requiring sessionId or value', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your cash flow shows a weekly pattern with higher sales on weekends. Days 3 and 5 show negative balances due to supplier payments.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const predictions = [
        { date: '2024-03-10', predictedBalance: 5000, trend: 'up', confidence: 0.85, isNegative: false },
        { date: '2024-03-11', predictedBalance: 3000, trend: 'down', confidence: 0.80, isNegative: false },
        { date: '2024-03-12', predictedBalance: -1000, trend: 'down', confidence: 0.75, isNegative: true },
        { date: '2024-03-13', predictedBalance: 2000, trend: 'up', confidence: 0.78, isNegative: false },
        { date: '2024-03-14', predictedBalance: -500, trend: 'down', confidence: 0.72, isNegative: true },
        { date: '2024-03-15', predictedBalance: 4000, trend: 'up', confidence: 0.82, isNegative: false },
        { date: '2024-03-16', predictedBalance: 6000, trend: 'up', confidence: 0.88, isNegative: false },
      ];
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          metric: 'cashflowPrediction',
          predictions,
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation.success).toBe(true);
      expect(data.explanation.content).toBe(mockResponse.content);
      
      // Verify orchestrator was called with cashflow prediction prompt
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      expect(promptCall).toContain('cash flow');
      expect(promptCall).toContain('prediction');
    });

    it('should return 400 when predictions are missing for cashflowPrediction', async () => {
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          metric: 'cashflowPrediction',
          language: 'en',
          // Missing predictions
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          // Missing userId, metric, value
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 for invalid session', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'invalid-session',
          userId: 'user-123',
          metric: 'health_score',
          value: 85,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 for incomplete profile', async () => {
      mockGetProfile.mockResolvedValue({
        userId: 'user-123',
        // Missing business_type and explanation_mode
      } as any);
      
      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          userId: 'user-123',
          metric: 'health_score',
          value: 85,
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
