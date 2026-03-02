# Testing Guide - User Registration System

## Setup

1. **Clean build cache** (if you encounter module errors):
   ```bash
   rm -rf .next
   npm run build
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Open browser to `http://localhost:3000`
   - You should be redirected to `/login`

## Test Scenarios

### 1. Test Signup Flow

#### A. Password Strength Indicator
1. Click on "Create Account" tab
2. Start typing in the password field
3. **Verify**:
   - Strength bar appears below password field
   - Bar shows 4 segments
   - Color changes based on strength:
     - Red (1 requirement met)
     - Orange (2 requirements met)
     - Yellow (3 requirements met)
     - Green (4 requirements met)

#### B. Password Requirements Checklist
1. Type different passwords and verify checkmarks:
   - `abc` → No checkmarks (too short, no uppercase, no number)
   - `abcdefgh` → 1 checkmark (length only)
   - `Abcdefgh` → 2 checkmarks (length + uppercase)
   - `Abcdefg1` → 4 checkmarks (all requirements met) ✓

2. **Verify** each requirement shows:
   - Gray circle (○) when not met
   - Green checkmark (✓) when met

#### C. Show/Hide Password Toggle
1. Type a password in the password field
2. Click the eye icon on the right
3. **Verify**: Password becomes visible as plain text
4. Click the eye icon again
5. **Verify**: Password is hidden again (dots)
6. Repeat for "Confirm Password" field

#### D. Complete Signup
1. Fill in all required fields:
   - Username: `testuser` (check for green checkmark "Username available")
   - Password: `Test1234` (should show green strength bar)
   - Confirm Password: `Test1234`
   - Shop Name: `Test Shop`
   - Owner Name: `Test Owner`
   - Business Type: Select any
   - City: `Mumbai`
   - Phone: `+919876543210` (optional)
   - Language: Keep English

2. Click "Create Account"
3. **Verify**: 
   - Redirected to home page
   - No errors shown
   - User is logged in

### 2. Test Login Flow

#### A. Show/Hide Password Toggle
1. Go to `/login`
2. Click on "Sign In" tab (should be default)
3. Type a password
4. Click the eye icon
5. **Verify**: Password becomes visible
6. Click eye icon again
7. **Verify**: Password is hidden

#### B. Login with Created Account
1. Enter username: `testuser`
2. Enter password: `Test1234`
3. Check "Remember this device" (optional)
4. Click "Sign In"
5. **Verify**:
   - Redirected to home page
   - User is logged in
   - Data syncs from DynamoDB

### 3. Test Username Availability

1. Go to signup form
2. Type username: `testuser` (already exists)
3. Wait 500ms (debounce)
4. **Verify**: 
   - Red error message: "Username already taken"
   - Red X icon appears

5. Type username: `newuser123`
6. Wait 500ms
7. **Verify**:
   - Green message: "Username available"
   - Green checkmark appears

### 4. Test Multi-language Support

#### A. Switch Language
1. On login page, click "हिंदी" button
2. **Verify**: All labels change to Hindi
3. Click "मराठी" button
4. **Verify**: All labels change to Marathi
5. Click "English" button
6. **Verify**: All labels change to English

#### B. Password Requirements in Hindi
1. Select Hindi language
2. Go to signup form
3. Type a password
4. **Verify** requirements show in Hindi:
   - कम से कम 8 अक्षर
   - एक बड़ा अक्षर (A-Z)
   - एक छोटा अक्षर (a-z)
   - एक संख्या (0-9)

#### C. Password Requirements in Marathi
1. Select Marathi language
2. Go to signup form
3. Type a password
4. **Verify** requirements show in Marathi:
   - किमान 8 वर्ण
   - एक मोठे अक्षर (A-Z)
   - एक लहान अक्षर (a-z)
   - एक संख्या (0-9)

### 5. Test Validation Errors

#### A. Weak Password
1. Try to signup with password: `abc123`
2. **Verify**: Error message shows password requirements

#### B. Password Mismatch
1. Password: `Test1234`
2. Confirm Password: `Test5678`
3. **Verify**: Error shows "Passwords do not match"

#### C. Username Too Short
1. Username: `ab`
2. **Verify**: Error shows username must be 3-20 characters

#### D. Missing Required Fields
1. Leave shop name empty
2. Try to submit
3. **Verify**: Error shows "All required fields must be provided"

### 6. Test Rate Limiting

#### A. Signup Rate Limit
1. Try to signup 6 times in quick succession
2. **Verify**: 6th attempt shows "Too many signup attempts"

#### B. Login Rate Limit
1. Try to login with wrong password 11 times
2. **Verify**: 11th attempt shows "Too many login attempts"

#### C. Username Check Rate Limit
1. Type 21 different usernames quickly
2. **Verify**: 21st check shows "Too many requests"

### 7. Test Session Management

#### A. Remember Device
1. Login with "Remember this device" checked
2. Close browser
3. Reopen browser and go to app
4. **Verify**: Still logged in (30-day session)

#### B. Default Session
1. Login without "Remember this device"
2. Check localStorage: `vyapar-user-session`
3. **Verify**: Session expires in 7 days

#### C. Logout
1. Click on profile/settings
2. Click logout
3. **Verify**: 
   - Redirected to login page
   - Session cleared from localStorage
   - Cannot access protected pages

### 8. Test Data Persistence

#### A. Profile Creation
1. After signup, check DynamoDB
2. **Verify** USER record exists:
   - PK: `USER#testuser`
   - SK: `METADATA`
   - Contains: userId, username, passwordHash

3. **Verify** PROFILE record exists:
   - PK: `PROFILE#{userId}`
   - SK: `METADATA`
   - Contains: shopName, userName, businessType, etc.

#### B. Login Statistics
1. Login multiple times
2. Check USER record in DynamoDB
3. **Verify**:
   - `loginCount` increments
   - `lastLoginAt` updates

## Expected Results Summary

✅ Password strength bar works in real-time
✅ Password requirements show with checkmarks
✅ Show/hide toggle works in all password fields
✅ Multi-language support works correctly
✅ Username availability checking works
✅ Form validation prevents invalid submissions
✅ Rate limiting prevents abuse
✅ Session management works correctly
✅ Data persists to DynamoDB
✅ Login statistics update correctly

## Troubleshooting

### Module Not Found Error
```bash
rm -rf .next
npm run build
npm run dev
```

### DynamoDB Connection Issues
1. Check `.env.local` has correct AWS credentials
2. Verify DynamoDB table exists: `vyapar-ai`
3. Check AWS region is correct: `ap-south-1`

### Session Not Persisting
1. Check browser localStorage
2. Look for `vyapar-user-session` key
3. Verify session hasn't expired

### Password Strength Not Updating
1. Check browser console for errors
2. Verify React state is updating
3. Try clearing browser cache

## Browser Compatibility

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Checks

- Username availability check: < 500ms
- Password strength calculation: Instant (no lag)
- Form submission: < 2 seconds
- Page load: < 3 seconds

## Security Checks

- ✅ Passwords never visible in network requests
- ✅ Password hashes stored (not plain text)
- ✅ Rate limiting prevents brute force
- ✅ Input sanitization prevents XSS/SQL injection
- ✅ Session tokens are random and unique
