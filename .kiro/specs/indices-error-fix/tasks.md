# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Translation Keys Displayed Literally
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that IndicesDashboard displays literal translation keys when API returns error responses
  - Test Case 1: Mock `/api/indices/calculate` to return `INVALID_INPUT` with `errors.insufficientData` message, verify component displays literal key "errors.insufficientData" or "indices.error"
  - Test Case 2: Mock `/api/indices/latest` to return 404, then mock `/api/indices/calculate` to return insufficient data error, verify component displays literal translation key
  - Test Case 3: Mock API to return server error, verify component displays "indices.error" literally without translation
  - Test Case 4: Verify that error messages starting with "errors." or "indices." are not translated by the component
  - The test assertions should match the Expected Behavior Properties from design: error messages should be properly translated and specific to error type
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "Component displays 'errors.insufficientData' literally instead of 'Need at least 7 days of data'")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Successful Index Display Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for successful responses (non-error cases)
  - Test Case 1: Observe and verify successful index calculation displays indices correctly
  - Test Case 2: Observe and verify successful index retrieval from `/api/indices/latest` displays correctly
  - Test Case 3: Observe and verify loading states show spinner with "Checking..." message
  - Test Case 4: Observe and verify sync status indicators (online/offline/syncing) work correctly
  - Test Case 5: Observe and verify AI explanation button and modal work with valid indices
  - Test Case 6: Observe and verify affordability planner calculates correctly with valid data
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for indices error message display

  - [x] 3.1 Add INSUFFICIENT_DATA error code to error-utils.ts
    - Add new error code to ErrorCode enum: `INSUFFICIENT_DATA = 'INSUFFICIENT_DATA'`
    - This distinguishes insufficient data scenarios from generic INVALID_INPUT errors
    - _Bug_Condition: isBugCondition(state) where state.apiResponse.code = "INVALID_INPUT" AND state.apiResponse.message = "errors.insufficientData"_
    - _Expected_Behavior: Error code should be INSUFFICIENT_DATA for insufficient data scenarios, enabling frontend to display specific guidance_
    - _Preservation: Existing error codes and error handling for other scenarios must remain unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Update indices calculate API to use INSUFFICIENT_DATA error code
    - In `app/api/indices/calculate/route.ts`, replace `ErrorCode.INVALID_INPUT` with `ErrorCode.INSUFFICIENT_DATA` when aggregateStressInputs or aggregateAffordabilityInputs returns null
    - Update both stress index and affordability index calculation error handling
    - Ensure error message is properly translated using the language parameter
    - _Bug_Condition: API returns INVALID_INPUT for insufficient data, making it indistinguishable from other validation errors_
    - _Expected_Behavior: API returns INSUFFICIENT_DATA code with translated error message for insufficient data scenarios_
    - _Preservation: Successful calculation responses and other error types must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Update IndicesDashboard component error handling
    - In `components/IndicesDashboard.tsx`, update `loadLatestIndices` function to check error `code` field instead of string matching
    - When response has `code === 'INSUFFICIENT_DATA'`, set error state to 'INSUFFICIENT_DATA' marker
    - For other errors, properly translate error messages if they are translation keys
    - Update error display logic to handle 'INSUFFICIENT_DATA' marker specifically
    - Render insufficient data UI with icon, translated message from `t('indices.insufficientData', language)`, and guidance from `t('indices.addMoreData', language)`
    - Update generic error display to translate keys starting with "errors." or "indices." using `t()` function
    - Ensure retry button uses translated text from `t('receipt.tryAgain', language)`
    - _Bug_Condition: Component displays literal translation keys when error.includes('Insufficient') check fails or when error is a translation key_
    - _Expected_Behavior: Component checks error code, displays translated messages, and provides specific guidance for INSUFFICIENT_DATA errors_
    - _Preservation: Successful index display, loading states, sync status, AI explanation, and affordability planner must remain unchanged_
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Proper Error Message Display
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify component displays translated "indices.insufficientData" message, not literal key
    - Verify component displays translated "indices.error" for server errors, not literal key
    - Verify error messages are properly translated in all test cases
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Successful Index Display Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify successful index calculation and display still works correctly
    - Verify loading states, sync status, AI explanation, and affordability planner still work correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all exploration tests - should now PASS (were failing before fix)
  - Run all preservation tests - should still PASS (were passing before fix)
  - Run unit tests for error code checking logic
  - Run integration tests for full error handling flows
  - Test error messages in multiple languages (English, Hindi, Marathi)
  - Verify no regressions in successful index display flows
  - Ask the user if questions arise
