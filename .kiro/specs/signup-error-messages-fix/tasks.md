# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Generic Error Codes for Validation Failures
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate all validation failures return generic INVALID_INPUT
  - **Scoped PBT Approach**: Scope the property to concrete failing cases (username taken, weak password, invalid format, missing fields, invalid length)
  - Test that signup endpoint returns specific error codes for each validation failure type:
    - USERNAME_TAKEN when username already exists
    - WEAK_PASSWORD when password is weak
    - INVALID_USERNAME when username format is invalid
    - MISSING_REQUIRED_FIELDS when required fields are missing
    - INVALID_FIELD_LENGTH when field lengths are invalid
  - The test assertions should match the Expected Behavior Properties from design (requirements 2.1-2.6)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists, all return INVALID_INPUT)
  - Document counterexamples found (e.g., "username taken returns INVALID_INPUT instead of USERNAME_TAKEN")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Validation Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (successful signups, rate limits, server errors)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - Successful signup returns 201 with userId and username
    - Rate limit exceeded returns 429 with RATE_LIMIT_EXCEEDED
    - Server errors return 500 with SERVER_ERROR
    - DynamoDB errors return 500 with DYNAMODB_ERROR
    - Password hashing failures return 500 with SERVER_ERROR
    - Input sanitization, password hashing, and atomic record creation work correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for signup error messages

  - [x] 3.1 Add new error codes to ErrorCode enum
    - Add USERNAME_TAKEN to lib/error-utils.ts
    - Add WEAK_PASSWORD to lib/error-utils.ts
    - Add INVALID_USERNAME to lib/error-utils.ts
    - Add MISSING_REQUIRED_FIELDS to lib/error-utils.ts
    - Add INVALID_FIELD_LENGTH to lib/error-utils.ts
    - _Bug_Condition: isBugCondition(input) where validation failure occurs AND errorCodeReturned == "INVALID_INPUT"_
    - _Expected_Behavior: Return specific error codes (USERNAME_TAKEN, WEAK_PASSWORD, INVALID_USERNAME, MISSING_REQUIRED_FIELDS, INVALID_FIELD_LENGTH) for each validation failure type_
    - _Preservation: Existing error codes (INVALID_INPUT, RATE_LIMIT_EXCEEDED, SERVER_ERROR, DYNAMODB_ERROR) remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 3.2 Add translation keys for new error messages
    - Add errors.usernameTaken with translations in en, hi, mr to lib/translations.ts
    - Add errors.weakPassword with translations in en, hi, mr to lib/translations.ts
    - Add errors.invalidUsername with translations in en, hi, mr to lib/translations.ts
    - Add errors.missingRequiredFields with translations in en, hi, mr to lib/translations.ts
    - Add errors.invalidFieldLength with translations in en, hi, mr to lib/translations.ts
    - _Bug_Condition: isBugCondition(input) where validation failure occurs AND errorMessage == "Invalid input. Please check your data."_
    - _Expected_Behavior: Return descriptive localized error messages for each validation failure type_
    - _Preservation: Existing translation keys remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 3.3 Update signup endpoint to use specific error codes
    - Replace INVALID_INPUT with MISSING_REQUIRED_FIELDS for missing fields check in app/api/auth/signup/route.ts
    - Keep INVALID_INPUT for SQL injection detection (security requirement)
    - Replace INVALID_INPUT with INVALID_USERNAME for username format check
    - Replace INVALID_INPUT with USERNAME_TAKEN for username exists check (status 409)
    - Replace INVALID_INPUT with WEAK_PASSWORD for password strength check
    - Replace INVALID_INPUT with INVALID_FIELD_LENGTH for shopName length check
    - Replace INVALID_INPUT with INVALID_FIELD_LENGTH for ownerName length check
    - Replace INVALID_INPUT with INVALID_FIELD_LENGTH for city length check
    - _Bug_Condition: isBugCondition(input) where any validation failure returns generic INVALID_INPUT_
    - _Expected_Behavior: Each validation failure returns its specific error code with descriptive message_
    - _Preservation: Successful signup flow, rate limiting, server error handling, and data processing logic remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.4 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Specific Error Codes for Validation Failures
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - specific error codes returned)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.5 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Validation Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in successful signups, rate limiting, server errors)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
