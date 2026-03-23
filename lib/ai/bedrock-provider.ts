/**
 * AWS Bedrock Provider Implementation
 * 
 * Wraps the existing AWS Bedrock client functionality in the AIProvider interface.
 * This enables seamless integration with the fallback orchestrator while maintaining
 * compatibility with existing Bedrock infrastructure.
 * 
 * The provider supports Bedrock model-family request formatting and includes retry logic
 * for throttling errors with exponential backoff.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AIProvider, AIProviderResponse, GenerateOptions } from './provider-abstraction';
import { extractBedrockContent, formatBedrockRequest, mapBedrockErrorType } from './bedrock-utils';

/**
 * BedrockProvider implements the AIProvider interface for AWS Bedrock
 * 
 * This class wraps the existing BedrockRuntimeClient and provides:
 * - Dependency injection support for testing
 * - Standardized response format
 * - Retry logic with exponential backoff
 * - Support for Bedrock model-family request/response handling
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
        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(formatBedrockRequest(prompt, this.modelId)),
        });
        
        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Extract content based on model type
        const content = extractBedrockContent(responseBody, this.modelId);
        
        return {
          success: true,
          content,
          provider: 'bedrock',
          modelId: this.modelId,
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
        const errorType = mapBedrockErrorType(error);
        
        // Don't retry on non-throttling errors
        if (errorType !== 'rate_limit') {
          break;
        }
      }
    }
    
    // Return error response
    const errorType = mapBedrockErrorType(lastError);
    return {
      success: false,
      error: this.getErrorMessage(lastError, errorType),
      errorType,
      provider: 'bedrock',
      modelId: this.modelId,
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
      case 'validation':
        return 'Invalid AI request.';
      default:
        // Never expose raw error messages - they might contain AWS details
        return 'Failed to get AI response.';
    }
  }
}
