/**
 * Unit Tests for FallbackOrchestrator
 * 
 * Tests cover:
 * - Primary provider success (no fallback triggered)
 * - Primary failure with fallback success
 * - Both providers fail scenario
 * - Fallback disabled configuration
 * - Configuration validation with invalid values
 * - Logging at each decision point
 * - Singleton pattern with getFallbackOrchestrator()
 * - Reset functionality
 * - Use mock providers for all tests
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 8.5
 */

import {
  FallbackOrchestrator,
  getFallbackOrchestrator,
  resetFallbackOrchestrator,
  FallbackConfig,
} from '../fallback-orchestrator';
import { AIProvider, AIProviderResponse } from '../provider-abstraction';
import { logger } from '../../logger';

// Mock the logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

/**
 * Mock AI Provider for testing
 * Implements AIProvider interface with configurable responses
 */
class MockProvider implements AIProvider {
  private responses: AIProviderResponse[] = [];
  private callCount = 0;
  private name: 'bedrock' | 'puter';
  
  constructor(name: 'bedrock' | 'puter') {
    this.name = name;
  }
  
  async generateResponse(prompt: string): Promise<AIProviderResponse> {
    const response = this.responses[this.callCount] || {
      success: false,
      error: 'No response configured',
      errorType: 'unknown' as const,
      provider: this.name,
    };
    this.callCount++;
    return response;
  }
  
  getProviderName(): 'bedrock' | 'puter' {
    return this.name;
  }
  
  isConfigured(): boolean {
    return true;
  }
  
  // Test helper methods
  setResponses(responses: AIProviderResponse[]): void {
    this.responses = responses;
    this.callCount = 0;
  }
  
  getCallCount(): number {
    return this.callCount;
  }
  
  reset(): void {
    this.responses = [];
    this.callCount = 0;
  }
}

describe('FallbackOrchestrator - Unit Tests', () => {
  let mockPrimaryProvider: MockProvider;
  let mockFallbackProvider: MockProvider;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create fresh mock providers
    mockPrimaryProvider = new MockProvider('bedrock');
    mockFallbackProvider = new MockProvider('puter');
  });
  
  describe('Constructor and Configuration', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });
    
    afterAll(() => {
      process.env = originalEnv;
    });
    
    it('should create instance with default configuration', () => {
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      expect(orchestrator).toBeInstanceOf(FallbackOrchestrator);
      
      const config = orchestrator.getConfig();
      expect(config.enableFallback).toBe(true); // Default when env not set
      expect(config.totalTimeout).toBe(10000);
    });
    
    it('should accept dependency injection of providers', () => {
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      expect(orchestrator).toBeInstanceOf(FallbackOrchestrator);
    });
    
    it('should read ENABLE_AI_FALLBACK from environment (true)', () => {
      process.env.ENABLE_AI_FALLBACK = 'true';
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const config = orchestrator.getConfig();
      expect(config.enableFallback).toBe(true);
    });
    
    it('should read ENABLE_AI_FALLBACK from environment (false)', () => {
      process.env.ENABLE_AI_FALLBACK = 'false';
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const config = orchestrator.getConfig();
      expect(config.enableFallback).toBe(false);
    });
    
    it('should default to fallback enabled when env not set', () => {
      delete process.env.ENABLE_AI_FALLBACK;
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const config = orchestrator.getConfig();
      expect(config.enableFallback).toBe(true);
    });
    
    it('should accept custom configuration overrides', () => {
      const customConfig: Partial<FallbackConfig> = {
        enableFallback: false,
        totalTimeout: 5000,
      };
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider,
        customConfig
      );
      
      const config = orchestrator.getConfig();
      expect(config.enableFallback).toBe(false);
      expect(config.totalTimeout).toBe(5000);
    });
    
    it('should log initialization with configuration details', () => {
      new FallbackOrchestrator(mockPrimaryProvider, mockFallbackProvider);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Fallback orchestrator initialized',
        expect.objectContaining({
          fallback_enabled: expect.any(Boolean),
          total_timeout_ms: 10000,
          primary_provider: 'bedrock',
          fallback_provider: 'puter',
        })
      );
    });
  });
  
  describe('Configuration Validation', () => {
    const originalEnv = process.env;
    
    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });
    
    afterAll(() => {
      process.env = originalEnv;
    });
    
    it('should warn on invalid ENABLE_AI_FALLBACK value', () => {
      process.env.ENABLE_AI_FALLBACK = 'invalid';
      
      new FallbackOrchestrator(mockPrimaryProvider, mockFallbackProvider);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid ENABLE_AI_FALLBACK value, using default (true)',
        expect.objectContaining({
          provided_value: 'invalid',
        })
      );
    });
    
    it('should not warn on valid "true" value', () => {
      process.env.ENABLE_AI_FALLBACK = 'true';
      
      new FallbackOrchestrator(mockPrimaryProvider, mockFallbackProvider);
      
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid ENABLE_AI_FALLBACK'),
        expect.any(Object)
      );
    });
    
    it('should not warn on valid "false" value', () => {
      process.env.ENABLE_AI_FALLBACK = 'false';
      
      new FallbackOrchestrator(mockPrimaryProvider, mockFallbackProvider);
      
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid ENABLE_AI_FALLBACK'),
        expect.any(Object)
      );
    });
    
    it('should not warn when env variable is not set', () => {
      delete process.env.ENABLE_AI_FALLBACK;
      
      new FallbackOrchestrator(mockPrimaryProvider, mockFallbackProvider);
      
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid ENABLE_AI_FALLBACK'),
        expect.any(Object)
      );
    });
  });
  
  describe('Primary Provider Success (No Fallback)', () => {
    it('should return primary provider response on success', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Primary provider response',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Primary provider response');
      expect(result.provider).toBe('bedrock');
      expect(mockPrimaryProvider.getCallCount()).toBe(1);
      expect(mockFallbackProvider.getCallCount()).toBe(0);
    });
    
    it('should log success when primary provider succeeds', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/test',
        userId: 'user123',
      });
      
      expect(logger.info).toHaveBeenCalledWith(
        'AI request handled by AWS Bedrock',
        expect.objectContaining({
          endpoint: '/api/test',
          userId: 'user123',
          duration_ms: expect.any(Number),
        })
      );
    });
    
    it('should not call fallback provider when primary succeeds', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt');
      
      expect(mockFallbackProvider.getCallCount()).toBe(0);
    });
    
    it('should log request initiation', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/analyze',
        userId: 'user456',
      });
      
      expect(logger.info).toHaveBeenCalledWith(
        'AI request initiated',
        expect.objectContaining({
          endpoint: '/api/analyze',
          userId: 'user456',
          fallback_enabled: true,
        })
      );
    });
  });
  
  describe('Primary Failure with Fallback Success', () => {
    it('should fallback to secondary provider when primary fails', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Primary provider failed',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      const fallbackSuccess: AIProviderResponse = {
        success: true,
        content: 'Fallback provider response',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      mockFallbackProvider.setResponses([fallbackSuccess]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Fallback provider response');
      expect(result.provider).toBe('puter');
      expect(mockPrimaryProvider.getCallCount()).toBe(1);
      expect(mockFallbackProvider.getCallCount()).toBe(1);
    });
    
    it('should log fallback attempt when primary fails', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Bedrock unavailable',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      const fallbackSuccess: AIProviderResponse = {
        success: true,
        content: 'Fallback success',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      mockFallbackProvider.setResponses([fallbackSuccess]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/explain',
        userId: 'user789',
      });
      
      expect(logger.warn).toHaveBeenCalledWith(
        'AI request failed on Bedrock, using Puter.js fallback',
        expect.objectContaining({
          endpoint: '/api/explain',
          userId: 'user789',
          bedrock_error: 'Bedrock unavailable',
          bedrock_error_type: 'service_error',
        })
      );
    });
    
    it('should log fallback success', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Primary failed',
        errorType: 'timeout',
        provider: 'bedrock',
      };
      
      const fallbackSuccess: AIProviderResponse = {
        success: true,
        content: 'Fallback success',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      mockFallbackProvider.setResponses([fallbackSuccess]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/ask',
      });
      
      expect(logger.info).toHaveBeenCalledWith(
        'AI request handled by Puter.js fallback',
        expect.objectContaining({
          endpoint: '/api/ask',
          duration_ms: expect.any(Number),
        })
      );
    });
    
    it('should handle authentication errors with fallback', async () => {
      const authError: AIProviderResponse = {
        success: false,
        error: 'Authentication failed',
        errorType: 'authentication',
        provider: 'bedrock',
      };
      
      const fallbackSuccess: AIProviderResponse = {
        success: true,
        content: 'Fallback handled it',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([authError]);
      mockFallbackProvider.setResponses([fallbackSuccess]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('puter');
    });
    
    it('should handle rate limit errors with fallback', async () => {
      const rateLimitError: AIProviderResponse = {
        success: false,
        error: 'Rate limit exceeded',
        errorType: 'rate_limit',
        provider: 'bedrock',
      };
      
      const fallbackSuccess: AIProviderResponse = {
        success: true,
        content: 'Fallback success',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([rateLimitError]);
      mockFallbackProvider.setResponses([fallbackSuccess]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('puter');
    });
  });
  
  describe('Both Providers Fail Scenario', () => {
    it('should return error when both providers fail', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Primary failed',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      const fallbackError: AIProviderResponse = {
        success: false,
        error: 'Fallback also failed',
        errorType: 'timeout',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      mockFallbackProvider.setResponses([fallbackError]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('AI service temporarily unavailable. Please try again later.');
      expect(result.errorType).toBe('service_error');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should log both provider failures', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Bedrock error',
        errorType: 'authentication',
        provider: 'bedrock',
      };
      
      const fallbackError: AIProviderResponse = {
        success: false,
        error: 'Puter error',
        errorType: 'rate_limit',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      mockFallbackProvider.setResponses([fallbackError]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/benchmark/explain',
        userId: 'user999',
      });
      
      expect(logger.error).toHaveBeenCalledWith(
        'AI request failed on both providers',
        expect.objectContaining({
          endpoint: '/api/benchmark/explain',
          userId: 'user999',
          bedrock_error: 'Bedrock error',
          bedrock_error_type: 'authentication',
          puter_error: 'Puter error',
          puter_error_type: 'rate_limit',
          duration_ms: expect.any(Number),
        })
      );
    });
    
    it('should call both providers when both fail', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Error',
        errorType: 'unknown',
        provider: 'bedrock',
      };
      
      const fallbackError: AIProviderResponse = {
        success: false,
        error: 'Error',
        errorType: 'unknown',
        provider: 'puter',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      mockFallbackProvider.setResponses([fallbackError]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt');
      
      expect(mockPrimaryProvider.getCallCount()).toBe(1);
      expect(mockFallbackProvider.getCallCount()).toBe(1);
    });
  });
  
  describe('Fallback Disabled Configuration', () => {
    it('should not attempt fallback when disabled', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Primary failed',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider,
        { enableFallback: false }
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Primary failed');
      expect(mockPrimaryProvider.getCallCount()).toBe(1);
      expect(mockFallbackProvider.getCallCount()).toBe(0);
    });
    
    it('should log error when fallback is disabled', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Service unavailable',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider,
        { enableFallback: false }
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/indices/explain',
        userId: 'user111',
      });
      
      expect(logger.error).toHaveBeenCalledWith(
        'AI request failed, fallback disabled',
        expect.objectContaining({
          endpoint: '/api/indices/explain',
          userId: 'user111',
          error: 'Service unavailable',
          errorType: 'service_error',
        })
      );
    });
    
    it('should return primary error directly when fallback disabled', async () => {
      const primaryError: AIProviderResponse = {
        success: false,
        error: 'Specific error message',
        errorType: 'timeout',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([primaryError]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider,
        { enableFallback: false }
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result).toEqual(primaryError);
    });
  });
  
  describe('Unexpected Error Handling', () => {
    it('should handle unexpected exceptions in orchestrator', async () => {
      // Create a provider that throws an exception
      const throwingProvider: AIProvider = {
        async generateResponse() {
          throw new Error('Unexpected exception');
        },
        getProviderName() {
          return 'bedrock';
        },
        isConfigured() {
          return true;
        },
      };
      
      const orchestrator = new FallbackOrchestrator(
        throwingProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error occurred.');
      expect(result.errorType).toBe('unknown');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should log unexpected errors with stack trace', async () => {
      const throwingProvider: AIProvider = {
        async generateResponse() {
          throw new Error('Unexpected exception');
        },
        getProviderName() {
          return 'bedrock';
        },
        isConfigured() {
          return true;
        },
      };
      
      const orchestrator = new FallbackOrchestrator(
        throwingProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/test',
        userId: 'user222',
      });
      
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error in fallback orchestrator',
        expect.objectContaining({
          endpoint: '/api/test',
          userId: 'user222',
          error: 'Unexpected exception',
          stack: expect.any(String),
        })
      );
    });
  });
  
  describe('getConfig()', () => {
    it('should return copy of current configuration', () => {
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider,
        { enableFallback: false, totalTimeout: 5000 }
      );
      
      const config = orchestrator.getConfig();
      
      expect(config.enableFallback).toBe(false);
      expect(config.totalTimeout).toBe(5000);
    });
    
    it('should return a copy, not the original config object', () => {
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const config1 = orchestrator.getConfig();
      const config2 = orchestrator.getConfig();
      
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
  
  describe('reset()', () => {
    it('should call reset method without errors', () => {
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      expect(() => orchestrator.reset()).not.toThrow();
    });
    
    it('should log debug message on reset', () => {
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      orchestrator.reset();
      
      expect(logger.debug).toHaveBeenCalledWith('Fallback orchestrator reset');
    });
  });
  
  describe('Singleton Pattern', () => {
    beforeEach(() => {
      // Reset singleton before each test
      resetFallbackOrchestrator();
    });
    
    afterEach(() => {
      // Clean up singleton after each test
      resetFallbackOrchestrator();
    });
    
    it('should return same instance on multiple calls', () => {
      const instance1 = getFallbackOrchestrator();
      const instance2 = getFallbackOrchestrator();
      
      expect(instance1).toBe(instance2);
    });
    
    it('should create new instance after reset', () => {
      const instance1 = getFallbackOrchestrator();
      
      resetFallbackOrchestrator();
      
      const instance2 = getFallbackOrchestrator();
      
      expect(instance1).not.toBe(instance2);
    });
    
    it('should return FallbackOrchestrator instance', () => {
      const instance = getFallbackOrchestrator();
      
      expect(instance).toBeInstanceOf(FallbackOrchestrator);
    });
    
    it('should create instance with default providers', () => {
      const instance = getFallbackOrchestrator();
      
      expect(instance).toBeInstanceOf(FallbackOrchestrator);
      expect(instance.getConfig()).toBeDefined();
    });
  });
  
  describe('Request Metadata Handling', () => {
    it('should handle requests without metadata', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      const result = await orchestrator.generateResponse('Test prompt');
      
      expect(result.success).toBe(true);
    });
    
    it('should handle metadata with only endpoint', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/test',
      });
      
      expect(logger.info).toHaveBeenCalledWith(
        'AI request initiated',
        expect.objectContaining({
          endpoint: '/api/test',
        })
      );
    });
    
    it('should handle metadata with only userId', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        userId: 'user333',
      });
      
      expect(logger.info).toHaveBeenCalledWith(
        'AI request initiated',
        expect.objectContaining({
          userId: 'user333',
        })
      );
    });
    
    it('should handle metadata with both endpoint and userId', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Success',
        provider: 'bedrock',
      };
      
      mockPrimaryProvider.setResponses([successResponse]);
      
      const orchestrator = new FallbackOrchestrator(
        mockPrimaryProvider,
        mockFallbackProvider
      );
      
      await orchestrator.generateResponse('Test prompt', undefined, {
        endpoint: '/api/analyze',
        userId: 'user444',
      });
      
      expect(logger.info).toHaveBeenCalledWith(
        'AI request initiated',
        expect.objectContaining({
          endpoint: '/api/analyze',
          userId: 'user444',
        })
      );
    });
  });
});
