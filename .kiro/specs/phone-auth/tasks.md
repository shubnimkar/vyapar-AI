# Implementation Plan: Phone-Based OTP Authentication

## Overview

This implementation plan breaks down the phone-based OTP authentication feature into incremental coding tasks. Each task builds on previous work, with testing integrated throughout to catch issues early. The implementation follows the hybrid sync architecture, extending it to support authenticated users while maintaining offline-first functionality.

## Tasks

- [x] 1. Set up Supabase Auth configuration and database schema updates
  - Update `.env.local` with Supabase Auth configuration
  - Create SQL migration file `supabase/phone-auth-migration.sql` for schema updates
  - Add phone_number, phone_verified, and auth_provider columns to users table
  - Update RLS policies for authenticated user access
  - Test schema changes in Supabase SQL Editor
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 2. Implement core authentication manager
  - [x] 2.1 Create `lib/auth-manager.ts` with phone validation and formatting
    - Implement `validatePhoneNumber()` function for Indian mobile format
    - Implement `formatPhoneNumber()` to E.164 format (+91XXXXXXXXXX)
    - Add localized error messages for validation failures
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [ ]* 2.2 Write property test for phone validation
    - **Property 1: Phone Number Validation and Formatting**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  
  - [x] 2.3 Implement OTP operations in auth-manager
    - Implement `sendOTP()` using Supabase Auth signInWithOtp
    - Implement `verifyOTP()` for code verification
    - Implement `resendOTP()` with cooldown logic
    - Add rate limiting (3 attempts per hour)
    - _Requirements: 2.1, 2.3, 2.5, 2.6, 4.2, 4.4_
  
  - [ ]* 2.4 Write property tests for OTP operations
    - **Property 2: OTP Generation Consistency**
    - **Property 3: OTP Invalidation on Regeneration**
    - **Property 4: Rate Limiting Enforcement**
    - **Property 5: OTP Verification Correctness**
    - **Property 6: Verification Attempt Limiting**
    - **Property 7: Resend Cooldown Enforcement**
    - **Validates: Requirements 2.1, 2.3, 2.5, 2.6, 3.2, 3.3, 3.4, 3.6, 4.2, 4.4**

- [ ] 3. Implement session management
  - [x] 3.1 Create `lib/session-store.ts` for session persistence
    - Implement `saveSession()` to store in localStorage
    - Implement `loadSession()` to retrieve from localStorage
    - Implement `clearSession()` for logout
    - Implement `isSessionValid()` for validation
    - Implement `shouldRefresh()` for auto-refresh logic
    - Add remember device preference storage
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 12.2, 12.3, 12.4_
  
  - [ ]* 3.2 Write property tests for session management
    - **Property 10: Session Creation and Persistence Round Trip**
    - **Property 11: Session Validation Logic**
    - **Property 12: Session Refresh Before Expiry**
    - **Property 19: Session Duration Based on Remember Device**
    - **Property 20: Remember Device Preference Persistence**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.2, 12.3, 12.4**
  
  - [x] 3.3 Add session management methods to auth-manager
    - Implement `getSession()` to retrieve current session
    - Implement `refreshSession()` for token refresh
    - Implement `logout()` to clear session and invalidate token
    - Implement `isAuthenticated()` state check
    - Implement `getCurrentUser()` to get user info
    - _Requirements: 6.3, 6.4, 6.6, 9.2, 9.3_
  
  - [ ]* 3.4 Write property tests for logout and access control
    - **Property 16: Logout Session Cleanup**
    - **Property 17: Post-Logout Access Denial**
    - **Validates: Requirements 9.2, 9.3, 9.5, 12.5**

- [ ] 4. Checkpoint - Ensure core auth logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement data migration service
  - [x] 5.1 Create `lib/data-migrator.ts` for device data migration
    - Implement `needsMigration()` to check migration status
    - Implement `migrateDeviceData()` to transfer localStorage to Supabase
    - Add user_id to all daily_entries and credit_entries
    - Implement `markMigrated()` to set migration flag
    - Implement `rollbackMigration()` for error recovery
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 5.2 Write property tests for data migration
    - **Property 8: Data Migration Completeness**
    - **Property 9: Migration Idempotency**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.6**
  
  - [ ]* 5.3 Write unit tests for migration edge cases
    - Test migration with empty localStorage
    - Test migration failure and rollback
    - Test migration flag persistence
    - _Requirements: 5.5_

- [ ] 6. Create Supabase Auth integration wrapper
  - [x] 6.1 Create `lib/supabase-auth.ts` wrapper
    - Implement `signInWithOtp()` wrapper for Supabase Auth
    - Implement `verifyOtp()` wrapper
    - Implement `getSession()` wrapper
    - Implement `refreshSession()` wrapper
    - Implement `signOut()` wrapper
    - Add error handling and logging
    - _Requirements: 2.1, 2.2, 3.2, 3.3, 6.3, 6.6, 9.2_
  
  - [ ]* 6.2 Write integration tests for Supabase Auth
    - Test OTP send and verify flow
    - Test session refresh
    - Test logout
    - _Requirements: 2.1, 3.2, 6.6, 9.2_

- [ ] 7. Implement localization for auth flows
  - [x] 7.1 Extend `lib/translations.ts` with auth translations
    - Add phone input labels and placeholders
    - Add OTP input labels
    - Add error messages for all error types
    - Add button labels (Send OTP, Verify, Resend, Logout)
    - Add success messages
    - Translate all strings to Hindi and Marathi
    - _Requirements: 1.4, 2.4, 3.4, 4.5, 7.1, 7.2, 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 7.2 Write property test for localization
    - **Property 13: Multi-Language Localization**
    - **Validates: Requirements 7.1, 7.2, 4.5**
  
  - [ ]* 7.3 Write unit tests for default language behavior
    - Test English default when preference not set
    - _Requirements: 7.4_

- [ ] 8. Build PhoneInput UI component
  - [x] 8.1 Create `components/auth/PhoneInput.tsx`
    - Create phone number input with auto +91 prefix
    - Add real-time validation with error display
    - Use numeric keyboard (inputMode="numeric")
    - Add large touch targets (min 44px height)
    - Implement loading state during OTP send
    - Add localized labels and errors
    - Style with Tailwind CSS matching app design
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [ ]* 8.2 Write unit tests for PhoneInput component
    - Test component renders correctly
    - Test validation triggers on input
    - Test submit with valid/invalid numbers
    - Test localization in all languages
    - _Requirements: 1.1, 1.2, 1.4_

- [ ] 9. Build OTPInput UI component
  - [x] 9.1 Create `components/auth/OTPInput.tsx`
    - Create 6-digit OTP input with auto-focus
    - Implement auto-submit on 6th digit
    - Add paste support for SMS codes
    - Add resend button with 60-second countdown
    - Display phone number for context
    - Add loading states for verify and resend
    - Add error display with localization
    - Style with Tailwind CSS
    - _Requirements: 3.1, 3.4, 4.1, 4.2, 4.3, 4.5_
  
  - [ ]* 9.2 Write unit tests for OTPInput component
    - Test 6-digit input behavior
    - Test resend cooldown logic
    - Test paste functionality
    - Test error display
    - _Requirements: 3.1, 4.1, 4.2_

- [ ] 10. Build AuthGuard component
  - [x] 10.1 Create `components/auth/AuthGuard.tsx`
    - Check session on mount
    - Show login screen if not authenticated
    - Show children if authenticated
    - Handle session refresh
    - Add loading state during session check
    - _Requirements: 6.3, 6.4, 6.5, 9.5_
  
  - [ ]* 10.2 Write unit tests for AuthGuard
    - Test redirect when not authenticated
    - Test children render when authenticated
    - Test session refresh trigger
    - _Requirements: 6.3, 6.4, 9.5_

- [ ] 11. Create login page and flow
  - [x] 11.1 Create `app/login/page.tsx`
    - Implement two-step flow: phone input → OTP input
    - Integrate PhoneInput and OTPInput components
    - Handle OTP send, verify, and resend
    - Show appropriate error messages
    - Trigger data migration on first login
    - Redirect to home page on success
    - Add "Remember this device" checkbox
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3, 4.4, 5.1, 12.1, 12.2_
  
  - [ ]* 11.2 Write integration tests for login flow
    - Test complete phone → OTP → success flow
    - Test first-time login triggers migration
    - Test remember device checkbox
    - Test error scenarios
    - _Requirements: 1.1, 2.1, 3.2, 5.1, 12.1_

- [ ] 12. Checkpoint - Ensure UI components and login flow work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Add user profile display
  - [x] 13.1 Create `components/auth/UserProfile.tsx`
    - Display formatted phone number (+91 XXXXX XXXXX)
    - Display account creation date
    - Add logout button
    - Style with Tailwind CSS
    - _Requirements: 8.1, 8.4, 9.1_
  
  - [ ]* 13.2 Write property test for phone display formatting
    - **Property 15: Phone Number Display Formatting**
    - **Validates: Requirements 8.4**
  
  - [ ]* 13.3 Write unit tests for UserProfile component
    - Test profile data display
    - Test logout button triggers logout
    - _Requirements: 8.1, 9.1_

- [ ] 14. Update sync engine for authenticated users
  - [x] 14.1 Modify `lib/sync-engine.ts` to support user_id
    - Update `syncDailyEntries()` to include user_id when authenticated
    - Update `syncCreditEntries()` to include user_id when authenticated
    - Update `fetchDailyEntries()` to query by user_id when authenticated
    - Update `fetchCreditEntries()` to query by user_id when authenticated
    - Maintain backward compatibility with device_id for unauthenticated users
    - _Requirements: 5.2, 5.3, 10.1_
  
  - [ ]* 14.2 Write property test for RLS data isolation
    - **Property 18: Row-Level Security Data Isolation**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ]* 14.3 Write unit tests for authenticated sync
    - Test sync with user_id
    - Test fetch filters by user_id
    - Test backward compatibility with device_id
    - _Requirements: 5.2, 10.1_

- [ ] 15. Update existing pages with AuthGuard
  - [x] 15.1 Wrap main app page with AuthGuard
    - Update `app/page.tsx` to require authentication
    - Add UserProfile component to header/nav
    - Ensure unauthenticated users redirect to login
    - _Requirements: 6.4, 9.5_
  
  - [ ] 15.2 Add session check to app initialization
    - Check for valid session on app load
    - Auto-refresh session if needed
    - Redirect to login if session invalid
    - _Requirements: 6.3, 6.5, 6.6_

- [ ] 16. Implement error handling and user feedback
  - [ ] 16.1 Create error handling utilities
    - Create `lib/auth-errors.ts` with error type definitions
    - Implement error message mapping for all error types
    - Add localized error messages
    - Implement error logging (console in dev, optional tracking in prod)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 16.2 Write unit tests for error handling
    - Test SMS delivery failure handling
    - Test network error handling
    - Test rate limit error handling
    - Test migration error handling
    - _Requirements: 2.4, 5.5, 11.1, 11.2, 11.3, 11.4_

- [ ] 17. Add offline support for authentication
  - [ ] 17.1 Implement offline authentication handling
    - Cache authentication state in localStorage
    - Allow app usage with cached session when offline
    - Queue auth operations when offline
    - Sync auth state when connection restored
    - Show offline indicator during auth flows
    - _Requirements: 6.2, 11.2_
  
  - [ ]* 17.2 Write unit tests for offline behavior
    - Test cached session usage when offline
    - Test auth operation queuing
    - Test sync on reconnection
    - _Requirements: 6.2, 11.2_

- [ ] 18. Update database schema in Supabase
  - [ ] 18.1 Run phone-auth-migration.sql in Supabase
    - Execute schema updates in Supabase SQL Editor
    - Verify new columns added to users table
    - Verify RLS policies updated correctly
    - Test policies with sample authenticated queries
    - _Requirements: 8.2, 8.3, 8.5, 10.1, 10.2, 10.4_
  
  - [ ]* 18.2 Write property tests for user account data
    - **Property 14: User Account Data Format**
    - **Validates: Requirements 8.2, 8.3, 8.5**
  
  - [ ]* 18.3 Write unit tests for RLS policies
    - Test authenticated user can access own data
    - Test authenticated user cannot access other user's data
    - Test unauthenticated access denied
    - _Requirements: 10.1, 10.2, 10.4_

- [ ] 19. Final integration and testing
  - [ ] 19.1 Test complete authentication flows
    - Test new user signup flow
    - Test returning user login flow
    - Test multi-device login
    - Test data migration on first login
    - Test logout and re-login
    - Test session persistence across page reloads
    - _Requirements: 1.1, 2.1, 3.2, 5.1, 6.2, 9.2_
  
  - [ ]* 19.2 Write end-to-end integration tests
    - Test complete login → use app → logout flow
    - Test first-time user with data migration
    - Test multi-device data sync
    - Test offline → online sync
    - _Requirements: 5.1, 6.2, 10.1_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (20 properties total)
- Unit tests validate specific examples, edge cases, and UI components
- Integration tests validate complete flows and multi-component interactions
- All code uses TypeScript with Next.js App Router
- Authentication uses Supabase Auth with SMS OTP
- Maintains offline-first architecture with localStorage + Supabase sync
- Multi-language support (English, Hindi, Marathi) throughout
- RLS policies enforce data isolation at database level
