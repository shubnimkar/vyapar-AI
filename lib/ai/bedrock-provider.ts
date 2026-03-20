/**
 * AWS Bedrock Provider Implementation
 * 
 * Wraps the existing AWS Bedrock client functionality in the AIProvider interface.
 * This enables seamless integration with the fallback orchestrator while maintaining
 * compatibility with existing Bedrock infrastructure.
 * 
 * The provider supports both Claude and Nova model formats and includes retry logic
 * for throttling errors with exponential backoff.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AIProvider, AIProviderResponse, GenerateOptions } from './provider-abstraction';

/**
 * BedrockProvider implements the AIProvider interface for AWS Bedrock
 * 
 * This class wraps the existing BedrockRuntimeClient and provides:
 * - Dependency injection support for testing
 * - Standardized response format
 * - Retry logic with exponential backoff
 * - Support for both Claude and Nova models
 * - Error type mapping and user-friendly messages
 */
export class BedrockProvider implements AIProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;
  
  /**
   * Create a new BedrockProvider instance
   * 
   * @param client - Optional BedrockRuntimeClient for dependency injection (testing)
   * @param modelId - Optional model ID override (defaults to BEDROCK_MODEL_ID env var)
   */
  constructor(client?: BedrockRuntimeClient, modelId?: string) {
    // Support dependency injection for testing
    this.client = client || new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
      },
    });
    
    this.modelId = modelId || process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';
  }
  
  /**
   * Generate AI response from prompt using AWS Bedrock
   * 
   * Implements retry logic with exponential backoff for throttling errors.
   * Maps AWS-specific errors to standardized error types.
   * 
   * @param prompt - The prompt text to send to the AI
   * @param options - Optional configuration (maxRetries, timeout, language)
   * @returns Standardized AIProviderResponse
   */
  async generateResponse(prompt: string, options?: GenerateOptions): Promise<AIProviderResponse> {
    const maxRetries = options?.maxRetries ?? 2;
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Determine model type and format request
        const modelType = this.getModelType(this.modelId);
        const requestBody = this.formatRequest(prompt, modelType);
        
        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(requestBody),
        });
        
        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract content based on model type
        const content = this.extractContent(responseBody, modelType);
        
        return {
          success: true,
          content,
          provider: 'bedrock',
        };
        
      } catch (error: any) {
        lastError = error;
        
        // Handle throttling with exponential backoff
        if (error.name === 'ThrottlingException' && attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Map error types
        const errorType = this.mapErrorType(error);
        
        // Don't retry on non-throttling errors
        if (errorType !== 'rate_limit') {
          break;
        }
      }
    }
    
    // Return error response
    const errorType = this.mapErrorType(lastError);
    return {
      success: false,
      error: this.getErrorMessage(lastError, errorType),
      errorType,
      provider: 'bedrock',
    };
  }
  
  /**
   * Get the provider identifier
   * 
   * @returns 'bedrock'
   */
  getProviderName(): 'bedrock' | 'puter' {
    return 'bedrock';
  }
  
  /**
   * Check if the provider is configured and ready to use
   * 
   * Verifies that required AWS credentials are present in environment variables.
   * 
   * @returns True if AWS credentials are configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );
  }
  
  /**
   * Detect model type from model ID
   * 
   * @param modelId - The Bedrock model ID
   * @returns 'claude' or 'nova'
   */
  private getModelType(modelId: string): 'claude' | 'nova' {
    if (modelId.includes('anthropic') || modelId.includes('claude')) {
      return 'claude';
    }
    if (modelId.includes('nova')) {
      return 'nova';
    }
    return 'claude'; // default
  }
  
  /**
   * Format request body based on model type
   * 
   * @param prompt - The prompt text
   * @param modelType - 'claude' or 'nova'
   * @returns Formatted request body
   */
  private formatRequest(prompt: string, modelType: 'claude' | 'nova'): any {
    if (modelType === 'nova') {
      // Amazon Nova format
      return {
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { max_new_tokens: 2000 },
      };
    } else {
      // Claude format
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      };
    }
  }
  
  /**
   * Extract content from response body based on model type
   * 
   * @param responseBody - Parsed response body
   * @param modelType - 'claude' or 'nova'
   * @returns Extracted content text
   */
  private extractContent(responseBody: any, modelType: 'claude' | 'nova'): string {
    if (modelType === 'nova') {
      // Nova response format: output.message.content[0].text
      return responseBody.output?.message?.content?.[0]?.text || '';
    } else {
      // Claude response format: content[0].text
      return responseBody.content?.[0]?.text || '';
    }
  }
  
  /**
   * Map AWS error to standardized error type
   * 
   * @param error - The error object from AWS SDK
   * @returns Standardized error type
   */
  private mapErrorType(error: any): AIProviderResponse['errorType'] {
    if (error.name === 'ThrottlingException') return 'rate_limit';
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') return 'timeout';
    if (error.name === 'ServiceUnavailableException') return 'service_error';
    if (error.name === 'UnauthorizedException' || error.name === 'AccessDeniedException') return 'authentication';
    return 'unknown';
  }
  
  /**
   * Get user-friendly error message based on error type
   * 
   * Never exposes AWS-specific error details, credentials, or stack traces.
   * 
   * @param error - The error object
   * @param errorType - The standardized error type
   * @returns User-friendly error message safe for client consumption
   */
  private getErrorMessage(error: any, errorType: AIProviderResponse['errorType']): string {
    switch (errorType) {
      case 'rate_limit':
        return 'Too many requests. Please try again in a moment.';
      case 'timeout':
        return 'Request timed out. Please try again.';
      case 'service_error':
        return 'AI service is temporarily unavailable.';
      case 'authentication':
        return 'Authentication failed.';
      default:
        // Never expose raw error messages - they might contain AWS details
        return 'Failed to get AI response.';
    }
  }
}
