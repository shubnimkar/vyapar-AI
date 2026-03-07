/**
 * Unit Tests for MockProvider
 * 
 * Tests verify that the mock provider correctly implements the AIProvider
 * interface and provides all necessary testing utilities.
 * 
 * Validates: Requirements 8.1, 8.2
 */

import { MockProvider } from './mock-provider';
import { AIProviderResponse } from '../provider-abstraction';

describe('MockProvider - Unit Tests', () => {
  let mockProvider: MockProvider;
  
  beforeEach(() => {
    mockProvider = new MockProvider('bedrock');
  });
  
  describe('Constructor', () => {
    it('should create instance with bedrock name', () => {
      const provider = new MockProvider('bedrock');
      
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.getProviderName()).toBe('bedrock');
    });
    
    it('should create instance with puter name', () => {
      const provider = new MockProvider('puter');
      
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider.getProviderName()).toBe('puter');
    });
  });
  
  describe('getProviderName()', () => {
    it('should return bedrock for bedrock provider', () => {
      const provider = new MockProvider('bedrock');
      
      expect(provider.getProviderName()).toBe('bedrock');
    });
    
    it('should return puter for puter provider', () => {
      const provider = new MockProvider('puter');
      
      expect(provider.getProviderName()).toBe('puter');
    });
  });
  
  describe('isConfigured()', () => {
    it('should always return true', () => {
      expect(mockProvider.isConfigured()).toBe(true);
    });
    
    it('should return true for puter provider', () => {
      const provider = new MockProvider('puter');
      
      expect(provider.isConfigured()).toBe(true);
    });
  });
  
  describe('setResponses()', () => {
    it('should configure responses for sequential calls', async () => {
      const responses: AIProviderResponse[] = [
        { success: true, content: 'First response', provider: 'bedrock' },
        { success: true, content: 'Second response', provider: 'bedrock' },
      ];
      
      mockProvider.setResponses(responses);
      
      const result1 = await mockProvider.generateResponse('prompt 1');
      const result2 = await mockProvider.generateResponse('prompt 2');
      
      expect(result1.content).toBe('First response');
      expect(result2.content).toBe('Second response');
    });
    
    it('should reset call count when setting responses', async () => {
      mockProvider.setResponses([
        { success: true, content: 'First', provider: 'bedrock' },
      ]);
      
      await mockProvider.generateResponse('prompt');
      expect(mockProvider.getCallCount()).toBe(1);
      
      mockProvider.setResponses([
        { success: true, content: 'New first', provider: 'bedrock' },
      ]);
      
      expect(mockProvider.getCallCount()).toBe(0);
    });
    
    it('should allow setting empty response array', () => {
      expect(() => mockProvider.setResponses([])).not.toThrow();
    });
  });
  
  describe('generateResponse()', () => {
    it('should return configured success response', async () => {
      const successResponse: AIProviderResponse = {
        success: true,
        content: 'Test content',
        provider: 'bedrock',
      };
      
      mockProvider.setResponses([successResponse]);
      
      const result = await mockProvider.generateResponse('test prompt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Test content');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should return configured error response', async () => {
      const errorResponse: AIProviderResponse = {
        success: false,
        error: 'Test error',
        errorType: 'timeout',
        provider: 'bedrock',
      };
      
      mockProvider.setResponses([errorResponse]);
      
      const result = await mockProvider.generateResponse('test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.errorType).toBe('timeout');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should return responses in sequence', async () => {
      mockProvider.setResponses([
        { success: true, content: 'First', provider: 'bedrock' },
        { success: false, error: 'Second', errorType: 'rate_limit', provider: 'bedrock' },
        { success: true, content: 'Third', provider: 'bedrock' },
      ]);
      
      const result1 = await mockProvider.generateResponse('prompt 1');
      const result2 = await mockProvider.generateResponse('prompt 2');
      const result3 = await mockProvider.generateResponse('prompt 3');
      
      expect(result1.success).toBe(true);
      expect(result1.content).toBe('First');
      
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Second');
      
      expect(result3.success).toBe(true);
      expect(result3.content).toBe('Third');
    });
    
    it('should return default error when no responses configured', async () => {
      const result = await mockProvider.generateResponse('test prompt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No response configured');
      expect(result.errorType).toBe('unknown');
      expect(result.provider).toBe('bedrock');
    });
    
    it('should return default error when all responses consumed', async () => {
      mockProvider.setResponses([
        { success: true, content: 'Only response', provider: 'bedrock' },
      ]);
      
      await mockProvider.generateResponse('prompt 1');
      const result = await mockProvider.generateResponse('prompt 2');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No response configured');
      expect(result.errorType).toBe('unknown');
    });
    
    it('should use provider name in default error response', async () => {
      const puterProvider = new MockProvider('puter');
      
      const result = await puterProvider.generateResponse('test prompt');
      
      expect(result.provider).toBe('puter');
    });
  });
  
  describe('getCallCount()', () => {
    it('should start at 0', () => {
      expect(mockProvider.getCallCount()).toBe(0);
    });
    
    it('should increment on each generateResponse call', async () => {
      mockProvider.setResponses([
        { success: true, content: 'Response', provider: 'bedrock' },
        { success: true, content: 'Response', provider: 'bedrock' },
        { success: true, content: 'Response', provider: 'bedrock' },
      ]);
      
      expect(mockProvider.getCallCount()).toBe(0);
      
      await mockProvider.generateResponse('prompt 1');
      expect(mockProvider.getCallCount()).toBe(1);
      
      await mockProvider.generateResponse('prompt 2');
      expect(mockProvider.getCallCount()).toBe(2);
      
      await mockProvider.generateResponse('prompt 3');
      expect(mockProvider.getCallCount()).toBe(3);
    });
    
    it('should continue incrementing even after responses exhausted', async () => {
      mockProvider.setResponses([
        { success: true, content: 'Only response', provider: 'bedrock' },
      ]);
      
      await mockProvider.generateResponse('prompt 1');
      await mockProvider.generateResponse('prompt 2');
      await mockProvider.generateResponse('prompt 3');
      
      expect(mockProvider.getCallCount()).toBe(3);
    });
  });
  
  describe('reset()', () => {
    it('should clear configured responses', async () => {
      mockProvider.setResponses([
        { success: true, content: 'Response', provider: 'bedrock' },
      ]);
      
      mockProvider.reset();
      
      const result = await mockProvider.generateResponse('prompt');
      
      expect(result.error).toBe('No response configured');
    });
    
    it('should reset call count to 0', async () => {
      mockProvider.setResponses([
        { success: true, content: 'Response', provider: 'bedrock' },
      ]);
      
      await mockProvider.generateResponse('prompt 1');
      await mockProvider.generateResponse('prompt 2');
      
      expect(mockProvider.getCallCount()).toBe(2);
      
      mockProvider.reset();
      
      expect(mockProvider.getCallCount()).toBe(0);
    });
    
    it('should allow setting new responses after reset', async () => {
      mockProvider.setResponses([
        { success: true, content: 'First', provider: 'bedrock' },
      ]);
      
      await mockProvider.generateResponse('prompt');
      
      mockProvider.reset();
      
      mockProvider.setResponses([
        { success: true, content: 'After reset', provider: 'bedrock' },
      ]);
      
      const result = await mockProvider.generateResponse('prompt');
      
      expect(result.content).toBe('After reset');
      expect(mockProvider.getCallCount()).toBe(1);
    });
  });
  
  describe('AIProvider Interface Compliance', () => {
    it('should implement all required AIProvider methods', () => {
      expect(typeof mockProvider.generateResponse).toBe('function');
      expect(typeof mockProvider.getProviderName).toBe('function');
      expect(typeof mockProvider.isConfigured).toBe('function');
    });
    
    it('should return Promise from generateResponse', () => {
      const result = mockProvider.generateResponse('test');
      
      expect(result).toBeInstanceOf(Promise);
    });
    
    it('should work with async/await', async () => {
      mockProvider.setResponses([
        { success: true, content: 'Async test', provider: 'bedrock' },
      ]);
      
      const result = await mockProvider.generateResponse('test');
      
      expect(result.content).toBe('Async test');
    });
  });
  
  describe('Test Isolation', () => {
    it('should maintain independent state across instances', async () => {
      const provider1 = new MockProvider('bedrock');
      const provider2 = new MockProvider('puter');
      
      provider1.setResponses([
        { success: true, content: 'Provider 1', provider: 'bedrock' },
      ]);
      
      provider2.setResponses([
        { success: true, content: 'Provider 2', provider: 'puter' },
      ]);
      
      const result1 = await provider1.generateResponse('prompt');
      const result2 = await provider2.generateResponse('prompt');
      
      expect(result1.content).toBe('Provider 1');
      expect(result2.content).toBe('Provider 2');
      expect(provider1.getCallCount()).toBe(1);
      expect(provider2.getCallCount()).toBe(1);
    });
    
    it('should not share call counts between instances', async () => {
      const provider1 = new MockProvider('bedrock');
      const provider2 = new MockProvider('bedrock');
      
      provider1.setResponses([
        { success: true, content: 'Response', provider: 'bedrock' },
      ]);
      
      await provider1.generateResponse('prompt');
      await provider1.generateResponse('prompt');
      
      expect(provider1.getCallCount()).toBe(2);
      expect(provider2.getCallCount()).toBe(0);
    });
  });
});
