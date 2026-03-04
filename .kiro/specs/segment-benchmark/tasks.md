# Implementation Plan: Segment Benchmark

## Overview

This implementation plan breaks down the Segment Benchmark feature into discrete coding tasks following the Hybrid Intelligence Principle. All comparison calculations are deterministic TypeScript functions with no AI involvement. The implementation follows a bottom-up approach: core functions → data management → service layer → API → UI.

## Tasks

- [ ] 1. Implement segment key formatter and validator
  - Create `/lib/finance/segmentKeyFormatter.ts` with pure functions
  - Implement `formatSegmentKey()` function accepting cityTier and businessType
  - Implement `parseSegmentKey()` function to extract components from key
  - Implement `isValidCityTier()` and `isValidBusinessType()` validators
  - Define `CityTier` and `BusinessType` TypeScript types
  - _Requirements: 1.2, 1.6, 1.7_

- [ ]* 1.1 Write unit tests for segment key formatter
  - Test all 15 valid segment key combinations (3 tiers × 5 types)
  - Test invalid formats and edge cases
  - Test round-trip (format then parse returns original values)
  - _Requirements: 1.2_

- [ ] 2. Implement percentile calculator
  - [ ] 2.1 Create core calculation function in `/lib/finance/calculatePercentile.ts`
    - Implement `calculatePercentile()` as pure function accepting userScore and segmentMedian
    - Handle edge cases: equal values (return 50), zero median, NaN inputs
    - Implement simplified percentile formula for above/below median
    - Return percentile value between 0-100
    - _Requirements: 2.5, 2.6_

  - [ ]* 2.2 Write property-based tests for percentile calculator
    - **Property 4: Range Constraint** - Percentile always between 0-100
    - **Validates: Requirements 2.5, 2.6**
    - **Property 5: Median Relationship** - Score > median implies percentile > 50, score < median implies percentile < 50, score == median implies percentile == 50
    - **Validates: Requirements 2.5, 2.6**
    - Use fast-check library with minimum 100 iterations per property
    - _Requirements: 9.1, 9.2, 9.3, 9.6, 9.7_

- [ ] 3. Implement performance categorizer
  - [ ] 3.1 Create categorization function in `/lib/finance/categorizePerformance.ts`
    - Implement `categorizePerformance()` accepting percentile value
    - Return 'above_average' for percentile > 60
    - Return 'at_average' for percentile 40-60 (inclusive)
    - Return 'below_average' for percentile < 40
    - Define `ComparisonCategory` type
    - _Requirements: 2.7, 2.8, 2.9_

  - [ ] 3.2 Implement visual indicator mapper
    - Implement `getVisualIndicator()` function
    - Return color, icon, bgColor, borderColor for each category
    - Map above_average → green, at_average → yellow, below_average → red
    - _Requirements: 4.4_

  - [ ]* 3.3 Write unit tests for categorizer
    - Test boundary values (39, 40, 60, 61)
    - Test visual indicator mapping for all categories
    - **Property 6: Category Assignment** - Verify correct category for all percentile ranges
    - **Validates: Requirements 2.7, 2.8, 2.9**
    - _Requirements: 2.7, 2.8, 2.9_

- [ ] 4. Implement comparison engine
  - [ ] 4.1 Create comparison function in `/lib/finance/compareWithSegment.ts`
    - Implement `compareWithSegment()` as pure function accepting userMetrics and segmentData
    - Calculate health score percentile and category
    - Calculate margin percentile and category (scale margin to 0-100 for calculation)
    - Return `BenchmarkComparison` with both metric comparisons and segment info
    - Include calculatedAt timestamp
    - _Requirements: 2.5, 2.6, 2.10_

  - [ ]* 4.2 Write property-based tests for comparison engine
    - **Property 7: Idempotence** - Same inputs produce identical results
    - **Validates: Requirements 2.4**
    - **Property 8: Completeness** - Result includes all required fields
    - **Validates: Requirements 2.5, 2.6**
    - Test with various user metrics and segment data combinations
    - _Requirements: 9.1, 9.4_

- [ ] 5. Add type definitions to `/lib/types.ts`
  - Add `CityTier` type ('tier1' | 'tier2' | 'tier3')
  - Add `BusinessType` type ('kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other')
  - Add `ComparisonCategory` type
  - Add `SegmentData` interface
  - Add `CachedSegmentData` interface
  - Add `UserMetrics` interface
  - Add `MetricComparison` interface
  - Add `BenchmarkComparison` interface
  - Add `VisualIndicator` interface
  - Extend `UserProfile` with city_tier and business_type fields
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1_

- [ ] 6. Checkpoint - Ensure core calculation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement segment cache manager
  - [ ] 7.1 Create cache manager class in `/lib/segmentCacheManager.ts`
    - Implement `SegmentCacheManager` class
    - Implement `saveToCache()` method storing segment data in localStorage
    - Implement `getFromCache()` method retrieving segment data
    - Implement `isCacheStale()` method checking if data older than 7 days
    - Implement `clearCache()` method removing all segment cache entries
    - Use cache key format: `vyapar_segment_{cityTier}_{businessType}`
    - Handle localStorage quota exceeded errors gracefully
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 7.2 Write unit tests for cache manager
    - **Property 9: Round-Trip** - Save and retrieve preserves data
    - **Validates: Requirements 3.2**
    - **Property 10: Cache Key Format** - Keys match expected pattern
    - **Validates: Requirements 3.4**
    - **Property 12: Staleness Detection** - Correctly identifies stale data (> 7 days)
    - **Validates: Requirements 3.6**
    - Test cache hit, cache miss, corrupted data
    - Test quota exceeded error handling
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 8. Implement DynamoDB segment store
  - [ ] 8.1 Create segment store class in `/lib/segmentStore.ts`
    - Implement `SegmentStore` class with DynamoDB client
    - Implement `getSegmentData()` method with PK=SEGMENT#{tier}#{type}, SK=METADATA
    - Implement `saveSegmentData()` method for storing segment statistics
    - Use single-table design with vyapar-ai-data table
    - Handle DynamoDB errors gracefully (return null on failure)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8_

  - [ ]* 8.2 Write unit tests for segment store
    - Test successful retrieval with mocked DynamoDB client
    - Test not found scenario
    - Test network error handling
    - Test successful save
    - **Property 2: Segment Data Invariants** - Validate all segment data fields
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.8**
    - _Requirements: 1.1_

- [ ] 9. Implement demo segment data generator
  - [ ] 9.1 Create demo data generator in `/lib/demoSegmentData.ts`
    - Implement `generateDemoSegmentData()` function
    - Generate realistic data for all 15 segment combinations
    - Use health score ranges: tier1 [60-80], tier2 [50-70], tier3 [40-60]
    - Use margin ranges by business type: kirana [0.15-0.25], salon [0.20-0.30], pharmacy [0.10-0.20], restaurant [0.05-0.15], other [0.10-0.25]
    - Use sample sizes: tier1 [200-500], tier2 [100-300], tier3 [50-150]
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 9.2 Create seed script for demo data
    - Implement `seedDemoData()` async function
    - Save all demo segments to DynamoDB
    - Log progress and errors
    - _Requirements: 5.5_

  - [ ] 9.3 Create cache loader for offline demo
    - Implement `loadDemoDataToCache()` function
    - Load all demo segments to localStorage cache
    - _Requirements: 5.7_

  - [ ]* 9.4 Write unit tests for demo data
    - **Property 18: Coverage Completeness** - All 15 combinations exist
    - **Validates: Requirements 5.1**
    - **Property 19: Data Validity** - Values within expected ranges
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 10. Checkpoint - Ensure data management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement benchmark service
  - [ ] 11.1 Create service class in `/lib/benchmarkService.ts`
    - Implement `BenchmarkService` class
    - Implement `getUserSegment()` method extracting segment from user profile
    - Implement `getSegmentData()` method with cache-first strategy
    - Implement `getBenchmarkComparison()` method orchestrating full workflow
    - Handle offline scenario (use cached data even if stale)
    - Handle profile incomplete scenario (return null)
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 11.2 Write integration tests for service
    - Test complete flow with valid profile and data
    - Test profile incomplete scenario
    - Test segment data not found scenario
    - Test offline scenario (cache hit with stale data)
    - **Property 20: User Segment Derivation** - Valid profile returns correct segment
    - **Validates: Requirements 7.1**
    - **Property 21: Segment Data Consistency** - Retrieved data matches requested key
    - **Validates: Requirements 7.2**
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12. Implement API endpoint
  - [ ] 12.1 Create benchmark endpoint at `/app/api/benchmark/route.ts`
    - Implement GET handler
    - Authenticate user via session
    - Get user profile and validate completeness
    - Calculate user metrics (health score, profit margin) from daily entries
    - Call benchmark service to get comparison
    - Return structured JSON response
    - Add Cache-Control header (1 hour)
    - _Requirements: 8.1, 8.2, 8.3, 8.7_

  - [ ] 12.2 Add error handling to API
    - Return 401 for unauthenticated requests
    - Return 400 for incomplete profile
    - Return 400 for no daily entries
    - Return 404 for segment data not found
    - Return 500 for internal errors
    - Use structured error format with success, code, message
    - Log all errors with structured logger
    - _Requirements: 8.4, 8.5, 8.6, 8.8_

  - [ ]* 12.3 Write API integration tests
    - Test authenticated request with complete profile
    - Test unauthenticated request (401)
    - Test incomplete profile (400)
    - Test no daily entries (400)
    - Test segment not found (404)
    - **Property 23: Response Completeness** - Success response includes all required fields
    - **Validates: Requirements 8.3**
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 13. Add translation keys to `/lib/translations.ts`
  - Add benchmark title, labels, and field names (English, Hindi, Marathi)
  - Add category labels: above_average, at_average, below_average (English, Hindi, Marathi)
  - Add messages: noData, limitedData, staleData (English, Hindi, Marathi)
  - Add sampleSize message with count placeholder (English, Hindi, Marathi)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7_

- [ ] 14. Implement benchmark display component
  - [ ] 14.1 Create display component at `/components/BenchmarkDisplay.tsx`
    - Accept comparison, language, isLoading, error props
    - Display loading state with skeleton
    - Display error state with message
    - Display no data state with "Complete your profile" message
    - Display health score comparison with visual indicator
    - Display profit margin comparison with visual indicator
    - Show limited data warning when sample_size < 10
    - Show stale data indicator when data > 7 days old
    - Display sample size info
    - Use translation keys for all labels
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [ ]* 14.2 Write component tests
    - Test rendering with valid comparison data
    - Test loading state
    - Test error state
    - Test no data state
    - Test limited data warning display (sample_size < 10)
    - Test stale data indicator display (> 7 days)
    - Test visual indicator mapping for all categories
    - **Property 13: Display Completeness** - All required fields rendered
    - **Validates: Requirements 4.1, 4.2, 4.5**
    - **Property 14: Visual Indicator Mapping** - Correct colors/icons for categories
    - **Validates: Requirements 4.4**
    - **Property 15: Limited Data Warning** - Warning shown when sample_size < 10
    - **Validates: Requirements 4.6**
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 15. Integrate benchmark into dashboard
  - [ ] 15.1 Add benchmark display to main page at `/app/page.tsx`
    - Import and render `BenchmarkDisplay` component
    - Position near health score display
    - Fetch comparison data from `/api/benchmark` endpoint
    - Handle loading and error states
    - Pass user language preference
    - _Requirements: 4.8_

  - [ ] 15.2 Update profile setup to include segment fields
    - Add city_tier dropdown to profile setup form
    - Add business_type dropdown to profile setup form
    - Validate selections before saving
    - Trigger benchmark refresh when profile updated
    - _Requirements: 7.1, 7.3, 7.5, 7.6_

- [ ] 16. Implement AI explanation integration (optional)
  - [ ] 16.1 Create prompt builder in `/lib/ai/benchmarkPromptBuilder.ts`
    - Implement `buildBenchmarkExplanationPrompt()` function
    - Include comparison results and user profile context
    - Add persona context (business_type, city_tier)
    - Add explanation mode instruction (simple/detailed)
    - Add language instruction (English, Hindi, Marathi)
    - Explicitly instruct AI to NOT recalculate values
    - Provide actionable suggestions based on category
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [ ] 16.2 Add "Explain" button to benchmark display
    - Add button to fetch AI explanation
    - Call AI explanation endpoint with comparison data
    - Display explanation in expandable section
    - Handle AI service failures gracefully (show comparison without explanation)
    - _Requirements: 6.1, 6.2_

  - [ ]* 16.3 Write tests for AI integration
    - **Property 24: Metric Preservation** - AI doesn't modify numeric values
    - **Validates: Requirements 6.2**
    - **Property 25: Context Inclusion** - Prompt includes city_tier and business_type
    - **Validates: Requirements 6.9**
    - Test prompt building with various profiles and comparisons
    - Test explanation display with and without AI response
    - _Requirements: 6.1, 6.2, 6.9_

- [ ] 17. Seed demo data and test demo flow
  - [ ] 17.1 Run seed script to populate DynamoDB
    - Execute `seedDemoData()` function
    - Verify all 15 segments created in DynamoDB
    - Check data validity (ranges, sample sizes)
    - _Requirements: 5.5, 5.6_

  - [ ] 17.2 Load demo data to cache for offline demo
    - Execute `loadDemoDataToCache()` function
    - Verify all segments cached in localStorage
    - Test offline benchmark display with cached data
    - _Requirements: 5.7_

  - [ ] 17.3 Test complete demo flow
    - Create test user with complete profile (city_tier, business_type)
    - Add daily entries to calculate health score and margin
    - View benchmark comparison on dashboard
    - Verify correct segment data retrieved
    - Verify correct percentile and category displayed
    - Test with different profiles (different tiers and types)
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2_

- [ ] 18. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 19. Property-based test validation
  - Verify all 25 correctness properties are tested
  - Ensure minimum 100 iterations per property test
  - Check test tags reference correct property numbers
  - Validate property test coverage matches design document
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property-based tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All comparison calculations are pure TypeScript functions with no AI or network dependencies
- AI is used ONLY for explanation, never for calculation
- Offline-first architecture ensures comparisons work without network connectivity
- Follow vyapar-rules.md constraints: deterministic core, no business logic in components, single-table DynamoDB design
- Demo data is pre-baked for hackathon presentation (no real aggregate data collection needed)
