# Signup Error Messages Fix - Bugfix Design

## Overview

The signup endpoint currently returns a generic "INVALID_INPUT" error code with the message "Invalid input. Please check your data." for all validation failures. This creates a poor user experience because users cannot understand what specifically went wrong with their signup attempt. The fix will introduce specific error codes for each validation failure type (username taken, weak password, invalid format, etc.) with localized error messages, enabling users to correct their input effectively.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when any validation failure in the signup endpoint returns the generic "INVALID_INPUT" error code instead of a specific error code
- **Property (P)**: The desired behavior when validation fails - the endpoint should return specific error codes (USERNAME_TAKEN, WEAK_PASSWORD, INVALID_USERNAME, etc.) with descriptive localized messages
- **Preservation**: Existing successful signup flow, rate limiting, server error handling, and DynamoDB operations that must remain unchanged by the fix
- **POST /api/auth/signup**: The signup endpoint in `app/api/auth/signup/route.ts` that handles user registration
- **ErrorCode enum**: The enumeration in `lib/error-utils.ts` that defines all possible error codes
- **errorTranslations**: The translation object in `lib/translations.ts` that maps error message keys to localized strings

## Bug Details

### Fault Condition

The bug manifests when any validation check fails in the signup endpoint. The endpoint is currently using the same generic error code (INVALID_INPUT) and message for all validation failures, making it impossible for users to understand what specifically went wrong.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type SignupRequest
  OUTPUT: boolean
  
  RETURN (usernameAlreadyExists(input.username) OR
          passwordIsWeak(input.password) OR
          usernameFormatInvalid(input.username) OR
          requiredFieldsMissing(input) OR
          sqlInjectionDetected(input) OR
          fieldLengthInvalid(input))
         AND errorCodeReturned == "INVALID_INPUT"
         AND errorMessage == "Invalid input. Please check your data."
END FUNCTION
```

### Examples

- **Username Taken**: User tries to signup with username "shopowner123" that already exists → receives "INVALID_INPUT" with "Invalid input. Please check your data." instead of "USERNAME_TAKEN" with "Username already taken"
- **Weak Password**: User enters password "pass" (too short, no uppercase, no number) → receives "INVALID_INPUT" with "Invalid input. Please check your data." instead of "WEAK_PASSWORD" with "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number"
- **Invalid Username Format**: User enters username "shop@owner!" (contains special characters) → receives "INVALID_INPUT" with "Invalid input. Please check your data." instead of "INVALID_USERNAME" with specific format requirements
- **Missing Required Fields**: User submits signup without shopName → receives "INVALID_INPUT" with "Invalid input. Please check your data." instead of "MISSING_REQUIRED_FIELDS" with "Required fields are missing"
- **SQL Injection Attempt**: User enters username "admin'; DROP TABLE users--" → receives "INVALID_INPUT" with "Invalid input. Please check your data." (this case should keep INVALID_INPUT but is currently indistinguishable from other failures)
- **Invalid Field Length**: User enters shopName with 150 characters → receives "INVALID_INPUT" with "Invalid input. Please check your data." instead of "INVALID_FIELD_LENGTH" with specific field information

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Successful signup flow (201 status with userId and username) must continue to work exactly as before
- Rate limiting (429 status with RATE_LIMIT_EXCEEDED) must remain unchanged
- Server error handling (500 status with SERVER_ERROR) must remain unchanged
- DynamoDB error handling (500 status with DYNAMODB_ERROR) must remain unchanged
- Password hashing failure handling (500 status with SERVER_ERROR) must remain unchanged
- Atomic user and profile record creation must remain unchanged
- Input sanitization logic must remain unchanged
- All validation logic (username format, password strength, field lengths) must remain unchanged

**Scope:**
All inputs that do NOT trigger validation failures should be completely unaffected by this fix. This includes:
- Valid signup requests with all correct data
- Rate limit exceeded scenarios
- Server errors and DynamoDB errors
- Password hashing failures

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Copy-Paste Error Handling**: All validation failure branches in the signup endpoint use the same error response pattern:
   ```typescript
   return NextResponse.json(
     createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
     { status: 400 }
   );
   ```
   This was likely copied and pasted during initial implementation without updating the error codes.

2. **Missing Error Codes**: The `ErrorCode` enum in `lib/error-utils.ts` does not include specific codes for signup validation failures (USERNAME_TAKEN, WEAK_PASSWORD, INVALID_USERNAME, MISSING_REQUIRED_FIELDS, INVALID_FIELD_LENGTH).

3. **Missing Translation Keys**: The `errorTranslations` object in `lib/translations.ts` does not include translation keys for the specific error messages needed for each validation failure type.

4. **Inconsistent Status Code**: The username already exists case returns 409 (Conflict) status but still uses the generic INVALID_INPUT error code, creating confusion.

## Correctness Properties

Property 1: Fault Condition - Specific Error Codes for Validation Failures

_For any_ signup request where a validation failure occurs (isBugCondition returns true), the fixed signup endpoint SHALL return a specific error code corresponding to the validation failure type (USERNAME_TAKEN for existing username, WEAK_PASSWORD for weak password, INVALID_USERNAME for format issues, MISSING_REQUIRED_FIELDS for missing fields, INVALID_FIELD_LENGTH for length issues) with a descriptive localized error message that helps the user understand and correct the issue.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Non-Validation Behavior

_For any_ signup request that does NOT trigger validation failures (isBugCondition returns false), the fixed signup endpoint SHALL produce exactly the same behavior as the original endpoint, preserving successful signup responses (201 with userId), rate limit responses (429), server error responses (500), and all data processing logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `lib/error-utils.ts`

**Changes**:
1. **Add New Error Codes**: Add the following error codes to the `ErrorCode` enum:
   - `USERNAME_TAKEN` - for when username already exists
   - `WEAK_PASSWORD` - for when password doesn't meet strength requirements
   - `INVALID_USERNAME` - for when username format is invalid
   - `MISSING_REQUIRED_FIELDS` - for when required fields are missing
   - `INVALID_FIELD_LENGTH` - for when field lengths are invalid

**File 2**: `lib/translations.ts`

**Changes**:
1. **Add Translation Keys**: Add the following keys to the `errorTranslations` object with translations in English, Hindi, and Marathi:
   - `errors.usernameTaken` - "Username already taken" / "उपयोगकर्ता नाम पहले से लिया गया है" / "वापरकर्तानाव आधीच घेतले आहे"
   - `errors.weakPassword` - "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number" / "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए जिसमें 1 बड़ा अक्षर, 1 छोटा अक्षर और 1 संख्या हो" / "पासवर्ड किमान 8 वर्णांचा असावा ज्यामध्ये 1 मोठे अक्षर, 1 लहान अक्षर आणि 1 संख्या असावी"
   - `errors.invalidUsername` - "Username must be 3-20 characters and contain only letters, numbers, and underscores" / "उपयोगकर्ता नाम 3-20 अक्षरों का होना चाहिए और केवल अक्षर, संख्या और अंडरस्कोर होने चाहिए" / "वापरकर्तानाव 3-20 वर्णांचे असावे आणि फक्त अक्षरे, संख्या आणि अंडरस्कोर असावेत"
   - `errors.missingRequiredFields` - "Required fields are missing" / "आवश्यक फ़ील्ड गायब हैं" / "आवश्यक फील्ड गहाळ आहेत"
   - `errors.invalidFieldLength` - "Field length is invalid" / "फ़ील्ड की लंबाई अमान्य है" / "फील्ड लांबी अवैध आहे"

**File 3**: `app/api/auth/signup/route.ts`

**Function**: `POST`

**Specific Changes**:
1. **Missing Required Fields Check** (line ~60): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.MISSING_REQUIRED_FIELDS, 'errors.missingRequiredFields'`

2. **SQL Injection Detection** (line ~75): Keep `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` (this is correct - we don't want to reveal SQL injection detection details)

3. **Invalid Username Format** (line ~83): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.INVALID_USERNAME, 'errors.invalidUsername'`

4. **Username Already Exists** (line ~92): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.USERNAME_TAKEN, 'errors.usernameTaken'` (status remains 409)

5. **Weak Password** (line ~100): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.WEAK_PASSWORD, 'errors.weakPassword'`

6. **Invalid Shop Name Length** (line ~108): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.INVALID_FIELD_LENGTH, 'errors.invalidFieldLength'`

7. **Invalid Owner Name Length** (line ~114): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.INVALID_FIELD_LENGTH, 'errors.invalidFieldLength'`

8. **Invalid City Length** (line ~120): Replace `ErrorCode.INVALID_INPUT, 'errors.invalidInput'` with `ErrorCode.INVALID_FIELD_LENGTH, 'errors.invalidFieldLength'`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (all validation failures return generic INVALID_INPUT), then verify the fix works correctly (specific error codes returned) and preserves existing behavior (successful signups, rate limiting, server errors unchanged).

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that all validation failures currently return the generic INVALID_INPUT error code.

**Test Plan**: Write tests that trigger each validation failure type and assert that the response contains a specific error code. Run these tests on the UNFIXED code to observe failures (generic INVALID_INPUT returned instead of specific codes).

**Test Cases**:
1. **Username Taken Test**: POST signup with existing username → expect USERNAME_TAKEN error code (will fail on unfixed code, returns INVALID_INPUT)
2. **Weak Password Test**: POST signup with password "weak" → expect WEAK_PASSWORD error code (will fail on unfixed code, returns INVALID_INPUT)
3. **Invalid Username Format Test**: POST signup with username "user@name!" → expect INVALID_USERNAME error code (will fail on unfixed code, returns INVALID_INPUT)
4. **Missing Required Fields Test**: POST signup without shopName → expect MISSING_REQUIRED_FIELDS error code (will fail on unfixed code, returns INVALID_INPUT)
5. **Invalid Field Length Test**: POST signup with 150-character shopName → expect INVALID_FIELD_LENGTH error code (will fail on unfixed code, returns INVALID_INPUT)
6. **SQL Injection Test**: POST signup with SQL keywords in username → expect INVALID_INPUT error code (should pass on unfixed code - this is correct behavior)

**Expected Counterexamples**:
- All validation failures (except SQL injection) return generic INVALID_INPUT error code
- Error messages are all "Invalid input. Please check your data."
- Users cannot distinguish between different validation failure types

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (validation failures), the fixed function produces the expected behavior (specific error codes).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := POST_signup_fixed(input)
  ASSERT result.code IN ['USERNAME_TAKEN', 'WEAK_PASSWORD', 'INVALID_USERNAME', 
                          'MISSING_REQUIRED_FIELDS', 'INVALID_FIELD_LENGTH']
  ASSERT result.message != "Invalid input. Please check your data."
  ASSERT result.message describes the specific validation failure
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (successful signups, rate limits, server errors), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT POST_signup_original(input) = POST_signup_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for successful signups and error scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Successful Signup Preservation**: Observe that valid signup requests return 201 with userId on unfixed code, then write test to verify this continues after fix
2. **Rate Limit Preservation**: Observe that rate limit exceeded returns 429 with RATE_LIMIT_EXCEEDED on unfixed code, then write test to verify this continues after fix
3. **Server Error Preservation**: Observe that server errors return 500 with SERVER_ERROR on unfixed code, then write test to verify this continues after fix
4. **DynamoDB Error Preservation**: Observe that DynamoDB errors return 500 with DYNAMODB_ERROR on unfixed code, then write test to verify this continues after fix
5. **Password Hashing Error Preservation**: Observe that password hashing failures return 500 with SERVER_ERROR on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test each validation failure type returns the correct specific error code
- Test that error messages are properly localized (en, hi, mr)
- Test that HTTP status codes are correct (400 for validation, 409 for username taken)
- Test that SQL injection detection still returns INVALID_INPUT (security requirement)
- Test that successful signup flow is unchanged
- Test that rate limiting is unchanged
- Test that server error handling is unchanged

### Property-Based Tests

- Generate random valid signup requests and verify they all return 201 with userId (preservation)
- Generate random invalid usernames and verify they all return INVALID_USERNAME (fix checking)
- Generate random weak passwords and verify they all return WEAK_PASSWORD (fix checking)
- Generate random signup requests with missing fields and verify they all return MISSING_REQUIRED_FIELDS (fix checking)
- Generate random signup requests with invalid field lengths and verify they all return INVALID_FIELD_LENGTH (fix checking)

### Integration Tests

- Test full signup flow with each validation failure type and verify correct error code and message
- Test signup with multiple validation failures and verify the first failure is caught with correct error code
- Test signup in different languages (en, hi, mr) and verify error messages are properly localized
- Test that after fixing a validation error, user can successfully signup
- Test that existing users cannot be overwritten (username taken check works correctly)
