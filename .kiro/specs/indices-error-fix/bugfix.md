# Bugfix Requirements Document

## Introduction

The dashboard is displaying "indices.error" translation key instead of showing the calculated Stress Index and Affordability Index. This occurs when users navigate to the dashboard and the IndicesDashboard component attempts to load and display financial health indices. The error message appears as a literal translation key ("indices.error") rather than the localized error message, indicating that the component is receiving an error state but the error handling is not properly displaying user-friendly messages.

The bug impacts the user experience by:
- Preventing users from viewing their financial health metrics
- Displaying technical translation keys instead of helpful error messages
- Not clearly communicating whether the issue is insufficient data or a system error
- Breaking the core value proposition of the Daily Health Coach feature

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the IndicesDashboard component loads and the `/api/indices/latest` endpoint returns a 404 (no indices found) THEN the system displays "indices.error" as a literal string instead of a localized error message

1.2 WHEN the IndicesDashboard component calls `/api/indices/calculate` and receives an "insufficient data" error response THEN the system displays "indices.error" instead of the specific "indices.insufficientData" message

1.3 WHEN the `/api/indices/calculate` endpoint is called with a user who has fewer than 7 daily entries THEN the system returns a generic error response that doesn't distinguish between "insufficient data" and other server errors

1.4 WHEN the error state contains the translation key "indices.error" THEN the component displays this key literally instead of resolving it to the translated message

1.5 WHEN network errors or API failures occur during indices calculation THEN the system displays "indices.error" without providing actionable guidance to the user

### Expected Behavior (Correct)

2.1 WHEN the IndicesDashboard component loads and the `/api/indices/latest` endpoint returns a 404 (no indices found) THEN the system SHALL display a user-friendly message indicating that indices need to be calculated for the first time

2.2 WHEN the IndicesDashboard component calls `/api/indices/calculate` and receives an "insufficient data" error response THEN the system SHALL display the localized "indices.insufficientData" message with guidance to add more daily entries

2.3 WHEN the `/api/indices/calculate` endpoint is called with a user who has fewer than 7 daily entries THEN the system SHALL return a specific error code (INSUFFICIENT_DATA) that allows the frontend to display appropriate messaging

2.4 WHEN the error state is set in the component THEN the system SHALL properly resolve translation keys to their localized messages using the t() function

2.5 WHEN network errors or API failures occur during indices calculation THEN the system SHALL display specific, actionable error messages that guide users on how to resolve the issue

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user has sufficient data (7+ daily entries) and the calculation succeeds THEN the system SHALL CONTINUE TO display the Stress Index and Affordability Index correctly

3.2 WHEN the IndicesDashboard component successfully loads existing indices from `/api/indices/latest` THEN the system SHALL CONTINUE TO display them without recalculation

3.3 WHEN the sync status changes between online/offline/syncing THEN the system SHALL CONTINUE TO display the appropriate status indicator

3.4 WHEN users click the "Explain" button with valid index data THEN the system SHALL CONTINUE TO fetch and display AI explanations correctly

3.5 WHEN the AffordabilityPlanner calculates affordability for a planned cost THEN the system SHALL CONTINUE TO return and display the affordability index correctly

3.6 WHEN error responses include localized error messages from the API THEN the system SHALL CONTINUE TO display those messages to users

3.7 WHEN the component handles successful API responses THEN the system SHALL CONTINUE TO update the indexData state and render the indices displays


## Bug Condition Analysis

### Bug Condition Function

The bug occurs when error handling in the IndicesDashboard component and API endpoints fails to properly communicate error states to users.

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type IndicesDashboardState
  OUTPUT: boolean
  
  // Returns true when the bug condition is met
  RETURN (X.error = "indices.error" AND X.isDisplayed = true) OR
         (X.apiResponse.code = "INVALID_INPUT" AND 
          X.apiResponse.message = "errors.insufficientData" AND
          X.displayedMessage ≠ "indices.insufficientData") OR
         (X.apiResponse.status = 404 AND 
          X.displayedMessage = "indices.error")
END FUNCTION
```

### Property Specification - Fix Checking

The fixed system must properly handle and display error states:

```pascal
// Property: Fix Checking - Proper Error Message Display
FOR ALL X WHERE isBugCondition(X) DO
  result ← handleIndicesError'(X)
  ASSERT (result.displayedMessage ≠ "indices.error") AND
         (result.isTranslationKey = false) AND
         (result.isUserFriendly = true) AND
         (result.providesGuidance = true)
END FOR
```

### Property Specification - Preservation Checking

The fix must not break existing successful flows:

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT handleIndicesError(X) = handleIndicesError'(X)
END FOR
```

This ensures that:
- Successful index calculations continue to display correctly
- Valid error messages from the API continue to be shown
- Sync status indicators continue to work
- AI explanation functionality remains intact

### Key Definitions

- **F**: The original (unfixed) error handling - displays "indices.error" translation key literally
- **F'**: The fixed error handling - properly resolves translation keys and displays specific error messages based on error codes

### Root Cause

The bug has multiple contributing factors:

1. **Translation Key Not Resolved**: The component sets `error` state to translation keys but doesn't always resolve them with `t()` function when displaying
2. **Generic Error Responses**: The API returns generic error codes that don't distinguish between "insufficient data" and other errors
3. **Insufficient Error Context**: The 404 response from `/api/indices/latest` triggers a recalculation, but if that also fails, the error message is not specific enough
4. **Error Message Propagation**: API error messages use translation keys, but the component doesn't consistently check if the error is already a translated message or needs translation

### Concrete Counterexamples

**Example 1: New User with No Data**
```typescript
// Input
userId = "user123"
dailyEntries = []
creditEntries = []

// Current Behavior (Bug)
IndicesDashboard displays: "indices.error"

// Expected Behavior (Fixed)
IndicesDashboard displays: "Add more daily entries to see your financial health metrics"
```

**Example 2: User with Insufficient Data (< 7 entries)**
```typescript
// Input
userId = "user456"
dailyEntries = [entry1, entry2, entry3, entry4, entry5] // Only 5 entries

// Current Behavior (Bug)
API returns: { success: false, code: "INVALID_INPUT", message: "errors.insufficientData" }
Component displays: "indices.error"

// Expected Behavior (Fixed)
API returns: { success: false, code: "INSUFFICIENT_DATA", message: "errors.insufficientData" }
Component displays: "Add more daily entries to see your financial health metrics"
```

**Example 3: First-Time Calculation (404 from latest)**
```typescript
// Input
userId = "user789"
dailyEntries = [7 valid entries]
/api/indices/latest returns 404

// Current Behavior (Bug)
Component catches 404, calls calculate, but if calculate fails, shows: "indices.error"

// Expected Behavior (Fixed)
Component catches 404, calls calculate with proper error handling, shows specific message
```
