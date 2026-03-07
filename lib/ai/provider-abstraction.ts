/**
 * AI Provider Abstraction Layer
 * 
 * Defines standard interfaces for AI providers to enable seamless switching
 * between AWS Bedrock (primary) and Puter.js (fallback) without modifying
 * endpoint code.
 * 
 * This abstraction layer supports the deterministic-first principle where AI
 * is used exclusively for explanation and interpretation, never for financial
 * calculations.
 */

import { Language } from '../types';

/**
 * Error types for AI provider failures
 */
export type AIErrorType = 
  | 'authentication'   // Invalid or missing credentials
  | 'rate_limit'       // Too many requests (throttling)
  | 'timeout'          // Request exceeded time limit
  | 'service_error'    // Provider service unavailable
  | 'unknown';         // Unclassified errors

/**
 * Standard response format for all AI providers
 * 
 * This interface ensures consistent response structure regardless of
 * which provider (Bedrock or Puter) handled the request.
 */
export interface AIProviderResponse {
  /** Whether the request succeeded */
  success: boolean;
  
  /** AI-generated content (present if success=true) */
  content?: string;
  
  /** Error message (present if success=false) */
  error?: string;
  
  /** Categorized error type for handling (present if success=false) */
  errorType?: AIErrorType;
  
  /** Which provider handled the request */
  provider: 'bedrock' | 'puter';
}

/**
 * Options for AI generation requests
 */
export interface GenerateOptions {
  /** Maximum retry attempts (default: 2) */
  maxRetries?: number;
  
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** User's preferred language for responses */
  language?: Language;
}

/**
 * Abstract interface that all AI providers must implement
 * 
 * This interface enables dependency injection for testing and allows
 * seamless switching between providers without modifying endpoint code.
 */
export interface AIProvider {
  /**
   * Generate AI response from prompt
   * 
   * @param prompt - The prompt text to send to the AI
   * @param options - Optional configuration for the request
   * @returns Standardized response with success flag, content, and metadata
   */
  generateResponse(
    prompt: string,
    options?: GenerateOptions
  ): Promise<AIProviderResponse>;
  
  /**
   * Get the provider identifier
   * 
   * @returns Provider name ('bedrock' or 'puter')
   */
  getProviderName(): 'bedrock' | 'puter';
  
  /**
   * Check if the provider is configured and ready to use
   * 
   * @returns True if provider is configured with necessary credentials/settings
   */
  isConfigured(): boolean;
}
