# Requirements Document: User Profile & Data Management System

## Introduction

The User Profile & Data Management System provides comprehensive user account management for Vyapar AI, including signup profile completion, preferences management, automated data retention policies, and GDPR-compliant account deletion. This system ensures users have full control over their data while maintaining automated cleanup processes for optimal database performance.

## Glossary

- **User_Profile**: The complete user account information including business details and preferences
- **Profile_Setup_Screen**: The onboarding screen shown after OTP verification for profile completion
- **Data_Retention_Policy**: Automated rules for archiving or deleting user data based on age and type
- **Grace_Period**: The 30-day window before permanent account deletion during which users can cancel
- **Soft_Delete**: Marking data as archived using is_archived flag without permanent deletion
- **Hard_Delete**: Permanent removal of data from the database (GDPR compliance)
- **Inactive_User**: A user who has not logged in for 180 days
- **Auto_Archive**: Automated process that soft-deletes old data based on retention policies
- **Supabase**: PostgreSQL database service used as primary data store
- **RLS**: Row Level Security policies in Supabase for data isolation

## Requirements

### Requirement 1: Profile Setup on Signup

**User Story:** As a new user, I want to complete my business profile after phone verification, so that the system can personalize my experience and store my business information.

#### Acceptance Criteria

1. WHEN a user completes OTP verification THEN the System SHALL display the Profile_Setup_Screen with required and optional fields
2. THE Profile_Setup_Screen SHALL include required fields: shop name, user name, and preferred language (English/Hindi/Marathi)
3. THE Profile_Setup_Screen SHALL include optional fields: business type dropdown and city text input
4. WHEN a user clicks "Skip for Now" THEN the System SHALL create a User_Profile with only required fields and auto-set values
5. WHEN a user clicks "Complete Profile" THEN the System SHALL validate all required fields are filled before proceeding
6. THE System SHALL auto-populate phone number, created date, device ID, and default preferences without user input
7. WHEN profile creation succeeds THEN the System SHALL navigate the user to the main dashboard

### Requirement 2: Automatic Profile Creation

**User Story:** As a system administrator, I want user profiles to be automatically created with sensible defaults, so that all users have consistent initial settings.

#### Acceptance Criteria

1. WHEN a new user completes signup THEN the System SHALL create a User_Profile record in Supabase with a unique user_id
2. THE System SHALL set default preferences: data_retention_days to 90, auto_archive to enabled, notifications_enabled to true, currency to INR
3. THE System SHALL record the created_at timestamp and last_active_at timestamp as the current time
4. THE System SHALL set is_active to true and subscription_tier to 'free' by default
5. THE System SHALL link the user's phone number to the User_Profile as the primary identifier
6. WHEN profile creation fails THEN the System SHALL rollback the signup process and return an error message

### Requirement 3: User Preferences Management

**User Story:** As a user, I want to view and update my profile and preferences, so that I can control how the system handles my data and personalizes my experience.

#### Acceptance Criteria

1. WHEN a user navigates to settings THEN the System SHALL display the current User_Profile information and preferences
2. THE System SHALL allow editing of: user name, shop name, preferred language, business type, and city
3. THE System SHALL display read-only fields: phone number, account created date, and last active date
4. THE System SHALL provide controls for: data_retention_days (slider 30-365), auto_archive toggle, and notifications toggle
5. WHEN a user updates preferences THEN the System SHALL validate the data_retention_days is between 30 and 365
6. WHEN a user saves changes THEN the System SHALL update the User_Profile in Supabase and show a success confirmation
7. WHEN language preference changes THEN the System SHALL immediately update the UI to the selected language

### Requirement 4: Automated Data Retention Policies

**User Story:** As a system administrator, I want automated data retention policies to run regularly, so that old data is archived without manual intervention and database performance is maintained.

#### Acceptance Criteria

1. THE System SHALL run the archive_old_entries database function daily at midnight UTC
2. WHEN a daily entry is older than the user's data_retention_days setting THEN the System SHALL set its is_archived flag to true
3. WHEN a paid credit entry is 30 days past its payment date THEN the System SHALL set its is_archived flag to true
4. WHEN a voice upload file in S3 is 1 day old THEN the S3_Lifecycle_Policy SHALL permanently delete the file
5. WHEN a report is 30 days old THEN the System SHALL set its is_archived flag to true
6. THE System SHALL preserve archived data in the database for potential restoration
7. WHEN auto_archive is disabled for a user THEN the System SHALL skip archiving that user's daily entries

### Requirement 5: Inactive User Cleanup

**User Story:** As a system administrator, I want inactive users to be automatically identified and their data archived, so that the database remains optimized for active users.

#### Acceptance Criteria

1. THE System SHALL run the cleanup_inactive_users database function weekly on Sunday at midnight UTC
2. WHEN a user has not logged in for 180 days THEN the System SHALL set is_active to false
3. WHEN a user is marked inactive THEN the System SHALL set is_archived to true for all their daily entries, credits, and reports
4. WHEN a user is marked inactive AND notifications are enabled THEN the System SHALL send a notification before archiving
5. WHEN an inactive user logs in THEN the System SHALL set is_active to true and update last_active_at
6. WHEN an inactive user logs in THEN the System SHALL restore (unarchive) their most recent 90 days of data

### Requirement 6: Account Deletion with Grace Period

**User Story:** As a user, I want to request account deletion with a grace period, so that I can change my mind if I delete my account accidentally.

#### Acceptance Criteria

1. WHEN a user requests account deletion from settings THEN the System SHALL set deletion_requested_at to current timestamp
2. WHEN deletion is requested THEN the System SHALL calculate deletion_scheduled_at as 30 days from deletion_requested_at
3. WHEN deletion is requested THEN the System SHALL set is_archived to true for all user data
4. WHEN deletion is requested THEN the System SHALL display the scheduled deletion date to the user
5. WHEN a user cancels deletion during the grace period THEN the System SHALL clear deletion_requested_at and deletion_scheduled_at
6. WHEN a user cancels deletion THEN the System SHALL restore (unarchive) their data
7. THE System SHALL run the process_account_deletions database function daily at midnight UTC
8. WHEN deletion_scheduled_at is reached THEN the System SHALL permanently delete all user data including profile, entries, credits, reports, and S3 files
9. WHEN permanent deletion completes THEN the System SHALL remove the User_Profile record from the database

### Requirement 7: Database Schema and Functions

**User Story:** As a developer, I want a well-structured database schema with automated functions, so that the system can efficiently manage user data and retention policies.

#### Acceptance Criteria

1. THE users table SHALL include columns: id, phone, shop_name, user_name, language, business_type, city
2. THE users table SHALL include columns: created_at, last_active_at, is_active, subscription_tier
3. THE users table SHALL include a preferences JSONB column storing: data_retention_days, auto_archive, notifications_enabled, currency
4. THE users table SHALL include columns: deletion_requested_at, deletion_scheduled_at
5. THE System SHALL provide a database function archive_old_entries() that archives data based on retention policies
6. THE System SHALL provide a database function cleanup_inactive_users() that marks inactive users and archives their data
7. THE System SHALL provide a database function process_account_deletions() that permanently deletes users past their grace period
8. THE daily_entries, paid_credits, and reports tables SHALL include an is_archived boolean column defaulting to false

### Requirement 8: Multi-language Support

**User Story:** As a user, I want all profile and settings UI text in my preferred language, so that I can use the system comfortably in English, Hindi, or Marathi.

#### Acceptance Criteria

1. THE System SHALL provide translations for all UI text in English, Hindi, and Marathi
2. WHEN a user selects a language preference THEN the System SHALL store it in the User_Profile
3. WHEN the UI loads THEN the System SHALL display all text in the user's preferred language
4. THE System SHALL translate field labels, button text, validation messages, and confirmation dialogs
5. THE System SHALL translate notification messages sent to users

### Requirement 9: API Endpoints for Profile Management

**User Story:** As a frontend developer, I want well-defined API endpoints for profile operations, so that I can build a responsive user interface.

#### Acceptance Criteria

1. THE System SHALL provide POST /api/profile/setup endpoint that creates or updates a User_Profile on signup
2. THE System SHALL provide GET /api/profile endpoint that returns the authenticated user's profile data
3. THE System SHALL provide PUT /api/profile endpoint that updates the authenticated user's profile and preferences
4. THE System SHALL provide POST /api/profile/delete endpoint that initiates account deletion with grace period
5. THE System SHALL provide POST /api/profile/cancel-deletion endpoint that cancels a pending deletion request
6. WHEN any profile API is called without authentication THEN the System SHALL return a 401 Unauthorized error
7. WHEN profile data validation fails THEN the System SHALL return a 400 Bad Request error with specific field errors

### Requirement 10: Performance and Success Metrics

**User Story:** As a product manager, I want the profile system to be fast and user-friendly, so that users complete their profiles quickly and manage their data easily.

#### Acceptance Criteria

1. WHEN a new user completes the Profile_Setup_Screen THEN the process SHALL take less than 60 seconds
2. WHEN a user updates their profile THEN the System SHALL save changes within 2 seconds
3. WHEN automated cleanup functions run THEN they SHALL complete within 5 minutes for databases with up to 100,000 users
4. THE System SHALL maintain 99.9% uptime for profile API endpoints
5. WHEN a user requests account deletion THEN the System SHALL confirm the request within 3 seconds
