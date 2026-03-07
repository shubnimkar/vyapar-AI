/**
 * Fallback Orchestrator
 * 
 * Manages the fallback logic and provider selection for AI requests.
 * Maintains AWS Bedrock as the primary provider while providing Puter.js
 * as a transparent fallback when Bedrock is unavailable.
 * 
 * This orchestrator ensures AI features remain operational during AWS service
 * disruptions, particularly critical during hackathon demos and presentations.
 */

import { AIProvider, AIProviderResponse, GenerateOptions } from './provider-abstraction';
import { BedrockProvider } from './bedrock-provider';
import { PuterProvider } from './puter-provider';
import { logger } from '../logger';
import { getErrorMessage } from '../translations';
import { Language } from '../types';

/**
 * Configuration for the fallback orchestrator
 */
export interface FallbackConfig {
  /** Whether to enable automatic fallback to Puter when Bedrock fails */
  enableFallback: boolean;
  
  /** Total timeout for all attempts in milliseconds */
  totalTimeout: number;
}

/**
 * Metadata for tracking AI requests
 */
export interface RequestMetadata {
  /** API endpoint that initiated the request */
  endpoint?: string;
  
  /** User ID if available */
  userId?: string;
}

/**
 * FallbackOrchestrator manages AI provider selection and fallback logic
 * 
 * The orchestrator:
 * - Attempts Bedrock (primary) first for all requests
 * - Falls back to Puter.js if Bedrock fails (when enabled)
 * - Logs provider usage for monitoring and demo purposes
 * - Supports dependency injection for testing
 * - Validates configuration on initialization
 */
export class FallbackOrchestrator {
  private primaryProvider: AIProvider;
  private fallbackProvider: AIProvider;
  private config: FallbackConfig;
  
  /**
   * Create a new FallbackOrchestrator instance
   * 
   * @param primaryProvider - Optional primary provider (defaults to BedrockProvider)
   * @param fallbackProvider - Optional fallback provider (defaults to PuterProvider)
   * @param config - Optional configuration overrides
   */
  constructor(
    primaryProvider?: AIProvider,
    fallbackProvider?: AIProvider,
    config?: Partial<FallbackConfig>
  ) {
    // Support dependency injection for testing
    this.primaryProvider = primaryProvider || new BedrockProvider();
    this.fallbackProvider = fallbackProvider || new PuterProvider();
    
    // Read configuration from environment
    const enableFallback = process.env.ENABLE_AI_FALLBACK !== 'false';
    
    this.config = {
      enableFallback: config?.enableFallback ?? enableFallback,
      totalTimeout: config?.totalTimeout ?? 10000,
    };
    
    // Validate and log configuration
    this.validateConfig();
  }
  
  /**
   * Generate AI response with automatic fallback
   * 
   * Attempts primary provider (Bedrock) first, then falls back to
   * secondary provider (Puter) if primary fails and fallback is enabled.
   * 
   * @param prompt - The prompt text to send to the AI
   * @param options - Optional generation options
   * @param metadata - Optional request metadata for logging
   * @returns Standardized AIProviderResponse
   */
  async generateResponse(
    prompt: string,
    options?: GenerateOptions,
    metadata?: RequestMetadata
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    
    // Log request initiation
    logger.info('AI request initiated', {
      endpoint: metadata?.endpoint,
      userId: metadata?.userId,
      fallback_enabled: this.config.enableFallback,
    });
    
    // Attempt primary provider (Bedrock)
    try {
      const primaryResponse = await this.primaryProvider.generateResponse(prompt, options);
      
      if (primaryResponse.success) {
        // Log success
        logger.info('AI request handled by AWS Bedrock', {
          endpoint: metadata?.endpoint,
          userId: metadata?.userId,
          duration_ms: Date.now() - startTime,
        });
        
        return primaryResponse;
      }
      
      // Primary failed, check if fallback is enabled
      if (!this.config.enableFallback) {
        logger.error('AI request failed, fallback disabled', {
          endpoint: metadata?.endpoint,
          userId: metadata?.userId,
          error: primaryResponse.error,
          errorType: primaryResponse.errorType,
        });
        
        return primaryResponse;
      }
      
      // Log fallback attempt
      logger.warn('AI request failed on Bedrock, using Puter.js fallback', {
        endpoint: metadata?.endpoint,
        userId: metadata?.userId,
        bedrock_error: primaryResponse.error,
        bedrock_error_type: primaryResponse.errorType,
      });
      
      // Attempt fallback provider (Puter)
      const fallbackResponse = await this.fallbackProvider.generateResponse(prompt, options);
      
      if (fallbackResponse.success) {
        logger.info('AI request handled by Puter.js fallback', {
          endpoint: metadata?.endpoint,
          userId: metadata?.userId,
          duration_ms: Date.now() - startTime,
        });
        
        return fallbackResponse;
      }
      
      // Both providers failed
      logger.error('AI request failed on both providers', {
        endpoint: metadata?.endpoint,
        userId: metadata?.userId,
        bedrock_error: primaryResponse.error,
        bedrock_error_type: primaryResponse.errorType,
        puter_error: fallbackResponse.error,
        puter_error_type: fallbackResponse.errorType,
        duration_ms: Date.now() - startTime,
      });
      
      // Get localized error message
      const language = (options?.language as Language) || 'en';
      const localizedError = getErrorMessage('errors.aiUnavailable', language);
      
      // Return combined error
      return {
        success: false,
        error: localizedError,
        errorType: 'service_error',
        provider: 'bedrock', // Report primary provider in error
      };
      
    } catch (error: any) {
      // Sanitize error for logging (keep detailed for server logs)
      logger.error('Unexpected error in fallback orchestrator', {
        endpoint: metadata?.endpoint,
        userId: metadata?.userId,
        error: error.message,
        // Don't log full stack trace with sensitive info
      });
      
      // Get localized error message
      const language = (options?.language as Language) || 'en';
      const localizedError = getErrorMessage('errors.serverError', language);
      
      // Return sanitized error (never expose internal details to client)
      return {
        success: false,
        error: localizedError, // Use generic localized message, not sanitized error details
        errorType: 'unknown',
        provider: 'bedrock',
      };
    }
  }
  
  /**
   * Get the current configuration
   * 
   * @returns Copy of current FallbackConfig
   */
  getConfig(): FallbackConfig {
    return { ...this.config };
  }
  
  /**
   * Reset provider state (for testing)
   * 
   * This method is primarily used in test environments to reset
   * any cached state between test runs.
   */
  reset(): void {
    // Reset any cached state if needed
    logger.debug('Fallback orchestrator reset');
  }
  
  /**
   * Validate configuration and log initialization
   * 
   * Validates ENABLE_AI_FALLBACK environment variable and logs
   * configuration details for monitoring and debugging.
   */
  private validateConfig(): void {
    // Validate fallback setting
    const envValue = process.env.ENABLE_AI_FALLBACK;
    if (envValue && envValue !== 'true' && envValue !== 'false') {
      logger.warn('Invalid ENABLE_AI_FALLBACK value, using default (true)', {
        provided_value: envValue,
      });
    }
    
    logger.info('Fallback orchestrator initialized', {
      fallback_enabled: this.config.enableFallback,
      total_timeout_ms: this.config.totalTimeout,
      primary_provider: this.primaryProvider.getProviderName(),
      fallback_provider: this.fallbackProvider.getProviderName(),
    });
  }
  
  /**
   * Sanitize error messages to remove sensitive information
   * 
   * Strips AWS error details, API keys, credentials, and stack traces
   * from error messages before returning to clients.
   * 
   * @param error - The error object to sanitize
   * @returns Sanitized error message safe for client consumption
   */
  private sanitizeError(error: any): string {
    if (!error) return 'An error occurred';
    
    const errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred';
    
    // Patterns to remove from error messages
    const sensitivePatterns = [
      // AWS credentials and keys
      /AKIA[0-9A-Z]{16}/gi, // AWS Access Key ID
      /[A-Za-z0-9/+=]{40}/g, // AWS Secret Access Key pattern
      /aws_access_key_id[=:]\s*[^\s]+/gi,
      /aws_secret_access_key[=:]\s*[^\s]+/gi,
      /aws_session_token[=:]\s*[^\s]+/gi,
      
      // API keys and tokens
      /api[_-]?key[=:]\s*[^\s]+/gi,
      /bearer\s+[^\s]+/gi,
      /token[=:]\s*[^\s]+/gi,
      
      // AWS-specific error details
      /RequestId:\s*[a-f0-9-]+/gi,
      /arn:aws:[^:]+:[^:]+:[^:]+:[^\s]+/gi,
      /x-amzn-requestid:\s*[^\s]+/gi,
      
      // Stack trace indicators
      /at\s+[^\s]+\s+\([^)]+\)/g,
      /^\s*at\s+/gm,
      
      // File paths that might expose structure
      /\/home\/[^\s]+/g,
      /\/usr\/[^\s]+/g,
      /C:\\[^\s]+/g,
    ];
    
    let sanitized = errorMessage;
    
    // Apply all sanitization patterns
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    // Remove any remaining AWS-specific error codes that might leak info
    sanitized = sanitized.replace(/AWS\.[A-Za-z]+Exception/g, 'Service Error');
    
    // Truncate if too long (might contain stack trace)
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }
    
    return sanitized;
  }
}

/**
 * Singleton instance for application-wide use
 */
let orchestratorInstance: FallbackOrchestrator | null = null;

/**
 * Get the singleton FallbackOrchestrator instance
 * 
 * Creates a new instance on first call, then returns the same instance
 * for subsequent calls. This ensures consistent configuration across
 * the application.
 * 
 * @returns Singleton FallbackOrchestrator instance
 */
export function getFallbackOrchestrator(): FallbackOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new FallbackOrchestrator();
  }
  return orchestratorInstance;
}

/**
 * Reset the singleton instance (for testing)
 * 
 * This function is primarily used in test environments to ensure
 * test isolation by resetting the singleton between tests.
 */
export function resetFallbackOrchestrator(): void {
  orchestratorInstance = null;
}
