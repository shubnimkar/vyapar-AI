# Requirements Document

## Introduction

The AI Provider Fallback System ensures that Vyapar AI's explanation and interpretation features remain operational during AWS Bedrock service disruptions, particularly during hackathon demos and presentations. The system maintains AWS Bedrock as the primary provider (to demonstrate AWS integration to judges) while providing Puter.js as a transparent fallback option. This architecture preserves the deterministic-first principle where AI is used only for explanation and interpretation, never for financial calculations.

## Glossary

- **AI_Provider**: An external service that provides natural language generation capabilities for explaining financial metrics and providing business insights
- **Bedrock_Provider**: AWS Bedrock AI service, the primary AI provider for Vyapar AI
- **Puter_Provider**: Puter.js serverless AI service, the fallback AI provider requiring no API keys
- **Provider_Abstraction_Layer**: A software interface that standardizes communication with different AI providers
- **Fallback_System**: The mechanism that automatically switches from primary to fallback provider when failures occur
- **Prompt_Builder**: The existing system in lib/ai/ that constructs AI prompts with persona and business context
- **AI_Endpoint**: API routes that use AI for explanation (/api/analyze, /api/ask, /api/explain, /api/benchmark/explain, /api/indices/explain)
- **Provider_Logger**: Component that tracks which AI provider was used for each request

## Requirements

### Requirement 1: Provider Abstraction Layer

**User Story:** As a developer, I want a unified interface for AI providers, so that I can switch between providers without changing endpoint code.

#### Acceptance Criteria

1. THE Provider_Abstraction_Layer SHALL define a standard interface with generateResponse(prompt: string, options?: object) method
2. THE Provider_Abstraction_Layer SHALL return responses in a consistent format regardless of underlying provider
3. THE Provider_Abstraction_Layer SHALL expose a getProviderName() method that returns the current provider identifier
4. THE Provider_Abstraction_Layer SHALL support dependency injection for testing with mock providers
5. WHEN a provider method is called, THE Provider_Abstraction_Layer SHALL preserve all existing prompt building functionality from lib/ai/prompt-builder.ts

### Requirement 2: AWS Bedrock Provider Implementation

**User Story:** As a developer, I want to wrap existing Bedrock functionality in the provider interface, so that it works with the fallback system.

#### Acceptance Criteria

1. THE Bedrock_Provider SHALL implement the Provider_Abstraction_Layer interface
2. THE Bedrock_Provider SHALL use the existing AWS SDK v3 Bedrock client from lib/bedrock-client.ts
3. WHEN Bedrock_Provider.generateResponse() is called, THE Bedrock_Provider SHALL invoke the Bedrock API with the provided prompt
4. IF the Bedrock API returns an error, THEN THE Bedrock_Provider SHALL throw a descriptive error with the failure reason
5. THE Bedrock_Provider SHALL return responses in the standardized format defined by Provider_Abstraction_Layer

### Requirement 3: Puter.js Provider Implementation

**User Story:** As a developer, I want a Puter.js provider implementation, so that AI features work when Bedrock is unavailable.

#### Acceptance Criteria

1. THE Puter_Provider SHALL implement the Provider_Abstraction_Layer interface
2. THE Puter_Provider SHALL use the Puter.js AI SDK with no API key requirements
3. WHEN Puter_Provider.generateResponse() is called, THE Puter_Provider SHALL invoke the Puter.js AI API with the provided prompt
4. IF the Puter.js API returns an error, THEN THE Puter_Provider SHALL throw a descriptive error with the failure reason
5. THE Puter_Provider SHALL return responses in the standardized format defined by Provider_Abstraction_Layer
6. THE Puter_Provider SHALL handle rate limiting gracefully with appropriate error messages

### Requirement 4: Automatic Fallback Logic

**User Story:** As a shop owner, I want AI features to work reliably during demos, so that I can always get business insights even if AWS has issues.

#### Acceptance Criteria

1. THE Fallback_System SHALL attempt to use Bedrock_Provider first for all AI requests
2. WHEN Bedrock_Provider fails with any error, THE Fallback_System SHALL automatically retry the request using Puter_Provider
3. IF both providers fail, THEN THE Fallback_System SHALL return an error response following the error format from lib/error-utils.ts
4. THE Fallback_System SHALL complete fallback attempts within 10 seconds total timeout
5. WHERE fallback is disabled via configuration, THE Fallback_System SHALL only attempt Bedrock_Provider and return errors immediately on failure

### Requirement 5: Provider Usage Logging

**User Story:** As a hackathon participant, I want to track which AI provider handled each request, so that I can demonstrate AWS usage to judges.

#### Acceptance Criteria

1. WHEN an AI request is processed, THE Provider_Logger SHALL log which provider was used (bedrock or puter)
2. WHEN Bedrock_Provider succeeds, THE Provider_Logger SHALL log with level "info" and message "AI request handled by AWS Bedrock"
3. WHEN fallback to Puter_Provider occurs, THE Provider_Logger SHALL log with level "warn" and message "AI request failed on Bedrock, using Puter.js fallback"
4. WHEN both providers fail, THE Provider_Logger SHALL log with level "error" and include both failure reasons
5. THE Provider_Logger SHALL use the existing logger from lib/logger.ts
6. THE Provider_Logger SHALL include request metadata (endpoint, timestamp, user_id if available)

### Requirement 6: Configuration Management

**User Story:** As a developer, I want to control fallback behavior via environment variables, so that I can disable fallback in production if needed.

#### Acceptance Criteria

1. THE Fallback_System SHALL read configuration from environment variable ENABLE_AI_FALLBACK
2. WHEN ENABLE_AI_FALLBACK is set to "true", THE Fallback_System SHALL enable automatic fallback to Puter_Provider
3. WHEN ENABLE_AI_FALLBACK is set to "false" or undefined, THE Fallback_System SHALL only use Bedrock_Provider
4. THE Fallback_System SHALL validate configuration on initialization and log warnings for invalid values
5. THE Fallback_System SHALL default to fallback enabled (true) when environment variable is not set

### Requirement 7: Endpoint Integration

**User Story:** As a developer, I want all AI endpoints updated to use the fallback system, so that all AI features benefit from reliability improvements.

#### Acceptance Criteria

1. THE AI_Endpoint /api/analyze SHALL use the Fallback_System instead of direct Bedrock calls
2. THE AI_Endpoint /api/ask SHALL use the Fallback_System instead of direct Bedrock calls
3. THE AI_Endpoint /api/explain SHALL use the Fallback_System instead of direct Bedrock calls
4. THE AI_Endpoint /api/benchmark/explain SHALL use the Fallback_System instead of direct Bedrock calls
5. THE AI_Endpoint /api/indices/explain SHALL use the Fallback_System instead of direct Bedrock calls
6. WHEN an AI_Endpoint uses the Fallback_System, THE AI_Endpoint SHALL preserve all existing prompt building logic from lib/ai/prompt-builder.ts and lib/ai/templates.ts
7. WHEN an AI_Endpoint receives a response, THE AI_Endpoint SHALL return it in the existing response format without modification

### Requirement 8: Testing Support

**User Story:** As a developer, I want to test the fallback system with mock providers, so that I can verify behavior without making real API calls.

#### Acceptance Criteria

1. THE Provider_Abstraction_Layer SHALL support constructor injection of provider instances for testing
2. THE Fallback_System SHALL accept mock providers that implement the Provider_Abstraction_Layer interface
3. WHEN running unit tests, THE Fallback_System SHALL use mock providers instead of real API clients
4. THE Fallback_System SHALL expose a method to reset provider state for test isolation
5. FOR ALL provider implementations, unit tests SHALL verify interface compliance and error handling

### Requirement 9: Deterministic-First Compliance

**User Story:** As a system architect, I want to ensure AI providers only handle explanation tasks, so that financial calculations remain deterministic and testable.

#### Acceptance Criteria

1. THE Provider_Abstraction_Layer SHALL only be used for explanation and interpretation endpoints
2. THE Provider_Abstraction_Layer SHALL NOT be used in any financial calculation functions in lib/finance/
3. THE Provider_Abstraction_Layer SHALL NOT be used in health score, margin, stress index, or affordability index calculations
4. WHEN an AI_Endpoint uses the Fallback_System, THE AI_Endpoint SHALL compute all financial metrics deterministically before requesting AI explanation
5. THE Fallback_System SHALL never store or modify business state (daily entries, credits, profiles)

### Requirement 10: Error Handling and User Experience

**User Story:** As a shop owner, I want clear error messages when AI features fail, so that I understand what happened without technical jargon.

#### Acceptance Criteria

1. WHEN both providers fail, THE Fallback_System SHALL return a user-friendly error message using lib/error-utils.ts
2. THE Fallback_System SHALL support localized error messages for Hindi and English
3. IF Bedrock_Provider fails due to authentication, THEN THE Fallback_System SHALL log the specific error but show generic message to users
4. IF Puter_Provider fails due to rate limiting, THEN THE Fallback_System SHALL return error code "AI_RATE_LIMITED" with appropriate message
5. THE Fallback_System SHALL never expose API keys, credentials, or internal error details to client responses
