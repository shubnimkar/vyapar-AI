# Requirements Document: Daily Health Coach

## Introduction

The Daily Health Coach transforms Vyapar AI's passive health score into an active daily coaching system. Instead of merely displaying financial metrics, it provides shop owners with 1-2 concrete, actionable suggestions every day in their local language. The system uses a deterministic, rule-based engine to analyze daily financial data and generate personalized recommendations that help improve financial health.

This feature is designed for small shop owners in India (kirana stores, salons, pharmacies, restaurants) who need simple, actionable guidance rather than complex financial analysis.

## Glossary

- **Daily_Health_Coach**: The rule-based suggestion engine that generates daily actionable advice
- **Suggestion_Engine**: Pure TypeScript function that evaluates financial rules and produces suggestions
- **DailySuggestion**: A single actionable recommendation with severity, title, and description
- **SuggestionContext**: Financial metrics used as input to the suggestion engine
- **Health_Score**: Computed financial health metric (0-100) from existing system
- **Udhaar**: Hindi term for credit/outstanding payments owed by customers
- **Credit_Ratio**: Proportion of total sales that are outstanding as credit (credit_outstanding / total_sales)
- **Margin**: Profit margin calculated as (sales - expenses) / sales
- **Cash_Buffer_Days**: Number of days the business can operate with current cash reserves
- **DailyEntry**: Existing data model storing daily sales, expenses, and credit information
- **Severity_Level**: Classification of suggestion urgency: 'info' | 'warning' | 'critical'
- **Sync_Service**: Service that synchronizes local data with DynamoDB when online
- **Translation_System**: Existing localization system supporting 'en', 'hi', 'mr' languages

## Requirements

### Requirement 1: Generate Daily Suggestions

**User Story:** As a shop owner, I want to receive one actionable suggestion each day based on my financial data, so that I know exactly what to do to improve my business health.

#### Acceptance Criteria

1. WHEN a daily entry is saved or updated, THE Suggestion_Engine SHALL evaluate all financial rules and generate applicable suggestions
2. WHEN multiple rules are triggered, THE Suggestion_Engine SHALL prioritize by severity (critical > warning > info)
3. THE Suggestion_Engine SHALL return suggestions as an array of DailySuggestion objects
4. FOR ALL generated suggestions, THE Suggestion_Engine SHALL include id, created_at, severity, title, and description fields
5. THE Suggestion_Engine SHALL be a pure TypeScript function with no side effects
6. FOR ALL inputs, parsing the SuggestionContext then generating suggestions then parsing again SHALL produce equivalent suggestions (deterministic property)

### Requirement 2: Evaluate High Credit Ratio Rule

**User Story:** As a shop owner, I want to be alerted when too much money is tied up in credit, so that I can take action to collect payments.

#### Acceptance Criteria

1. WHEN credit_outstanding exceeds 0.4 times total_sales, THE Suggestion_Engine SHALL generate a critical severity suggestion
2. THE Suggestion_Engine SHALL use the translation key 'suggestions.high_credit.title' for the suggestion title
3. THE Suggestion_Engine SHALL use the translation key 'suggestions.high_credit.description' for the suggestion description
4. THE Suggestion_Engine SHALL include the actual credit ratio percentage in the suggestion context
5. IF credit_outstanding is zero or total_sales is zero, THEN THE Suggestion_Engine SHALL skip this rule

### Requirement 3: Evaluate Margin Drop Rule

**User Story:** As a shop owner, I want to be warned when my profit margin is declining, so that I can adjust my pricing or reduce expenses.

#### Acceptance Criteria

1. WHEN current_margin is less than 0.7 times avg_margin_last_30_days, THE Suggestion_Engine SHALL generate a warning severity suggestion
2. THE Suggestion_Engine SHALL use the translation key 'suggestions.margin_drop.title' for the suggestion title
3. THE Suggestion_Engine SHALL use the translation key 'suggestions.margin_drop.description' for the suggestion description
4. THE Suggestion_Engine SHALL include both current and average margin percentages in the suggestion context
5. IF avg_margin_last_30_days is unavailable or zero, THEN THE Suggestion_Engine SHALL skip this rule

### Requirement 4: Evaluate Low Cash Buffer Rule

**User Story:** As a shop owner, I want to be alerted when my cash reserves are running low, so that I can prepare for potential cash flow problems.

#### Acceptance Criteria

1. WHEN cash_buffer_days is less than 7, THE Suggestion_Engine SHALL generate a critical severity suggestion
2. THE Suggestion_Engine SHALL use the translation key 'suggestions.low_cash.title' for the suggestion title
3. THE Suggestion_Engine SHALL use the translation key 'suggestions.low_cash.description' for the suggestion description
4. THE Suggestion_Engine SHALL include the actual cash buffer days in the suggestion context
5. IF cash_buffer_days cannot be calculated, THEN THE Suggestion_Engine SHALL skip this rule

### Requirement 5: Provide Positive Reinforcement

**User Story:** As a shop owner, I want to receive positive feedback when my business is healthy, so that I stay motivated and know I'm on the right track.

#### Acceptance Criteria

1. WHEN health_score is greater than or equal to 70 AND no critical or warning rules are triggered, THE Suggestion_Engine SHALL generate an info severity suggestion
2. THE Suggestion_Engine SHALL use the translation key 'suggestions.healthy_state.title' for the suggestion title
3. THE Suggestion_Engine SHALL use the translation key 'suggestions.healthy_state.description' for the suggestion description
4. THE Suggestion_Engine SHALL include an optimization tip in the description
5. THE Suggestion_Engine SHALL rotate between different optimization tips for variety

### Requirement 6: Store Suggestions with Daily Entry

**User Story:** As a shop owner, I want my daily suggestions to be saved with my daily entry, so that I can review past advice and track my progress.

#### Acceptance Criteria

1. WHEN suggestions are generated, THE Daily_Entry_Service SHALL store them in the DailyEntry.suggestions array
2. THE Daily_Entry_Service SHALL persist suggestions to localStorage for offline access
3. WHEN the device is online, THE Sync_Service SHALL synchronize suggestions to DynamoDB
4. THE DailyEntry data model SHALL include a suggestions field of type DailySuggestion[]
5. FOR ALL DailySuggestion objects, the id field SHALL be unique within the daily entry

### Requirement 7: Dismiss Suggestions

**User Story:** As a shop owner, I want to dismiss suggestions I've read or acted upon, so that I don't see the same advice repeatedly.

#### Acceptance Criteria

1. WHEN a user dismisses a suggestion, THE Daily_Health_Coach SHALL set the dismissed_at timestamp
2. THE Daily_Health_Coach SHALL persist the dismissed_at value to localStorage immediately
3. WHEN the device is online, THE Sync_Service SHALL synchronize the dismissed_at value to DynamoDB
4. THE Dashboard SHALL display only suggestions where dismissed_at is null or undefined
5. FOR ALL dismissed suggestions, the dismissed_at timestamp SHALL be in ISO 8601 format

### Requirement 8: Display Daily Suggestion Card

**User Story:** As a shop owner, I want to see today's most important suggestion prominently on my dashboard, so that I know what action to take.

#### Acceptance Criteria

1. THE Dashboard SHALL display a DailySuggestionCard component showing undismissed suggestions
2. WHEN multiple undismissed suggestions exist, THE DailySuggestionCard SHALL display the highest severity suggestion first
3. THE DailySuggestionCard SHALL show the suggestion title, description, and severity visual indicator
4. THE DailySuggestionCard SHALL display "आज का एक सुझाव" in Hindi or "Today's One Suggestion" in English based on user language
5. THE DailySuggestionCard SHALL include a dismiss button that triggers the dismiss action

### Requirement 9: Localize Suggestion Content

**User Story:** As a shop owner, I want to receive suggestions in my preferred language, so that I can easily understand and act on the advice.

#### Acceptance Criteria

1. THE Translation_System SHALL provide translation keys for all suggestion titles and descriptions
2. THE Suggestion_Engine SHALL use the user's selected language preference ('en', 'hi', or 'mr')
3. THE Translation_System SHALL support the following keys: suggestions.high_credit.title, suggestions.high_credit.description, suggestions.margin_drop.title, suggestions.margin_drop.description, suggestions.low_cash.title, suggestions.low_cash.description, suggestions.healthy_state.title, suggestions.healthy_state.description
4. WHEN a translation key is missing, THE Translation_System SHALL fall back to English
5. FOR ALL suggestion text, the Translation_System SHALL use simple, jargon-free language appropriate for small shop owners

### Requirement 10: Operate Offline

**User Story:** As a shop owner with unreliable internet, I want to receive daily suggestions even when offline, so that I always have guidance regardless of connectivity.

#### Acceptance Criteria

1. THE Suggestion_Engine SHALL execute entirely in the browser without network requests
2. THE Suggestion_Engine SHALL use only data available in localStorage
3. THE Suggestion_Engine SHALL calculate all metrics (credit ratio, margin, cash buffer) from local DailyEntry data
4. WHEN the device is offline, THE Daily_Health_Coach SHALL generate suggestions using cached historical data
5. THE Suggestion_Engine SHALL have zero external dependencies (no AI, no API calls)

### Requirement 11: Trigger Suggestion Generation

**User Story:** As a shop owner, I want suggestions to be automatically generated when my financial data changes, so that I always have current advice.

#### Acceptance Criteria

1. WHEN a daily entry is created, THE Daily_Entry_Service SHALL invoke the Suggestion_Engine
2. WHEN a daily entry is updated, THE Daily_Entry_Service SHALL invoke the Suggestion_Engine
3. WHEN the Sync_Service recalculates statistics after sync, THE Daily_Entry_Service SHALL invoke the Suggestion_Engine
4. THE Suggestion_Engine SHALL replace previous suggestions for the same day
5. IF suggestion generation fails, THEN THE Daily_Entry_Service SHALL log the error and continue without blocking the save operation

### Requirement 12: Calculate Suggestion Context

**User Story:** As a developer, I want a clear interface for providing financial metrics to the suggestion engine, so that the system is maintainable and testable.

#### Acceptance Criteria

1. THE Daily_Entry_Service SHALL construct a SuggestionContext object before invoking the Suggestion_Engine
2. THE SuggestionContext SHALL include: health_score, total_sales, total_expenses, total_credit_outstanding, avg_margin_last_30_days, current_margin, cash_buffer_days, language
3. THE Daily_Entry_Service SHALL calculate avg_margin_last_30_days from the last 30 days of DailyEntry records
4. THE Daily_Entry_Service SHALL calculate cash_buffer_days as (current_cash / avg_daily_expenses)
5. IF insufficient historical data exists, THE Daily_Entry_Service SHALL provide null for metrics that cannot be calculated

### Requirement 13: Visual Severity Indicators

**User Story:** As a shop owner, I want to quickly understand the urgency of suggestions through visual cues, so that I can prioritize my actions.

#### Acceptance Criteria

1. THE DailySuggestionCard SHALL display critical severity suggestions with a red color indicator
2. THE DailySuggestionCard SHALL display warning severity suggestions with an orange/yellow color indicator
3. THE DailySuggestionCard SHALL display info severity suggestions with a blue/green color indicator
4. THE DailySuggestionCard SHALL use an icon appropriate to the severity level
5. THE visual indicators SHALL be accessible and distinguishable for users with color vision deficiencies

### Requirement 14: Unit Test Coverage

**User Story:** As a developer, I want comprehensive unit tests for the suggestion engine, so that I can confidently modify and extend the rules.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for each individual rule (high credit, margin drop, low cash, healthy state)
2. THE test suite SHALL verify that the Suggestion_Engine returns suggestions in priority order (critical > warning > info)
3. THE test suite SHALL verify that the Suggestion_Engine is deterministic (same input produces same output)
4. THE test suite SHALL verify that the Suggestion_Engine handles missing or invalid input gracefully
5. THE test suite SHALL achieve at least 90% code coverage for /lib/finance/generateDailySuggestions.ts
