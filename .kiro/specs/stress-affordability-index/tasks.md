# Implementation Plan: Stress & Affordability Index

## Overview

This implementation plan breaks down the Stress & Affordability Index feature into discrete coding tasks following the Hybrid Intelligence Principle. All financial calculations are deterministic TypeScript functions with no AI involvement. The implementation follows a bottom-up approach: core calculations → data aggregation → storage → API → AI integration → UI.

## Tasks

- [x] 1. Implement statistical utility functions
  - Create `/lib/finance/statisticsUtils.ts` with pure functions
  - Implement `mean()` function for calculating average of number arrays
  - Implement `standardDeviation()` function for calculating standard deviation
  - Implement `sum()` function for summing number arrays
  - Implement `filterEntriesByDateRange()` function for filtering entries by date
  - _Requirements: 1.7, 1.10, 2.7, 2.10_

- [x] 1.1 Write unit tests for statistical utilities
  - Test `mean()` with various inputs including edge cases (empty array, single value)
  - Test `standardDeviation()` with known datasets
  - Test `sum()` with positive, negative, and zero values
  - Test `filterEntriesByDateRange()` with various date ranges
  - _Requirements: 9.4_

- [x] 2. Implement Stress Index calculator
  - [x] 2.1 Create core calculation function in `/lib/finance/calculateStressIndex.ts`
    - Implement `calculateStressIndex()` as pure function accepting creditRatio, cashBuffer, expenseVolatility
    - Implement credit ratio scoring algorithm (0-40 points based on thresholds)
    - Implement cash buffer scoring algorithm (0-35 points based on thresholds)
    - Implement expense volatility scoring algorithm (0-25 points based on thresholds)
    - Return `StressIndexResult` with score, breakdown, timestamp, and input parameters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 2.2 Add input validation for Stress Index
    - Implement `validateStressInputs()` function
    - Check for NaN, undefined, and negative values
    - Return structured validation result with error messages
    - _Requirements: 1.1, 9.4_

  - [x] 2.3 Write unit tests for Stress Index calculator
    - Test ideal conditions (zero stress scenario)
    - Test worst conditions (maximum stress scenario)
    - Test boundary values at each threshold (0.5, 0.7 for credit ratio, etc.)
    - Test zero values for each input parameter
    - Test component sum equals total score
    - Test timestamp and input parameter storage
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

  - [x] 2.4 Write property-based tests for Stress Index
    - **Property 1: Range Constraint** - Score always between 0-100
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: Monotonicity** - Increasing credit ratio increases stress, decreasing cash buffer increases stress, increasing volatility increases stress
    - **Validates: Requirements 1.4, 1.5, 1.6**
    - **Property 3: Component Sum Consistency** - Component scores sum to total score (within 0.01 tolerance)
    - **Validates: Requirements 1.3**
    - **Property 4: Determinism** - Same inputs produce identical results
    - **Validates: Requirements 1.7, 1.10**
    - Use fast-check library with minimum 100 iterations per property
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 3. Implement Affordability Index calculator
  - [x] 3.1 Create core calculation function in `/lib/finance/calculateAffordabilityIndex.ts`
    - Implement `calculateAffordabilityIndex()` as pure function accepting plannedCost, avgMonthlyProfit
    - Calculate cost-to-profit ratio
    - Implement scoring algorithm based on ratio thresholds
    - Assign affordability category based on score ranges
    - Handle edge cases (zero/negative profit, zero cost)
    - Return `AffordabilityIndexResult` with score, breakdown, timestamp, and input parameters
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Add input validation for Affordability Index
    - Implement `validateAffordabilityInputs()` function
    - Check for NaN, undefined values
    - Validate plannedCost is positive
    - Return structured validation result with error messages
    - _Requirements: 2.1, 7.2, 9.4_

  - [x] 3.3 Write unit tests for Affordability Index calculator
    - Test very small expense (score = 100)
    - Test expense exceeding profit (score < 50)
    - Test zero profit edge case (score = 0)
    - Test negative profit edge case (score = 0)
    - Test correct cost-to-profit ratio calculation
    - Test category assignment for each score range
    - Test timestamp and input parameter storage
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

  - [x] 3.4 Write property-based tests for Affordability Index
    - **Property 5: Range Constraint** - Score always between 0-100
    - **Validates: Requirements 2.1, 2.2**
    - **Property 6: Inverse Relationship** - Increasing cost decreases affordability, increasing profit increases affordability
    - **Validates: Requirements 2.4, 2.5**
    - **Property 7: Zero Profit Edge Case** - Zero or negative profit always returns score of 0
    - **Validates: Requirements 2.6**
    - **Property 8: Scaling Invariance** - Scaling both inputs by same factor preserves score
    - **Validates: Requirements 2.1, 2.2**
    - **Property 9: Threshold Behavior** - Cost > profit gives score < 50, cost < 10% profit gives score > 90
    - **Validates: Requirements 2.4, 2.5**
    - **Property 10: Determinism** - Same inputs produce identical results
    - **Validates: Requirements 2.7, 2.10**
    - Use fast-check library with minimum 100 iterations per property
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 4. Checkpoint - Ensure core calculation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement data aggregation functions
  - [x] 5.1 Create Stress Index input aggregation in `/lib/finance/aggregateStressInputs.ts`
    - Implement `aggregateStressInputs()` function accepting daily entries and credit entries
    - Calculate credit ratio from last 30 days (outstanding credits / total sales)
    - Calculate cash buffer from last 90 days (latest cash / avg monthly expenses)
    - Calculate expense volatility from last 30 days (stdDev / mean of daily expenses)
    - Return null if insufficient data (< 7 days)
    - Return `StressIndexInputs` with calculated values and metadata
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 5.2 Create Affordability Index input aggregation in `/lib/finance/aggregateAffordabilityInputs.ts`
    - Implement `aggregateAffordabilityInputs()` function accepting daily entries
    - Calculate average monthly profit from last 90 days
    - Return null if insufficient data (< 7 days)
    - Return `AffordabilityIndexInputs` with calculated values and metadata
    - _Requirements: 3.4, 3.5_

  - [x] 5.3 Write unit tests for data aggregation
    - Test insufficient data returns null (< 7 days)
    - Test credit ratio calculation with mixed paid/unpaid credits
    - Test cash buffer calculation with 90 days of data
    - Test expense volatility calculation with varying expenses
    - Test zero sales edge case (credit ratio = 0)
    - Test only unpaid credits are counted
    - Test average monthly profit calculation
    - _Requirements: 9.4, 9.5_

- [x] 6. Add type definitions to `/lib/types.ts`
  - Add `StressComponentBreakdown` interface
  - Add `StressIndexResult` interface
  - Add `AffordabilityComponentBreakdown` interface
  - Add `AffordabilityIndexResult` interface
  - Add `IndexData` interface for storage
  - Add `PlannedExpense` interface
  - Add `StressColor` and `AffordabilityColor` types
  - Add `IndexVisualConfig` interface
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.1_

- [x] 7. Implement storage and sync manager
  - [x] 7.1 Create localStorage functions in `/lib/index-sync.ts`
    - Implement `saveIndexToLocalStorage()` function
    - Implement `getLatestIndexFromLocalStorage()` function
    - Implement `getHistoricalIndicesFromLocalStorage()` function
    - Implement automatic pruning of entries older than 90 days
    - _Requirements: 4.6, 8.1, 8.2, 8.3, 8.4_

  - [x] 7.2 Create DynamoDB functions in `/lib/index-sync.ts`
    - Implement `saveIndexToDynamoDB()` function using single-table design
    - Use partition key `PK = USER#{user_id}` and sort key `SK = INDEX#{date}`
    - Implement `getLatestIndexFromDynamoDB()` function with descending sort
    - Implement `getHistoricalIndicesFromDynamoDB()` function with date range query
    - _Requirements: 4.1, 4.2, 4.3, 4.8, 4.9_

  - [x] 7.3 Implement sync manager with conflict resolution
    - Create `IndexSyncManager` class
    - Implement `saveIndex()` method (localStorage always, DynamoDB when online)
    - Implement `getLatestIndex()` method (try localStorage first, fallback to DynamoDB)
    - Implement `syncPendingIndices()` method with last-write-wins resolution
    - Implement `isOnline()` method for network detection
    - _Requirements: 4.5, 4.6, 4.7, 8.5, 8.6, 8.7, 8.8_

  - [x] 7.4 Write integration tests for storage and sync
    - **Property 16: Round-Trip Persistence** - Saving and retrieving preserves all fields
    - **Validates: Requirements 4.1, 4.3, 4.4**
    - **Property 17: Latest Index Retrieval** - Returns entry with most recent date
    - **Validates: Requirements 4.8**
    - **Property 18: Historical Index Ordering** - Returns entries in descending date order
    - **Validates: Requirements 4.9**
    - Test offline calculation flow (localStorage only)
    - Test online sync flow (localStorage + DynamoDB)
    - Test conflict resolution (last-write-wins)
    - _Requirements: 9.4_

- [x] 8. Checkpoint - Ensure storage and sync tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement API routes
  - [x] 9.1 Create calculate indices endpoint at `/app/api/indices/calculate/route.ts`
    - Implement POST handler accepting userId, plannedCost (optional), language
    - Load daily entries and credit entries via sync manager
    - Call `aggregateStressInputs()` and validate sufficient data
    - Call `calculateStressIndex()` with aggregated inputs
    - If plannedCost provided, call `aggregateAffordabilityInputs()` and `calculateAffordabilityIndex()`
    - Create `IndexData` object with results
    - Save via sync manager (handles online/offline)
    - Return structured JSON response with success/error format
    - _Requirements: 3.6, 4.5, 8.3_

  - [x] 9.2 Create get latest indices endpoint at `/app/api/indices/latest/route.ts`
    - Implement GET handler accepting userId query parameter
    - Validate userId is provided
    - Call sync manager `getLatestIndex()` method
    - Return structured JSON response with index data or 404 if not found
    - _Requirements: 4.8, 5.8_

  - [x] 9.3 Add error handling to API routes
    - Return 400 for missing/invalid parameters
    - Return 404 for no data found
    - Return 500 for calculation errors
    - Use structured error format: `{ success: false, code: string, message: string }`
    - Include localized error messages based on language parameter
    - Never expose stack traces to client
    - _Requirements: 3.5, 5.6_

- [x] 10. Implement AI integration
  - [x] 10.1 Create prompt builder in `/lib/ai/prompts.ts`
    - Implement `buildIndexExplanationPrompt()` function
    - Include stress index score and breakdown in prompt
    - Include affordability index if provided
    - Add persona context based on business type (kirana, salon, pharmacy, restaurant)
    - Add explanation mode instruction (simple: 2-3 bullets, detailed: 5-7 bullets)
    - Add language instruction (English, Hindi, Marathi)
    - Explicitly instruct AI to NOT recalculate any values
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 10.2 Create AI explanation endpoint at `/app/api/indices/explain/route.ts`
    - Implement POST handler accepting stressIndex, affordabilityIndex (optional), userProfile, language
    - Validate stressIndex is provided
    - Call `buildIndexExplanationPrompt()` with all parameters
    - Invoke Bedrock model via centralized client
    - Return structured JSON response with explanation and original index data
    - Handle AI service failures gracefully with fallback message
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Add translation keys to `/lib/translations.ts`
  - Add stress index labels (English, Hindi, Marathi)
  - Add affordability index labels (English, Hindi, Marathi)
  - Add component breakdown labels (English, Hindi, Marathi)
  - Add affordability category labels (English, Hindi, Marathi)
  - Add affordability guidance messages (English, Hindi, Marathi)
  - Add insufficient data messages (English, Hindi, Marathi)
  - Add sync status messages (English, Hindi, Marathi)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 12. Implement UI components
  - [x] 12.1 Create Stress Index display component at `/components/StressIndexDisplay.tsx`
    - Accept `stressIndex` and `language` props
    - Display score with color coding (green: 0-33, yellow: 34-66, red: 67-100)
    - Implement toggle for component breakdown display
    - Display credit ratio, cash buffer, and expense volatility scores
    - Display calculation timestamp
    - Use translation keys for all labels
    - **Property 19: Stress Color Coding** - Verify correct color mapping
    - **Validates: Requirements 5.1**
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 10.1_

  - [x] 12.2 Create Affordability planner component at `/components/AffordabilityPlanner.tsx`
    - Accept `userId`, `language`, and `onCalculate` callback props
    - Implement input field for planned expense amount
    - Validate input is positive number
    - Call `onCalculate` callback when user clicks "Check Affordability"
    - Display affordability score with color coding (red: 0-33, yellow: 34-66, green: 67-100)
    - Display affordability category and guidance message
    - Display cost-to-profit ratio and average monthly profit
    - Show loading state during calculation
    - Handle errors gracefully with user-friendly messages
    - Use translation keys for all labels
    - **Property 20: Affordability Color Coding** - Verify correct color mapping
    - **Validates: Requirements 5.2**
    - **Property 21: Affordability Guidance Mapping** - Verify correct category assignment
    - **Validates: Requirements 7.5**
    - **Property 22: Positive Cost Validation** - Reject non-positive values
    - **Validates: Requirements 7.2**
    - _Requirements: 5.2, 5.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.8, 10.1_

  - [x] 12.3 Create combined indices dashboard component at `/components/IndicesDashboard.tsx`
    - Display stress index and affordability planner side by side
    - Implement "Explain" button that calls AI explanation endpoint
    - Display AI explanation in modal or expandable section
    - Show sync status indicator (online/offline/syncing)
    - Handle insufficient data scenario with helpful message
    - Implement responsive layout for mobile and desktop
    - _Requirements: 5.6, 5.7, 5.8, 6.1, 8.5_

- [x] 13. Integrate indices into main dashboard
  - [x] 13.1 Add indices dashboard to main page at `/app/page.tsx`
    - Import and render `IndicesDashboard` component
    - Position below health score display
    - Pass user profile and language preferences
    - _Requirements: 5.7_

  - [x] 13.2 Implement automatic recalculation on data changes
    - Add recalculation trigger when new daily entry is added
    - Add recalculation trigger when credit entry is added/updated
    - Add recalculation trigger when credit is marked as paid
    - Call `/api/indices/calculate` endpoint after data changes
    - Update dashboard display with new index values
    - **Property 23: Calculation Location Independence** - Offline and online calculations produce same results
    - **Validates: Requirements 8.3**
    - _Requirements: 3.6, 5.8_

  - [x] 13.3 Add sync status indicators
    - Display "Offline" indicator when network unavailable
    - Display "Syncing" indicator during sync operations
    - Display "Synced" indicator when sync completes successfully
    - Display error message if sync fails (with retry option)
    - Use translation keys for all status messages
    - _Requirements: 8.5, 8.6, 10.7_

- [x] 14. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Performance validation
  - Verify stress index calculation completes in < 10ms
  - Verify affordability index calculation completes in < 5ms
  - Verify dashboard renders with indices in < 100ms
  - Verify aggregation functions complete in < 50ms for 90 days of data
  - _Requirements: 9.7_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property-based tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All financial calculations are pure TypeScript functions with no AI or network dependencies
- AI is used ONLY for explanation, never for calculation
- Offline-first architecture ensures calculations work without network connectivity
- Follow vyapar-rules.md constraints: deterministic core, no business logic in components, single-table DynamoDB design
