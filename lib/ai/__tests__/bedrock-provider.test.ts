/**
 * Unit Tests for BedrockProvider
 * 
 * Tests cover:
 * - Successful response handling for Claude and Nova models
 * - Error type mapping for all error categories
 * - Retry logic with exponential backoff for throttling
 * - Timeout handling without retry
 * - Configuration validation
 * - Dependency injection with mock client
 * 
 * Validates: Requirements 8.5
 */

import { BedrockProvider } from '../bedrock-provider';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime');

describe('BedrockProvider - Unit Tests', () => {
  let mockClient: jest.Mocked<BedrockRuntimeClient>;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create mock client
    mockClient = {
      send: jest.fn(),
    } as any;
  });
  
  describe('Constructor and Configuration', () => {
    it('should create instance with default configuration', () => {
      const provider = new BedrockProvider();
      
      expect(provider).toBeInstanceOf(BedrockProvider);
      expect(provider.getProviderName()).toBe('bedrock');
    });
    
    it('should accept dependency injection of client', () => {
      const provider = new BedrockProvider(mockClient);
      
      expect(provider).toBeInstanceOf(BedrockProvider);
    });
    
    it('should accept custom model ID', () => {
      const customModelId = 'anthropic.claude-3-opus-20240229-v1:0';
      const provider = new BedrockProvider(mockClient, customModelId);
      
      expect(provider).toBeInstanceOf(BedrockProvider);
    });
  });
  
  describe('isConfigured()', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      // Reset environment before each test
      jest.resetModules();
      process.env = { ...originalEnv };
    });
    
    afterAll(() => {
      // Restore original environment
      process.env = originalEnv;
    });
    
    it('should return true when all AWS credentials are present', () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-key-id';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      
      const provider = new BedrockProvider(mockClient);
      
      expect(provider.isConfigured()).toBe(true);
    });
    
    it('should return false when AWS_REGION is missing', () => {
      delete process.env.AWS_REGION;
      process.env.AWS_ACCESS_KEY_ID = 'test-key-id';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      
      const provider = new BedrockProvider(mockClient);
      
      expect(provider.isConfigured()).toBe(false);
    });
    
    it('should return false when AWS_ACCESS_KEY_ID is missing', () => {
      process.env.AWS_REGION = 'us-east-1';
      delete process.env.AWS_ACCESS_KEY_ID;
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      
      const provider = new BedrockProvider(mockClient);
      
      expect(provider.isConfigured()).toBe(false);
    });
    
    it('should return false when AWS_SECRET_ACCESS_KEY is missing', () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-key-id';
      delete process.env.AWS_SECRET_ACCESS_KEY;
      
      const provider = new BedrockProvider(mockClient);
      
      expect(provider.isConfigured()).toBe(false);
    });
  });
  
  describe('Successful Response Handling', () => {
    it('should handle successful Claude model response', async () => {
      const claudeResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [
            {
              type: 'text',
              text: 'This is a Claude response',
            },
          ],
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(claudeResponse);
      
      const provider = new BedrockProvider(mockClient, 'anthropic.claude-3-sonnet-20240229-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('This is a Claude response');
      expect(result.provider).toBe('bedrock');
      expect(result.error).toBeUndefined();
      expect(result.errorType).toBeUndefined();
    });
    
    it('should handle successful Nova model response', async () => {
      const novaResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          output: {
            message: {
              content: [
                {
                  text: 'This is a Nova response',
                },
              ],
            },
          },
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(novaResponse);
      
      const provider = new BedrockProvider(mockClient, 'amazon.nova-pro-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('This is a Nova response');
      expect(result.provider).toBe('bedrock');
      expect(result.error).toBeUndefined();
      expect(result.errorType).toBeUndefined();
    });
    
    it('should handle empty content in Claude response', async () => {
      const claudeResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [],
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(claudeResponse);
      
      const provider = new BedrockProvider(mockClient, 'anthropic.claude-3-sonnet-20240229-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should handle empty content in Nova response', async () => {
      const novaResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          output: {
            message: {
              content: [],
            },
          },
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(novaResponse);
      
      const provider = new BedrockProvider(mockClient, 'amazon.nova-pro-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
      expect(result.provider).toBe('bedrock');
    });
  });
  
  describe('Error Type Mapping', () => {
    it('should map ThrottlingException to rate_limit error', async () => {
      const throttlingError = new Error('Throttling');
      (throttlingError as any).name = 'ThrottlingException';
      
      mockClient.send.mockRejectedValue(throttlingError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt', { maxRetries: 0 });
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.error).toBe('Too many requests. Please try again in a moment.');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should map TimeoutError to timeout error', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).name = 'TimeoutError';
      
      mockClient.send.mockRejectedValue(timeoutError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(result.error).toBe('Request timed out. Please try again.');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should map ETIMEDOUT code to timeout error', async () => {
      const timeoutError = new Error('Connection timeout');
      (timeoutError as any).code = 'ETIMEDOUT';
      
      mockClient.send.mockRejectedValue(timeoutError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(result.error).toBe('Request timed out. Please try again.');
    });
    
    it('should map ServiceUnavailableException to service_error', async () => {
      const serviceError = new Error('Service unavailable');
      (serviceError as any).name = 'ServiceUnavailableException';
      
      mockClient.send.mockRejectedValue(serviceError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('service_error');
      expect(result.error).toBe('AI service is temporarily unavailable.');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should map UnauthorizedException to authentication error', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).name = 'UnauthorizedException';
      
      mockClient.send.mockRejectedValue(authError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('authentication');
      expect(result.error).toBe('Authentication failed.');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should map AccessDeniedException to authentication error', async () => {
      const authError = new Error('Access denied');
      (authError as any).name = 'AccessDeniedException';
      
      mockClient.send.mockRejectedValue(authError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('authentication');
      expect(result.error).toBe('Authentication failed.');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should map unknown errors to unknown error type', async () => {
      const unknownError = new Error('Something went wrong');
      (unknownError as any).name = 'UnknownException';
      
      mockClient.send.mockRejectedValue(unknownError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.error).toBe('Something went wrong');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should use fallback error message for errors without message', async () => {
      const errorWithoutMessage = new Error();
      delete (errorWithoutMessage as any).message;
      
      mockClient.send.mockRejectedValue(errorWithoutMessage);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get AI response.');
    });
  });
  
  describe('Retry Logic with Exponential Backoff', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should retry on ThrottlingException with exponential backoff', async () => {
      const throttlingError = new Error('Throttling');
      (throttlingError as any).name = 'ThrottlingException';
      
      const successResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ type: 'text', text: 'Success after retry' }],
        })),
      };
      
      // First two calls fail, third succeeds
      mockClient.send
        .mockRejectedValueOnce(throttlingError)
        .mockRejectedValueOnce(throttlingError)
        .mockResolvedValueOnce(successResponse);
      
      const provider = new BedrockProvider(mockClient);
      const resultPromise = provider.generateResponse('Test prompt', { maxRetries: 2 });
      
      // Fast-forward through the backoff delays
      await jest.advanceTimersByTimeAsync(1000); // First retry after 1s
      await jest.advanceTimersByTimeAsync(2000); // Second retry after 2s
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Success after retry');
      expect(mockClient.send).toHaveBeenCalledTimes(3);
    });
    
    it('should use exponential backoff timing (1s, 2s, 4s)', async () => {
      const throttlingError = new Error('Throttling');
      (throttlingError as any).name = 'ThrottlingException';
      
      mockClient.send.mockRejectedValue(throttlingError);
      
      const provider = new BedrockProvider(mockClient);
      const resultPromise = provider.generateResponse('Test prompt', { maxRetries: 2 });
      
      // Verify timing of retries
      await jest.advanceTimersByTimeAsync(999);
      expect(mockClient.send).toHaveBeenCalledTimes(1); // Initial call only
      
      await jest.advanceTimersByTimeAsync(1);
      expect(mockClient.send).toHaveBeenCalledTimes(2); // After 1s
      
      await jest.advanceTimersByTimeAsync(1999);
      expect(mockClient.send).toHaveBeenCalledTimes(2); // Still waiting
      
      await jest.advanceTimersByTimeAsync(1);
      expect(mockClient.send).toHaveBeenCalledTimes(3); // After 2s more
      
      await resultPromise;
    });
    
    it('should respect maxRetries option', async () => {
      const throttlingError = new Error('Throttling');
      (throttlingError as any).name = 'ThrottlingException';
      
      mockClient.send.mockRejectedValue(throttlingError);
      
      const provider = new BedrockProvider(mockClient);
      const resultPromise = provider.generateResponse('Test prompt', { maxRetries: 1 });
      
      await jest.advanceTimersByTimeAsync(1000);
      
      const result = await resultPromise;
      
      expect(result.success).toBe(false);
      expect(mockClient.send).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
    
    it('should not retry when maxRetries is 0', async () => {
      const throttlingError = new Error('Throttling');
      (throttlingError as any).name = 'ThrottlingException';
      
      mockClient.send.mockRejectedValue(throttlingError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt', { maxRetries: 0 });
      
      expect(result.success).toBe(false);
      expect(mockClient.send).toHaveBeenCalledTimes(1); // No retries
    });
  });
  
  describe('Timeout Handling Without Retry', () => {
    it('should not retry on timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).name = 'TimeoutError';
      
      mockClient.send.mockRejectedValue(timeoutError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt', { maxRetries: 2 });
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(mockClient.send).toHaveBeenCalledTimes(1); // No retries
    });
    
    it('should not retry on service errors', async () => {
      const serviceError = new Error('Service unavailable');
      (serviceError as any).name = 'ServiceUnavailableException';
      
      mockClient.send.mockRejectedValue(serviceError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt', { maxRetries: 2 });
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('service_error');
      expect(mockClient.send).toHaveBeenCalledTimes(1); // No retries
    });
    
    it('should not retry on authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).name = 'UnauthorizedException';
      
      mockClient.send.mockRejectedValue(authError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt', { maxRetries: 2 });
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('authentication');
      expect(mockClient.send).toHaveBeenCalledTimes(1); // No retries
    });
    
    it('should not retry on unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      
      mockClient.send.mockRejectedValue(unknownError);
      
      const provider = new BedrockProvider(mockClient);
      const result = await provider.generateResponse('Test prompt', { maxRetries: 2 });
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(mockClient.send).toHaveBeenCalledTimes(1); // No retries
    });
  });
  
  describe('Model Type Detection and Request Formatting', () => {
    it('should successfully process Claude model response', async () => {
      const claudeResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ type: 'text', text: 'Claude response' }],
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(claudeResponse);
      
      const provider = new BedrockProvider(mockClient, 'anthropic.claude-3-sonnet-20240229-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Claude response');
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
    
    it('should successfully process Claude model with claude in ID', async () => {
      const claudeResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ type: 'text', text: 'Claude response' }],
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(claudeResponse);
      
      const provider = new BedrockProvider(mockClient, 'claude-3-opus-20240229-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Claude response');
    });
    
    it('should successfully process Nova model response', async () => {
      const novaResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          output: {
            message: {
              content: [{ text: 'Nova response' }],
            },
          },
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(novaResponse);
      
      const provider = new BedrockProvider(mockClient, 'amazon.nova-pro-v1:0');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Nova response');
    });
    
    it('should default to Claude format for unknown model IDs', async () => {
      const claudeResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ type: 'text', text: 'Response' }],
        })),
      };
      
      mockClient.send.mockResolvedValueOnce(claudeResponse);
      
      const provider = new BedrockProvider(mockClient, 'unknown-model-id');
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Response');
    });
  });
  
  describe('getProviderName()', () => {
    it('should return "bedrock"', () => {
      const provider = new BedrockProvider(mockClient);
      
      expect(provider.getProviderName()).toBe('bedrock');
    });
  });
});
