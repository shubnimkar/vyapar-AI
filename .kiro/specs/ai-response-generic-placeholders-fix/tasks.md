# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - AI Content Extraction Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate UI components display placeholders instead of actual AI content
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - mock AI responses with nested content structures and verify components display placeholders
  - Test that CashFlowPredictor displays generic template "### Explanation of the 7-Day Cash Flow Prediction" when API returns `{ success: true, explanation: { success: true, content: "Based on your kirana store..." } }`
  - Test that InsightsDisplay shows "#### Identify" heading when API returns `{ success: true, insights: { trueProfitAnalysis: "Your salon business..." } }`
  - Test that BenchmarkDisplay shows "benchmark.title" literal text when API returns `{ success: true, explanation: "Your kirana store performs..." }`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "CashFlowPredictor renders 'data.explanation' object as string instead of extracting 'data.explanation.content'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Fallback Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (AI service unavailable, error responses)
  - Observe: CashFlowPredictor displays "Unable to generate explanation" when `response.success === false`
  - Observe: InsightsDisplay displays error message when `response.insights === null`
  - Observe: BenchmarkDisplay displays fallback message when API returns error
  - Observe: IndicesDashboard displays fallback message when API returns error
  - Observe: Deterministic metrics (health score, stress index, affordability index) are calculated without AI dependency
  - Write property-based tests capturing observed fallback behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix AI response content extraction in UI components

  - [x] 3.1 Fix CashFlowPredictor content extraction
    - Update `handleExplainPrediction` function to correctly extract nested content
    - Check for `data.explanation.content` first (nested object structure)
    - Fall back to `data.explanation` if it's a string
    - Add robust type guards: `typeof data.explanation === 'object' && data.explanation !== null && 'content' in data.explanation`
    - Ensure fallback message only displays when both nested and flat structures are unavailable
    - _Bug_Condition: isBugCondition(response) where response.success === true AND response.explanation exists AND component displays placeholder_
    - _Expected_Behavior: Component extracts actual AI content from response.explanation.content or response.explanation and displays it_
    - _Preservation: Fallback behavior for AI unavailability (response.success === false) must remain unchanged_
    - _Requirements: 2.1, 3.1_

  - [x] 3.2 Fix InsightsDisplay content rendering
    - Verify parent component (`/api/analyze` endpoint) correctly parses AI response
    - Update `parseInsights` function in `/app/api/analyze/route.ts` to correctly extract content from AI response
    - Ensure regex patterns correctly extract sections from `aiResponse.content`
    - Add fallback to return raw content if parsing fails
    - Verify InsightsDisplay component receives parsed insights with actual AI text
    - _Bug_Condition: isBugCondition(response) where response.success === true AND response.insights exists AND component displays "#### Identify" heading_
    - _Expected_Behavior: Component displays actual AI-generated insights text from parsed response_
    - _Preservation: Error handling for invalid inputs and missing profile data must remain unchanged_
    - _Requirements: 2.2, 3.2_

  - [x] 3.3 Verify BenchmarkDisplay implementation
    - Confirm that `/api/benchmark/explain` returns flat structure `{ success: true, explanation: "..." }`
    - Verify `handleExplain` function correctly extracts `data.explanation`
    - Test that component displays actual AI content instead of "benchmark.title" literal text
    - If bug exists, update content extraction logic similar to CashFlowPredictor
    - _Bug_Condition: isBugCondition(response) where response.success === true AND response.explanation exists AND component displays translation key_
    - _Expected_Behavior: Component displays actual AI-generated explanation text_
    - _Preservation: Fallback behavior for AI unavailability must remain unchanged_
    - _Requirements: 2.4, 3.4_

  - [x] 3.4 Verify IndicesDashboard implementation
    - Confirm that `/api/indices/explain` returns flat structure `{ success: true, explanation: "..." }`
    - Verify `handleExplain` function correctly extracts `data.explanation`
    - Test that component displays actual AI content instead of generic fallback
    - If bug exists, update content extraction logic similar to CashFlowPredictor
    - _Bug_Condition: isBugCondition(response) where response.success === true AND response.explanation exists AND component displays generic fallback_
    - _Expected_Behavior: Component displays actual AI-generated explanation text_
    - _Preservation: Fallback behavior for AI unavailability must remain unchanged_
    - _Requirements: 2.5, 3.5_

  - [x] 3.5 Standardize response structures (optional improvement)
    - Consider flattening `/api/explain` response structure for consistency
    - Current: `{ success: true, explanation: { success: true, content: "..." } }`
    - Proposed: `{ success: true, explanation: "..." }` (match other endpoints)
    - This would eliminate the need for nested extraction in UI components
    - Update endpoint to return flat structure if standardization is chosen
    - _Bug_Condition: Response structure inconsistency across endpoints_
    - _Expected_Behavior: All AI endpoints return consistent flat structure_
    - _Preservation: All existing API consumers must continue to work_
    - _Requirements: 2.6, 2.7, 3.6, 3.7_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - AI Content Correctly Extracted
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify CashFlowPredictor displays actual AI content from nested response
    - Verify InsightsDisplay displays actual AI insights instead of "#### Identify"
    - Verify BenchmarkDisplay displays actual AI explanation instead of translation key
    - Verify IndicesDashboard displays actual AI explanation instead of generic fallback
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Fallback Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all fallback behaviors still work correctly after fix
    - Verify deterministic calculations continue without AI dependency
    - Verify error handling for invalid inputs remains unchanged
    - Verify language switching functionality still works
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
