/**
 * Integration tests for /api/analyze endpoint with FallbackOrchestrator
 * Tests deterministic calculation ordering and Bedrock model-chain fallback behavior
 */

import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session-store';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { AIProviderResponse } from '@/lib/ai/provider-abstraction';

// Mock dependencies
jest.mock('@/lib/session-store');
jest.mock('@/lib/ai/fallback-orchestrator');
jest.mock('@/lib/bedrock-client-mock', () => ({
  generateMockRecommendations: jest.fn(() => ['Recommendation 1', 'Recommendation 2']),
  generateMockAlerts: jest.fn(() => ['Alert 1']),
  generateMockChartData: jest.fn(() => ({ labels: [], data: [] })),
  generateMockBenchmark: jest.fn(() => ({ industry: 'retail', score: 75 })),
}));

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetFallbackOrchestrator = getFallbackOrchestrator as jest.MockedFunction<typeof getFallbackOrchestrator>;

describe('/api/analyze endpoint integration tests', () => {
  let mockOrchestrator: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock orchestrator
    mockOrchestrator = {
      generateResponse: jest.fn(),
      getConfig: jest.fn(() => ({ enableFallback: true, totalTimeout: 10000 })),
      reset: jest.fn(),
    };
    
    mockGetFallbackOrchestrator.mockReturnValue(mockOrchestrator);
    
    // Mock session with sample data
    mockGetSession.mockResolvedValue({
      sessionId: 'test-session-123',
      userId: 'user-123',
      expiresAt: Date.now() + 3600000,
      salesData: {
        headers: ['date', 'amount', 'category'],
        rows: [
          { date: '2024-01-01', amount: 5000, category: 'groceries' },
          { date: '2024-01-02', amount: 3000, category: 'groceries' },
        ],
      },
      expensesData: {
        headers: ['date', 'amount', 'category'],
        rows: [
          { date: '2024-01-01', amount: 2000, category: 'rent' },
          { date: '2024-01-02', amount: 1000, category: 'utilities' },
        ],
      },
      inventoryData: {
        headers: ['item', 'quantity', 'cost_price'],
        rows: [
          { item: 'Rice', quantity: 100, cost_price: 50 },
          { item: 'Dal', quantity: 50, cost_price: 80 },
        ],
      },
    });
  });

  describe('Deterministic calculation ordering', () => {
    it('should calculate health score before calling AI', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: '**True Profit Analysis**\nYour profit is good.\n**Cashflow Forecast**\nStable.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify deterministic metrics were calculated
      expect(data.calculatedMetrics).toBeDefined();
      expect(data.calculatedMetrics.profit).toBeDefined();
      expect(data.calculatedMetrics.expenseRatio).toBeDefined();
      expect(data.calculatedMetrics.blockedInventory).toBeDefined();
      
      // Verify AI was called AFTER calculations
      expect(mockOrchestrator.generateResponse).toHaveBeenCalled();
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      
      // Prompt should include pre-calculated metrics
      expect(promptCall).toContain('5000'); // profit value
    });

    it('should use provided deterministic results if available', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: '**True Profit Analysis**\nAnalysis content.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
          deterministicResults: {
            profit: 10000,
            expenseRatio: 0.3,
            blockedInventory: 5000,
          },
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(data.calculatedMetrics.profit).toBe(10000);
      expect(data.calculatedMetrics.expenseRatio).toBe(0.3);
      expect(data.calculatedMetrics.blockedInventory).toBe(5000);
    });
  });

  describe('Bedrock success path', () => {
    it('should return AI analysis when Bedrock succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: '[SECTION_1] Your business is profitable. [SECTION_5] Positive trend.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.insights).toBeDefined();
      expect(data.insights.trueProfitAnalysis).toContain('profitable');
      expect(data.calculatedMetrics).toBeDefined();
      
      // Verify orchestrator was called with correct parameters
      expect(mockOrchestrator.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        { language: 'en' },
        { endpoint: '/api/analyze' }
      );
    });
  });

  describe('Bedrock fallback model path', () => {
    it('should return AI analysis when the fallback Bedrock model succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: '**True Profit Analysis**\nGood profit margins.\n**Blocked Inventory Cash**\nSome inventory blocked.',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-lite-v1:0',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.insights).toBeDefined();
      expect(data.calculatedMetrics).toBeDefined();
    });
  });

  describe('Both providers fail path', () => {
    it('should return error when both providers fail', async () => {
      const mockResponse: AIProviderResponse = {
        success: false,
        error: 'AI service temporarily unavailable.',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
    });
  });

  describe('Prompt building preservation', () => {
    it('should preserve existing prompt building logic', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: '**True Profit Analysis**\nTest content.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
        }),
      });
      
      await POST(request);
      
      // Verify prompt was built with session data
      expect(mockOrchestrator.generateResponse).toHaveBeenCalled();
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      expect(typeof promptCall).toBe('string');
      expect(promptCall.length).toBeGreaterThan(0);
    });
  });

  describe('Response format preservation', () => {
    it('should maintain existing response format structure', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: '**True Profit Analysis**\nContent.\n**Cashflow Forecast**\nForecast.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      // Verify response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('insights');
      expect(data).toHaveProperty('benchmark');
      expect(data).toHaveProperty('calculatedMetrics');
      
      // Verify insights structure
      expect(data.insights).toHaveProperty('trueProfitAnalysis');
      expect(data.insights).toHaveProperty('lossMakingProducts');
      expect(data.insights).toHaveProperty('blockedInventoryCash');
      expect(data.insights).toHaveProperty('abnormalExpenses');
      expect(data.insights).toHaveProperty('cashflowForecast');
      expect(data.insights).toHaveProperty('recommendations');
      expect(data.insights).toHaveProperty('alerts');
      expect(data.insights).toHaveProperty('chartData');
    });
  });

  describe('Error handling', () => {
    it('should return 400 for missing session ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 for invalid session', async () => {
      mockGetSession.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'invalid-session',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when no data is uploaded', async () => {
      mockGetSession.mockResolvedValue({
        sessionId: 'test-session-123',
        userId: 'user-123',
        expiresAt: Date.now() + 3600000,
        // No salesData, expensesData, or inventoryData
      });
      
      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
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
