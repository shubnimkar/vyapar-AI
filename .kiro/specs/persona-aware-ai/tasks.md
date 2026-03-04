# Implementation Plan: Persona-Aware AI

## Overview

This implementation plan transforms the Persona-Aware AI feature from design to working code. The feature provides business-specific AI personalization through centralized prompt building, profile management, and integration with existing AI endpoints. Implementation follows a deterministic-first architecture where AI explains pre-calculated metrics but never computes them.

Key implementation areas:
- Profile storage with persona fields (business_type, city_tier, explanation_mode)
- Centralized prompt builder library with business-specific templates
- Integration with /api/explain, /api/analyze, /api/ask endpoints
- Profile setup and settings UI components
- Offline-first with localStorage caching and sync queue
- Structured logging with persona context

## Tasks

- [ ] 1. Extend profile storage with persona fields
  - [ ] 1.1 Add persona fields to UserProfile interface in lib/types.ts
    - Add business_type: 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other'
    - Add city_tier?: 'tier-1' | 'tier-2' | 'tier-3' | 'rural' | null
    - Add explanation_mode: 'simple' | 'detailed'
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.2 Add validation methods to ProfileService in lib/dynamodb-client.ts
    - Implement validateBusinessType(type: string): boolean
    - Implement validateCityTier(tier: string | null): boolean
    - Implement validateExplanationMode(mode: string): boolean
    - Return false for invalid enum values
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.3 Write property test for profile field validation
    - **Property 1: Profile Field Validation**
    - **Validates: Requirements 1.1, 1.2, 1.3**
    - Test that Profile_Store accepts only valid enum values
    - Test that Profile_Store rejects invalid values with error codes

  - [ ] 1.4 Update /api/profile/setup endpoint to accept persona fields
    - Validate business_type and explanation_mode are required
    - Validate city_tier is optional (allow null)
    - Call validation methods before saving
    - Return VALIDATION_ERROR for invalid values
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 1.5 Update /api/profile PUT endpoint to accept persona field updates
    - Allow partial updates to persona fields
    - Validate updated fields using validation methods
    - Persist changes to DynamoDB
    - _Requirements: 1.4, 8.5_

  - [ ]* 1.6 Write property test for profile persistence round-trip
    - **Property 2: Profile Persistence Round-Trip**
    - **Validates: Requirements 1.4**
    - Test that saving and retrieving profile returns equivalent persona values

- [ ] 2. Create centralized prompt builder library
  - [ ] 2.1 Create lib/ai/ directory and types file
    - Create lib/ai/types.ts with PersonaContext and PromptStructure interfaces
    - Define PersonaContext with business_type, city_tier, explanation_mode, language
    - Define PromptStructure with system, user, metadata fields
    - _Requirements: 2.1, 2.2, 2.3, 2.10_

  - [ ] 2.2 Create prompt template constants in lib/ai/templates.ts
    - Define PERSONA_IDENTITIES object with 5 business types × 3 languages
    - Define BUSINESS_CONTEXTS object with 5 business types × 3 languages
    - Define CITY_TIER_CONTEXTS object with 4 tiers × 3 languages
    - Define EXPLANATION_MODE_INSTRUCTIONS for simple and detailed modes
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 2.3 Implement buildPersonaPrompt function in lib/ai/prompt-builder.ts
    - Accept PersonaContext and promptType parameters
    - Build system prompt with persona identity, business context, location context
    - Add AI interpretation layer instructions (explain, not calculate)
    - Add explanation mode instructions (simple: 2-3 bullets, detailed: 5-7 bullets)
    - Build user prompt based on promptType (explain, analyze, ask)
    - Return PromptStructure with system, user, metadata
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 2.4 Write property test for prompt structure completeness
    - **Property 3: Prompt Structure Completeness**
    - **Validates: Requirements 2.10**
    - Test that buildPersonaPrompt returns object with system and user fields

  - [ ]* 2.5 Write property test for persona identity injection
    - **Property 4: Persona Identity Injection**
    - **Validates: Requirements 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
    - Test that all business types include business-specific persona identity

  - [ ]* 2.6 Write property test for business context injection
    - **Property 5: Business Context Injection**
    - **Validates: Requirements 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
    - Test that all business types include business-specific context

  - [ ]* 2.7 Write property test for location context conditional inclusion
    - **Property 6: Location Context Conditional Inclusion**
    - **Validates: Requirements 2.6**
    - Test that city_tier presence controls location context inclusion

  - [ ]* 2.8 Write property test for explanation mode instructions
    - **Property 7: Explanation Mode Instructions**
    - **Validates: Requirements 2.7, 2.8**
    - Test simple mode instructs 2-3 bullets with no jargon
    - Test detailed mode instructs 5-7 bullets with explanations

  - [ ]* 2.9 Write property test for AI interpretation layer enforcement
    - **Property 8: AI Interpretation Layer Enforcement**
    - **Validates: Requirements 5.1, 5.2, 5.6**
    - Test that prompts explicitly state AI must explain, not calculate

  - [ ]* 2.10 Write property test for deterministic metrics inclusion
    - **Property 9: Deterministic Metrics Inclusion**
    - **Validates: Requirements 5.3**
    - Test that provided metric values appear in user message section

  - [ ] 2.11 Implement helper functions for prompt building
    - Implement buildExplainPrompt(data, language): string
    - Implement buildAnalyzePrompt(data, language): string
    - Implement buildAskPrompt(data, language): string
    - Format calculatedMetrics as bullet list in prompts
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]* 2.12 Write unit tests for prompt builder edge cases
    - Test city_tier is null (optional field not set)
    - Test empty calculatedMetrics object
    - Test all three promptType values (explain, analyze, ask)
    - Test all language values (en, hi, mr)

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Integrate prompt builder with existing AI endpoints
  - [ ] 4.1 Update /api/explain/route.ts to use Prompt_Builder
    - Retrieve profile using ProfileService.getProfile(userId)
    - Return PROFILE_INCOMPLETE error if profile missing or incomplete
    - Build PersonaContext from profile data
    - Call buildPersonaPrompt with 'explain' type and metric data
    - Pass prompt to invokeBedrockModel
    - Add structured logging with persona context
    - Implement graceful degradation if AI unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4, 6.1, 6.2, 9.1, 9.4, 9.5_

  - [ ] 4.2 Update /api/analyze/route.ts to use Prompt_Builder
    - Retrieve profile using ProfileService.getProfile(userId)
    - Return PROFILE_INCOMPLETE error if profile missing or incomplete
    - Build PersonaContext from profile data
    - Call buildPersonaPrompt with 'analyze' type and calculated metrics
    - Pass prompt to invokeBedrockModel
    - Add structured logging with persona context
    - Implement graceful degradation if AI unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.5, 6.1, 6.2, 9.2, 9.4, 9.5_

  - [ ] 4.3 Update /api/ask/route.ts to use Prompt_Builder
    - Retrieve profile using ProfileService.getProfile(userId)
    - Return PROFILE_INCOMPLETE error if profile missing or incomplete
    - Build PersonaContext from profile data
    - Call buildPersonaPrompt with 'ask' type and question data
    - Pass prompt to invokeBedrockModel
    - Add structured logging with persona context
    - Implement graceful degradation if AI unavailable
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 9.3, 9.4, 9.5_

  - [ ]* 4.4 Write property test for API response structure preservation
    - **Property 12: API Response Structure Preservation**
    - **Validates: Requirements 9.6**
    - Test that API returns AI_Service response without modification

  - [ ]* 4.5 Write integration tests for AI endpoint flows
    - Test /api/explain retrieves profile and builds persona-aware prompt
    - Test /api/analyze retrieves profile and builds persona-aware prompt
    - Test /api/ask retrieves profile and builds persona-aware prompt
    - Mock Bedrock client for AI responses
    - Mock DynamoDB client for profile retrieval

- [ ] 5. Implement offline-first storage and sync
  - [ ] 5.1 Create lib/offline-persona-sync.ts with localStorage functions
    - Implement getCachedPersona(): CachedPersona | null
    - Implement updatePersonaCache(updates): void
    - Implement syncPersonaToDynamoDB(userId, persona): Promise<boolean>
    - Implement queuePendingUpdate(persona): void
    - Implement syncPendingUpdates(userId): Promise<void>
    - Use PERSONA_CACHE_KEY and PENDING_UPDATES_KEY constants
    - _Requirements: 6.4, 6.5, 6.6_

  - [ ]* 5.2 Write property test for offline storage round-trip
    - **Property 10: Offline Storage Round-Trip**
    - **Validates: Requirements 6.4, 6.5**
    - Test that storing and retrieving from localStorage returns equivalent values

  - [ ]* 5.3 Write property test for offline sync queue
    - **Property 11: Offline Sync Queue**
    - **Validates: Requirements 6.6**
    - Test that offline updates are queued and synced when online

  - [ ] 5.4 Add network event listener for automatic sync
    - Listen for 'online' event in window
    - Call syncPendingUpdates when network restored
    - Use last-write-wins strategy for conflict resolution
    - _Requirements: 6.6_

  - [ ]* 5.5 Write unit tests for offline sync edge cases
    - Test sync with empty pending queue
    - Test sync failure handling
    - Test multiple pending updates (last-write-wins)

- [ ] 6. Create profile setup UI component
  - [ ] 6.1 Create ProfileSetupForm component in components/ProfileSetupForm.tsx
    - Add business_type dropdown with 5 options (required)
    - Add city_tier dropdown with 4 options + "Not specified" (optional)
    - Add explanation_mode radio buttons (simple/detailed, required)
    - Validate required fields on submit
    - Call /api/profile/setup on submit
    - Cache persona preferences to localStorage on success
    - Navigate to dashboard on success
    - Display validation errors inline
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ] 6.2 Update app/profile-setup/page.tsx to use ProfileSetupForm
    - Import and render ProfileSetupForm component
    - Pass userId from session
    - Handle navigation after successful setup
    - _Requirements: 7.7_

  - [ ]* 6.3 Write unit tests for ProfileSetupForm
    - Test required field validation
    - Test successful form submission
    - Test API error handling
    - Test localStorage caching

- [ ] 7. Create profile settings UI component
  - [ ] 7.1 Update UserSettings component in components/UserSettings.tsx
    - Display current business_type value
    - Display current city_tier value
    - Display current explanation_mode value
    - Enable save button when fields change
    - Call /api/profile PUT endpoint on save
    - Update localStorage cache on success
    - Display success confirmation message
    - Display error message with retry option on failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ] 7.2 Add offline sync status indicator to UserSettings
    - Show "Saved locally" when offline
    - Show "Synced" when online sync completes
    - Show "Syncing..." during sync operation
    - _Requirements: 6.6_

  - [ ]* 7.3 Write unit tests for UserSettings persona fields
    - Test field value display
    - Test save button enable/disable
    - Test successful update
    - Test error handling with retry

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Add structured logging with persona context
  - [ ] 9.1 Update lib/logger.ts to support structured logging
    - Add support for context object parameter
    - Format persona_context as JSON field
    - Ensure production logs never include full prompt text
    - _Requirements: 10.4, 10.6_

  - [ ] 9.2 Add logging to Prompt_Builder
    - Log at info level when building prompts
    - Include business_type, city_tier, explanation_mode in context
    - Include prompt_type in context
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 9.3 Add logging to AI endpoints
    - Log persona context at info level on request
    - Log AI errors at error level with persona context
    - _Requirements: 10.5_

  - [ ]* 9.4 Write property test for structured logging with persona context
    - **Property 13: Structured Logging with Persona Context**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.6**
    - Test that Logger creates structured log entry with persona fields

  - [ ]* 9.5 Write unit tests for logging edge cases
    - Test logging with null city_tier
    - Test logging AI errors
    - Test production mode excludes full prompts

- [ ] 10. Integration and wiring
  - [ ] 10.1 Update existing components to handle PROFILE_INCOMPLETE errors
    - Update InsightsDisplay to show profile setup prompt
    - Update QAChat to show profile setup prompt
    - Update HealthScoreDisplay to show profile setup prompt
    - _Requirements: 3.4, 6.1_

  - [ ] 10.2 Add default persona values for existing users
    - Create migration script to set business_type: 'other', explanation_mode: 'simple'
    - Set city_tier: null for existing users
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 10.3 Update profile completion check in authentication flow
    - Check if persona fields are set after login
    - Redirect to profile setup if incomplete
    - _Requirements: 7.7_

  - [ ]* 10.4 Write integration tests for end-to-end flows
    - Test new user → profile setup → AI request with persona
    - Test existing user → update settings → AI request with new persona
    - Test offline update → network restore → sync → AI request

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at reasonable breaks
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows with mocked dependencies
- All financial calculations remain deterministic; AI only explains pre-calculated values
- Offline-first architecture ensures core functionality works without AI
- Structured logging enables debugging of personalization issues
