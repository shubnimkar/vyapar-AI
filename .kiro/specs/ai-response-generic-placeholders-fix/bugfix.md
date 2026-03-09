# Bugfix Requirements Document

## Introduction

This document specifies the requirements for fixing a bug where AI responses across multiple features (Cash Flow Prediction, Health Score, Analysis, Benchmark) display generic placeholder text instead of actual contextual AI-generated insights. The bug affects the user experience by showing non-personalized, template-like content instead of business-specific, persona-aware explanations that respect the user's profile settings (business_type, explanation_mode, language).

The fix must ensure that AI responses are properly constructed with persona context, successfully invoked through the AI provider system, and correctly displayed in the UI without being replaced by placeholders.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user requests cash flow prediction explanation THEN the system displays "### Explanation of the 7-Day Cash Flow Prediction" with generic template text instead of persona-aware insights

1.2 WHEN a user requests health score explanation THEN the system displays "### Understanding the HealthScore of 70" with generic bullet points instead of business-specific analysis

1.3 WHEN a user requests business analysis THEN the system displays "#### Identify" as a heading instead of structured insights with actual product names and numbers

1.4 WHEN a user requests benchmark explanation THEN the system displays "benchmark.title" as literal translation key text instead of localized AI explanation

1.5 WHEN a user requests indices explanation THEN the system displays generic fallback text instead of persona-aware AI-generated explanations

1.6 WHEN AI responses are generated THEN the system fails to include business_type, city_tier, and explanation_mode context in prompts

1.7 WHEN AI responses are returned from the backend THEN the UI components fail to extract and display the actual AI-generated content

### Expected Behavior (Correct)

2.1 WHEN a user requests cash flow prediction explanation THEN the system SHALL generate and display persona-aware insights specific to their business type (kirana, salon, pharmacy, restaurant, other) explaining why certain days are predicted higher/lower

2.2 WHEN a user requests health score explanation THEN the system SHALL generate and display business-specific analysis that references actual metrics and provides actionable recommendations in the user's preferred explanation_mode (simple or detailed)

2.3 WHEN a user requests business analysis THEN the system SHALL generate and display structured insights with specific product names, actual numbers from the data, and persona-appropriate recommendations

2.4 WHEN a user requests benchmark explanation THEN the system SHALL generate and display localized AI explanation in the user's current language (en, hi, mr) with business-specific context

2.5 WHEN a user requests indices explanation THEN the system SHALL generate and display persona-aware explanations that interpret pre-calculated stress and affordability index values

2.6 WHEN AI responses are generated THEN the system SHALL include complete persona context (business_type, city_tier, explanation_mode, language) in all prompt constructions

2.7 WHEN AI responses are returned from the backend THEN the UI components SHALL correctly extract the content field from response objects and display the actual AI-generated text

### Unchanged Behavior (Regression Prevention)

3.1 WHEN AI services are unavailable THEN the system SHALL CONTINUE TO provide graceful fallback explanations using deterministic rules

3.2 WHEN deterministic metrics are calculated (health score, stress index, affordability index) THEN the system SHALL CONTINUE TO calculate them without AI dependency

3.3 WHEN users have insufficient data for predictions THEN the system SHALL CONTINUE TO display appropriate "insufficient data" messages

3.4 WHEN API endpoints receive invalid inputs THEN the system SHALL CONTINUE TO return proper error responses with localized error messages

3.5 WHEN users switch languages THEN the system SHALL CONTINUE TO update UI text and request AI responses in the new language

3.6 WHEN profile data is incomplete THEN the system SHALL CONTINUE TO validate and return appropriate error responses

3.7 WHEN AI prompt builders are called with valid context THEN the system SHALL CONTINUE TO construct prompts with language instructions, persona identity, business context, and explanation mode instructions
