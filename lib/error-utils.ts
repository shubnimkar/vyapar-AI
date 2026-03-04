/**
 * Error Handling Utilities
 * 
 * Provides standardized error response format, error codes, and utility functions
 * for consistent error handling across the Vyapar AI application.
 */

import { logger } from './logger';
import { getErrorMessage } from './translations';
import { Language } from './types';

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}

/**
 * Error code catalog
 * 
 * Defines all possible error codes used throughout the application.
 * Each code maps to localized error messages in translations.ts
 */
export enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BODY_TOO_LARGE = 'BODY_TOO_LARGE',
  BEDROCK_ERROR = 'BEDROCK_ERROR',
  DYNAMODB_ERROR = 'DYNAMODB_ERROR'
}

/**
 * Create standardized error response
 * 
 * Creates a consistent error response format that can be returned to clients.
 * The response includes a success flag (always false), error code, and localized message.
 * 
 * @param code - Error code from ErrorCode enum
 * @param messageKey - Translation key for error message (e.g., 'errors.authRequired')
 * @param language - User's preferred language (defaults to 'en')
 * @returns Standardized error response object
 * 
 * @example
 * ```typescript
 * const errorResponse = createErrorResponse(
 *   ErrorCode.INVALID_INPUT,
 *   'errors.invalidInput',
 *   'hi'
 * );
 * // Returns: { success: false, code: 'INVALID_INPUT', message: 'अमान्य इनपुट...' }
 * ```
 */
export function createErrorResponse(
  code: ErrorCode,
  messageKey: string,
  language: Language = 'en'
): ErrorResponse {
  return {
    success: false,
    code,
    message: getErrorMessage(messageKey, language)
  };
}

/**
 * Log error server-side and return client-safe response
 * 
 * This function performs two critical operations:
 * 1. Logs the full error details (including stack trace) server-side using the logger
 * 2. Returns a sanitized error response to the client (without stack traces or sensitive info)
 * 
 * This ensures that developers can debug issues using server logs while preventing
 * exposure of internal implementation details to clients.
 * 
 * @param error - Error object with stack trace
 * @param code - Error code from ErrorCode enum
 * @param messageKey - Translation key for error message
 * @param language - User's preferred language (defaults to 'en')
 * @param context - Additional context for logging (e.g., request path, user ID)
 * @returns Sanitized error response for client (no stack traces)
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   return NextResponse.json(
 *     logAndReturnError(
 *       error as Error,
 *       ErrorCode.SERVER_ERROR,
 *       'errors.serverError',
 *       'en',
 *       { path: '/api/analyze', userId: '123' }
 *     ),
 *     { status: 500 }
 *   );
 * }
 * ```
 */
export function logAndReturnError(
  error: Error,
  code: ErrorCode,
  messageKey: string,
  language: Language = 'en',
  context?: Record<string, any>
): ErrorResponse {
  // Log full error details server-side (including stack trace)
  logger.error('API Error', {
    code,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
    ...context
  });
  
  // Return sanitized error to client (no stack traces)
  return createErrorResponse(code, messageKey, language);
}

/**
 * Body size limits by endpoint type
 * 
 * Defines maximum allowed request body sizes for different endpoint categories:
 * - UPLOAD: 10MB for file upload endpoints (receipt-ocr, voice-entry)
 * - AI: 1MB for AI/Bedrock endpoints (analyze, ask, explain)
 * - DEFAULT: 1MB default limit for other endpoints
 */
export const BODY_SIZE_LIMITS = {
  UPLOAD: 10 * 1024 * 1024,  // 10MB for uploads
  AI: 1 * 1024 * 1024,        // 1MB for AI endpoints
  DEFAULT: 1 * 1024 * 1024    // 1MB default
};

/**
 * Validate request body size
 * 
 * Checks if a request body exceeds the specified size limit.
 * Works with both string and Buffer body types.
 * 
 * @param body - Request body (string or Buffer)
 * @param limit - Size limit in bytes
 * @returns Validation result with valid flag and actual size
 * 
 * @example
 * ```typescript
 * const body = await req.text();
 * const validation = validateBodySize(body, BODY_SIZE_LIMITS.AI);
 * if (!validation.valid) {
 *   // Body exceeds limit
 *   console.log(`Body size ${validation.size} exceeds limit ${BODY_SIZE_LIMITS.AI}`);
 * }
 * ```
 */
export function validateBodySize(
  body: string | Buffer,
  limit: number
): { valid: boolean; size: number } {
  const size = Buffer.byteLength(body);
  
  return {
    valid: size <= limit,
    size
  };
}

/**
 * Middleware-style body size validator
 * 
 * Validates the request body size and returns an error response if it exceeds the limit.
 * This function is designed to be called at the beginning of API route handlers.
 * 
 * If the body size is valid, returns an object with the parsed body text.
 * If the body size exceeds the limit, returns an ErrorResponse with BODY_TOO_LARGE code
 * and logs a warning with the request details.
 * 
 * @param req - Next.js request object
 * @param limit - Size limit in bytes
 * @returns Object with either error or bodyText
 * 
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   // Check body size (1MB limit for AI endpoints)
 *   const bodyCheck = await checkBodySize(req, BODY_SIZE_LIMITS.AI);
 *   if (bodyCheck.error) {
 *     return NextResponse.json(bodyCheck.error, { status: 413 });
 *   }
 *   
 *   // Parse the body text as JSON
 *   const body = JSON.parse(bodyCheck.bodyText);
 *   // Proceed with request processing...
 * }
 * ```
 */
export async function checkBodySize(
  req: Request,
  limit: number
): Promise<{ error: ErrorResponse } | { bodyText: string }> {
  try {
    const body = await req.text();
    const validation = validateBodySize(body, limit);
    
    if (!validation.valid) {
      logger.warn('Request body too large', {
        size: validation.size,
        limit,
        path: new URL(req.url).pathname
      });
      
      return {
        error: createErrorResponse(
          ErrorCode.BODY_TOO_LARGE,
          'errors.bodyTooLarge',
          'en' // Will be replaced with user's language in route
        )
      };
    }
    
    return { bodyText: body };
  } catch (error) {
    logger.error('Failed to check body size', { error });
    // Return empty body text to allow request to proceed
    return { bodyText: '{}' };
  }
}
