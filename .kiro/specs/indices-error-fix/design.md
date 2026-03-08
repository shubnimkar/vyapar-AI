# Indices Error Fix Bugfix Design

## Overview

This bugfix addresses the issue where the IndicesDashboard component displays the literal translation key "indices.error" instead of user-friendly, localized error messages. The root cause is a combination of:

1. The API returning a generic `INVALID_INPUT` error code for insufficient data scenarios
2. The API returning translation keys as error messages instead of translated text
3. The frontend component not properly resolving translation keys when displaying errors
4. The frontend not distinguishing between different error types (insufficient data vs. server errors)

The fix will introduce a specific `INSUFFICIENT_DATA` error code, ensure proper error message translation at the API level, and improve frontend error handling to display appropriate messages based on error codes.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when error handling fails to properly communicate error states to users, resulting in translation keys being displayed literally
- **Property (P)**: The desired behavior - error messages should be properly translated and specific to the error type (insufficient data, not found, server error)
- **Preservation**: Existing successful index calculation and display flows that must remain unchanged
- **IndicesDashboard**: The React component in `components/IndicesDashboard.tsx` that displays stress and affordability indices
- **ErrorCode**: Enum in `lib/error-utils.ts` that defines standardized error codes
- **Translation Key**: String keys like "indices.error" or "errors.insufficientData" that map to localized messages

## Bug Details

### Fault Condition

The bug manifests when the IndicesDashboard component receives error responses from the indices API endpoints. The component either displays translation keys literally or shows generic error messages that don't guide users on how to resolve the issue.

**Formal Specification:**
```
FUNCTION isBugCondition(state)
  INPUT: state of type IndicesDashboardState
  OUTPUT: boolean
  
  RETURN (state.error = "indices.error" AND state.isDisplayed = true) OR
         (state.apiResponse.code = "INVALID_INPUT" AND 
          state.apiResponse.message = "errors.insufficientData" AND
          state.displayedMessage ≠ t("indices.insufficientData", language)) OR
         (state.apiResponse.status = 404 AND 
          state.displayedMessage = "indices.error")
END FUNCTION
```

### Examples

**Example 1: New User with Insufficient Data (< 7 entries)**
```typescript
// Input
userId = "user456"
dailyEntries = [entry1, entry2] // Only 2 entries

// API Response (Current - Bug)
{
  success: false,
  code: "INVALID_INPUT",
  message: "errors.insufficientData"  // Translation key, not translated
}

// Component Display (Current - Bug)
error = "errors.insufficientData"  // Literal translation key displayed
// OR
error = "indices.error"  // Generic fallback

// Expected Behavior (Fixed)
// API Response:
{
  success: false,
  code: "INSUFFICIENT_DATA",
  message: "Insufficient data to calculate indices. Please add at least 7 days of daily entries."
}

// Component Display:
Shows helpful UI with:
- Icon indicating insufficient data
- Message: "Need at least 7 days of data to calculate indices"
- Guidance: "Add more daily entries to see your financial health metrics"
```

**Example 2: First-Time User (404 from /api/indices/latest)**
```typescript
// Input
userId = "user789"
dailyEntries = [7 valid entries]
/api/indices/latest returns 404

// Current Behavior (Bug)
Component catches 404, calls /api/indices/calculate
If calculate also fails (e.g., insufficient data), shows: "indices.error"

// Expected Behavior (Fixed)
Component catches 404, calls /api/indices/calculate
If calculate fails with INSUFFICIENT_DATA, shows specific message:
"Need at least 7 days of data to calculate indices"
```

**Example 3: Server Error**
```typescript
// Input
userId = "user123"
API throws unexpected error

// Current Behavior (Bug)
error = "indices.error"  // Generic message

// Expected Behavior (Fixed)
error = "Error calculating indices"  // Translated from "indices.error"
Shows retry button
```

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Successful index calculations must continue to display correctly
- Loading states must continue to show spinner with "Checking..." message
- Sync status indicators (online/offline/syncing) must continue to work
- AI explanation functionality must continue to work when indices are available
- AffordabilityPlanner must continue to calculate affordability for planned costs

**Scope:**
All inputs that do NOT involve error states should be completely unaffected by this fix. This includes:
- Successful API responses with valid index data
- Loading and syncing states
- User interactions with the explain button
- Affordability calculations with valid data

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Generic Error Code**: The `/api/indices/calculate` endpoint returns `ErrorCode.INVALID_INPUT` for insufficient data scenarios, which doesn't distinguish this specific case from other validation errors

2. **Translation Keys in API Responses**: The API returns translation keys (e.g., "errors.insufficientData") as error messages instead of translated text, expecting the frontend to translate them

3. **Inconsistent Error Handling in Component**: The IndicesDashboard component has special handling for errors containing "Insufficient" but:
   - It checks `error.includes('Insufficient')` which only works if the error is already translated
   - It sets `error` state to `data.error` which may be a translation key
   - It doesn't consistently call `t()` to resolve translation keys

4. **Missing Error Code Check**: The component doesn't check the error `code` field to determine the error type, relying only on string matching in the error message

## Correctness Properties

Property 1: Fault Condition - Proper Error Message Display

_For any_ API error response where the error code is INSUFFICIENT_DATA, the fixed IndicesDashboard component SHALL display the localized "indices.insufficientData" message with helpful guidance, not the literal translation key.

**Validates: Requirements 2.2, 2.3, 2.4**

Property 2: Preservation - Successful Index Display

_For any_ API response that is NOT an error (successful index calculation or retrieval), the fixed component SHALL produce exactly the same display behavior as the original component, preserving all existing functionality for successful flows.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `lib/error-utils.ts`

**Changes**:
1. **Add INSUFFICIENT_DATA Error Code**: Add new error code to ErrorCode enum
   ```typescript
   export enum ErrorCode {
     // ... existing codes
     INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
   }
   ```

**File 2**: `app/api/indices/calculate/route.ts`

**Function**: `POST` handler

**Specific Changes**:
1. **Change Error Code for Insufficient Data**: Replace `ErrorCode.INVALID_INPUT` with `ErrorCode.INSUFFICIENT_DATA` when aggregateStressInputs returns null
   ```typescript
   // Before:
   return NextResponse.json(
     createErrorResponse(
       ErrorCode.INVALID_INPUT,
       'errors.insufficientData',
       language
     ),
     { status: 400 }
   );
   
   // After:
   return NextResponse.json(
     createErrorResponse(
       ErrorCode.INSUFFICIENT_DATA,
       'errors.insufficientData',
       language
     ),
     { status: 400 }
   );
   ```

**File 3**: `components/IndicesDashboard.tsx`

**Function**: `loadLatestIndices`, `calculateIndices`, error display logic

**Specific Changes**:
1. **Check Error Code Instead of String Matching**: Update error handling to check the `code` field in API responses
   ```typescript
   // In loadLatestIndices:
   if (data.success && data.data) {
     setIndexData(data.data);
   } else if (response.status === 404) {
     // No indices yet - need to calculate
     await calculateIndices();
   } else {
     // Check error code to determine message
     if (data.code === 'INSUFFICIENT_DATA') {
       setError('INSUFFICIENT_DATA');  // Special marker
     } else {
       setError(data.message || t('indices.error', language));
     }
   }
   ```

2. **Update Error Display Logic**: Modify the error state rendering to handle INSUFFICIENT_DATA specifically
   ```typescript
   // Replace the current "Insufficient data state" check:
   // Before:
   if (error && error.includes('Insufficient')) {
     // ... render insufficient data UI
   }
   
   // After:
   if (error === 'INSUFFICIENT_DATA') {
     return (
       <div className="bg-white rounded-lg shadow-md p-8 text-center">
         <div className="text-6xl mb-4">📊</div>
         <h3 className="text-lg font-semibold text-gray-800 mb-2">
           {t('indices.insufficientData', language)}
         </h3>
         <p className="text-gray-600 mb-4">
           {t('indices.addMoreData', language)}
         </p>
         {renderSyncStatus()}
       </div>
     );
   }
   ```

3. **Ensure Translation of Error Messages**: Make sure all error messages are properly translated
   ```typescript
   // In calculateIndices:
   if (data.success && data.data) {
     setIndexData(data.data);
   } else {
     // Check error code first
     if (data.code === 'INSUFFICIENT_DATA') {
       setError('INSUFFICIENT_DATA');
     } else {
       // For other errors, use the message if it's already translated,
       // or translate it if it's a key
       const errorMsg = data.message || 'indices.error';
       setError(errorMsg.startsWith('errors.') || errorMsg.startsWith('indices.') 
         ? t(errorMsg, language) 
         : errorMsg
       );
     }
   }
   ```

4. **Update Generic Error Display**: Ensure the generic error state also translates keys
   ```typescript
   // In error state rendering:
   if (error && error !== 'INSUFFICIENT_DATA') {
     return (
       <div className="bg-white rounded-lg shadow-md p-8 text-center">
         <div className="text-red-600 mb-4">⚠️</div>
         <p className="text-red-600">
           {error.startsWith('errors.') || error.startsWith('indices.') 
             ? t(error, language) 
             : error}
         </p>
         <button
           onClick={loadLatestIndices}
           className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
         >
           {t('receipt.tryAgain', language)}
         </button>
       </div>
     );
   }
   ```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate API error responses and verify that the component displays translation keys literally. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Insufficient Data Test**: Mock `/api/indices/calculate` to return `INVALID_INPUT` with `errors.insufficientData` message, verify component displays literal key (will fail on unfixed code)
2. **404 Then Insufficient Data Test**: Mock `/api/indices/latest` to return 404, then mock `/api/indices/calculate` to return insufficient data error, verify error handling (will fail on unfixed code)
3. **Generic Error Test**: Mock API to return server error, verify component displays "indices.error" literally (will fail on unfixed code)
4. **Translation Key Detection Test**: Verify that error messages starting with "errors." or "indices." are not translated (will fail on unfixed code)

**Expected Counterexamples**:
- Component displays "errors.insufficientData" literally instead of translated message
- Component displays "indices.error" literally instead of translated message
- Component doesn't check error `code` field, only checks error message string

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL errorResponse WHERE isBugCondition(errorResponse) DO
  displayedMessage := handleError_fixed(errorResponse, language)
  ASSERT displayedMessage ≠ "indices.error"
  ASSERT displayedMessage ≠ "errors.insufficientData"
  ASSERT isTranslated(displayedMessage, language)
  ASSERT providesGuidance(displayedMessage)
END FOR
```

**Test Cases**:
1. **INSUFFICIENT_DATA Error Code**: Verify component displays translated "indices.insufficientData" message
2. **404 Followed by INSUFFICIENT_DATA**: Verify component handles 404 gracefully and shows insufficient data UI
3. **Server Error**: Verify component displays translated "indices.error" message with retry button
4. **Multiple Languages**: Verify error messages are translated correctly in English, Hindi, and Marathi

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL apiResponse WHERE NOT isBugCondition(apiResponse) DO
  ASSERT handleResponse_original(apiResponse) = handleResponse_fixed(apiResponse)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-error inputs

**Test Plan**: Observe behavior on UNFIXED code first for successful responses, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Successful Index Calculation**: Verify component displays indices correctly after successful calculation
2. **Successful Index Retrieval**: Verify component displays existing indices from `/api/indices/latest`
3. **Loading States**: Verify loading spinner and messages display correctly
4. **Sync Status**: Verify online/offline/syncing status indicators work correctly
5. **AI Explanation**: Verify explain button and modal work correctly with valid indices
6. **Affordability Calculation**: Verify affordability planner works correctly

### Unit Tests

- Test error code checking logic in component
- Test translation key detection and resolution
- Test error state rendering for different error codes
- Test API error response handling for INSUFFICIENT_DATA code
- Test that createErrorResponse uses correct error code

### Property-Based Tests

- Generate random error responses with different codes and verify correct display
- Generate random successful responses and verify preservation of display behavior
- Test translation key resolution across all supported languages
- Test error message formatting with various error codes

### Integration Tests

- Test full flow: load dashboard → 404 → calculate → insufficient data → display message
- Test full flow: load dashboard → calculate → success → display indices
- Test error recovery: error state → retry → success
- Test language switching with error states
