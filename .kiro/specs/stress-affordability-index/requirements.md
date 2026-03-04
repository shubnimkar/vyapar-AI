# Requirements Document: Stress & Affordability Index

## Introduction

The Stress & Affordability Index feature provides two deterministic financial health metrics for Vyapar AI shop owners. The Stress Index measures financial pressure based on credit exposure, cash reserves, and expense volatility. The Affordability Index evaluates whether planned expenses are financially viable based on historical profit patterns. Both indices are pure, deterministic calculations that operate offline-first and provide explainable component breakdowns for AI interpretation.

## Glossary

- **Stress_Index_Calculator**: Pure TypeScript function that computes financial stress score (0-100) based on credit ratio, cash buffer, and expense volatility
- **Affordability_Index_Calculator**: Pure TypeScript function that computes affordability score (0-100) for planned expenses based on average monthly profit
- **Credit_Ratio**: Outstanding credits divided by total sales over a measurement period
- **Cash_Buffer**: Available cash divided by average monthly expenses
- **Expense_Volatility**: Standard deviation of daily expenses over a measurement period
- **Planned_Extra_Cost**: User-provided amount for a planned expense or investment
- **Avg_Monthly_Profit**: Average monthly profit calculated from historical daily entries
- **Index_Store**: DynamoDB storage for calculated indices with daily entries
- **Component_Breakdown**: Explainable sub-scores showing how each factor contributes to the final index
- **Visual_Indicator**: UI component displaying index score with color-coded severity (green/yellow/red)
- **Offline_Calculator**: Client-side calculation engine using localStorage data when network unavailable
- **Sync_Manager**: Service that synchronizes calculated indices between localStorage and DynamoDB

## Requirements

### Requirement 1: Stress Index Calculation Engine

**User Story:** As a shop owner, I want to see my financial stress level, so that I can understand if my business is under financial pressure.

#### Acceptance Criteria

1. THE Stress_Index_Calculator SHALL accept credit_ratio, cash_buffer, and expense_volatility as numeric inputs
2. THE Stress_Index_Calculator SHALL return a stress score between 0 and 100 inclusive
3. THE Stress_Index_Calculator SHALL return a Component_Breakdown showing individual contributions from credit_ratio, cash_buffer, and expense_volatility
4. WHEN credit_ratio exceeds 0.5, THE Stress_Index_Calculator SHALL increase the stress score proportionally
5. WHEN cash_buffer falls below 1.0, THE Stress_Index_Calculator SHALL increase the stress score proportionally
6. WHEN expense_volatility exceeds 0.3, THE Stress_Index_Calculator SHALL increase the stress score proportionally
7. THE Stress_Index_Calculator SHALL be a pure function with no side effects
8. THE Stress_Index_Calculator SHALL not depend on network connectivity
9. THE Stress_Index_Calculator SHALL not invoke AI services
10. FOR ALL valid inputs, THE Stress_Index_Calculator SHALL produce deterministic outputs (same inputs always produce same outputs)

#### Correctness Properties

**Property 1 (Invariant - Range Constraint):**
```typescript
// For all valid inputs, stress score must be in valid range
∀ credit_ratio, cash_buffer, expense_volatility:
  0 ≤ calculateStressIndex(credit_ratio, cash_buffer, expense_volatility) ≤ 100
```

**Property 2 (Metamorphic - Monotonicity):**
```typescript
// Increasing credit ratio should never decrease stress
∀ cr1, cr2, cb, ev where cr1 < cr2:
  calculateStressIndex(cr1, cb, ev) ≤ calculateStressIndex(cr2, cb, ev)

// Decreasing cash buffer should never decrease stress
∀ cr, cb1, cb2, ev where cb1 > cb2:
  calculateStressIndex(cr, cb1, ev) ≤ calculateStressIndex(cr, cb2, ev)

// Increasing expense volatility should never decrease stress
∀ cr, cb, ev1, ev2 where ev1 < ev2:
  calculateStressIndex(cr, cb, ev1) ≤ calculateStressIndex(cr, cb, ev2)
```

**Property 3 (Idempotence - Component Breakdown Consistency):**
```typescript
// Calling breakdown calculation multiple times produces same result
∀ inputs:
  getStressBreakdown(inputs) = getStressBreakdown(inputs)
```

**Property 4 (Invariant - Component Sum):**
```typescript
// Component contributions should sum to total score (within rounding tolerance)
∀ inputs:
  |calculateStressIndex(inputs) - sum(getStressBreakdown(inputs).components)| < 0.01
```

### Requirement 2: Affordability Index Calculation Engine

**User Story:** As a shop owner, I want to check if I can afford a planned expense, so that I can make informed financial decisions.

#### Acceptance Criteria

1. THE Affordability_Index_Calculator SHALL accept planned_extra_cost and avg_monthly_profit as numeric inputs
2. THE Affordability_Index_Calculator SHALL return an affordability score between 0 and 100 inclusive
3. THE Affordability_Index_Calculator SHALL return a Component_Breakdown showing the cost-to-profit ratio analysis
4. WHEN planned_extra_cost exceeds avg_monthly_profit, THE Affordability_Index_Calculator SHALL return a score below 50
5. WHEN planned_extra_cost is less than 0.1 times avg_monthly_profit, THE Affordability_Index_Calculator SHALL return a score above 90
6. WHEN avg_monthly_profit is zero or negative, THE Affordability_Index_Calculator SHALL return a score of 0
7. THE Affordability_Index_Calculator SHALL be a pure function with no side effects
8. THE Affordability_Index_Calculator SHALL not depend on network connectivity
9. THE Affordability_Index_Calculator SHALL not invoke AI services
10. FOR ALL valid inputs, THE Affordability_Index_Calculator SHALL produce deterministic outputs

#### Correctness Properties

**Property 1 (Invariant - Range Constraint):**
```typescript
// For all valid inputs, affordability score must be in valid range
∀ planned_cost, avg_profit:
  0 ≤ calculateAffordabilityIndex(planned_cost, avg_profit) ≤ 100
```

**Property 2 (Metamorphic - Inverse Relationship):**
```typescript
// Increasing planned cost should never increase affordability
∀ pc1, pc2, ap where pc1 < pc2:
  calculateAffordabilityIndex(pc1, ap) ≥ calculateAffordabilityIndex(pc2, ap)

// Increasing average profit should never decrease affordability
∀ pc, ap1, ap2 where ap1 < ap2:
  calculateAffordabilityIndex(pc, ap1) ≤ calculateAffordabilityIndex(pc, ap2)
```

**Property 3 (Edge Case - Zero Profit):**
```typescript
// Zero or negative profit always means unaffordable
∀ planned_cost where planned_cost > 0:
  calculateAffordabilityIndex(planned_cost, 0) = 0
  calculateAffordabilityIndex(planned_cost, -100) = 0
```

**Property 4 (Metamorphic - Scaling Invariance):**
```typescript
// Scaling both cost and profit by same factor preserves affordability
∀ planned_cost, avg_profit, scale where scale > 0:
  calculateAffordabilityIndex(planned_cost, avg_profit) = 
  calculateAffordabilityIndex(planned_cost * scale, avg_profit * scale)
```

### Requirement 3: Historical Data Aggregation

**User Story:** As a shop owner, I want the system to calculate metrics from my transaction history, so that the indices reflect my actual business performance.

#### Acceptance Criteria

1. THE Stress_Index_Calculator SHALL calculate credit_ratio from outstanding credits and total sales over the last 30 days
2. THE Stress_Index_Calculator SHALL calculate cash_buffer from current cash balance and average monthly expenses over the last 90 days
3. THE Stress_Index_Calculator SHALL calculate expense_volatility as the standard deviation of daily expenses over the last 30 days
4. THE Affordability_Index_Calculator SHALL calculate avg_monthly_profit from daily entries over the last 90 days
5. WHEN insufficient historical data exists (less than 7 days), THE System SHALL display a message indicating indices cannot be calculated
6. THE System SHALL recalculate indices when new daily entries are added
7. THE System SHALL use localStorage data for offline calculation
8. THE System SHALL use DynamoDB data when online

#### Correctness Properties

**Property 1 (Invariant - Data Sufficiency):**
```typescript
// Indices require minimum data points
∀ daily_entries where daily_entries.length < 7:
  canCalculateIndices(daily_entries) = false
```

**Property 2 (Metamorphic - Data Addition):**
```typescript
// Adding more historical data should not invalidate calculation
∀ entries1, entries2 where entries1.length ≥ 7 && entries2.length > entries1.length:
  canCalculateIndices(entries1) = true ⟹ canCalculateIndices(entries2) = true
```

### Requirement 4: Index Storage and Retrieval

**User Story:** As a shop owner, I want my stress and affordability scores saved, so that I can track changes over time.

#### Acceptance Criteria

1. THE Index_Store SHALL persist stress_index, affordability_index, and component_breakdown in DynamoDB
2. THE Index_Store SHALL use partition key format `PK = USER#{user_id}` and sort key format `SK = INDEX#{date}`
3. THE Index_Store SHALL store calculation_timestamp with each index entry
4. THE Index_Store SHALL store input_parameters used for calculation with each index entry
5. WHEN online, THE Sync_Manager SHALL save calculated indices to DynamoDB
6. WHEN offline, THE Sync_Manager SHALL save calculated indices to localStorage
7. WHEN connection is restored, THE Sync_Manager SHALL sync localStorage indices to DynamoDB
8. THE System SHALL retrieve the most recent index for dashboard display
9. THE System SHALL retrieve historical indices for trend analysis

#### Correctness Properties

**Property 1 (Round-Trip - Persistence):**
```typescript
// Saving and retrieving an index preserves its values
∀ index_data:
  retrieve(save(index_data)) = index_data
```

**Property 2 (Idempotence - Multiple Saves):**
```typescript
// Saving the same index multiple times produces same result
∀ index_data:
  save(save(index_data)) = save(index_data)
```

### Requirement 5: Dashboard Visualization

**User Story:** As a shop owner, I want to see my stress and affordability scores on the dashboard, so that I can quickly assess my financial health.

#### Acceptance Criteria

1. THE Visual_Indicator SHALL display stress_index with color coding: green (0-33), yellow (34-66), red (67-100)
2. THE Visual_Indicator SHALL display affordability_index with color coding: red (0-33), yellow (34-66), green (67-100)
3. THE Visual_Indicator SHALL display numeric score alongside color indicator
4. THE Visual_Indicator SHALL display component_breakdown when user taps or clicks the index
5. THE Visual_Indicator SHALL display calculation_timestamp showing when indices were last updated
6. WHEN indices cannot be calculated due to insufficient data, THE System SHALL display a message in English, Hindi, or Marathi based on user preference
7. THE Dashboard SHALL display both indices side by side on mobile and desktop layouts
8. THE Dashboard SHALL update indices automatically when new daily entries are added

### Requirement 6: AI Explanation Layer

**User Story:** As a shop owner, I want AI to explain what my stress and affordability scores mean, so that I can understand the implications for my business.

#### Acceptance Criteria

1. THE System SHALL provide stress_index, component_breakdown, and business_context to the AI explanation service
2. THE System SHALL provide affordability_index, planned_extra_cost, and avg_monthly_profit to the AI explanation service
3. THE AI explanation service SHALL generate persona-aware explanations based on business_type from user profile
4. THE AI explanation service SHALL adjust explanation complexity based on explanation_mode (simple or detailed)
5. THE AI explanation service SHALL provide explanations in English, Hindi, or Marathi based on user preference
6. THE AI explanation service SHALL NOT recalculate any index values
7. THE AI explanation service SHALL NOT modify component_breakdown values
8. WHEN explanation_mode is simple, THE AI SHALL provide 2-3 bullet points with no jargon
9. WHEN explanation_mode is detailed, THE AI SHALL provide 5-7 bullet points explaining financial concepts

### Requirement 7: Affordability Planning Interface

**User Story:** As a shop owner, I want to enter a planned expense amount, so that I can check if I can afford it before committing.

#### Acceptance Criteria

1. THE System SHALL provide an input field for planned_extra_cost in the user's currency
2. THE System SHALL validate that planned_extra_cost is a positive number
3. WHEN planned_extra_cost is entered, THE System SHALL immediately calculate and display the affordability_index
4. THE System SHALL display the avg_monthly_profit used in the calculation
5. THE System SHALL display affordability guidance: "Easily Affordable" (90-100), "Affordable" (70-89), "Stretch" (50-69), "Risky" (30-49), "Not Recommended" (0-29)
6. THE System SHALL allow user to save the planned expense with the affordability assessment
7. THE System SHALL store planned expenses in localStorage for offline access
8. THE System SHALL display labels and guidance in English, Hindi, or Marathi based on user preference

### Requirement 8: Offline-First Calculation

**User Story:** As a shop owner, I want to see my stress and affordability scores even without internet, so that I can make decisions anytime.

#### Acceptance Criteria

1. THE Offline_Calculator SHALL retrieve daily entries from localStorage when network is unavailable
2. THE Offline_Calculator SHALL retrieve credit entries from localStorage when network is unavailable
3. THE Offline_Calculator SHALL calculate both indices using localStorage data
4. THE Offline_Calculator SHALL store calculated indices in localStorage
5. THE System SHALL display a sync status indicator showing "Offline" when network is unavailable
6. WHEN network is restored, THE Sync_Manager SHALL sync calculated indices to DynamoDB
7. THE Sync_Manager SHALL use last-write-wins conflict resolution for index synchronization
8. THE System SHALL never block UI rendering due to network unavailability

#### Correctness Properties

**Property 1 (Confluence - Calculation Location Independence):**
```typescript
// Calculating offline vs online with same data produces same result
∀ daily_entries, credit_entries:
  calculateOffline(daily_entries, credit_entries) = 
  calculateOnline(daily_entries, credit_entries)
```

### Requirement 9: Unit Testing Requirements

**User Story:** As a developer, I want comprehensive unit tests for index calculations, so that I can ensure correctness and prevent regressions.

#### Acceptance Criteria

1. THE test suite SHALL include property-based tests using fast-check for Stress_Index_Calculator
2. THE test suite SHALL include property-based tests using fast-check for Affordability_Index_Calculator
3. THE test suite SHALL verify all correctness properties defined in Requirements 1 and 2
4. THE test suite SHALL test edge cases: zero values, negative values, very large values, boundary values
5. THE test suite SHALL test component_breakdown accuracy
6. THE test suite SHALL verify deterministic behavior with fixed inputs
7. THE test suite SHALL verify calculation performance (under 10ms per calculation)
8. THE test suite SHALL achieve 100% code coverage for calculation functions

### Requirement 10: Multi-Language Support

**User Story:** As a shop owner, I want to see index labels and guidance in my preferred language, so that I can understand the information easily.

#### Acceptance Criteria

1. THE System SHALL provide translations for "Stress Index", "Affordability Index", and all component labels in English, Hindi, and Marathi
2. THE System SHALL provide translations for affordability guidance levels in English, Hindi, and Marathi
3. THE System SHALL provide translations for insufficient data messages in English, Hindi, and Marathi
4. THE System SHALL retrieve language preference from user profile or localStorage
5. THE System SHALL apply language preference to all index-related UI elements
6. THE System SHALL apply language preference to AI explanation prompts
7. THE AI explanation service SHALL generate responses in the user's preferred language

## Non-Functional Requirements

### Performance

1. THE Stress_Index_Calculator SHALL complete calculation in under 10 milliseconds
2. THE Affordability_Index_Calculator SHALL complete calculation in under 5 milliseconds
3. THE Dashboard SHALL render indices within 100 milliseconds of data availability

### Reliability

1. THE calculation functions SHALL handle invalid inputs gracefully without throwing exceptions
2. THE System SHALL continue functioning when AI explanation service is unavailable
3. THE System SHALL provide fallback explanations when AI service fails

### Maintainability

1. THE calculation logic SHALL reside in `/lib/finance/calculateStressIndex.ts` and `/lib/finance/calculateAffordabilityIndex.ts`
2. THE calculation functions SHALL include JSDoc comments explaining the algorithm
3. THE component_breakdown SHALL include human-readable labels for each component

### Security

1. THE System SHALL validate all numeric inputs to prevent injection attacks
2. THE System SHALL sanitize planned_extra_cost input before storage
3. THE Index_Store SHALL enforce user_id isolation for all index queries
