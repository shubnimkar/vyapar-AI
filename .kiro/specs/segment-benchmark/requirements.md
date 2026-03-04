# Requirements Document: Segment Benchmark

## Introduction

The Segment Benchmark feature enables shop owners to compare their financial performance metrics (health score and profit margin) against similar businesses in their segment. A segment is defined by city tier and business type. This feature follows the Hybrid Intelligence Principle: all comparison logic is deterministic and offline-capable, while AI provides persona-aware explanations of the comparison results.

This feature supports the product goal of making Vyapar AI a daily habit tool by providing social proof and motivation through peer comparison.

## Glossary

- **Segment**: A grouping of businesses defined by city_tier and business_type
- **City_Tier**: Classification of city size (tier1, tier2, tier3)
- **Business_Type**: Category of business (kirana, salon, pharmacy, restaurant, other)
- **Segment_Key**: Unique identifier for a segment in format `SEGMENT#{city_tier}#{business_type}`
- **Median_Health_Score**: The middle value of health scores for all businesses in a segment
- **Median_Margin**: The middle value of profit margins for all businesses in a segment
- **Sample_Size**: Number of businesses contributing to segment statistics
- **Comparison_Engine**: Deterministic TypeScript module that compares user metrics with segment medians
- **Benchmark_Display**: UI component showing comparison results
- **Segment_Store**: DynamoDB storage for segment aggregate statistics
- **Benchmark_Cache**: localStorage cache for offline segment data access
- **Percentile_Rank**: User's position relative to segment (0-100, where 50 is median)
- **Comparison_Category**: Classification of performance (above_average, at_average, below_average)

## Requirements

### Requirement 1: Segment Definition and Storage

**User Story:** As a shop owner, I want my business to be compared with similar businesses in my area, so that I understand how I'm performing relative to my peers.

#### Acceptance Criteria

1. THE Segment_Store SHALL store segment statistics with Segment_Key as partition key
2. THE Segment_Key SHALL be formatted as `SEGMENT#{city_tier}#{business_type}`
3. THE Segment_Store SHALL store median_health_score as a number between 0 and 100
4. THE Segment_Store SHALL store median_margin as a decimal number
5. THE Segment_Store SHALL store sample_size as a positive integer
6. THE Segment_Store SHALL support city_tier values: tier1, tier2, tier3
7. THE Segment_Store SHALL support business_type values: kirana, salon, pharmacy, restaurant, other
8. THE Segment_Store SHALL include last_updated timestamp for each segment record

#### Correctness Properties

**Property 1.1 (Invariant):** For all segment records, median_health_score is between 0 and 100 inclusive
**Property 1.2 (Invariant):** For all segment records, sample_size is greater than 0
**Property 1.3 (Invariant):** For all segment records, Segment_Key matches pattern `SEGMENT#(tier1|tier2|tier3)#(kirana|salon|pharmacy|restaurant|other)`

### Requirement 2: Deterministic Comparison Logic

**User Story:** As a developer, I want all comparison calculations to be deterministic and offline-capable, so that the system follows the Hybrid Intelligence Principle and remains reliable.

#### Acceptance Criteria

1. THE Comparison_Engine SHALL be implemented as pure TypeScript functions in `/lib/finance/`
2. THE Comparison_Engine SHALL NOT depend on AI services
3. THE Comparison_Engine SHALL NOT depend on network connectivity
4. THE Comparison_Engine SHALL be fully unit testable with no side effects
5. WHEN user_health_score is provided, THE Comparison_Engine SHALL calculate health_score_percentile
6. WHEN user_margin is provided, THE Comparison_Engine SHALL calculate margin_percentile
7. THE Comparison_Engine SHALL categorize performance as above_average when percentile > 60
8. THE Comparison_Engine SHALL categorize performance as at_average when percentile is between 40 and 60 inclusive
9. THE Comparison_Engine SHALL categorize performance as below_average when percentile < 40
10. THE Comparison_Engine SHALL return comparison results without making external calls

#### Correctness Properties

**Property 2.1 (Idempotence):** Calling compareWithSegment(user_data, segment_data) multiple times with same inputs returns identical results
**Property 2.2 (Invariant):** For all valid inputs, percentile output is between 0 and 100 inclusive
**Property 2.3 (Metamorphic):** If user_score > median_score, then percentile > 50
**Property 2.4 (Metamorphic):** If user_score < median_score, then percentile < 50
**Property 2.5 (Metamorphic):** If user_score equals median_score, then percentile equals 50

### Requirement 3: Offline-First Data Access

**User Story:** As a shop owner with unreliable internet, I want to view my benchmark comparison even when offline, so that I can always access my performance insights.

#### Acceptance Criteria

1. THE Benchmark_Cache SHALL store segment data in localStorage
2. WHEN segment data is fetched from Segment_Store, THE System SHALL update Benchmark_Cache
3. WHEN network is unavailable, THE System SHALL retrieve segment data from Benchmark_Cache
4. THE Benchmark_Cache SHALL store data with key format `segment_${city_tier}_${business_type}`
5. THE Benchmark_Cache SHALL include cached_at timestamp for each entry
6. WHEN Benchmark_Cache data is older than 7 days, THE System SHALL display staleness indicator
7. THE System SHALL NOT block UI rendering when network is unavailable

#### Correctness Properties

**Property 3.1 (Round Trip):** Data written to Benchmark_Cache can be read back with identical values
**Property 3.2 (Invariant):** Benchmark_Cache always contains valid JSON-serializable data
**Property 3.3 (Error Condition):** When localStorage is full, System returns graceful error without crashing

### Requirement 4: Benchmark Display Component

**User Story:** As a shop owner, I want to see how my health score and profit margin compare to similar businesses, so that I can understand my competitive position.

#### Acceptance Criteria

1. THE Benchmark_Display SHALL show user's health score alongside segment median
2. THE Benchmark_Display SHALL show user's profit margin alongside segment median
3. THE Benchmark_Display SHALL display Comparison_Category as localized text
4. THE Benchmark_Display SHALL show visual indicator (icon or color) for above/at/below average
5. THE Benchmark_Display SHALL display sample_size for transparency
6. WHEN sample_size is less than 10, THE Benchmark_Display SHALL show "Limited data" warning
7. THE Benchmark_Display SHALL support English, Hindi, and Marathi languages
8. THE Benchmark_Display SHALL be positioned on dashboard near health score display
9. WHEN segment data is unavailable, THE Benchmark_Display SHALL show "No comparison data available" message
10. THE Benchmark_Display SHALL NOT contain business logic

#### Correctness Properties

**Property 4.1 (Invariant):** Benchmark_Display never renders with undefined or null comparison values
**Property 4.2 (Metamorphic):** If user switches language, all labels update but numeric values remain unchanged

### Requirement 5: Demo Data Seeding

**User Story:** As a hackathon demonstrator, I want pre-baked segment data available, so that I can showcase the benchmark feature without requiring real aggregate data.

#### Acceptance Criteria

1. THE System SHALL provide demo segment data for all combinations of city_tier and business_type
2. THE Demo_Data SHALL include realistic median_health_score values between 40 and 80
3. THE Demo_Data SHALL include realistic median_margin values between 0.05 and 0.30
4. THE Demo_Data SHALL include sample_size values between 50 and 500
5. THE Demo_Data SHALL be loadable via seed script or initialization function
6. THE Demo_Data SHALL be clearly marked as demo data in development environment
7. WHEN Demo_Data is used, THE System SHALL display "Demo data" indicator in UI

#### Correctness Properties

**Property 5.1 (Invariant):** All demo segment records satisfy the same validation rules as production data
**Property 5.2 (Invariant):** Demo data covers all 15 segment combinations (3 tiers × 5 business types)

### Requirement 6: AI Explanation Layer

**User Story:** As a shop owner, I want AI to explain what my benchmark comparison means, so that I can understand the implications for my business.

#### Acceptance Criteria

1. THE AI_Explanation_Service SHALL receive comparison results from Comparison_Engine
2. THE AI_Explanation_Service SHALL NOT recalculate any financial metrics
3. THE AI_Explanation_Service SHALL provide persona-aware explanations based on business_type
4. THE AI_Explanation_Service SHALL adjust explanation complexity based on explanation_mode (simple/detailed)
5. WHEN comparison_category is below_average, THE AI_Explanation_Service SHALL suggest actionable improvements
6. WHEN comparison_category is above_average, THE AI_Explanation_Service SHALL provide encouragement and sustainability tips
7. WHEN comparison_category is at_average, THE AI_Explanation_Service SHALL suggest optimization opportunities
8. THE AI_Explanation_Service SHALL support English, Hindi, and Marathi explanations
9. THE AI_Explanation_Service SHALL include segment context (city_tier, business_type) in prompts

#### Correctness Properties

**Property 6.1 (Invariant):** AI explanations never contain recalculated metric values different from Comparison_Engine output
**Property 6.2 (Error Condition):** When AI service fails, System displays comparison results without explanation

### Requirement 7: Integration with User Profile

**User Story:** As a shop owner, I want the system to automatically know my segment, so that I don't have to manually select comparison groups.

#### Acceptance Criteria

1. WHEN user profile includes city_tier and business_type, THE System SHALL automatically determine user's segment
2. THE System SHALL retrieve segment data matching user's Segment_Key
3. WHEN user updates city_tier or business_type, THE System SHALL refresh benchmark comparison
4. WHEN user profile is incomplete, THE Benchmark_Display SHALL show "Complete your profile to see benchmarks" message
5. THE System SHALL validate that city_tier is one of: tier1, tier2, tier3
6. THE System SHALL validate that business_type is one of: kirana, salon, pharmacy, restaurant, other

#### Correctness Properties

**Property 7.1 (Invariant):** User's Segment_Key is always derivable from valid profile data
**Property 7.2 (Metamorphic):** Changing only explanation_mode does not change Segment_Key

### Requirement 8: API Endpoint for Benchmark Data

**User Story:** As a frontend developer, I want a dedicated API endpoint for benchmark data, so that I can fetch comparison information efficiently.

#### Acceptance Criteria

1. THE System SHALL provide API endpoint at `/api/benchmark`
2. WHEN GET request is made to `/api/benchmark`, THE System SHALL return user's segment comparison
3. THE API SHALL return JSON with fields: user_health_score, segment_median_health_score, health_percentile, user_margin, segment_median_margin, margin_percentile, comparison_category, sample_size
4. WHEN user is not authenticated, THE API SHALL return 401 error
5. WHEN user profile is incomplete, THE API SHALL return 400 error with message "Profile incomplete"
6. WHEN segment data is not found, THE API SHALL return 404 error with message "Segment data unavailable"
7. THE API SHALL include cache headers for 1-hour client-side caching
8. THE API SHALL log requests using structured logger

#### Correctness Properties

**Property 8.1 (Invariant):** API response always includes all required fields when status is 200
**Property 8.2 (Error Condition):** API returns proper HTTP status codes for all error scenarios

### Requirement 9: Property-Based Testing

**User Story:** As a developer, I want comprehensive property-based tests for comparison logic, so that I can ensure correctness across all input ranges.

#### Acceptance Criteria

1. THE Test_Suite SHALL use fast-check library for property-based testing
2. THE Test_Suite SHALL test Comparison_Engine with randomly generated user scores (0-100)
3. THE Test_Suite SHALL test Comparison_Engine with randomly generated median scores (0-100)
4. THE Test_Suite SHALL verify percentile calculation properties across 1000+ random inputs
5. THE Test_Suite SHALL verify category assignment logic across boundary conditions
6. THE Test_Suite SHALL test that percentile is always between 0 and 100
7. THE Test_Suite SHALL test that score > median implies percentile > 50
8. THE Test_Suite SHALL test idempotence of comparison function

#### Correctness Properties

**Property 9.1 (Round Trip):** For all valid inputs, running comparison twice yields identical results
**Property 9.2 (Metamorphic):** Swapping user_score and median_score inverts percentile around 50
**Property 9.3 (Invariant):** Output percentile is always a valid number (not NaN, not Infinity)

### Requirement 10: Multi-Language Support

**User Story:** As a shop owner who speaks Hindi or Marathi, I want benchmark labels and categories in my language, so that I can understand the comparison easily.

#### Acceptance Criteria

1. THE Translation_Service SHALL provide translations for "Above Average", "At Average", "Below Average"
2. THE Translation_Service SHALL provide translations for "Health Score", "Profit Margin", "Your Business", "Segment Average"
3. THE Translation_Service SHALL provide translations for "Limited data", "No comparison data available", "Complete your profile"
4. THE System SHALL use user's language preference from profile or localStorage
5. THE System SHALL default to English when preferred language is not available
6. THE System SHALL support language codes: en, hi, mr
7. THE Translation_Service SHALL be implemented in `/lib/translations.ts`

#### Correctness Properties

**Property 10.1 (Invariant):** All translation keys have entries for en, hi, and mr
**Property 10.2 (Invariant):** Translation function never returns undefined for valid language codes

