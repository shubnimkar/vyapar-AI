/**
 * Puter.js AI Provider Implementation
 * 
 * Implements the AIProvider interface using Puter.js AI SDK.
 * This provider serves as a fallback when AWS Bedrock is unavailable.
 * 
 * Key features:
 * - No API key required (serverless AI service)
 * - Transparent fallback for users
 * - Consistent response format via AIProvider interface
 */

import { AIProvider, AIProviderResponse, GenerateOptions } from './provider-abstraction';

/**
 * Puter.js provider implementation
 * 
 * This provider uses the Puter.js AI service which requires no API keys
 * or credentials, making it ideal as a fallback option during AWS service
 * disruptions.
 */
export class PuterProvider implements AIProvider {
  private apiEndpoint: string;
  
  /**
   * Create a new Puter provider instance
   * 
   * @param apiEndpoint - Optional custom API endpoint (defaults to Puter.js public endpoint)
   */
  constructor(apiEndpoint?: string) {
    // Puter.js endpoint (no API key required)
    this.apiEndpoint = apiEndpoint || 'https://api.puter.com/ai/chat';
  }
  
  /**
   * Generate AI response using Puter.js
   * 
   * @param prompt - The prompt text to send to the AI
   * @param options - Optional configuration for the request
   * @returns Standardized response with success flag, content, and metadata
   */
  async generateResponse(
    prompt: string,
    options?: GenerateOptions
  ): Promise<AIProviderResponse> {
    const timeout = options?.timeout ?? 8000; // 8 second timeout for Puter
    
    try {
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Make POST request to Puter API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'gpt-3.5-turbo', // Puter.js default model
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            errorType: 'rate_limit',
            provider: 'puter',
          };
        }
        
        // Handle other errors
        return {
          success: false,
          error: `Puter API error: ${response.statusText}`,
          errorType: 'service_error',
          provider: 'puter',
        };
      }
      
      // Parse response and extract content
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      return {
        success: true,
        content,
        provider: 'puter',
      };
      
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out.',
          errorType: 'timeout',
          provider: 'puter',
        };
      }
      
      // Handle network errors
      return {
        success: false,
        error: error.message || 'Failed to connect to Puter AI service.',
        errorType: 'unknown',
        provider: 'puter',
      };
    }
  }
  
  /**
   * Get the provider identifier
   * 
   * @returns 'puter' as the provider name
   */
  getProviderName(): 'bedrock' | 'puter' {
    return 'puter';
  }
  
  /**
   * Check if the provider is configured and ready to use
   * 
   * Puter.js requires no configuration or credentials, so this always
   * returns true.
   * 
   * @returns Always true (no credentials needed)
   */
  isConfigured(): boolean {
    return true;
  }
}
