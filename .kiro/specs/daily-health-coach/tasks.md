# Implementation Plan: Daily Health Coach

## Overview

This plan implements a deterministic, rule-based suggestion engine that generates 1-2 actionable daily financial health suggestions for small shop owners. The implementation follows the Hybrid Intelligence principle with a pure TypeScript core, offline-first architecture, and multi-language support (English, Hindi, Marathi).

## Tasks

- [ ] 1. Set up core types and translation keys
  - Create `SuggestionContext` and `DailySuggestion` interfaces in `/lib/types.ts`
  - Add all suggestion translation keys to `/lib/translations.ts` (high_credit, margin_drop, low_cash, healthy_state)
  - Add UI label translation keys (todaysSuggestion, dismiss, error messages)
  - _Requirements: 1.4, 9.3, 9.4_

- [ ] 2. Implement rule evaluation functions
  - [ ] 2.1 Create `/lib/finance/generateDailySuggestions.ts` with rule evaluation functions
    - Implement `evaluateHighCreditRule()` - triggers when credit ratio > 40%
    - Implement `evaluateMarginDropRule()` - triggers when margin < 70% of 30-day average
    - Implement `evaluateLowCashBufferRule()` - triggers when cash buffer < 7 days
    - Implement `evaluateHealthyStateRule()` - triggers when health score >= 70 and no other issues
    - Include optimization tip rotation logic for healthy state
    - _Requirements: 2.1, 2.5, 3.1, 3.5, 4.1, 4.5, 5.1, 5.5_
  
  - [ ]* 2.2 Write property test for rule triggering conditions
    - **Property 1: Suggestion Generation Triggers on Rule Conditions**
    - **Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**
  
  - [ ]* 2.3 Write unit tests for individual rule functions
    - Test high credit rule with various credit ratios
    - Test margin drop rule with various margin values
    - Test low cash buffer rule with various buffer days
    - Test healthy state rule with and without other suggestions
    - Test rule skipping with zero/null values
    - _Requirements: 2.1, 2.5, 3.1, 3.5, 4.1, 4.5, 5.1_

- [ ] 3. Implement main suggestion generation function
  - [ ] 3.1 Implement `generateDailySuggestions()` main function
    - Call all rule evaluation functions in sequence
    - Collect non-null suggestions into array
    - Sort suggestions by severity (critical > warning > info)
    - Return sorted array
    - Add error handling for individual rule failures
    - _Requirements: 1.1, 1.2, 1.5, 1.6_
  
  - [ ]* 3.2 Write property test for severity-based ordering
    - **Property 2: Severity-Based Priority Ordering**
    - **Validates: Requirements 1.2**
  
  - [ ]* 3.3 Write property test for deterministic behavior
    - **Property 4: Deterministic Suggestion Generation**
    - **Validates: Requirements 1.5, 1.6**
  
  - [ ]* 3.4 Write property test for suggestion structure completeness
    - **Property 3: Suggestion Structure Completeness**
    - **Validates: Requirements 1.4**
  
  - [ ]* 3.5 Write property test for suggestion ID uniqueness
    - **Property 10: Suggestion ID Uniqueness**
    - **Validates: Requirements 6.5**

- [ ] 4. Checkpoint - Ensure core engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement suggestion context builder
  - [ ] 5.1 Create `/lib/finance/suggestionContext.ts` with context building logic
    - Implement `buildSuggestionContext()` function
    - Calculate average margin from last 30 days of entries
    - Calculate cash buffer days from current cash and average daily expenses
    - Calculate total outstanding credit from unpaid credit entries
    - Calculate health score using existing `calculateHealthScore()` function
    - Handle missing or insufficient historical data gracefully
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ]* 5.2 Write unit tests for context builder
    - Test with sufficient historical data (30+ days)
    - Test with insufficient historical data (< 7 days)
    - Test with no historical data
    - Test with missing cash values
    - Test credit calculation with mixed paid/unpaid entries
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 6. Integrate suggestion generation into daily entry service
  - [ ] 6.1 Update `/lib/daily-entry-service.ts` or create if missing
    - Add suggestion generation to `saveDailyEntry()` function
    - Call `buildSuggestionContext()` with current entry, historical entries, and credits
    - Call `generateDailySuggestions()` with built context
    - Store suggestions in `entry.suggestions` array
    - Wrap suggestion generation in try-catch to prevent blocking saves
    - Log errors but continue with empty suggestions array on failure
    - _Requirements: 6.1, 6.2, 11.1, 11.2, 11.4, 11.5_
  
  - [ ] 6.2 Update DailyEntry interface to include suggestions field
    - Add `suggestions?: DailySuggestion[]` to DailyEntry interface in `/lib/types.ts`
    - _Requirements: 6.4_
  
  - [ ]* 6.3 Write integration test for complete save flow
    - Test entry save triggers suggestion generation
    - Test entry update replaces previous suggestions
    - Test suggestion generation failure doesn't block save
    - _Requirements: 11.1, 11.2, 11.4, 11.5_

- [ ] 7. Implement localStorage persistence for suggestions
  - [ ] 7.1 Update daily entry sync functions to persist suggestions
    - Ensure `saveDailyEntryToLocalStorage()` in `/lib/daily-entry-sync.ts` saves suggestions array
    - Ensure `loadDailyEntriesFromLocalStorage()` loads suggestions array
    - Handle QuotaExceededError with cleanup of old entries
    - _Requirements: 6.2, 6.3, 10.1, 10.2, 10.3_
  
  - [ ]* 7.2 Write unit tests for localStorage persistence
    - Test suggestions are saved with daily entry
    - Test suggestions are loaded with daily entry
    - Test QuotaExceededError handling
    - _Requirements: 6.2, 6.3_

- [ ] 8. Implement DynamoDB sync for suggestions
  - [ ] 8.1 Update DynamoDB sync functions to sync suggestions
    - Ensure `syncDailyEntryToDynamoDB()` in `/lib/daily-entry-sync.ts` includes suggestions in item
    - Ensure suggestions are stored in DAILY_ENTRY items with PK=USER#{user_id}, SK=DAILY_ENTRY#{date}
    - Add retry logic for failed syncs
    - _Requirements: 6.3_
  
  - [ ]* 8.2 Write integration test for DynamoDB sync
    - Test suggestions sync to DynamoDB when online
    - Test sync failure handling and retry
    - _Requirements: 6.3_

- [ ] 9. Checkpoint - Ensure data persistence tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement dismiss functionality
  - [ ] 10.1 Create dismiss handler function
    - Implement `dismissSuggestion()` function in `/lib/daily-entry-service.ts`
    - Load daily entry for specified date
    - Find suggestion by ID and set `dismissed_at` to current ISO timestamp
    - Save updated entry to localStorage
    - Sync to DynamoDB if online
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [ ]* 10.2 Write unit tests for dismiss functionality
    - Test dismissed_at timestamp is set correctly
    - Test ISO 8601 format validation
    - Test localStorage persistence of dismissed state
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [ ]* 10.3 Write property test for ISO 8601 timestamp format
    - **Property 12: ISO 8601 Timestamp Format**
    - **Validates: Requirements 7.5**

- [ ] 11. Implement DailySuggestionCard UI component
  - [ ] 11.1 Create `/components/DailySuggestionCard.tsx`
    - Filter suggestions to show only undismissed (dismissed_at is null/undefined)
    - Sort undismissed suggestions by severity (critical > warning > info)
    - Display highest priority suggestion
    - Show severity icon (⚠️ for critical, ⚡ for warning, 💡 for info)
    - Apply severity-based styling (red for critical, orange for warning, blue for info)
    - Show localized title and description
    - Include dismiss button with click handler
    - Return null if no undismissed suggestions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 11.2 Write property test for dismissed suggestion filtering
    - **Property 11: Dismissed Suggestion Filtering**
    - **Validates: Requirements 7.4**
  
  - [ ]* 11.3 Write property test for display priority by severity
    - **Property 13: Display Priority by Severity**
    - **Validates: Requirements 8.2**
  
  - [ ]* 11.4 Write unit tests for UI component
    - Test component renders with suggestions
    - Test component returns null with no undismissed suggestions
    - Test severity styling is applied correctly
    - Test dismiss button triggers handler
    - _Requirements: 8.1, 8.2, 8.5_

- [ ] 12. Add accessibility features to DailySuggestionCard
  - [ ] 12.1 Implement accessibility attributes
    - Add ARIA labels to dismiss button
    - Ensure color contrast ratio >= 4.5:1 for all text
    - Add keyboard navigation support (Tab, Enter, Escape)
    - Use both color and icons for severity indicators
    - Add screen reader announcements for new suggestions
    - _Requirements: 13.5_
  
  - [ ]* 12.2 Write accessibility tests
    - Test ARIA labels are present
    - Test keyboard navigation works
    - Test color contrast meets WCAG 2.1 AA
    - _Requirements: 13.5_

- [ ] 13. Integrate DailySuggestionCard into Dashboard
  - [ ] 13.1 Update Dashboard page to display DailySuggestionCard
    - Import DailySuggestionCard component
    - Load today's daily entry with suggestions
    - Pass suggestions and dismiss handler to component
    - Position card prominently on dashboard
    - _Requirements: 8.1_
  
  - [ ]* 13.2 Write integration test for dashboard display
    - Test card appears on dashboard with suggestions
    - Test card disappears after all suggestions dismissed
    - _Requirements: 8.1_

- [ ] 14. Implement translation and localization
  - [ ] 14.1 Add translation interpolation for dynamic values
    - Update translation helper to support {ratio}, {current}, {avg}, {days} placeholders
    - Implement value interpolation in suggestion descriptions
    - Format percentages and numbers appropriately for each language
    - _Requirements: 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 9.1, 9.2, 9.5_
  
  - [ ]* 14.2 Write property test for language-specific translation
    - **Property 14: Language-Specific Translation**
    - **Validates: Requirements 9.2**
  
  - [ ]* 14.3 Write property test for translation fallback
    - **Property 15: Translation Fallback to English**
    - **Validates: Requirements 9.4**
  
  - [ ]* 14.4 Write unit tests for translation
    - Test Hindi translations are used when language is 'hi'
    - Test Marathi translations are used when language is 'mr'
    - Test English fallback for missing keys
    - Test value interpolation works correctly
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [ ] 15. Checkpoint - Ensure all UI and translation tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Add comprehensive property-based tests
  - [ ]* 16.1 Write property test for translation key consistency
    - **Property 5: Translation Key Consistency**
    - **Validates: Requirements 2.2, 2.3, 3.2, 3.3, 4.2, 4.3, 5.2, 5.3**
  
  - [ ]* 16.2 Write property test for context data inclusion
    - **Property 6: Context Data Inclusion**
    - **Validates: Requirements 2.4, 3.4, 4.4, 5.4**
  
  - [ ]* 16.3 Write property test for rule skipping on invalid data
    - **Property 7: Rule Skipping on Invalid Data**
    - **Validates: Requirements 2.5, 3.5, 4.5**
  
  - [ ]* 16.4 Write property test for healthy state exclusivity
    - **Property 8: Healthy State Exclusivity**
    - **Validates: Requirements 5.1**
  
  - [ ]* 16.5 Write property test for optimization tip rotation
    - **Property 9: Optimization Tip Rotation**
    - **Validates: Requirements 5.5**
  
  - [ ]* 16.6 Write property test for suggestion replacement on update
    - **Property 16: Suggestion Replacement on Update**
    - **Validates: Requirements 11.4**

- [ ] 17. Add error handling and logging
  - [ ] 17.1 Implement comprehensive error handling
    - Add try-catch blocks around all rule evaluations
    - Add try-catch around context building
    - Add try-catch around localStorage operations
    - Add try-catch around DynamoDB sync operations
    - Log all errors with structured logging
    - Never block daily entry save due to suggestion errors
    - _Requirements: 11.5_
  
  - [ ]* 17.2 Write unit tests for error handling
    - Test suggestion generation continues when one rule fails
    - Test save continues when suggestion generation fails
    - Test localStorage fallback when sync fails
    - _Requirements: 11.5_

- [ ] 18. Add JSDoc documentation
  - [ ] 18.1 Document all public functions
    - Add JSDoc comments to `generateDailySuggestions()`
    - Add JSDoc comments to all rule evaluation functions
    - Add JSDoc comments to `buildSuggestionContext()`
    - Add JSDoc comments to `dismissSuggestion()`
    - Include parameter descriptions, return types, and examples
    - Document error conditions and edge cases

- [ ] 19. Final checkpoint - Run full test suite
  - Run all unit tests and verify 90%+ code coverage for `/lib/finance/generateDailySuggestions.ts`
  - Run all property-based tests with 100+ iterations each
  - Run all integration tests
  - Verify no console errors or warnings
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Create demo data and manual testing
  - [ ] 20.1 Create demo scenarios for testing
    - Create demo data with high credit ratio (> 40%)
    - Create demo data with margin drop (< 70% of average)
    - Create demo data with low cash buffer (< 7 days)
    - Create demo data with healthy state (score >= 70, no issues)
    - Create demo data with multiple simultaneous issues
  
  - [ ] 20.2 Manual testing checklist
    - Test suggestion appears after saving daily entry
    - Test suggestion displays in correct language (en, hi, mr)
    - Test dismiss button works and persists
    - Test dismissed suggestions don't reappear
    - Test suggestions sync to DynamoDB when online
    - Test suggestions work offline
    - Test multiple suggestions show highest priority first
    - Test optimization tips rotate across different dates

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples and edge cases
- The implementation follows the Hybrid Intelligence principle: deterministic core with no AI involvement
- All financial calculations must be pure functions with no side effects
- Offline-first architecture: all logic runs in browser without network dependencies
- Translation system supports English, Hindi, and Marathi with fallback to English
