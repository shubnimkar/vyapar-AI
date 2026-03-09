# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Lambda Not Triggered Without Prefix
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - voice files uploaded without `uploads/` prefix
  - Test that voice file uploads without `uploads/` prefix do NOT trigger Lambda (from Fault Condition in design)
  - Test implementation: Upload voice file with key `voice-{timestamp}.webm` to S3, verify Lambda is NOT invoked
  - The test assertions should match the Expected Behavior Properties from design: Lambda SHOULD be triggered for voice uploads
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: Lambda not triggered, API times out after 60+ seconds
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Voice Upload Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-voice uploads (receipt OCR, CSV)
  - Observe: Receipt uploads use key format `receipt-{timestamp}-{filename}` (no prefix)
  - Observe: Receipt Lambda triggers correctly on root-level files
  - Observe: S3 lifecycle policies work correctly (1-day for voice, 7-day for receipts)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that receipt OCR uploads continue to use root-level keys (no `uploads/` prefix)
  - Test that CSV uploads continue to work unchanged
  - Test that API response format remains unchanged
  - Test that file validation logic is preserved
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3. Fix voice entry S3 prefix

  - [x] 3.1 Implement the fix
    - Modify `app/api/voice-entry/route.ts` line 60
    - Change `Key: filename,` to `Key: \`uploads/${filename}\`,`
    - This single-line change aligns voice uploads with Lambda S3 event notification configuration
    - No other changes required (Lambda code, polling logic, validation all remain unchanged)
    - _Bug_Condition: isBugCondition(input) where input.s3Key does NOT start with 'uploads/' AND input.filename starts with 'voice-'_
    - _Expected_Behavior: Voice files uploaded with `uploads/` prefix trigger Lambda automatically, processing completes within 30 seconds_
    - _Preservation: Receipt OCR uploads continue with root-level keys, S3 lifecycle policies unchanged, API response format unchanged, file validation unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Lambda Triggered With Prefix
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify Lambda is triggered when voice files are uploaded with `uploads/` prefix
    - Verify processing completes within 30 seconds
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Voice Upload Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm receipt OCR uploads still use root-level keys
    - Confirm CSV uploads still work unchanged
    - Confirm API response format unchanged
    - Confirm file validation logic preserved
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all tests (exploration + preservation)
  - Verify Lambda is triggered for voice uploads
  - Verify receipt OCR continues to work unchanged
  - Verify no regressions in other upload features
  - Ensure all tests pass, ask the user if questions arise
