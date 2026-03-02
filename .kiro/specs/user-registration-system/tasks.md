# Implementation Plan: User Registration System

## Overview

This implementation plan converts the user registration system design into actionable coding tasks. The system replaces the current demo-only authentication with a full-featured signup and login flow using username/password authentication, bcrypt password hashing, and DynamoDB for data persistence.

The implementation follows an incremental approach: core services first, then API endpoints, then UI components, and finally integration and testing. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [ ] 1. Set up core authentication services and utilities
  - [x] 1.1 Implement password hasher service with bcrypt
    - Create `lib/password-hasher.ts` with hash, verify, and validateStrength methods
    - Use bcryptjs library with 10 salt rounds
    - Include TypeScript interfaces for PasswordHashResult and PasswordVerifyResult
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 11.1, 11.2, 11.3, 11.4_
  
  - [x] 1.2 Write property tests for password hasher
    - **Property 6: Password Verification Correctness** - hashing then verifying with same password returns true
    - **Property 7: Password Verification Security** - hashing then verifying with different password returns false
    - **Property 8: Bcrypt Salt Rounds Configuration** - hash string indicates 10 salt rounds
    - **Validates: Requirements 11.5, 11.6, 11.2**
  
  - [x] 1.3 Implement username validator service
    - Create `lib/username-validator.ts` with validateFormat, checkAvailability, and sanitize methods
    - Format validation: alphanumeric + underscore, 3-20 characters
    - Case-insensitive uniqueness check against DynamoDB
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 1.4 Write property tests for username validator
    - **Property 1: Username Format Validation** - accepts only valid format
    - **Property 2: Username Case-Insensitive Uniqueness** - treats different cases as same username
    - **Property 3: Username Validation Idempotence** - multiple validations produce same result
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6**
  
  - [ ] 1.5 Implement input sanitizer service
    - Create `lib/input-sanitizer.ts` with sanitizeText, stripHtml, and detectSqlKeywords methods
    - Strip HTML tags, trim whitespace, reject SQL keywords
    - _Requirements: 10.3, 10.4, 12.5, 12.6_
  
  - [ ] 1.6 Write property tests for input sanitizer
    - **Property 26: Input Sanitization** - removes HTML tags and SQL keywords
    - **Validates: Requirements 10.3, 10.4, 12.5, 12.6**

- [ ] 2. Implement session management and rate limiting
  - [ ] 2.1 Create session manager service
    - Create `lib/session-manager.ts` with createSession, saveSession, loadSession, clearSession, and isSessionValid methods
    - Use localStorage for client-side session storage
    - Session duration: 7 days default, 30 days with remember device
    - _Requirements: 7.1, 7.3_
  
  - [ ] 2.2 Write unit tests for session manager
    - Test session creation, validation, expiration
    - Test remember device functionality
    - _Requirements: 7.1, 7.3_
  
  - [ ] 2.3 Implement rate limiter service
    - Create `lib/rate-limiter.ts` with check and reset methods
    - In-memory Map with automatic cleanup
    - Limits: signup (5/hour), login (10/15min), username check (20/min)
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [ ] 2.4 Write unit tests for rate limiter
    - Test rate limit enforcement
    - Test automatic cleanup
    - Test different limit configurations
    - _Requirements: 10.1, 10.2, 10.5_

- [ ] 3. Create authentication API endpoints
  - [ ] 3.1 Implement POST /api/auth/signup endpoint
    - Create `app/api/auth/signup/route.ts`
    - Validate input, check username uniqueness, hash password
    - Generate userId with UUID v4
    - Create USER and PROFILE records in DynamoDB using TransactWriteItems
    - Create authenticated session
    - Return success with userId
    - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.4, 7.1_
  
  - [ ] 3.2 Write property tests for signup endpoint
    - **Property 9: DynamoDB Key Format for USER Records** - PK format "USER#username", SK "METADATA"
    - **Property 10: DynamoDB Key Format for PROFILE Records** - PK format "PROFILE#userId", SK "METADATA"
    - **Property 11: Unique UserId Generation** - different accounts have different userIds
    - **Property 12: User-Profile Referential Integrity** - userId matches in both records
    - **Property 13: Required Fields in Data Stores** - all required fields present
    - **Property 14: Signup Creates Both Records** - atomic creation of USER and PROFILE
    - **Property 16: Session Creation After Signup** - valid session created after signup
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.4, 7.1**
  
  - [ ] 3.3 Implement POST /api/auth/login endpoint
    - Create `app/api/auth/login/route.ts`
    - Query USER record by username (case-insensitive)
    - Verify password hash using bcrypt
    - Update lastLoginAt and loginCount
    - Create authenticated session
    - Return success with user data
    - _Requirements: 5.2, 5.5, 7.3_
  
  - [ ] 3.4 Write property tests for login endpoint
    - **Property 15: Login Verifies Credentials** - success only if username exists and password matches
    - **Property 17: Session Creation After Login** - valid session created after login
    - **Validates: Requirements 5.5, 7.3**
  
  - [ ] 3.5 Implement GET /api/auth/check-username endpoint
    - Create `app/api/auth/check-username/route.ts`
    - Validate username format
    - Check uniqueness in DynamoDB (case-insensitive)
    - Return availability status within 500ms
    - Apply rate limiting (20 per IP per minute)
    - _Requirements: 2.3, 2.4, 5.3, 5.6, 10.2_
  
  - [ ] 3.6 Write unit tests for check-username endpoint
    - Test format validation
    - Test uniqueness check
    - Test response time < 500ms
    - Test rate limiting
    - _Requirements: 2.3, 2.4, 5.6, 10.2_

- [ ] 4. Checkpoint - Ensure API endpoints work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Build UI components for authentication forms
  - [ ] 5.1 Create username input component with real-time validation
    - Create `components/auth/UsernameInput.tsx`
    - Debounced availability check (500ms)
    - Display validation feedback inline
    - Multi-language error messages
    - _Requirements: 2.4, 2.5_
  
  - [ ] 5.2 Write unit tests for username input component
    - Test debouncing behavior
    - Test validation feedback display
    - Test multi-language support
    - _Requirements: 2.4, 2.5_
  
  - [ ] 5.3 Create password input component with strength meter
    - Create `components/auth/PasswordInput.tsx`
    - Client-side strength validation
    - Visual strength indicator
    - Show/hide password toggle
    - Multi-language validation messages
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [ ] 5.4 Write unit tests for password input component
    - Test strength validation
    - Test visual feedback
    - Test show/hide toggle
    - _Requirements: 3.1, 3.2, 3.5_
  
  - [ ] 5.5 Implement signup form component
    - Create `components/auth/SignupForm.tsx`
    - Collect all registration fields: username, password, confirm password, shop name, owner name, business type, city, phone, language
    - Business type dropdown with options: Retail, Wholesale, Services, Manufacturing, Restaurant, Other
    - Language selector with options: English, Hindi, Marathi (default: English)
    - Client-side validation for all fields
    - Password match validation
    - Display field-level errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.7, 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 5.6 Write property tests for signup form validation
    - **Property 4: Password Strength Validation** - accepts only passwords meeting strength requirements
    - **Property 28: Text Field Length Validation** - validates field lengths 1-100 characters
    - **Property 29: Phone Number Format Validation** - validates international phone format
    - **Property 31: Required Field Validation** - rejects submission with empty required fields
    - **Validates: Requirements 3.1, 3.2, 12.1, 12.2, 12.3, 12.4, 1.2**
  
  - [ ] 5.7 Implement login form component
    - Create `components/auth/LoginForm.tsx`
    - Username and password fields
    - Remember device checkbox
    - Error message display
    - Loading state indication
    - _Requirements: 6.2_
  
  - [ ] 5.8 Write unit tests for login form component
    - Test form submission
    - Test remember device checkbox
    - Test error display
    - Test loading states
    - _Requirements: 6.2_

- [ ] 6. Create unified login page with mode toggle
  - [ ] 6.1 Implement login page with sign in/sign up toggle
    - Create `app/login/page.tsx`
    - Toggle control to switch between Sign In and Sign Up modes
    - Display LoginForm in Sign In mode
    - Display SignupForm in Sign Up mode
    - Smooth visual transitions between modes
    - Clear form data on mode switch
    - Language selector
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 6.2 Write property tests for login page
    - **Property 19: Form Mode Switching Clears Data** - switching modes clears all form inputs
    - **Validates: Requirements 6.5**
  
  - [ ] 6.3 Write unit tests for login page
    - Test mode toggle functionality
    - Test form rendering in each mode
    - Test transitions
    - Test language selector
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Implement error handling and multi-language support
  - [ ] 7.1 Add authentication translations to translation engine
    - Update `lib/translations.ts` with new keys for registration
    - Add translations for English, Hindi, and Marathi
    - Include all labels, error messages, and validation messages
    - Keys: username_label, password_label, shop_name_label, owner_name_label, business_type_label, city_label, phone_label, language_label, signup_button, login_button, username_taken, passwords_no_match, weak_password, connection_error, etc.
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 7.2 Write property tests for translation completeness
    - **Property 23: Translation Completeness** - all registration text keys have translations for all languages
    - **Validates: Requirements 9.4**
  
  - [ ] 7.3 Implement error handling in API endpoints
    - Add try-catch blocks for DynamoDB operations
    - Log errors with context (timestamp, IP, user input)
    - Return generic error messages to client
    - Never expose sensitive information
    - _Requirements: 8.4, 8.5, 10.6_
  
  - [ ] 7.4 Write property tests for error handling
    - **Property 20: DynamoDB Error Handling** - logs details, returns generic message
    - **Property 27: Failed Login Attempt Logging** - logs failed attempts with timestamp and IP
    - **Validates: Requirements 8.5, 10.6**

- [ ] 8. Checkpoint - Ensure UI and error handling work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement post-registration flow and navigation
  - [ ] 9.1 Add post-signup redirect logic
    - After successful signup, create session and redirect to home page
    - _Requirements: 7.1, 7.2_
  
  - [ ] 9.2 Add post-login redirect logic
    - After successful login, create session
    - Check profile completeness (shopName and ownerName present)
    - Redirect to home if profile complete, otherwise to profile setup
    - _Requirements: 7.3, 7.4_
  
  - [ ] 9.3 Write property tests for post-authentication flow
    - **Property 18: Post-Login Navigation Based on Profile** - redirects based on profile completeness
    - **Validates: Requirements 7.4**
  
  - [ ] 9.4 Write unit tests for navigation logic
    - Test redirect after signup
    - Test redirect after login with complete profile
    - Test redirect after login with incomplete profile
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 10. Implement security features and validation
  - [ ] 10.1 Add rate limiting to all auth endpoints
    - Apply rate limiter in signup endpoint (5 per IP per hour)
    - Apply rate limiter in login endpoint (10 per IP per 15 minutes)
    - Apply rate limiter in check-username endpoint (20 per IP per minute)
    - Return HTTP 429 with Retry-After header when exceeded
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [ ] 10.2 Write property tests for rate limiting
    - **Property 25: Rate Limiting Enforcement** - returns 429 when limits exceeded
    - **Validates: Requirements 10.1, 10.2, 10.5**
  
  - [ ] 10.3 Add input sanitization to all endpoints
    - Sanitize all text inputs before processing
    - Strip HTML tags
    - Reject SQL keywords in unexpected fields
    - Escape output when rendering user data
    - _Requirements: 10.3, 10.4, 12.5, 12.6_
  
  - [ ] 10.4 Add server-side validation to signup endpoint
    - Validate all required fields are non-empty
    - Validate field lengths (shop name, owner name, city: 1-100 chars)
    - Validate phone number format if provided
    - Validate password strength
    - Return specific field errors
    - _Requirements: 1.2, 3.6, 12.1, 12.2, 12.3, 12.4, 12.7_
  
  - [ ] 10.5 Write property tests for validation
    - **Property 30: Validation Error Specificity** - identifies which fields failed validation
    - **Validates: Requirements 12.7**

- [ ] 11. Update DynamoDB schema and services
  - [ ] 11.1 Extend DynamoDB client for USER and PROFILE entities
    - Update `lib/dynamodb-client.ts` to support USER and PROFILE entity types
    - Add methods: createUser, getUserByUsername, getUserById, createProfile, getProfile, updateProfile
    - Use TransactWriteItems for atomic USER + PROFILE creation
    - Implement GSI1 for userId lookups
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 11.2 Write unit tests for DynamoDB client extensions
    - Test USER record creation with correct PK/SK format
    - Test PROFILE record creation with correct PK/SK format
    - Test atomic transaction for both records
    - Test case-insensitive username queries
    - Test userId uniqueness
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 12. Implement language preference persistence
  - [ ] 12.1 Store language preference in PROFILE record
    - Include language field in PROFILE creation
    - Update profile when language changes
    - _Requirements: 9.5_
  
  - [ ] 12.2 Write property tests for language persistence
    - **Property 24: Language Preference Persistence** - selected language stored in PROFILE
    - **Validates: Requirements 9.5**
  
  - [ ] 12.3 Write unit tests for language preference
    - Test language stored during signup
    - Test language retrieved on login
    - Test language update
    - _Requirements: 9.5_

- [ ] 13. Create migration script for admin account
  - [ ] 13.1 Implement admin account migration script
    - Create `scripts/migrate-admin-account.ts`
    - Hash "vyapar123" password with bcrypt
    - Create USER record for "admin" username
    - Create PROFILE record with default admin profile
    - Log success message
    - _Requirements: N/A (migration task)_
  
  - [ ] 13.2 Write unit tests for migration script
    - Test USER record creation
    - Test PROFILE record creation
    - Test password hashing
    - _Requirements: N/A (migration task)_

- [ ] 14. Checkpoint - Ensure all features integrated correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Integration testing and final wiring
  - [ ] 15.1 Wire signup flow end-to-end
    - Connect SignupForm to /api/auth/signup
    - Handle success and error responses
    - Create session on success
    - Redirect to home page
    - _Requirements: 1.1, 5.4, 7.1, 7.2_
  
  - [ ] 15.2 Wire login flow end-to-end
    - Connect LoginForm to /api/auth/login
    - Handle success and error responses
    - Create session on success
    - Redirect based on profile completeness
    - _Requirements: 5.5, 7.3, 7.4_
  
  - [ ] 15.3 Wire username availability check
    - Connect UsernameInput to /api/auth/check-username
    - Debounce requests (500ms)
    - Display real-time feedback
    - _Requirements: 2.4, 2.5, 5.6_
  
  - [ ] 15.4 Write integration tests for complete flows
    - **Test complete signup flow**: form submission → API → DynamoDB → session → redirect
    - **Test complete login flow**: form submission → API → verification → session → redirect
    - **Test username availability check**: input → debounce → API → feedback
    - **Test multi-language support**: language selection → labels update → errors in selected language
    - **Test rate limiting**: multiple requests → rate limit → 429 response
    - _Requirements: All requirements_

- [ ] 16. Remove old authentication system
  - [ ] 16.1 Update auth checks to use new session manager
    - Replace simple-auth-manager usage with session-manager
    - Update all components that check authentication
    - Update middleware if applicable
    - _Requirements: N/A (cleanup task)_
  
  - [ ] 16.2 Remove hardcoded credentials and old auth files
    - Delete `lib/simple-auth-manager.ts` if it exists
    - Remove hardcoded admin/vyapar123 references
    - Update all imports
    - _Requirements: N/A (cleanup task)_
  
  - [ ] 16.3 Write unit tests for auth check updates
    - Test authentication checks use new session manager
    - Test protected routes work correctly
    - _Requirements: N/A (cleanup task)_

- [ ] 17. Final checkpoint - Ensure complete system works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout
- All API endpoints use Next.js App Router conventions
- DynamoDB operations use AWS SDK v3
- Password hashing uses bcryptjs (pure JavaScript, no native dependencies)
- Session management uses localStorage (client-side only)
- Rate limiting uses in-memory Map (suitable for single-instance deployment)
