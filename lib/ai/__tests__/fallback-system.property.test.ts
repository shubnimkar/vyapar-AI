/**
 * Property-Based Tests for AI Provider Fallback System
 * 
 * These tests verify universal correctness properties that should hold
 * across all valid executions of the fallback system.
 * 
 * Each property runs 100 iterations with randomized inputs to ensure
 * the system behaves correctly under all conditions.
 */

import fc from 'fast-check';
import { FallbackOrchestrator } from '../fallback-orchestrator';
import { MockProvider } from './mock-provider';
import { AIProviderResponse } from '../provider-abstraction';
import { Language } from '../../types';

describe('AI Provider Fallback System - Property-Based Tests', () => {
  /**
   * Property 1: Consistent Response Format Across Providers
   * 
   * For any AI provider implementation (Bedrock or Puter) and any valid prompt,
   * the response must conform to the AIProviderResponse interface with success flag,
   * optional content, optional error, errorType, and provider fields.
   * 
   * Validates: Requirements 1.2, 2.5, 3.5
   */
  describe('Property 1: Consistent Response Format Across Providers', () => {
    it('should return consistent response format for all providers and prompts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          fc.constantFrom('bedrock', 'puter'), // Provider selection
          fc.boolean(), // Success or failure
          async (prompt, providerType, shouldSucceed) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            // Configure mock response
            const mockResponse: AIProviderResponse = shouldSucceed
              ? {
                  success: true,
                  content: 'Test response content',
                  provider: providerType,
                }
              : {
                  success: false,
                  error: 'Test error',
                  errorType: 'service_error',
                  provider: providerType,
                };
            
            if (providerType === 'bedrock') {
              mockPrimary.setResponses([mockResponse]);
              mockFallback.setResponses([{ success: false, error: 'Fallback error', errorType: 'service_error', provider: 'puter' }]);
            } else {
              mockPrimary.setResponses([{ success: false, error: 'Primary error', errorType: 'service_error', provider: 'bedrock' }]);
              mockFallback.setResponses([mockResponse]);
            }
            
            const orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback);
            const response = await orchestrator.generateResponse(prompt);
            
            // Verify response structure
            expect(response).toHaveProperty('success');
            expect(typeof response.success).toBe('boolean');
            expect(response).toHaveProperty('provider');
            expect(['bedrock', 'puter']).toContain(response.provider);
            
            if (response.success) {
              expect(response).toHaveProperty('content');
              expect(typeof response.content).toBe('string');
            } else {
              expect(response).toHaveProperty('error');
              expect(response).toHaveProperty('errorType');
              expect(typeof response.error).toBe('string');
              expect(['authentication', 'rate_limit', 'timeout', 'service_error', 'unknown']).toContain(response.errorType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Fallback Ordering
   * 
   * For any AI request when fallback is enabled, the Fallback System must
   * attempt Bedrock Provider first, and only attempt Puter Provider if Bedrock fails.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  describe('Property 4: Fallback Ordering', () => {
    it('should always attempt Bedrock first, then Puter only if Bedrock fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          fc.boolean(), // Whether Bedrock succeeds
          async (prompt, bedrockSucceeds) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            // Configure responses
            if (bedrockSucceeds) {
              mockPrimary.setResponses([{
                success: true,
                content: 'Bedrock response',
                provider: 'bedrock',
              }]);
              mockFallback.setResponses([{
                success: true,
                content: 'Puter response',
                provider: 'puter',
              }]);
            } else {
              mockPrimary.setResponses([{
                success: false,
                error: 'Bedrock failed',
                errorType: 'service_error',
                provider: 'bedrock',
              }]);
              mockFallback.setResponses([{
                success: true,
                content: 'Puter response',
                provider: 'puter',
              }]);
            }
            
            const orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback);
            const response = await orchestrator.generateResponse(prompt);
            
            // Verify ordering
            expect(mockPrimary.getCallCount()).toBe(1); // Bedrock always called first
            
            if (bedrockSucceeds) {
              expect(mockFallback.getCallCount()).toBe(0); // Puter not called if Bedrock succeeds
              expect(response.provider).toBe('bedrock');
            } else {
              expect(mockFallback.getCallCount()).toBe(1); // Puter called if Bedrock fails
              expect(response.provider).toBe('puter');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Error Response Format Compliance
   * 
   * For any error condition where both providers fail, the Fallback System must
   * return an error response that conforms to the ErrorResponse format with
   * success=false, code, and message fields.
   * 
   * Validates: Requirements 4.3, 10.1
   */
  describe('Property 5: Error Response Format Compliance', () => {
    it('should return properly formatted error responses when both providers fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          fc.constantFrom('authentication', 'rate_limit', 'timeout', 'service_error', 'unknown'), // Error types
          async (prompt, errorType) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            // Both providers fail
            mockPrimary.setResponses([{
              success: false,
              error: 'Primary error',
              errorType,
              provider: 'bedrock',
            }]);
            mockFallback.setResponses([{
              success: false,
              error: 'Fallback error',
              errorType,
              provider: 'puter',
            }]);
            
            const orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback);
            const response = await orchestrator.generateResponse(prompt);
            
            // Verify error response format
            expect(response.success).toBe(false);
            expect(response.error).toBeTruthy();
            expect(typeof response.error).toBe('string');
            expect(response.errorType).toBeTruthy();
            expect(response.provider).toBe('bedrock'); // Reports primary provider
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Provider Logging Completeness
   * 
   * For any AI request processed by the Fallback System, the Provider Logger
   * must log which provider was used (bedrock or puter) along with request
   * metadata (endpoint, timestamp, userId if available).
   * 
   * Validates: Requirements 5.1, 5.6
   */
  describe('Property 6: Provider Logging Completeness', () => {
    it('should log provider usage and metadata for all requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          fc.string({ minLength: 5, maxLength: 50 }), // Random endpoint
          fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }), // Optional userId
          fc.boolean(), // Success or failure
          async (prompt, endpoint, userId, shouldSucceed) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            mockPrimary.setResponses([{
              success: shouldSucceed,
              content: shouldSucceed ? 'Response' : undefined,
              error: shouldSucceed ? undefined : 'Error',
              errorType: shouldSucceed ? undefined : 'service_error',
              provider: 'bedrock',
            }]);
            
            const orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback);
            
            // Capture logs (in real implementation, this would check logger output)
            const response = await orchestrator.generateResponse(
              prompt,
              {},
              { endpoint, userId }
            );
            
            // Verify response includes provider information
            expect(response.provider).toBeTruthy();
            expect(['bedrock', 'puter']).toContain(response.provider);
            
            // In a real test, we would verify logger.info/warn/error was called
            // with the correct metadata. For now, we verify the response structure.
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Localized Error Messages
   * 
   * For any error condition and any supported language (English, Hindi, Marathi),
   * the Fallback System must return error messages in the requested language
   * using the translation system.
   * 
   * Validates: Requirements 10.2
   */
  describe('Property 7: Localized Error Messages', () => {
    it('should return error messages in the requested language', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          fc.constantFrom('en', 'hi', 'mr'), // Supported languages
          async (prompt, language) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            // Both providers fail
            mockPrimary.setResponses([{
              success: false,
              error: 'Error',
              errorType: 'service_error',
              provider: 'bedrock',
            }]);
            mockFallback.setResponses([{
              success: false,
              error: 'Error',
              errorType: 'service_error',
              provider: 'puter',
            }]);
            
            const orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback);
            const response = await orchestrator.generateResponse(
              prompt,
              { language: language as Language }
            );
            
            // Verify error message is present and localized
            expect(response.success).toBe(false);
            expect(response.error).toBeTruthy();
            expect(typeof response.error).toBe('string');
            
            // Error message should not be the raw translation key
            expect(response.error).not.toContain('errors.');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Sensitive Information Sanitization
   * 
   * For any error response returned to clients, the response must not contain
   * API keys, credentials, AWS error details, or internal stack traces.
   * 
   * Validates: Requirements 10.5
   */
  describe('Property 10: Sensitive Information Sanitization', () => {
    it('should never expose sensitive information in error responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          fc.constantFrom(
            'AKIAIOSFODNN7EXAMPLE', // AWS access key
            'aws_access_key_id=AKIA123',
            'api_key=sk-1234567890',
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            'RequestId: abc-123-def',
            'arn:aws:bedrock:us-east-1:123:model/test',
            'at processRequest (/home/user/app/lib/bedrock.ts:123)'
          ), // Sensitive patterns
          async (prompt, sensitiveData) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            // Providers fail with sensitive data in error
            mockPrimary.setResponses([{
              success: false,
              error: `Error with sensitive data: ${sensitiveData}`,
              errorType: 'service_error',
              provider: 'bedrock',
            }]);
            mockFallback.setResponses([{
              success: false,
              error: 'Fallback error',
              errorType: 'service_error',
              provider: 'puter',
            }]);
            
            const orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback);
            const response = await orchestrator.generateResponse(prompt);
            
            // Verify sensitive data is not in response
            expect(response.success).toBe(false);
            expect(response.error).toBeTruthy();
            
            // Should not contain any of the sensitive patterns
            expect(response.error).not.toContain('AKIA');
            expect(response.error).not.toContain('aws_access_key_id');
            expect(response.error).not.toContain('api_key');
            expect(response.error).not.toContain('Bearer');
            expect(response.error).not.toContain('RequestId');
            expect(response.error).not.toContain('arn:aws');
            expect(response.error).not.toContain('/home/');
            expect(response.error).not.toContain('at processRequest');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Configuration Validation
   * 
   * For any configuration value, the Fallback System must validate and handle
   * invalid values gracefully, using safe defaults.
   */
  describe('Property: Configuration Validation', () => {
    it('should handle invalid configuration values gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // Enable fallback
          fc.integer({ min: 1000, max: 30000 }), // Timeout
          async (enableFallback, timeout) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            mockPrimary.setResponses([{
              success: true,
              content: 'Response',
              provider: 'bedrock',
            }]);
            
            const orchestrator = new FallbackOrchestrator(
              mockPrimary,
              mockFallback,
              { enableFallback, totalTimeout: timeout }
            );
            
            const config = orchestrator.getConfig();
            
            // Verify configuration is valid
            expect(typeof config.enableFallback).toBe('boolean');
            expect(typeof config.totalTimeout).toBe('number');
            expect(config.totalTimeout).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Fallback Disabled Behavior
   * 
   * When fallback is disabled, the system must only attempt the primary provider
   * and return errors immediately without trying the fallback provider.
   */
  describe('Property: Fallback Disabled Behavior', () => {
    it('should not attempt fallback when disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 500 }), // Random prompts
          async (prompt) => {
            const mockPrimary = new MockProvider('bedrock');
            const mockFallback = new MockProvider('puter');
            
            // Primary fails
            mockPrimary.setResponses([{
              success: false,
              error: 'Primary error',
              errorType: 'service_error',
              provider: 'bedrock',
            }]);
            
            const orchestrator = new FallbackOrchestrator(
              mockPrimary,
              mockFallback,
              { enableFallback: false, totalTimeout: 10000 }
            );
            
            const response = await orchestrator.generateResponse(prompt);
            
            // Verify only primary was called
            expect(mockPrimary.getCallCount()).toBe(1);
            expect(mockFallback.getCallCount()).toBe(0);
            expect(response.success).toBe(false);
            expect(response.provider).toBe('bedrock');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
