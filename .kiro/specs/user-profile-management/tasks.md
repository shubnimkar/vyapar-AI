# Implementation Plan: User Profile & Data Management System

## Overview

This implementation plan breaks down the User Profile & Data Management System into discrete coding tasks. The approach follows an incremental strategy: database schema first, then API endpoints, then UI components, with testing integrated throughout. Each task builds on previous work and includes checkpoint tasks to ensure stability before proceeding.

## Tasks

- [x] 1. Database schema migration and automated functions
  - Create migration file to extend users table with profile columns
  - Add is_archived column to daily_entries, credit_entries tables
  - Create reports table with proper indexes
  - Implement archive_old_entries() database function
  - Implement cleanup_inactive_users() database function
  - Implement process_account_deletions() database function
  - Add database constraints for validation (language, retention days, subscription tier)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ]* 1.1 Write property test for profile creation defaults
  - **Property 4: Profile Creation Defaults**
  - **Validates: Requirements 2.2, 2.3, 2.4**

- [ ]* 1.2 Write property test for profile creation atomicity
  - **Property 5: Profile Creation Atomicity**
  - **Validates: Requirements 2.1, 2.6**

- [x] 2. Extend TypeScript interfaces and types
  - [x] 2.1 Add UserProfile interface to lib/types.ts
    - Include all profile fields (shop_name, user_name, language, business_type, city)
    - Include account status fields (is_active, subscription_tier, last_active_at)
    - Include preferences interface (data_retention_days, auto_archive, notifications_enabled, currency)
    - Include deletion tracking fields (deletion_requested_at, deletion_scheduled_at)
    - _Requirements: 2.1, 3.1, 6.1_

  - [x] 2.2 Add ProfileSetupData and API response types
    - Create ProfileSetupData interface for form submission
    - Create DeletionInfo interface for grace period tracking
    - Create APIResponse generic type for consistent API responses
    - _Requirements: 1.1, 6.4_

- [x] 3. Create profile API endpoints
  - [x] 3.1 Implement POST /api/profile/setup endpoint
    - Validate required fields (shop_name, user_name, language)
    - Check authentication (get user from session)
    - Create or update user profile in Supabase
    - Set default preferences if not provided
    - Return created profile or validation errors
    - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 9.1_

  - [ ]* 3.2 Write property test for required field validation
    - **Property 2: Required Field Validation**
    - **Validates: Requirements 1.5**

  - [ ]* 3.3 Write property test for auto-populated fields
    - **Property 3: Auto-Populated Fields**
    - **Validates: Requirements 1.6**

  - [x] 3.4 Implement GET /api/profile endpoint
    - Check authentication (401 if not authenticated)
    - Fetch user profile from Supabase by user_id
    - Return profile data or 404 if not found
    - _Requirements: 3.1, 9.2, 9.6_

  - [ ]* 3.5 Write property test for settings display accuracy
    - **Property 6: Settings Display Accuracy**
    - **Validates: Requirements 3.1**

  - [x] 3.6 Implement PUT /api/profile endpoint
    - Check authentication (401 if not authenticated)
    - Validate input data (retention days 30-365, valid language)
    - Update user profile in Supabase
    - Trigger sync to cloud via sync-engine
    - Return updated profile or validation errors (400)
    - _Requirements: 3.5, 3.6, 9.3, 9.6, 9.7_

  - [ ]* 3.7 Write property test for preferences validation
    - **Property 7: Preferences Validation**
    - **Validates: Requirements 3.5**

  - [ ]* 3.8 Write property test for profile update persistence
    - **Property 8: Profile Update Persistence**
    - **Validates: Requirements 3.6**

  - [x] 3.9 Implement POST /api/profile/delete endpoint
    - Check authentication (401 if not authenticated)
    - Set deletion_requested_at to current timestamp
    - Calculate deletion_scheduled_at as 30 days from now
    - Archive all user data (set is_archived=true)
    - Return deletion info with scheduled date
    - _Requirements: 6.1, 6.2, 6.3, 9.4, 9.6_

  - [ ]* 3.10 Write property test for deletion request initialization
    - **Property 16: Deletion Request Initialization**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 3.11 Implement POST /api/profile/cancel-deletion endpoint
    - Check authentication (401 if not authenticated)
    - Clear deletion_requested_at and deletion_scheduled_at
    - Restore user data (set is_archived=false)
    - Return success confirmation
    - _Requirements: 6.5, 6.6, 9.5, 9.6_

  - [ ]* 3.12 Write property test for deletion cancellation
    - **Property 17: Deletion Cancellation**
    - **Validates: Requirements 6.5, 6.6**

  - [ ]* 3.13 Write property test for API authentication enforcement
    - **Property 23: API Authentication Enforcement**
    - **Validates: Requirements 9.6**

  - [ ]* 3.14 Write property test for API validation errors
    - **Property 24: API Validation Errors**
    - **Validates: Requirements 9.7**

- [ ] 4. Checkpoint - Ensure API endpoints work correctly
  - Test all profile API endpoints manually or with integration tests
  - Verify database schema is correctly applied
  - Ensure authentication checks work properly
  - Ask the user if questions arise

- [x] 5. Add translation keys for profile UI
  - [x] 5.1 Extend lib/translations.ts with profile translations
    - Add profile setup screen translations (title, field labels, buttons)
    - Add settings page translations (sections, preferences, actions)
    - Add account deletion translations (warnings, confirmations)
    - Add validation error translations
    - Support all three languages (en, hi, mr)
    - _Requirements: 8.1, 8.4_

  - [ ]* 5.2 Write property test for translation completeness
    - **Property 19: Translation Completeness**
    - **Validates: Requirements 8.1**

- [x] 6. Create ProfileSetupForm component
  - [x] 6.1 Build profile setup form UI
    - Create form with required fields (shop name, user name, language selector)
    - Add optional fields (business type dropdown, city input)
    - Implement "Skip for Now" and "Complete Profile" buttons
    - Add inline validation with error messages
    - Auto-focus first empty required field
    - Use translations for all text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.3_

  - [x] 6.2 Implement form submission logic
    - Call POST /api/profile/setup on submit
    - Handle validation errors and display inline
    - Navigate to dashboard on success
    - Show loading state during submission
    - _Requirements: 1.4, 1.5, 1.7_

  - [ ]* 6.3 Write property test for profile creation with skip
    - **Property 1: Profile Creation with Skip**
    - **Validates: Requirements 1.4**

  - [ ]* 6.4 Write unit tests for ProfileSetupForm
    - Test rendering with all fields
    - Test validation error display
    - Test skip vs complete button behavior
    - Test form submission success/failure

- [x] 7. Create UserSettings component
  - [x] 7.1 Build settings page UI structure
    - Create sections: Profile Information, Account Information, Data Preferences, Account Actions
    - Display read-only fields (phone, created date, last active)
    - Create editable fields with inline editing
    - Use translations for all text
    - _Requirements: 3.1, 3.2, 3.3, 8.3_

  - [x] 7.2 Implement DataRetentionSettings sub-component
    - Create slider for retention days (30-365) with visual markers
    - Add toggle for auto-archive with explanation
    - Add toggle for notifications
    - Show estimated data size impact
    - _Requirements: 3.4_

  - [x] 7.3 Implement settings update logic
    - Fetch current profile on component mount (GET /api/profile)
    - Track changes and enable save button when modified
    - Call PUT /api/profile on save
    - Handle validation errors and display inline
    - Show success confirmation after save
    - _Requirements: 3.1, 3.5, 3.6_

  - [ ]* 7.4 Write property test for language UI reactivity
    - **Property 9: Language UI Reactivity**
    - **Validates: Requirements 3.7**

  - [ ]* 7.5 Write property test for language preference persistence
    - **Property 20: Language Preference Persistence**
    - **Validates: Requirements 8.2, 8.3**

  - [ ]* 7.6 Write unit tests for UserSettings component
    - Test profile data display
    - Test editable vs read-only fields
    - Test save functionality
    - Test validation error handling

- [x] 8. Create AccountDeletion component
  - [x] 8.1 Build account deletion flow UI
    - Create confirmation step with warning message
    - Require typing "DELETE" to confirm
    - Show grace period step with scheduled deletion date
    - Add cancel deletion button
    - Use translations for all text
    - _Requirements: 6.1, 6.4, 6.5, 8.3_

  - [x] 8.2 Implement deletion request logic
    - Call POST /api/profile/delete on confirmation
    - Display scheduled deletion date
    - Show countdown timer for grace period
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.3 Implement cancellation logic
    - Call POST /api/profile/cancel-deletion on cancel
    - Show confirmation of cancellation
    - Restore access to account
    - _Requirements: 6.5, 6.6_

  - [ ]* 8.4 Write unit tests for AccountDeletion component
    - Test confirmation flow
    - Test grace period display
    - Test cancellation flow
    - Test error handling

- [x] 9. Integrate profile setup into auth flow
  - [x] 9.1 Update login page to redirect to profile setup
    - After successful OTP verification, check if profile is complete
    - Redirect to profile setup if shop_name or user_name is null
    - Redirect to dashboard if profile is complete
    - _Requirements: 1.1, 1.7_

  - [x] 9.2 Update auth-manager.ts to handle profile status
    - Add function to check if profile is complete
    - Return isFirstLogin flag from verifyOTP
    - Store profile completion status in session
    - _Requirements: 1.1, 2.1_

- [ ] 10. Extend sync-engine for profile sync
  - [ ] 10.1 Add syncUserProfile function to lib/sync-engine.ts
    - Sync profile updates to Supabase
    - Handle offline mode (queue for later sync)
    - Merge conflicts with last-write-wins strategy
    - _Requirements: 3.6_

  - [ ] 10.2 Update performFullSync to include profile
    - Fetch and merge profile data during full sync
    - Update last_active_at on every sync
    - _Requirements: 3.1, 5.5_

- [ ] 11. Implement S3 file cleanup for account deletion
  - [ ] 11.1 Create lib/s3-cleanup.ts module
    - Implement deleteUserS3Files function
    - List all objects in vyapar-receipts and vyapar-voice-uploads buckets with user prefix
    - Delete all user files from S3
    - Handle errors and log for manual intervention
    - _Requirements: 6.8_

  - [ ] 11.2 Integrate S3 cleanup into deletion process
    - Call deleteUserS3Files in process_account_deletions function
    - Ensure S3 cleanup happens before database deletion
    - Handle partial deletion failures
    - _Requirements: 6.8_

  - [ ]* 11.3 Write property test for permanent deletion
    - **Property 18: Permanent Deletion**
    - **Validates: Requirements 6.8, 6.9**

- [ ] 12. Checkpoint - Test complete profile flow end-to-end
  - Test new user signup → profile setup → dashboard
  - Test existing user settings update
  - Test account deletion request → grace period → cancellation
  - Test data archival with different retention settings
  - Ensure all tests pass, ask the user if questions arise

- [ ] 13. Implement database function tests
  - [ ] 13.1 Create test suite for archive_old_entries function
    - Test archival based on user retention settings
    - Test that auto_archive=false prevents archival
    - Test paid credit archival after 30 days
    - Test report archival after 30 days
    - _Requirements: 4.2, 4.3, 4.5, 4.7_

  - [ ]* 13.2 Write property test for age-based archival
    - **Property 10: Age-Based Archival**
    - **Validates: Requirements 4.2, 4.3, 4.5**

  - [ ]* 13.3 Write property test for archived data preservation
    - **Property 11: Archived Data Preservation**
    - **Validates: Requirements 4.6**

  - [ ]* 13.4 Write property test for auto-archive preference
    - **Property 12: Auto-Archive Preference Respected**
    - **Validates: Requirements 4.7**

  - [ ] 13.5 Create test suite for cleanup_inactive_users function
    - Test user marked inactive after 180 days
    - Test data archival for inactive users
    - Test reactivation on login
    - Test data restoration on reactivation
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

  - [ ]* 13.6 Write property test for inactive user marking
    - **Property 13: Inactive User Marking**
    - **Validates: Requirements 5.2**

  - [ ]* 13.7 Write property test for inactive user data archival
    - **Property 14: Inactive User Data Archival**
    - **Validates: Requirements 5.3**

  - [ ]* 13.8 Write property test for inactive user reactivation
    - **Property 15: Inactive User Reactivation**
    - **Validates: Requirements 5.5, 5.6**

  - [ ] 13.9 Create test suite for process_account_deletions function
    - Test permanent deletion after grace period
    - Test that data is not deleted during grace period
    - Test S3 file cleanup integration
    - _Requirements: 6.8, 6.9_

- [ ] 14. Setup scheduled jobs for automated functions
  - [ ] 14.1 Configure pg_cron for Supabase
    - Schedule archive_old_entries to run daily at midnight UTC
    - Schedule cleanup_inactive_users to run weekly on Sunday at midnight UTC
    - Schedule process_account_deletions to run daily at midnight UTC
    - Test scheduled jobs in staging environment
    - _Requirements: 4.1, 5.1, 6.7_

  - [ ] 14.2 Add monitoring and alerting for scheduled jobs
    - Log execution results to CloudWatch or Supabase logs
    - Set up alerts for job failures
    - Create dashboard for monitoring job execution
    - _Requirements: 4.1, 5.1, 6.7_

- [ ] 15. Add notification system for account events
  - [ ] 15.1 Create notification service module
    - Implement sendNotification function with language support
    - Support email and SMS notifications (future)
    - Use user's preferred language for messages
    - _Requirements: 5.4, 8.5_

  - [ ]* 15.2 Write property test for notification language
    - **Property 21: Notification Language**
    - **Validates: Requirements 8.5**

  - [ ] 15.3 Integrate notifications into user events
    - Send notification before marking user inactive
    - Send notification when deletion is scheduled
    - Send notification when deletion is cancelled
    - _Requirements: 5.4, 6.4_

- [ ] 16. Final checkpoint - Complete system validation
  - Run all property-based tests (minimum 100 iterations each)
  - Run all unit tests and integration tests
  - Test complete user lifecycle: signup → usage → inactivity → reactivation → deletion
  - Verify scheduled jobs are running correctly
  - Verify sync engine handles profile updates
  - Ensure all translations are complete and correct
  - Ask the user if questions arise

- [ ] 17. Documentation and deployment preparation
  - [ ] 17.1 Update database migration scripts
    - Ensure migration is idempotent (can run multiple times safely)
    - Add rollback script for migration
    - Document manual steps if any
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ] 17.2 Create deployment checklist
    - List environment variables needed
    - Document Supabase configuration steps
    - Document AWS S3 bucket setup
    - Document pg_cron setup steps
    - _Requirements: 4.1, 5.1, 6.7, 6.8_

  - [ ] 17.3 Update user-facing documentation
    - Add profile setup guide
    - Add settings management guide
    - Add account deletion guide with grace period explanation
    - Add data retention policy explanation
    - _Requirements: 1.1, 3.1, 6.1, 4.2_

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each property test should run minimum 100 iterations
- Database functions should be tested in isolation before integration
- Profile setup should be tested with both "skip" and "complete" flows
- Account deletion flow should be thoroughly tested due to data loss implications
- Scheduled jobs should be tested in staging before production deployment
- All UI components should support all three languages (en, hi, mr)
- Sync engine integration ensures offline-first functionality continues to work
