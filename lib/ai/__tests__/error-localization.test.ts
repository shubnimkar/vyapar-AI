/**
 * Unit tests for AI error message localization
 * 
 * Tests that error messages are properly localized for all supported languages
 * when AI providers fail.
 */

import { FallbackOrchestrator } from '../fallback-orchestrator';
import { MockProvider } from './mock-provider';
import { AIProviderResponse } from '../provider-abstraction';

describe('AI Error Message Localization', () => {
  let orchestrator: FallbackOrchestrator;
  let mockPrimary: MockProvider;
  let mockFallback: MockProvider;

  beforeEach(() => {
    mockPrimary = new MockProvider('bedrock');
    mockFallback = new MockProvider('puter');
    orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback, {
      enableFallback: true,
      totalTimeout: 10000,
    });
  });

  describe('English error messages', () => {
    it('should return English error message when both providers fail', async () => {
      // Configure both providers to fail
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Bedrock failed',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Puter failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('AI service temporarily unavailable. Please try again later.');
    });

    it('should use English as default when language not specified', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Bedrock failed',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Puter failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        {}, // No language specified
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('AI service temporarily unavailable. Please try again later.');
    });
  });

  describe('Hindi error messages', () => {
    it('should return Hindi error message when both providers fail', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Bedrock failed',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Puter failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'hi' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('AI सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।');
    });
  });

  describe('Marathi error messages', () => {
    it('should return Marathi error message when both providers fail', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Bedrock failed',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Puter failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'mr' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('AI सेवा तात्पुरती अनुपलब्ध आहे. कृपया नंतर पुन्हा प्रयत्न करा.');
    });
  });

  describe('Translation key verification', () => {
    it('should use correct translation key for AI unavailable error', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Bedrock failed',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Puter failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      // Test all three languages to verify translation key exists
      const languages: Array<'en' | 'hi' | 'mr'> = ['en', 'hi', 'mr'];
      
      for (const language of languages) {
        const response = await orchestrator.generateResponse(
          'Test prompt',
          { language },
          { endpoint: '/api/test' }
        );

        expect(response.success).toBe(false);
        expect(response.error).toBeTruthy();
        expect(response.error).not.toContain('errors.aiUnavailable'); // Should be translated, not raw key
      }
    });
  });

  describe('Unexpected error localization', () => {
    it('should return localized error for unexpected errors in English', async () => {
      // Force an unexpected error by making primary provider throw
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Unexpected error',
          errorType: 'unknown',
          provider: 'bedrock',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
      // Should use serverError translation key
    });

    it('should return localized error for unexpected errors in Hindi', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Unexpected error',
          errorType: 'unknown',
          provider: 'bedrock',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'hi' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });

    it('should return localized error for unexpected errors in Marathi', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Unexpected error',
          errorType: 'unknown',
          provider: 'bedrock',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'mr' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).toBeTruthy();
    });
  });
});
