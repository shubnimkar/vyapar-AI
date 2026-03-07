/**
 * Integration tests for /api/indices/explain endpoint
 * Verifies AI explanation follows Hybrid Intelligence Principle
 */

import { POST } from '@/app/api/indices/explain/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/bedrock-client');
jest.mock('@/lib/logger');

import { invokeBedrockModel } from '@/lib/bedrock-client';

const mockInvokeBedrockModel = invokeBedrockModel as jest.MockedFunction<typeof invokeBedrockModel>;

describe('POST /api/indices/explain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    test('should explain stress index successfully', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: true,
        content: 'Your stress index is moderate. Focus on reducing credit exposure.',
      });

      const requestBody = {
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        userProfile: {
          business_type: 'kirana',
          city_tier: 'tier-2',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBeDefined();
      expect(data.stressIndex).toEqual(requestBody.stressIndex);
    });

    test('should explain affordability index successfully', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: true,
        content: 'This expense is affordable for your business.',
      });

      const requestBody = {
        affordabilityIndex: {
          score: 75,
          breakdown: {
            costToProfitRatio: 0.4,
            affordabilityCategory: 'Affordable',
          },
          inputParameters: {
            plannedCost: 20000,
            avgMonthlyProfit: 50000,
          },
        },
        userProfile: {
          business_type: 'salon',
          explanation_mode: 'detailed',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBeDefined();
      expect(data.affordabilityIndex).toEqual(requestBody.affordabilityIndex);
    });

    test('should explain both indices together', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: true,
        content: 'Your financial health is moderate. The planned expense is affordable.',
      });

      const requestBody = {
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        affordabilityIndex: {
          score: 75,
          breakdown: {
            costToProfitRatio: 0.4,
            affordabilityCategory: 'Affordable',
          },
          inputParameters: {
            plannedCost: 20000,
            avgMonthlyProfit: 50000,
          },
        },
        userProfile: {
          business_type: 'pharmacy',
          city_tier: 'tier-1',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBeDefined();
      expect(data.stressIndex).toEqual(requestBody.stressIndex);
      expect(data.affordabilityIndex).toEqual(requestBody.affordabilityIndex);
    });
  });

  describe('Error Cases', () => {
    test('should return 400 when both indices are missing', async () => {
      const requestBody = {
        userProfile: {
          business_type: 'kirana',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_INDEX_DATA');
    });

    test('should return 400 when user profile is missing', async () => {
      const requestBody = {
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('MISSING_USER_PROFILE');
    });
  });

  describe('Fallback Behavior', () => {
    test('should return fallback explanation when AI service fails', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
        errorType: 'service_error',
      });

      const requestBody = {
        stressIndex: {
          score: 75,
          breakdown: {
            creditRatioScore: 35,
            cashBufferScore: 25,
            expenseVolatilityScore: 15,
          },
          inputParameters: {
            creditRatio: 0.65,
            cashBuffer: 0.8,
            expenseVolatility: 0.35,
          },
        },
        userProfile: {
          business_type: 'restaurant',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBeDefined();
      expect(data.fallback).toBe(true);
      expect(data.explanation).toContain('stress index is high');
    });

    test('should provide Hindi fallback explanation', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: false,
        error: 'Service unavailable',
        errorType: 'service_error',
      });

      const requestBody = {
        stressIndex: {
          score: 25,
          breakdown: {
            creditRatioScore: 10,
            cashBufferScore: 10,
            expenseVolatilityScore: 5,
          },
          inputParameters: {
            creditRatio: 0.15,
            cashBuffer: 2.5,
            expenseVolatility: 0.12,
          },
        },
        userProfile: {
          business_type: 'kirana',
          explanation_mode: 'simple',
        },
        language: 'hi',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.explanation).toBeDefined();
      expect(data.fallback).toBe(true);
      expect(data.explanation).toContain('स्वस्थ');
    });
  });

  describe('Hybrid Intelligence Principle Verification', () => {
    test('should pass pre-calculated values to AI, not recalculate', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: true,
        content: 'Explanation based on provided values',
      });

      const requestBody = {
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        userProfile: {
          business_type: 'kirana',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await POST(request);

      // Verify AI was called with prompt containing pre-calculated values
      expect(mockInvokeBedrockModel).toHaveBeenCalledTimes(1);
      const promptArg = mockInvokeBedrockModel.mock.calls[0][0];
      
      // Verify prompt includes the pre-calculated score
      expect(promptArg).toContain('45/100');
      
      // Verify prompt includes breakdown values
      expect(promptArg).toContain('20/40');
      expect(promptArg).toContain('15/35');
      expect(promptArg).toContain('10/25');
      
      // Verify prompt includes AI interpretation instructions
      expect(promptArg).toContain('CRITICAL');
      expect(promptArg.toLowerCase()).toContain('not');
      expect(promptArg.toLowerCase()).toContain('calculate');
    });
  });

  describe('Response Format', () => {
    test('should return structured JSON response', async () => {
      mockInvokeBedrockModel.mockResolvedValue({
        success: true,
        content: 'Test explanation',
      });

      const requestBody = {
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        userProfile: {
          business_type: 'kirana',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('explanation');
      expect(data).toHaveProperty('stressIndex');
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.explanation).toBe('string');
    });

    test('should not expose stack traces in error responses', async () => {
      const requestBody = {
        userProfile: {
          business_type: 'kirana',
          explanation_mode: 'simple',
        },
        language: 'en',
      };

      const request = new NextRequest('http://localhost:3000/api/indices/explain', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).not.toHaveProperty('stack');
      expect(data).not.toHaveProperty('stackTrace');
      expect(JSON.stringify(data).toLowerCase()).not.toContain('at object');
    });
  });
});
