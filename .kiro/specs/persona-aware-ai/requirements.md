# Requirements Document

## Introduction

The Persona-Aware AI feature tailors AI-generated explanations and advice to the specific type of business the shop owner operates. By incorporating business type, location context, and user preferences into AI prompts, the system provides more relevant and actionable insights. This feature operates as an interpretation layer only—AI explains deterministic financial metrics but never calculates them.

## Glossary

- **Profile_Store**: The component responsible for storing and retrieving user profile data including business type, city tier, and explanation mode
- **Prompt_Builder**: The helper function library in /lib/ai/ that constructs AI prompts with persona context
- **AI_Service**: The AWS Bedrock integration layer that sends prompts and receives AI responses
- **Business_Type**: An enumerated value representing the shop category (kirana, salon, pharmacy, restaurant, other)
- **City_Tier**: An optional classification of the user's location (tier-1, tier-2, tier-3, rural)
- **Explanation_Mode**: User preference for response complexity (simple, detailed)
- **Persona_Context**: The combined business type, city tier, and explanation mode used to personalize AI responses
- **Financial_Metric**: A deterministically calculated value such as health score, margin, stress index, or affordability index

## Requirements

### Requirement 1: Store Business Profile Data

**User Story:** As a shop owner, I want to specify my business type and location, so that AI advice is relevant to my specific situation

#### Acceptance Criteria

1. THE Profile_Store SHALL store business_type with allowed values: kirana, salon, pharmacy, restaurant, other
2. THE Profile_Store SHALL store city_tier as an optional field with allowed values: tier-1, tier-2, tier-3, rural
3. THE Profile_Store SHALL store explanation_mode with allowed values: simple, detailed
4. WHEN a user updates their profile, THE Profile_Store SHALL persist the changes to DynamoDB
5. WHEN a user has not set city_tier, THE Profile_Store SHALL return null for that field
6. THE Profile_Store SHALL retrieve profile data within 200ms for 95% of requests

### Requirement 2: Build Persona-Aware Prompts

**User Story:** As a developer, I want a centralized prompt builder, so that all AI requests include consistent persona context

#### Acceptance Criteria

1. THE Prompt_Builder SHALL accept business_type as a required parameter
2. THE Prompt_Builder SHALL accept city_tier as an optional parameter
3. THE Prompt_Builder SHALL accept explanation_mode as a required parameter
4. THE Prompt_Builder SHALL inject persona identity into the system prompt section
5. THE Prompt_Builder SHALL inject business context into the system prompt section
6. WHEN city_tier is provided, THE Prompt_Builder SHALL include location context in the prompt
7. WHEN explanation_mode is "simple", THE Prompt_Builder SHALL instruct the AI to provide 2-3 bullet points with no jargon
8. WHEN explanation_mode is "detailed", THE Prompt_Builder SHALL instruct the AI to provide 5-7 bullets with concept explanations
9. THE Prompt_Builder SHALL reside in /lib/ai/ directory
10. THE Prompt_Builder SHALL return a structured prompt object with system and user message sections

### Requirement 3: Prevent Hardcoded Prompts in Routes

**User Story:** As a developer, I want to maintain prompt consistency, so that persona context is never accidentally omitted

#### Acceptance Criteria

1. THE API_Route SHALL call Prompt_Builder functions to construct all AI prompts
2. THE API_Route SHALL NOT contain inline string templates for AI prompts
3. THE API_Route SHALL pass profile data to Prompt_Builder before invoking AI_Service
4. WHEN profile data is missing, THE API_Route SHALL return an error code PROFILE_INCOMPLETE

### Requirement 4: Tailor AI Explanations by Business Type

**User Story:** As a kirana shop owner, I want AI advice specific to grocery retail, so that suggestions are practical for my business

#### Acceptance Criteria

1. WHEN business_type is "kirana", THE Prompt_Builder SHALL include grocery retail context in prompts
2. WHEN business_type is "salon", THE Prompt_Builder SHALL include service business context in prompts
3. WHEN business_type is "pharmacy", THE Prompt_Builder SHALL include healthcare retail context in prompts
4. WHEN business_type is "restaurant", THE Prompt_Builder SHALL include food service context in prompts
5. WHEN business_type is "other", THE Prompt_Builder SHALL include general retail context in prompts
6. THE Prompt_Builder SHALL include business-specific terminology appropriate to the business_type

### Requirement 5: Maintain AI as Interpretation Layer Only

**User Story:** As a system architect, I want AI to explain but not calculate, so that financial accuracy is guaranteed

#### Acceptance Criteria

1. THE Prompt_Builder SHALL instruct the AI to explain pre-calculated Financial_Metrics
2. THE Prompt_Builder SHALL instruct the AI NOT to perform financial calculations
3. THE Prompt_Builder SHALL include deterministic metric values in the user message section
4. WHEN constructing prompts for health score explanation, THE Prompt_Builder SHALL include the calculated health score value
5. WHEN constructing prompts for margin analysis, THE Prompt_Builder SHALL include the calculated margin percentage
6. THE Prompt_Builder SHALL frame all prompts as interpretation tasks, not calculation tasks

### Requirement 6: Support Offline-First Architecture

**User Story:** As a shop owner with unreliable internet, I want core features to work offline, so that AI unavailability doesn't block my work

#### Acceptance Criteria

1. WHEN AI_Service is unavailable, THE Application SHALL display deterministic Financial_Metrics without AI explanation
2. WHEN AI_Service request fails, THE Application SHALL show a fallback message indicating explanation is unavailable
3. THE Application SHALL NOT block user actions while waiting for AI responses
4. THE Application SHALL cache explanation_mode preference in localStorage
5. THE Application SHALL cache business_type preference in localStorage
6. WHEN network connectivity is restored, THE Application SHALL sync profile changes to Profile_Store

### Requirement 7: Provide Profile Setup Interface

**User Story:** As a new user, I want to set my business type during onboarding, so that AI advice is personalized from the start

#### Acceptance Criteria

1. THE Profile_Setup_Form SHALL display business_type as a required dropdown field
2. THE Profile_Setup_Form SHALL display city_tier as an optional dropdown field
3. THE Profile_Setup_Form SHALL display explanation_mode as a required radio button group
4. WHEN a user submits the profile form, THE Profile_Setup_Form SHALL validate that business_type is selected
5. WHEN a user submits the profile form, THE Profile_Setup_Form SHALL validate that explanation_mode is selected
6. WHEN validation passes, THE Profile_Setup_Form SHALL call the profile API to persist data
7. WHEN the profile API returns success, THE Profile_Setup_Form SHALL navigate the user to the main dashboard

### Requirement 8: Allow Profile Updates

**User Story:** As a shop owner who expands my business, I want to update my business type, so that AI advice reflects my current situation

#### Acceptance Criteria

1. THE User_Settings_Page SHALL display current business_type value
2. THE User_Settings_Page SHALL display current city_tier value
3. THE User_Settings_Page SHALL display current explanation_mode value
4. WHEN a user changes any profile field, THE User_Settings_Page SHALL enable a save button
5. WHEN a user clicks save, THE User_Settings_Page SHALL call the profile update API
6. WHEN the update succeeds, THE User_Settings_Page SHALL display a success confirmation
7. WHEN the update fails, THE User_Settings_Page SHALL display an error message with retry option

### Requirement 9: Integrate with Existing AI Endpoints

**User Story:** As a developer, I want to enhance existing AI features with persona context, so that all AI interactions are personalized

#### Acceptance Criteria

1. THE /api/explain endpoint SHALL retrieve profile data before building prompts
2. THE /api/analyze endpoint SHALL retrieve profile data before building prompts
3. THE /api/ask endpoint SHALL retrieve profile data before building prompts
4. WHEN profile data is retrieved, THE API_Endpoint SHALL pass it to Prompt_Builder
5. WHEN Prompt_Builder returns a prompt, THE API_Endpoint SHALL pass it to AI_Service
6. THE API_Endpoint SHALL return AI_Service responses without modification to response structure

### Requirement 10: Log Persona Context for Debugging

**User Story:** As a developer, I want to log persona context in AI requests, so that I can debug personalization issues

#### Acceptance Criteria

1. WHEN Prompt_Builder constructs a prompt, THE Logger SHALL log business_type at info level
2. WHEN Prompt_Builder constructs a prompt, THE Logger SHALL log city_tier at info level if present
3. WHEN Prompt_Builder constructs a prompt, THE Logger SHALL log explanation_mode at info level
4. THE Logger SHALL NOT log the full prompt text in production
5. WHEN AI_Service returns an error, THE Logger SHALL log the error with persona context at error level
6. THE Logger SHALL use structured logging format with persona_context as a JSON field
