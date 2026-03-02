# User Profile Display Fix Design

## Overview

The UserProfile component currently only displays basic authentication information (phone number and account creation date) instead of the complete business profile information that users provide during profile setup. This fix will enhance the component to fetch and display complete business profile data from the `/api/profile` endpoint, showing shop name and user name prominently while maintaining backward compatibility and handling network issues gracefully.

## Glossary

- **Bug_Condition (C)**: The condition where a user has completed profile setup but the UserProfile component only displays basic auth data instead of business profile information
- **Property (P)**: The desired behavior where the UserProfile component displays complete business profile data with shop name and user name prominently
- **Preservation**: Existing authentication, logout, and formatting functionality that must remain unchanged by the fix
- **UserProfile Component**: The React component in `components/auth/UserProfile.tsx` that displays user information in the application header
- **Profile API**: The REST endpoint at `/api/profile` that provides complete business profile data including shopName, userName, businessType, and city
- **Auth Session**: The basic user session data stored in localStorage containing only id, phoneNumber, and createdAt
- **Business Profile**: The complete user profile data stored in Supabase containing shop name, user name, business type, city, and other business information

## Bug Details

### Fault Condition

The bug manifests when a user has completed profile setup and logs into the application, but the UserProfile component only displays phone number and account creation date from the auth session instead of fetching and displaying their complete business profile information. The component is not making API calls to fetch profile data and is only using the limited data available in the auth session.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { user: User, hasCompletedProfileSetup: boolean }
  OUTPUT: boolean
  
  RETURN input.user IS NOT NULL
         AND input.hasCompletedProfileSetup IS TRUE
         AND displayedData ONLY CONTAINS [phoneNumber, createdAt]
         AND displayedData DOES NOT CONTAIN [shopName, userName]
END FUNCTION
```

### Examples

- **Business Owner Login**: User "Rajesh Kumar" with shop "Kumar Electronics" logs in but sees only "+91 98765 43210" and "Account created: January 15, 2024" instead of "Kumar Electronics" and "Rajesh Kumar"
- **Profile Setup Complete**: User completes profile setup with shop name "Sharma Traders" and user name "Amit Sharma" but header still shows generic phone number display
- **Multi-language Display**: User sets language to Hindi during profile setup but profile display remains in basic format without personalized business identity
- **Network Available**: User has active internet connection and profile API is accessible but component doesn't fetch profile data

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Logout button functionality must continue to work exactly as before, clearing session and redirecting to login
- Phone number formatting must remain unchanged (+91 XXXXX XXXXX format)
- Date formatting must continue to respect user's language preference (hi-IN, mr-IN, en-IN)
- Component must continue to return null when no valid auth session exists
- Translation keys for UI text must continue to work in user's selected language
- Loading states during logout must remain unchanged

**Scope:**
All inputs that do NOT involve displaying user profile information should be completely unaffected by this fix. This includes:
- Authentication flow and session management
- Logout functionality and redirects
- Phone number and date formatting utilities
- Translation system and language preferences
- Component behavior when user is not authenticated

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing API Integration**: The UserProfile component is not making any API calls to fetch complete profile data
   - Component only uses `getCurrentUser()` which returns basic auth session data
   - No integration with `/api/profile` endpoint that contains business profile information

2. **Incomplete Data Source**: The component relies solely on auth session data which only contains id, phoneNumber, and createdAt
   - Auth session User interface lacks shopName, userName, businessType, and city fields
   - No mechanism to detect if user has completed profile setup

3. **No Profile Data State Management**: The component lacks state management for profile data
   - No loading states for profile API calls
   - No error handling for network failures or API errors
   - No fallback mechanism when profile data is unavailable

4. **Missing Profile Completion Detection**: The component doesn't check if user has completed profile setup
   - No logic to determine when to fetch profile data vs. show basic auth info
   - No handling of users who haven't completed profile setup yet

## Correctness Properties

Property 1: Fault Condition - Business Profile Display

_For any_ authenticated user where profile setup has been completed (user has shopName and userName in profile data), the fixed UserProfile component SHALL fetch complete business profile data from the `/api/profile` endpoint and display shop name and user name prominently instead of just phone number and creation date.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Authentication and Formatting Behavior

_For any_ user interaction that does NOT involve profile data display (logout actions, phone formatting, date formatting, translation), the fixed UserProfile component SHALL produce exactly the same behavior as the original component, preserving all existing authentication, formatting, and UI functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `components/auth/UserProfile.tsx`

**Function**: `UserProfile` component and related hooks

**Specific Changes**:
1. **Add Profile Data State Management**: Add state for complete profile data, loading states, and error handling
   - Add `profileData` state of type `UserProfile | null`
   - Add `profileLoading` state for API call status
   - Add `profileError` state for error handling

2. **Implement Profile API Integration**: Add function to fetch complete profile data from `/api/profile` endpoint
   - Create `loadProfileData()` function that calls `/api/profile?userId=${user.id}`
   - Handle successful responses by updating profileData state
   - Handle network errors and API failures gracefully

3. **Add Profile Completion Detection**: Implement logic to determine when to fetch profile data
   - Check if user has completed profile setup (has shopName and userName)
   - Only fetch profile data for users who have completed setup
   - Fall back to basic auth display for incomplete profiles

4. **Update Display Logic**: Modify component rendering to show business profile information prominently
   - Display shop name as primary identifier when available
   - Show user name as secondary identifier
   - Keep phone number as tertiary information
   - Maintain existing formatting for phone and date

5. **Add Error Handling and Fallbacks**: Implement graceful degradation for network issues
   - Show loading states during profile data fetch
   - Fall back to basic auth display when profile API fails
   - Handle ISP blocking issues common in India
   - Show appropriate error messages in user's language

### API Integration Details

**Endpoint**: `GET /api/profile?userId=${userId}`

**Response Handling**:
- Success (200): Update profileData state with complete UserProfile object
- Not Found (404): User hasn't completed profile setup, use basic auth display
- Network Error: Show loading state, then fall back to basic auth display
- Server Error (500): Log error, fall back to basic auth display

**Data Transformation**:
- Extract shopName, userName, businessType, city from API response
- Maintain existing phoneNumber and createdAt formatting
- Respect user's language preference for all text display

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate users with completed profile setup and verify that business profile information is displayed. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Complete Profile Display Test**: User with shopName "Kumar Electronics" and userName "Rajesh Kumar" should see business info prominently (will fail on unfixed code)
2. **API Integration Test**: Component should make API call to `/api/profile` when user is authenticated (will fail on unfixed code)
3. **Profile Data State Test**: Component should manage profile data state separately from auth session (will fail on unfixed code)
4. **Business Identity Priority Test**: Shop name should be displayed more prominently than phone number (will fail on unfixed code)

**Expected Counterexamples**:
- Component only displays phone number and creation date despite complete profile data being available
- No API calls are made to fetch profile data
- Possible causes: missing API integration, incomplete data source, no profile state management

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := UserProfile_fixed(input)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT UserProfile_original(input) = UserProfile_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for authentication, logout, and formatting functions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Logout Preservation**: Observe that logout button works correctly on unfixed code, then write test to verify this continues after fix
2. **Phone Formatting Preservation**: Observe that phone number formatting works correctly on unfixed code, then write test to verify this continues after fix
3. **Date Formatting Preservation**: Observe that date formatting respects language preferences on unfixed code, then write test to verify this continues after fix
4. **Authentication State Preservation**: Observe that component returns null for unauthenticated users on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test profile API integration with successful responses, error responses, and network failures
- Test component rendering with complete profile data vs. basic auth data
- Test loading states and error handling during profile data fetch
- Test fallback behavior when profile API is unavailable

### Property-Based Tests

- Generate random user profiles and verify business information is displayed correctly when available
- Generate random network conditions and verify graceful degradation to basic auth display
- Test that all authentication and formatting functions continue to work across many scenarios

### Integration Tests

- Test full user flow from login to profile display with complete business information
- Test profile display behavior with different network conditions (ISP blocking scenarios)
- Test language preference handling in profile display across different user configurations
- Test component behavior when switching between users with different profile completion states