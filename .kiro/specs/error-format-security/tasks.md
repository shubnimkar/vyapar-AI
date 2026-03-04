# Implementation Plan: Error Format & Security

## Overview

This implementation plan establishes a comprehensive error handling and security infrastructure for Vyapar AI. The implementation follows a layered approach: first building core utilities (logger and error handlers), then adding security middleware, integrating with existing API routes, and finally eliminating console.log usage across the codebase.

## Tasks

- [ ] 1. Create centralized logger service
  - Implement Logger class with debug, info, warn, error methods
  - Add log level hierarchy with production/development modes
  - Implement structured log format with timestamp, level, message, context
  - Add environment-based configuration (suppress debug in production)
  - Create singleton logger instance for application-wide use
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 1.1 Write unit tests for logger service
  - Test log level filtering in production vs development
  - Test structured log format output
  - Test context enrichment
  - Verify debug suppression in production mode
  - _Requirements: 4.6_

- [ ] 2. Create error utility functions and translations
  - [ ] 2.1 Define ErrorCode enum with all error types
    - Add AUTH_REQUIRED, INVALID_INPUT, NOT_FOUND, SERVER_ERROR
    - Add RATE_LIMIT_EXCEEDED, BODY_TOO_LARGE, BEDROCK_ERROR, DYNAMODB_ERROR
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 2.2 Add error message translations to translations.ts
    - Add errorTranslations object with all error codes
    - Implement translations for English, Hindi, Marathi
    - Implement getErrorMessage function with fallback to English
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 2.3 Implement error response creation functions
    - Create ErrorResponse interface
    - Implement createErrorResponse function
    - Implement logAndReturnError function with stack trace logging
    - Ensure no stack traces in client responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4_

  - [ ] 2.4 Implement body size validation functions
    - Define BODY_SIZE_LIMITS constants (10MB upload, 1MB AI)
    - Implement validateBodySize function
    - Implement checkBodySize middleware-style function
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 9.4, 9.5_

- [ ]* 2.5 Write unit tests for error utilities
  - **Property 1: Error Response Structure Invariant**
  - **Validates: Requirements 1.1, 1.2, 1.3**
  - Test createErrorResponse returns correct format
  - Test logAndReturnError excludes stack traces
  - Test validateBodySize with various sizes
  - Test error code uniqueness
  - Test translation fallback to English

- [ ] 3. Implement security headers middleware
  - Create middleware.ts in project root
  - Add Content-Security-Policy header with proper directives
  - Add X-Frame-Options header (DENY)
  - Add X-Content-Type-Options header (nosniff)
  - Add Referrer-Policy header (strict-origin-when-cross-origin)
  - Configure matcher to apply to all routes except static files
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 3.1 Write integration tests for security headers
  - **Property 8: Security Headers Presence**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - Test all required headers present in responses
  - Test CSP directives are correct
  - Test middleware applies to all routes

- [ ] 4. Integrate error handling into upload endpoints
  - [ ] 4.1 Update /api/receipt-ocr route
    - Add body size validation (10MB limit)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Return BODY_TOO_LARGE for oversized requests
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 4.2 Update /api/voice-entry route
    - Add body size validation (10MB limit)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Return BODY_TOO_LARGE for oversized requests
    - _Requirements: 7.1, 7.2, 7.4_

- [ ]* 4.3 Write integration tests for upload endpoint validation
  - **Property 9: Body Size Validation**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  - Test BODY_TOO_LARGE response for oversized uploads
  - Test successful processing for valid sizes
  - Test error response format

- [ ] 5. Integrate error handling into AI endpoints
  - [ ] 5.1 Update /api/analyze route
    - Add body size validation (1MB limit)
    - Replace error handling with logAndReturnError
    - Add structured logging with logger
    - Handle BEDROCK_ERROR separately
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 5.2 Update /api/ask route
    - Add body size validation (1MB limit)
    - Replace error handling with logAndReturnError
    - Add structured logging with logger
    - Handle BEDROCK_ERROR separately
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 5.3 Update /api/explain route
    - Add body size validation (1MB limit)
    - Replace error handling with logAndReturnError
    - Add structured logging with logger
    - Handle BEDROCK_ERROR separately
    - _Requirements: 8.1, 8.2, 8.5_

- [ ]* 5.4 Write integration tests for AI endpoint validation
  - **Property 9: Body Size Validation**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
  - Test BODY_TOO_LARGE response for oversized requests
  - Test BEDROCK_ERROR handling
  - Test error response format excludes stack traces

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integrate error handling into remaining API routes
  - [ ] 7.1 Update authentication routes (/api/auth/login, /api/auth/signup)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Use AUTH_REQUIRED and INVALID_INPUT error codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 7.2 Update profile routes (/api/profile/*)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Use appropriate error codes (AUTH_REQUIRED, INVALID_INPUT, NOT_FOUND)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 7.3 Update daily entry routes (/api/daily)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Handle DYNAMODB_ERROR for database failures
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 7.4 Update credit tracking routes (/api/credit)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Handle DYNAMODB_ERROR for database failures
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 7.5 Update report routes (/api/reports)
    - Replace error handling with createErrorResponse
    - Add structured logging with logger
    - Handle appropriate error codes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 7.6 Write integration tests for standardized error responses
  - **Property 1: Error Response Structure Invariant**
  - **Property 2: Stack Trace Exclusion**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 10.2, 10.3, 10.4**
  - Test error responses have correct structure
  - Test no stack traces in client responses
  - Test error codes match expected values
  - Test multi-language error messages

- [ ] 8. Eliminate console.log usage across codebase
  - [ ] 8.1 Audit existing console usage
    - Search for console.log, console.warn, console.error in all TypeScript files
    - Document locations and usage patterns
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 8.2 Replace console calls in components
    - Replace console.log with logger.debug or logger.info
    - Replace console.warn with logger.warn
    - Replace console.error with logger.error
    - Add appropriate context objects
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.3 Replace console calls in lib utilities
    - Replace console.log with logger.debug or logger.info
    - Replace console.warn with logger.warn
    - Replace console.error with logger.error
    - Add appropriate context objects
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.4 Replace console calls in API routes
    - Replace console.log with logger.info
    - Replace console.warn with logger.warn
    - Replace console.error with logger.error
    - Add request path and context to logs
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 12.1_

- [ ]* 8.5 Add ESLint rule to prevent console usage
  - Add no-console rule to .eslintrc.json
  - Run linter to verify no console usage remains
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation follows a bottom-up approach: utilities first, then integration
- Security headers are applied via middleware for automatic coverage
- Body size validation is added to specific endpoint types (upload vs AI)
- Console.log elimination is done systematically across the codebase
- All error responses follow the standardized format with no stack trace exposure
- Logger provides structured logging with production-safe configuration
