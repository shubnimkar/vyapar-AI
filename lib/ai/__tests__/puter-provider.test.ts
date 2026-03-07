/**
 * Unit Tests for PuterProvider
 * 
 * Tests cover:
 * - Successful response handling
 * - Rate limiting detection (429 status)
 * - Timeout handling with AbortController
 * - Network error handling
 * - Response parsing
 * - isConfigured() always returns true
 * 
 * Validates: Requirements 8.5
 */

import { PuterProvider } from '../puter-provider';

// Mock global fetch
global.fetch = jest.fn();

describe('PuterProvider - Unit Tests', () => {
  let provider: PuterProvider;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Create provider instance
    provider = new PuterProvider();
  });
  
  describe('Constructor and Configuration', () => {
    it('should create instance with default endpoint', () => {
      const provider = new PuterProvider();
      
      expect(provider).toBeInstanceOf(PuterProvider);
      expect(provider.getProviderName()).toBe('puter');
    });
    
    it('should accept custom API endpoint', () => {
      const customEndpoint = 'https://custom.api.com/ai';
      const provider = new PuterProvider(customEndpoint);
      
      expect(provider).toBeInstanceOf(PuterProvider);
    });
  });
  
  describe('isConfigured()', () => {
    it('should always return true (no credentials needed)', () => {
      const provider = new PuterProvider();
      
      expect(provider.isConfigured()).toBe(true);
    });
    
    it('should return true even with custom endpoint', () => {
      const provider = new PuterProvider('https://custom.api.com/ai');
      
      expect(provider.isConfigured()).toBe(true);
    });
  });
  
  describe('Successful Response Handling', () => {
    it('should handle successful response with content', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a Puter response',
              },
            },
          ],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('This is a Puter response');
      expect(result.provider).toBe('puter');
      expect(result.error).toBeUndefined();
      expect(result.errorType).toBeUndefined();
    });
    
    it('should handle empty content in response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '',
              },
            },
          ],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
      expect(result.provider).toBe('puter');
    });
    
    it('should handle missing content field gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {},
            },
          ],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
      expect(result.provider).toBe('puter');
    });
    
    it('should handle missing choices array gracefully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('');
      expect(result.provider).toBe('puter');
    });
    
    it('should send correct request format to Puter API', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      await provider.generateResponse('Test prompt');
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.puter.com/ai/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: 'Test prompt',
              },
            ],
            model: 'gpt-3.5-turbo',
          }),
        })
      );
    });
    
    it('should use custom endpoint when provided', async () => {
      const customEndpoint = 'https://custom.api.com/ai';
      const customProvider = new PuterProvider(customEndpoint);
      
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      await customProvider.generateResponse('Test prompt');
      
      expect(global.fetch).toHaveBeenCalledWith(
        customEndpoint,
        expect.any(Object)
      );
    });
  });
  
  describe('Rate Limiting Detection (429 Status)', () => {
    it('should detect 429 status as rate_limit error', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('rate_limit');
      expect(result.error).toBe('Rate limit exceeded. Please try again later.');
      expect(result.provider).toBe('puter');
    });
    
    it('should return rate_limit error without calling json()', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: jest.fn(), // Should not be called
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      await provider.generateResponse('Test prompt');
      
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
  
  describe('Timeout Handling with AbortController', () => {
    it('should timeout after default 8 seconds', async () => {
      // Mock fetch to simulate a slow response that triggers AbortController
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          // Simulate the AbortController timeout
          setTimeout(() => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }, 8100); // Slightly longer than default timeout
        });
      });
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(result.error).toBe('Request timed out.');
      expect(result.provider).toBe('puter');
    }, 10000); // Increase test timeout to 10 seconds
    
    it('should use custom timeout when provided', async () => {
      // Mock fetch to simulate a slow response
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }, 5100); // Slightly longer than custom timeout
        });
      });
      
      const result = await provider.generateResponse('Test prompt', { timeout: 5000 });
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
    }, 7000); // Increase test timeout to 7 seconds
    
    it('should handle AbortError from AbortController', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('timeout');
      expect(result.error).toBe('Request timed out.');
      expect(result.provider).toBe('puter');
    });
    
    it('should clear timeout on successful response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Quick response' } }],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      await provider.generateResponse('Test prompt');
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });
  });
  
  describe('Network Error Handling', () => {
    it('should handle network connection errors', async () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'TypeError';
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.error).toBe('Failed to fetch');
      expect(result.provider).toBe('puter');
    });
    
    it('should handle DNS resolution errors', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(dnsError);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.error).toBe('getaddrinfo ENOTFOUND');
    });
    
    it('should use fallback error message when error has no message', async () => {
      const errorWithoutMessage = new Error();
      delete (errorWithoutMessage as any).message;
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(errorWithoutMessage);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to connect to Puter AI service.');
    });
    
    it('should handle connection refused errors', async () => {
      const connectionError = new Error('connect ECONNREFUSED');
      
      (global.fetch as jest.Mock).mockRejectedValueOnce(connectionError);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.provider).toBe('puter');
    });
  });
  
  describe('Response Parsing', () => {
    it('should parse valid JSON response correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Parsed content',
              },
            },
          ],
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Parsed content');
      expect(mockResponse.json).toHaveBeenCalledTimes(1);
    });
    
    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Unexpected token')),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('unknown');
      expect(result.error).toBe('Unexpected token');
    });
    
    it('should extract content from nested response structure', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Nested content',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
          },
        }),
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Nested content');
    });
  });
  
  describe('HTTP Error Status Handling', () => {
    it('should handle 400 Bad Request as service_error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('service_error');
      expect(result.error).toBe('Puter API error: Bad Request');
    });
    
    it('should handle 401 Unauthorized as service_error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('service_error');
      expect(result.error).toBe('Puter API error: Unauthorized');
    });
    
    it('should handle 500 Internal Server Error as service_error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('service_error');
      expect(result.error).toBe('Puter API error: Internal Server Error');
    });
    
    it('should handle 503 Service Unavailable as service_error', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await provider.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('service_error');
      expect(result.error).toBe('Puter API error: Service Unavailable');
    });
  });
  
  describe('getProviderName()', () => {
    it('should return "puter"', () => {
      const provider = new PuterProvider();
      
      expect(provider.getProviderName()).toBe('puter');
    });
    
    it('should return "puter" even with custom endpoint', () => {
      const provider = new PuterProvider('https://custom.api.com/ai');
      
      expect(provider.getProviderName()).toBe('puter');
    });
  });
});
