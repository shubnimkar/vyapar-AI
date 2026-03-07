/**
 * Mock AI Provider for Testing
 * 
 * Provides a configurable mock implementation of the AIProvider interface
 * for use in unit tests and integration tests. This mock allows tests to:
 * - Configure specific responses in sequence
 * - Track the number of invocations
 * - Reset state between tests
 * 
 * Validates: Requirements 8.1, 8.2
 */

import { AIProvider, AIProviderResponse } from '../provider-abstraction';

/**
 * MockProvider implements AIProvider interface with configurable responses
 * 
 * This class is designed for testing the fallback orchestrator and other
 * components that depend on AIProvider. It allows tests to:
 * - Set up a sequence of responses (success or failure)
 * - Track how many times the provider was called
 * - Reset state for test isolation
 * 
 * Example usage:
 * ```typescript
 * const mockProvider = new MockProvider('bedrock');
 * mockProvider.setResponses([
 *   { success: true, content: 'First response', provider: 'bedrock' },
 *   { success: false, error: 'Second call fails', errorType: 'timeout', provider: 'bedrock' }
 * ]);
 * 
 * const result1 = await mockProvider.generateResponse('prompt 1');
 * // Returns first response
 * 
 * const result2 = await mockProvider.generateResponse('prompt 2');
 * // Returns second response
 * 
 * expect(mockProvider.getCallCount()).toBe(2);
 * ```
 */
export class MockProvider implements AIProvider {
  private responses: AIProviderResponse[] = [];
  private callCount = 0;
  private name: 'bedrock' | 'puter';
  
  /**
   * Create a new MockProvider instance
   * 
   * @param name - The provider name to return ('bedrock' or 'puter')
   */
  constructor(name: 'bedrock' | 'puter') {
    this.name = name;
  }
  
  /**
   * Generate AI response from prompt
   * 
   * Returns the next configured response in sequence. If no responses
   * are configured or all responses have been consumed, returns a
   * default error response.
   * 
   * @param prompt - The prompt text (not used in mock)
   * @returns The next configured response or default error
   */
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
  
  /**
   * Get the provider identifier
   * 
   * @returns Provider name ('bedrock' or 'puter')
   */
  getProviderName(): 'bedrock' | 'puter' {
    return this.name;
  }
  
  /**
   * Check if the provider is configured and ready to use
   * 
   * Mock providers are always configured.
   * 
   * @returns Always returns true
   */
  isConfigured(): boolean {
    return true;
  }
  
  /**
   * Configure mock responses for testing
   * 
   * Sets up a sequence of responses that will be returned by
   * generateResponse() calls. Each call consumes the next response
   * in the array. Also resets the call count to 0.
   * 
   * @param responses - Array of responses to return in sequence
   */
  setResponses(responses: AIProviderResponse[]): void {
    this.responses = responses;
    this.callCount = 0;
  }
  
  /**
   * Get the number of times generateResponse() was called
   * 
   * Useful for verifying that the provider was called the expected
   * number of times in tests.
   * 
   * @returns Number of generateResponse() invocations
   */
  getCallCount(): number {
    return this.callCount;
  }
  
  /**
   * Reset provider state for test isolation
   * 
   * Clears all configured responses and resets the call count to 0.
   * Should be called between tests to ensure test isolation.
   */
  reset(): void {
    this.responses = [];
    this.callCount = 0;
  }
}
