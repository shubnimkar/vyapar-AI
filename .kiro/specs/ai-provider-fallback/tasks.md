# Implementation Plan: AI Provider Fallback System

## Overview

This implementation plan converts the AI Provider Fallback System design into actionable coding tasks. The system introduces a resilient architecture that maintains AWS Bedrock as the primary AI provider while providing Puter.js as a transparent fallback. The implementation follows a phased approach: first creating the provider abstraction layer and implementations, then building the fallback orchestrator, and finally migrating existing endpoints to use the new system.

All tasks build incrementally, with each step validating functionality through code. The plan includes property-based tests for universal correctness properties and unit tests for specific behaviors. Tasks marked with `*` are optional and can be skipped for faster MVP delivery.

## Tasks

- [x] 1. Create provider abstraction layer and base interfaces
  - Create `lib/ai/provider-abstraction.ts` with AIProvider interface, AIProviderResponse interface, and GenerateOptions interface
  - Define standard response format with success, content, error, errorType, and provider fields
  - Define error types: authentication, rate_limit, timeout, service_error, unknown
  - Export all interfaces for use by provider implementations
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement Bedrock Provider
  - [x] 2.1 Create BedrockProvider class implementing AIProvider interface
    - Create `lib/ai/bedrock-provider.ts` with BedrockProvider class
    - Implement constructor with dependency injection support for testing
    - Wrap existing BedrockRuntimeClient from lib/bedrock-client.ts
    - Support BEDROCK_MODEL_ID environment variable
    - Implement getProviderName() returning 'bedrock'
    - Implement isConfigured() checking AWS credentials
    - _Requirements: 2.1, 2.2, 1.4_
  
  - [x] 2.2 Implement generateResponse() method with retry logic
    - Implement generateResponse(prompt, options) method
    - Support maxRetries option (default: 2)
    - Detect model type (Claude vs Nova) from model ID
    - Format request body based on model type
    - Invoke Bedrock API using InvokeModelCommand
    - Extract content from response based on model type
    - Return standardized AIProviderResponse on success
    - _Requirements: 2.3, 2.5_
  
  - [x] 2.3 Implement error handling and mapping
    - Catch ThrottlingException and retry with exponential backoff (1s, 2s, 4s)
    - Map ThrottlingException to errorType 'rate_limit'
    - Map TimeoutError to errorType 'timeout'
    - Map ServiceUnavailableException to errorType 'service_error'
    - Map UnauthorizedException/AccessDeniedException to errorType 'authentication'
    - Map unknown errors to errorType 'unknown'
    - Return user-friendly error messages for each error type
    - _Requirements: 2.4, 10.3_
  
  - [x] 2.4 Write unit tests for BedrockProvider
    - Test successful response handling for Claude model
    - Test successful response handling for Nova model
    - Test error type mapping for all error categories
    - Test retry logic with exponential backoff for throttling
    - Test timeout handling without retry
    - Test isConfigured() with valid and missing credentials
    - Test dependency injection with mock client
    - _Requirements: 8.5_

- [x] 3. Implement Puter Provider
  - [x] 3.1 Create PuterProvider class implementing AIProvider interface
    - Create `lib/ai/puter-provider.ts` with PuterProvider class
    - Implement constructor with optional API endpoint parameter
    - Default endpoint to 'https://api.puter.com/ai/chat'
    - Implement getProviderName() returning 'puter'
    - Implement isConfigured() returning true (no credentials needed)
    - _Requirements: 3.1, 3.2_
  
  - [x] 3.2 Implement generateResponse() method with timeout
    - Implement generateResponse(prompt, options) method
    - Support timeout option (default: 8000ms)
    - Create AbortController for timeout handling
    - Make POST request to Puter API with messages array
    - Parse response and extract content from choices[0].message.content
    - Return standardized AIProviderResponse on success
    - _Requirements: 3.3, 3.5_
  
  - [x] 3.3 Implement error handling for Puter API
    - Handle 429 status code as rate_limit error
    - Handle timeout (AbortError) as timeout error
    - Handle network errors as unknown error
    - Handle non-200 responses as service_error
    - Return user-friendly error messages
    - _Requirements: 3.4, 3.6_
  
  - [x] 3.4 Write unit tests for PuterProvider
    - Test successful response handling
    - Test rate limiting detection (429 status)
    - Test timeout handling with AbortController
    - Test network error handling
    - Test response parsing
    - Test isConfigured() always returns true
    - _Requirements: 8.5_

- [x] 4. Checkpoint - Ensure provider tests pass
  - Run unit tests for BedrockProvider and PuterProvider
  - Verify both providers implement AIProvider interface correctly
  - Ensure all tests pass, ask the user if questions arise

- [x] 5. Implement Fallback Orchestrator
  - [x] 5.1 Create FallbackOrchestrator class with configuration
    - Create `lib/ai/fallback-orchestrator.ts` with FallbackOrchestrator class
    - Define FallbackConfig interface with enableFallback and totalTimeout fields
    - Implement constructor with dependency injection for providers
    - Read ENABLE_AI_FALLBACK environment variable (default: true)
    - Store primaryProvider (BedrockProvider) and fallbackProvider (PuterProvider)
    - Implement getConfig() method returning current configuration
    - Implement reset() method for testing
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 8.2_
  
  - [x] 5.2 Implement generateResponse() with fallback logic
    - Implement generateResponse(prompt, options, metadata) method
    - Log request initiation with endpoint and userId metadata
    - Attempt primaryProvider.generateResponse() first
    - If primary succeeds, log success and return response
    - If primary fails and fallback disabled, log error and return primary error
    - If primary fails and fallback enabled, log fallback attempt
    - Attempt fallbackProvider.generateResponse()
    - If fallback succeeds, log success and return response
    - If both fail, log both errors and return generic error message
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 5.4_
  
  - [x] 5.3 Implement configuration validation and logging
    - Implement validateConfig() private method
    - Validate ENABLE_AI_FALLBACK value (must be 'true' or 'false')
    - Log warning if invalid value provided
    - Log orchestrator initialization with configuration details
    - Log primary and fallback provider names
    - _Requirements: 6.4, 5.6_
  
  - [x] 5.4 Create singleton instance and factory function
    - Create module-level orchestratorInstance variable
    - Implement getFallbackOrchestrator() function returning singleton
    - Implement resetFallbackOrchestrator() function for testing
    - Export both functions
    - _Requirements: 8.4_
  
  - [x] 5.5 Write unit tests for FallbackOrchestrator
    - Test primary provider success (no fallback triggered)
    - Test primary failure with fallback success
    - Test both providers fail scenario
    - Test fallback disabled configuration
    - Test configuration validation with invalid values
    - Test logging at each decision point
    - Test singleton pattern with getFallbackOrchestrator()
    - Test reset functionality
    - Use mock providers for all tests
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [x] 6. Create mock provider for testing
  - Create `lib/ai/__tests__/mock-provider.ts` with MockProvider class
  - Implement AIProvider interface
  - Add setResponses() method to configure mock responses
  - Add getCallCount() method to track invocations
  - Add reset() method to clear state
  - Return configured responses in sequence
  - _Requirements: 8.1, 8.2_

- [x] 7. Checkpoint - Ensure orchestrator tests pass
  - Run unit tests for FallbackOrchestrator
  - Verify fallback logic works correctly with mock providers
  - Ensure all tests pass, ask the user if questions arise

- [x] 8. Migrate /api/explain endpoint to use Fallback System
  - [x] 8.1 Update /api/explain to use FallbackOrchestrator
    - Import getFallbackOrchestrator from lib/ai/fallback-orchestrator
    - Replace invokeBedrockModel() call with orchestrator.generateResponse()
    - Pass prompt, options, and metadata (endpoint, userId) to orchestrator
    - Preserve existing prompt building with buildPersonaPrompt()
    - Preserve existing response format
    - Update error handling to use orchestrator response
    - Remove direct bedrock-client import
    - _Requirements: 7.3, 7.6, 7.7, 9.4_
  
  - [x] 8.2 Write integration test for /api/explain endpoint
    - Test endpoint with mock Bedrock success
    - Test endpoint with Bedrock failure and Puter success
    - Test endpoint with both providers failing
    - Verify prompt building is preserved
    - Verify response format is unchanged
    - Verify deterministic values returned on AI failure
    - _Requirements: 8.5_

- [x] 9. Migrate /api/analyze endpoint to use Fallback System
  - [x] 9.1 Update /api/analyze to use FallbackOrchestrator
    - Import getFallbackOrchestrator from lib/ai/fallback-orchestrator
    - Replace invokeBedrockModel() call with orchestrator.generateResponse()
    - Pass prompt, options, and metadata (endpoint, userId) to orchestrator
    - Preserve existing prompt building logic
    - Preserve existing response format with calculatedMetrics
    - Ensure health score calculated before AI call
    - Update error handling to use orchestrator response
    - _Requirements: 7.1, 7.6, 7.7, 9.4_
  
  - [x] 9.2 Write integration test for /api/analyze endpoint
    - Test endpoint with mock Bedrock success
    - Test endpoint with fallback to Puter
    - Verify health score calculated before AI call
    - Verify prompt building preserved
    - Verify response format unchanged
    - _Requirements: 8.5_

- [x] 10. Migrate /api/ask endpoint to use Fallback System
  - [x] 10.1 Update /api/ask to use FallbackOrchestrator
    - Import getFallbackOrchestrator from lib/ai/fallback-orchestrator
    - Replace invokeBedrockModel() call with orchestrator.generateResponse()
    - Pass prompt, options, and metadata (endpoint, userId) to orchestrator
    - Preserve existing prompt building for Q&A
    - Preserve existing response format
    - Update error handling to use orchestrator response
    - _Requirements: 7.2, 7.6, 7.7_
  
  - [x] 10.2 Write integration test for /api/ask endpoint
    - Test endpoint with mock Bedrock success
    - Test endpoint with fallback to Puter
    - Verify prompt building preserved
    - Verify response format unchanged
    - _Requirements: 8.5_

- [x] 11. Migrate /api/benchmark/explain endpoint to use Fallback System
  - [x] 11.1 Update /api/benchmark/explain to use FallbackOrchestrator
    - Import getFallbackOrchestrator from lib/ai/fallback-orchestrator
    - Replace invokeBedrockModel() call with orchestrator.generateResponse()
    - Pass prompt, options, and metadata (endpoint, userId) to orchestrator
    - Preserve existing benchmarkPromptBuilder usage
    - Preserve existing response format
    - Ensure segment comparison calculated before AI call
    - Update error handling to use orchestrator response
    - _Requirements: 7.4, 7.6, 7.7, 9.4_
  
  - [x] 11.2 Write integration test for /api/benchmark/explain endpoint
    - Test endpoint with mock Bedrock success
    - Test endpoint with fallback to Puter
    - Verify segment comparison calculated before AI call
    - Verify prompt building preserved
    - Verify response format unchanged
    - _Requirements: 8.5_

- [x] 12. Migrate /api/indices/explain endpoint to use Fallback System
  - [x] 12.1 Update /api/indices/explain to use FallbackOrchestrator
    - Import getFallbackOrchestrator from lib/ai/fallback-orchestrator
    - Replace invokeBedrockModel() call with orchestrator.generateResponse()
    - Pass prompt, options, and metadata (endpoint, userId) to orchestrator
    - Preserve existing prompt building for indices
    - Preserve existing response format
    - Ensure stress and affordability indices calculated before AI call
    - Update error handling to use orchestrator response
    - _Requirements: 7.5, 7.6, 7.7, 9.4_
  
  - [x] 12.2 Write integration test for /api/indices/explain endpoint
    - Test endpoint with mock Bedrock success
    - Test endpoint with fallback to Puter
    - Verify stress and affordability indices calculated before AI call
    - Verify prompt building preserved
    - Verify response format unchanged
    - _Requirements: 8.5_

- [x] 13. Checkpoint - Ensure all endpoint migrations pass tests
  - Run integration tests for all migrated endpoints
  - Verify no regressions in existing functionality
  - Ensure all tests pass, ask the user if questions arise

- [x] 14. Add error message localization
  - [x] 14.1 Extend lib/translations.ts with AI error messages
    - Add 'errors.aiUnavailable' key for English, Hindi, Marathi
    - Add 'errors.aiRateLimited' key for English, Hindi, Marathi
    - Add 'errors.aiTimeout' key for English, Hindi, Marathi
    - Add 'errors.aiAuthFailed' key for English, Hindi, Marathi
    - _Requirements: 10.2_
  
  - [x] 14.2 Update FallbackOrchestrator to use localized messages
    - Import translation function from lib/translations
    - Use localized error messages in final error response
    - Pass language from options to translation function
    - _Requirements: 10.2_
  
  - [x] 14.3 Write unit tests for error message localization
    - Test error messages in English
    - Test error messages in Hindi
    - Test error messages in Marathi
    - Verify correct translation keys used
    - _Requirements: 10.2_

- [x] 15. Implement sensitive information sanitization
  - [x] 15.1 Add sanitization to error responses
    - Create sanitizeError() function in FallbackOrchestrator
    - Strip AWS error details from error messages
    - Remove stack traces from client responses
    - Remove credential information from logs
    - Apply sanitization to all error responses
    - _Requirements: 10.5_
  
  - [x] 15.2 Write unit tests for sanitization
    - Test AWS error details are stripped
    - Test stack traces are removed
    - Test credentials are not exposed
    - Test API keys are not in responses
    - _Requirements: 10.5_

- [x] 16. Update environment configuration
  - [x] 16.1 Update .env.local.example with new variables
    - Add ENABLE_AI_FALLBACK variable with description
    - Document default value (true)
    - Add comment explaining fallback behavior
    - Keep existing AWS Bedrock variables
    - _Requirements: 6.1_
  
  - [x] 16.2 Update package.json dependencies if needed
    - Check if Puter.js SDK needs to be added
    - Add dependency if not using direct fetch API
    - Run npm install if dependencies added
    - _Requirements: 3.2_

- [x] 17. Write property-based tests for correctness properties
  - [x] 17.1 Write property test for consistent response format (Property 1)
    - **Property 1: Consistent Response Format Across Providers**
    - **Validates: Requirements 1.2, 2.5, 3.5**
    - Create `lib/ai/__tests__/provider-abstraction.property.test.ts`
    - Generate random prompts (10-500 chars)
    - Test both Bedrock and Puter providers
    - Verify response has success, provider fields
    - Verify success=true includes content field
    - Verify success=false includes error and errorType fields
    - Run 100 iterations
  
  - [x] 17.2 Write property test for prompt building preservation (Property 2)
    - **Property 2: Prompt Building Preservation**
    - **Validates: Requirements 1.5, 7.6**
    - Create `lib/ai/__tests__/prompt-preservation.property.test.ts`
    - Generate random persona contexts
    - Build prompts before and after fallback integration
    - Verify prompts are identical
    - Test all prompt types (explain, analyze, ask, benchmark, indices)
    - Run 100 iterations
  
  - [x] 17.3 Write property test for provider error propagation (Property 3)
    - **Property 3: Provider Error Propagation**
    - **Validates: Requirements 2.4, 3.4**
    - Create `lib/ai/__tests__/error-propagation.property.test.ts`
    - Generate random error conditions
    - Test both providers with various errors
    - Verify errors are categorized correctly
    - Verify error messages are descriptive
    - Run 100 iterations
  
  - [x] 17.4 Write property test for fallback ordering (Property 4)
    - **Property 4: Fallback Ordering**
    - **Validates: Requirements 4.1, 4.2**
    - Create `lib/ai/__tests__/fallback-ordering.property.test.ts`
    - Generate random prompts
    - Use mock providers to track call order
    - Verify Bedrock called first
    - Verify Puter called only if Bedrock fails
    - Verify Puter not called if Bedrock succeeds
    - Run 100 iterations
  
  - [x] 17.5 Write property test for error response format compliance (Property 5)
    - **Property 5: Error Response Format Compliance**
    - **Validates: Requirements 4.3, 10.1**
    - Create `lib/ai/__tests__/error-format.property.test.ts`
    - Generate random error scenarios
    - Test both providers failing
    - Verify error response has success=false, code, message fields
    - Verify error format matches lib/error-utils.ts
    - Run 100 iterations
  
  - [x] 17.6 Write property test for provider logging completeness (Property 6)
    - **Property 6: Provider Logging Completeness**
    - **Validates: Requirements 5.1, 5.6**
    - Create `lib/ai/__tests__/logging-completeness.property.test.ts`
    - Generate random requests with metadata
    - Capture log output
    - Verify provider name logged
    - Verify endpoint and userId logged
    - Verify timestamp present
    - Run 100 iterations
  
  - [x] 17.7 Write property test for localized error messages (Property 7)
    - **Property 7: Localized Error Messages**
    - **Validates: Requirements 10.2**
    - Create `lib/ai/__tests__/error-localization.property.test.ts`
    - Generate random error conditions
    - Test all supported languages (en, hi, mr)
    - Verify error messages in correct language
    - Verify translation keys exist
    - Run 100 iterations
  
  - [x] 17.8 Write property test for deterministic calculation ordering (Property 8)
    - **Property 8: Deterministic Calculation Ordering**
    - **Validates: Requirements 9.4**
    - Create `lib/ai/__tests__/calculation-ordering.property.test.ts`
    - Generate random financial data
    - Test all AI endpoints
    - Verify metrics calculated before AI call
    - Verify AI never calculates financial metrics
    - Run 100 iterations
  
  - [x] 17.9 Write property test for business state immutability (Property 9)
    - **Property 9: Business State Immutability**
    - **Validates: Requirements 9.5**
    - Create `lib/ai/__tests__/state-immutability.property.test.ts`
    - Generate random fallback operations
    - Capture DynamoDB state before and after
    - Verify no state changes occurred
    - Test both success and failure scenarios
    - Run 100 iterations
  
  - [x] 17.10 Write property test for sensitive information sanitization (Property 10)
    - **Property 10: Sensitive Information Sanitization**
    - **Validates: Requirements 10.5**
    - Create `lib/ai/__tests__/sanitization.property.test.ts`
    - Generate random error responses
    - Verify no API keys in responses
    - Verify no credentials in responses
    - Verify no AWS error details in responses
    - Verify no stack traces in responses
    - Run 100 iterations

- [x] 18. Final checkpoint - Run all tests and verify system
  - Run all unit tests for providers and orchestrator
  - Run all property-based tests (100 iterations each)
  - Run all integration tests for endpoints
  - Verify no regressions in existing functionality
  - Verify all 10 correctness properties pass
  - Ensure all tests pass, ask the user if questions arise

- [x] 19. Update documentation
  - Add inline code comments explaining fallback logic
  - Document ENABLE_AI_FALLBACK environment variable
  - Add JSDoc comments to all public methods
  - Document provider abstraction layer usage
  - _Requirements: 6.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (100 iterations each)
- Unit tests validate specific examples and edge cases
- All financial calculations must occur before AI calls (deterministic-first principle)
- AWS Bedrock is always the primary provider (for hackathon judging)
- Puter.js is transparent fallback (users don't know it's being used)
- Existing prompt building and response formats must be preserved
- No changes to API contracts or client code
