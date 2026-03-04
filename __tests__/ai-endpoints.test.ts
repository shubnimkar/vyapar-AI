/**
 * Integration tests for AI endpoint validation
 * 
 * Property 9: Body Size Validation
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Tests body size validation, Bedrock error handling, and error response format for:
 * - /api/analyze (1MB limit)
 * - /api/ask (1MB limit)
 * - /api/explain (1MB limit)
 */

import { NextRequest } from 'next/server';
import { POST as analyzePost } from '@/app/api/analyze/route';
import { POST as askPost } from '@/app/api/ask/route';
import { POST as explainPost } from '@/app/api/explain/route';
import { BODY_SIZE_LIMITS } from '@/lib/error-utils';

// Mock session store
jest.mock('@/lib/session-store', () => ({
  getSession: jest.fn((sessionId: string) => {
    if (sessionId === 'valid-session') {
      return {
        sessionId: 'valid-session',
        salesData: { rows: [{ amount: 1000 }] },
        expensesData: { rows: [{ amount: 500 }] },
        inventoryData: { rows: [{ quantity: 10, cost_price: 100 }] },
        conversationHistory: [],
      };
    }
    return null;
  }),
  updateSession: jest.fn(),
}));

// Mock Bedrock client
jest.mock('@/lib/bedrock-client', () => ({
  invokeBedrockModel: jest.fn((prompt: string) => {
    // Simulate Bedrock error for specific prompts
    if (prompt.includes('TRIGGER_BEDROCK_ERROR')) {
      throw new Error('Bedrock service unavailable');
    }
    return Promise.resolve({
      success: true,
      content: 'AI analysis result',
    });
  }),
}));

// Mock bedrock-client-mock for analyze endpoint
jest.mock('@/lib/bedrock-client-mock', () => ({
  generateMockRecommendations: jest.fn(() => []),
  generateMockAlerts: jest.fn(() => []),
  generateMockChartData: jest.fn(() => ({})),
  generateMockBenchmark: jest.fn(() => ({})),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AI Endpoint Body Size Validation', () => {
  beforeEach(() => {
    // Reset Bedrock mock to default successful behavior
    const bedrockModule = require('@/lib/bedrock-client');
    bedrockModule.invokeBedrockModel.mockReset();
    bedrockModule.invokeBedrockModel.mockResolvedValue({
      success: true,
      content: 'AI analysis result',
    });
  });

  describe('Property 9: Body Size Validation - /api/analyze', () => {
    describe('BODY_TOO_LARGE response for oversized requests', () => {
      test('should return BODY_TOO_LARGE for request exceeding 1MB', async () => {
        // Create a large payload (2MB)
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          language: 'en',
          largeField: largeData,
        });

        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await analyzePost(request);
        const data = await response.json();

        // Verify response status and error code
        expect(response.status).toBe(413);
        expect(data.success).toBe(false);
        expect(data.code).toBe('BODY_TOO_LARGE');
        expect(data.message).toBeDefined();
      });

      test('should return BODY_TOO_LARGE for request at exactly 1MB + 1 byte', async () => {
        // Create payload at exactly the limit + 1 byte
        const largeData = 'x'.repeat(BODY_SIZE_LIMITS.AI + 1);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          language: 'en',
          data: largeData,
        });

        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await analyzePost(request);
        const data = await response.json();

        expect(response.status).toBe(413);
        expect(data.code).toBe('BODY_TOO_LARGE');
      });
    });

    describe('Successful processing for valid sizes', () => {
      test('should accept request under 1MB', async () => {
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await analyzePost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      });
    });

    describe('Error response format validation', () => {
      test('should return standardized error format for oversized request', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          data: largeData,
        });

        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await analyzePost(request);
        const data = await response.json();

        // Verify standardized error format
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(typeof data.code).toBe('string');
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      });

      test('should not include stack trace in error response', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          data: largeData,
        });

        const request = new NextRequest('http://localhost:3000/api/analyze', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await analyzePost(request);
        const data = await response.json();
        const responseText = JSON.stringify(data);

        // Verify no stack trace information
        expect(responseText).not.toContain('at ');
        expect(responseText).not.toMatch(/\.ts:/);
        expect(responseText).not.toMatch(/\.js:/);
        expect(data).not.toHaveProperty('stack');
      });
    });
  });

  describe('Property 9: Body Size Validation - /api/ask', () => {
    describe('BODY_TOO_LARGE response for oversized requests', () => {
      test('should return BODY_TOO_LARGE for request exceeding 1MB', async () => {
        // Create a large payload (2MB)
        const largeQuestion = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          question: largeQuestion,
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/ask', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await askPost(request);
        const data = await response.json();

        // Verify response status and error code
        expect(response.status).toBe(413);
        expect(data.success).toBe(false);
        expect(data.code).toBe('BODY_TOO_LARGE');
        expect(data.message).toBeDefined();
      });

      test('should return BODY_TOO_LARGE for request at exactly 1MB + 1 byte', async () => {
        // Create payload at exactly the limit + 1 byte
        const largeData = 'x'.repeat(BODY_SIZE_LIMITS.AI + 1);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          question: largeData,
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/ask', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await askPost(request);
        const data = await response.json();

        expect(response.status).toBe(413);
        expect(data.code).toBe('BODY_TOO_LARGE');
      });
    });

    describe('Successful processing for valid sizes', () => {
      test('should accept request under 1MB', async () => {
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          question: 'What is my profit?',
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/ask', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await askPost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      });
    });

    describe('Error response format validation', () => {
      test('should return standardized error format for oversized request', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          question: largeData,
        });

        const request = new NextRequest('http://localhost:3000/api/ask', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await askPost(request);
        const data = await response.json();

        // Verify standardized error format
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(typeof data.code).toBe('string');
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      });

      test('should not include stack trace in error response', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          question: largeData,
        });

        const request = new NextRequest('http://localhost:3000/api/ask', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await askPost(request);
        const data = await response.json();
        const responseText = JSON.stringify(data);

        // Verify no stack trace information
        expect(responseText).not.toContain('at ');
        expect(responseText).not.toMatch(/\.ts:/);
        expect(responseText).not.toMatch(/\.js:/);
        expect(data).not.toHaveProperty('stack');
      });
    });
  });

  describe('Property 9: Body Size Validation - /api/explain', () => {
    describe('BODY_TOO_LARGE response for oversized requests', () => {
      test('should return BODY_TOO_LARGE for request exceeding 1MB', async () => {
        // Create a large payload (2MB)
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          metric: 'healthScore',
          value: 75,
          context: { largeField: largeData },
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/explain', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await explainPost(request);
        const data = await response.json();

        // Verify response status and error code
        expect(response.status).toBe(413);
        expect(data.success).toBe(false);
        expect(data.code).toBe('BODY_TOO_LARGE');
        expect(data.message).toBeDefined();
      });

      test('should return BODY_TOO_LARGE for request at exactly 1MB + 1 byte', async () => {
        // Create payload at exactly the limit + 1 byte
        const largeData = 'x'.repeat(BODY_SIZE_LIMITS.AI + 1);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          metric: 'healthScore',
          value: 75,
          context: { data: largeData },
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/explain', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await explainPost(request);
        const data = await response.json();

        expect(response.status).toBe(413);
        expect(data.code).toBe('BODY_TOO_LARGE');
      });
    });

    describe('Successful processing for valid sizes', () => {
      test('should accept request under 1MB', async () => {
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          metric: 'healthScore',
          value: 75,
          language: 'en',
        });

        const request = new NextRequest('http://localhost:3000/api/explain', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await explainPost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      });
    });

    describe('Error response format validation', () => {
      test('should return standardized error format for oversized request', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          metric: 'healthScore',
          value: 75,
          context: { data: largeData },
        });

        const request = new NextRequest('http://localhost:3000/api/explain', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await explainPost(request);
        const data = await response.json();

        // Verify standardized error format
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(typeof data.code).toBe('string');
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      });

      test('should not include stack trace in error response', async () => {
        const largeData = 'x'.repeat(2 * 1024 * 1024);
        const requestBody = JSON.stringify({
          sessionId: 'valid-session',
          metric: 'healthScore',
          value: 75,
          context: { data: largeData },
        });

        const request = new NextRequest('http://localhost:3000/api/explain', {
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const response = await explainPost(request);
        const data = await response.json();
        const responseText = JSON.stringify(data);

        // Verify no stack trace information
        expect(responseText).not.toContain('at ');
        expect(responseText).not.toMatch(/\.ts:/);
        expect(responseText).not.toMatch(/\.js:/);
        expect(data).not.toHaveProperty('stack');
      });
    });
  });

  describe('BEDROCK_ERROR Handling', () => {
    test('/api/analyze should return error when Bedrock fails', async () => {
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        language: 'en',
      });

      // Reset and configure mock to return failure
      const bedrockModule = require('@/lib/bedrock-client');
      bedrockModule.invokeBedrockModel.mockReset();
      bedrockModule.invokeBedrockModel.mockResolvedValue({
        success: false,
        error: 'Bedrock service unavailable',
      });

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await analyzePost(request);
      const data = await response.json();

      // Verify error handling (should return 503 for Bedrock errors)
      expect(data.success).toBe(false);
      expect(data.code).toBe('BEDROCK_ERROR');
      expect(response.status).toBe(503);
    });

    test('/api/ask should return error when Bedrock fails', async () => {
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        question: 'What is my profit?',
        language: 'en',
      });

      // Reset and configure mock to return failure
      const bedrockModule = require('@/lib/bedrock-client');
      bedrockModule.invokeBedrockModel.mockReset();
      bedrockModule.invokeBedrockModel.mockResolvedValue({
        success: false,
        error: 'Bedrock service unavailable',
      });

      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await askPost(request);
      const data = await response.json();

      // Verify error handling
      expect(data.success).toBe(false);
      expect(data.code).toBe('BEDROCK_ERROR');
      expect(response.status).toBe(503);
    });

    test('/api/explain should return error when Bedrock throws exception', async () => {
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        metric: 'healthScore',
        value: 75,
        language: 'en',
      });

      // Reset and configure mock to throw error
      const bedrockModule = require('@/lib/bedrock-client');
      bedrockModule.invokeBedrockModel.mockReset();
      bedrockModule.invokeBedrockModel.mockRejectedValue(
        new Error('Bedrock connection timeout')
      );

      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await explainPost(request);
      const data = await response.json();

      // Verify error handling (explain endpoint catches Bedrock errors specifically)
      expect(data.success).toBe(false);
      expect(data.code).toBe('BEDROCK_ERROR');
      expect(response.status).toBe(503);
    });

    test('Bedrock errors should not expose stack traces', async () => {
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        question: 'Test question',
        language: 'en',
      });

      // Mock Bedrock to throw error with stack trace
      const bedrockModule = require('@/lib/bedrock-client');
      const error = new Error('Bedrock internal error');
      error.stack = 'Error: Bedrock internal error\n    at invokeBedrockModel (/app/lib/bedrock-client.ts:45:10)';
      bedrockModule.invokeBedrockModel.mockRejectedValueOnce(error);

      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await askPost(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Verify no stack trace in response
      expect(responseText).not.toContain('at ');
      expect(responseText).not.toMatch(/\.ts:/);
      expect(responseText).not.toMatch(/bedrock-client/);
      expect(data).not.toHaveProperty('stack');
    });
  });

  describe('Cross-Endpoint Consistency', () => {
    test('all AI endpoints should use same 1MB limit', () => {
      // Verify all AI endpoints use the same limit
      expect(BODY_SIZE_LIMITS.AI).toBe(1 * 1024 * 1024);
    });

    test('all AI endpoints should return same error code for oversized requests', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024);

      // Test /api/analyze
      const analyzeBody = JSON.stringify({
        sessionId: 'valid-session',
        data: largeData,
      });
      const analyzeRequest = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: analyzeBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const analyzeResponse = await analyzePost(analyzeRequest);
      const analyzeData = await analyzeResponse.json();

      // Test /api/ask
      const askBody = JSON.stringify({
        sessionId: 'valid-session',
        question: largeData,
      });
      const askRequest = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: askBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const askResponse = await askPost(askRequest);
      const askData = await askResponse.json();

      // Test /api/explain
      const explainBody = JSON.stringify({
        sessionId: 'valid-session',
        metric: 'healthScore',
        value: 75,
        context: { data: largeData },
      });
      const explainRequest = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: explainBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const explainResponse = await explainPost(explainRequest);
      const explainData = await explainResponse.json();

      // All should return same error code
      expect(analyzeData.code).toBe('BODY_TOO_LARGE');
      expect(askData.code).toBe('BODY_TOO_LARGE');
      expect(explainData.code).toBe('BODY_TOO_LARGE');
    });

    test('all AI endpoints should return same HTTP status for oversized requests', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024);

      // Test /api/analyze
      const analyzeBody = JSON.stringify({
        sessionId: 'valid-session',
        data: largeData,
      });
      const analyzeRequest = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: analyzeBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const analyzeResponse = await analyzePost(analyzeRequest);

      // Test /api/ask
      const askBody = JSON.stringify({
        sessionId: 'valid-session',
        question: largeData,
      });
      const askRequest = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: askBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const askResponse = await askPost(askRequest);

      // Test /api/explain
      const explainBody = JSON.stringify({
        sessionId: 'valid-session',
        metric: 'healthScore',
        value: 75,
        context: { data: largeData },
      });
      const explainRequest = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: explainBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const explainResponse = await explainPost(explainRequest);

      // All should return 413 status
      expect(analyzeResponse.status).toBe(413);
      expect(askResponse.status).toBe(413);
      expect(explainResponse.status).toBe(413);
    });

    test('all AI endpoints should return same HTTP status for Bedrock errors', async () => {
      // Mock Bedrock to fail
      const bedrockModule = require('@/lib/bedrock-client');
      
      // Test /api/analyze
      bedrockModule.invokeBedrockModel.mockReset();
      bedrockModule.invokeBedrockModel.mockResolvedValue({
        success: false,
        error: 'Bedrock unavailable',
      });
      const analyzeBody = JSON.stringify({
        sessionId: 'valid-session',
        language: 'en',
      });
      const analyzeRequest = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: analyzeBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const analyzeResponse = await analyzePost(analyzeRequest);

      // Test /api/ask
      const askBody = JSON.stringify({
        sessionId: 'valid-session',
        question: 'Test',
        language: 'en',
      });
      const askRequest = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: askBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const askResponse = await askPost(askRequest);

      // All should return 503 status for service unavailable
      expect(analyzeResponse.status).toBe(503);
      expect(askResponse.status).toBe(503);
    });
  });

  describe('Boundary Testing', () => {
    test('should handle minimal valid request', async () => {
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        language: 'en',
      });

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await analyzePost(request);
      const data = await response.json();

      // Should not fail on body size validation
      expect(data.code).not.toBe('BODY_TOO_LARGE');
    });

    test('should handle request at 500KB (middle of valid range)', async () => {
      const mediumData = 'x'.repeat(500 * 1024);
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        question: mediumData,
        language: 'en',
      });

      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await askPost(request);
      const data = await response.json();

      // Should not fail on body size validation
      expect(data.code).not.toBe('BODY_TOO_LARGE');
    });

    test('should handle request at exactly 1MB (at limit)', async () => {
      // Create payload at exactly 1MB minus JSON overhead
      const dataSize = BODY_SIZE_LIMITS.AI - 200; // Leave room for JSON structure
      const exactData = 'x'.repeat(dataSize);
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        metric: 'healthScore',
        value: 75,
        context: { data: exactData },
        language: 'en',
      });

      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await explainPost(request);
      const data = await response.json();

      // Should not fail on body size validation (at limit is valid)
      expect(data.code).not.toBe('BODY_TOO_LARGE');
    });
  });

  describe('Error Response Format Consistency', () => {
    test('all error responses should have exactly three fields', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024);
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        data: largeData,
      });

      const request = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await analyzePost(request);
      const data = await response.json();

      // Verify exactly three fields
      const keys = Object.keys(data);
      expect(keys).toHaveLength(3);
      expect(keys).toContain('success');
      expect(keys).toContain('code');
      expect(keys).toContain('message');
    });

    test('error messages should be non-empty strings', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024);
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        question: largeData,
      });

      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await askPost(request);
      const data = await response.json();

      // Verify message is non-empty string
      expect(typeof data.message).toBe('string');
      expect(data.message.length).toBeGreaterThan(0);
      expect(data.message.trim()).not.toBe('');
    });

    test('error codes should be non-empty strings', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024);
      const requestBody = JSON.stringify({
        sessionId: 'valid-session',
        metric: 'healthScore',
        value: 75,
        context: { data: largeData },
      });

      const request = new NextRequest('http://localhost:3000/api/explain', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await explainPost(request);
      const data = await response.json();

      // Verify code is non-empty string
      expect(typeof data.code).toBe('string');
      expect(data.code.length).toBeGreaterThan(0);
      expect(data.code.trim()).not.toBe('');
    });
  });
});
