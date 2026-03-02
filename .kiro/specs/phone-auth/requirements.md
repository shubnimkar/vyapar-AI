# Requirements Document: Phone-Based OTP Authentication

## Introduction

This document specifies the requirements for implementing phone-based OTP (One-Time Password) authentication in Vyapar AI, a business health companion for small shop owners in India. The system will transition from device-based data isolation to user account-based authentication, enabling multi-device access, data recovery, and better user tracking while maintaining the simplicity expected by the target audience.

## Glossary

- **OTP_Service**: The authentication service that generates and validates one-time passwords
- **SMS_Provider**: The external service (Twilio or Supabase) that delivers SMS messages
- **Auth_System**: Supabase Auth service managing user sessions and authentication
- **User_Account**: A registered user identified by phone number with associated data
- **Session_Manager**: Component managing user login state and session persistence
- **Data_Migrator**: Component that transfers device-local data to user account on first login
- **Phone_Number**: Indian mobile number in E.164 format (+91XXXXXXXXXX)
- **Device_Data**: User data stored in localStorage before authentication
- **RLS_Policy**: Row Level Security policy in Supabase that isolates user data

## Requirements

### Requirement 1: Phone Number Input and Validation

**User Story:** As a shop owner, I want to enter my phone number to log in, so that I can access my business data from any device.

#### Acceptance Criteria

1. WHEN a user opens the app without an active session, THEN THE Auth_System SHALL display a login screen with phone number input
2. WHEN a user enters a phone number, THEN THE Auth_System SHALL validate it matches Indian mobile format (10 digits)
3. WHEN a valid phone number is entered, THEN THE Auth_System SHALL automatically prepend the +91 country code
4. WHEN an invalid phone number is entered, THEN THE Auth_System SHALL display an error message in the user's selected language
5. THE phone input field SHALL use numeric keyboard on mobile devices
6. THE phone input field SHALL have large touch targets suitable for mobile interaction

### Requirement 2: OTP Generation and Delivery

**User Story:** As a shop owner, I want to receive a verification code via SMS, so that I can securely verify my identity.

#### Acceptance Criteria

1. WHEN a user submits a valid phone number, THEN THE OTP_Service SHALL generate a 6-digit numeric code
2. WHEN an OTP is generated, THEN THE SMS_Provider SHALL send it to the provided phone number within 30 seconds
3. WHEN an OTP is generated, THEN THE OTP_Service SHALL store it with a 10-minute expiration time
4. WHEN SMS delivery fails, THEN THE Auth_System SHALL display a friendly error message and offer retry option
5. THE OTP_Service SHALL rate-limit OTP requests to maximum 3 attempts per phone number per hour
6. WHEN a new OTP is requested for the same phone number, THEN THE OTP_Service SHALL invalidate any previous unexpired OTPs

### Requirement 3: OTP Verification

**User Story:** As a shop owner, I want to enter the code I received, so that I can complete the login process.

#### Acceptance Criteria

1. WHEN an OTP is sent, THEN THE Auth_System SHALL display an input screen for the 6-digit code
2. WHEN a user enters a 6-digit code, THEN THE OTP_Service SHALL validate it against the stored OTP
3. WHEN the entered OTP matches and is not expired, THEN THE Auth_System SHALL create an authenticated session
4. WHEN the entered OTP is incorrect, THEN THE Auth_System SHALL display an error and allow retry
5. WHEN the OTP has expired, THEN THE Auth_System SHALL display an expiration message and offer to resend
6. THE Auth_System SHALL allow maximum 5 verification attempts before requiring a new OTP

### Requirement 4: OTP Resend Functionality

**User Story:** As a shop owner, I want to request a new code if I didn't receive the first one, so that I can complete login without frustration.

#### Acceptance Criteria

1. WHEN viewing the OTP input screen, THEN THE Auth_System SHALL display a "Resend OTP" button
2. WHEN the "Resend OTP" button is clicked within 60 seconds of the last send, THEN THE Auth_System SHALL display a countdown timer
3. WHEN 60 seconds have elapsed since the last OTP send, THEN THE Auth_System SHALL enable the "Resend OTP" button
4. WHEN "Resend OTP" is clicked after cooldown, THEN THE OTP_Service SHALL generate and send a new OTP
5. THE Auth_System SHALL display the resend countdown in the user's selected language

### Requirement 5: Device Data Migration

**User Story:** As an existing user, I want my current business data to be preserved when I log in for the first time, so that I don't lose my transaction history.

#### Acceptance Criteria

1. WHEN a user successfully authenticates for the first time, THEN THE Data_Migrator SHALL check for existing device data in localStorage
2. WHEN device data exists, THEN THE Data_Migrator SHALL transfer all daily entries to the user's account in Supabase
3. WHEN device data exists, THEN THE Data_Migrator SHALL transfer all credit tracking records to the user's account
4. WHEN migration completes successfully, THEN THE Data_Migrator SHALL mark the device data as migrated
5. WHEN migration fails, THEN THE Auth_System SHALL preserve the device data and retry on next login
6. THE Data_Migrator SHALL maintain data integrity during transfer with no loss of entries

### Requirement 6: Session Management

**User Story:** As a shop owner, I want to stay logged in across app visits, so that I don't have to enter my phone number every time.

#### Acceptance Criteria

1. WHEN a user successfully authenticates, THEN THE Session_Manager SHALL create a session token
2. WHEN a session is created, THEN THE Session_Manager SHALL store it in localStorage for persistence
3. WHEN a user reopens the app, THEN THE Session_Manager SHALL validate the stored session token
4. WHEN the session token is valid, THEN THE Auth_System SHALL grant access without requiring re-authentication
5. WHEN the session token is expired or invalid, THEN THE Auth_System SHALL display the login screen
6. THE Session_Manager SHALL refresh session tokens before expiration to maintain continuous access

### Requirement 7: Multi-Language Support

**User Story:** As a shop owner who speaks Hindi or Marathi, I want to see authentication screens in my language, so that I can understand the process clearly.

#### Acceptance Criteria

1. WHEN displaying the login screen, THEN THE Auth_System SHALL render all text in the user's selected language
2. WHEN displaying error messages, THEN THE Auth_System SHALL show them in the user's selected language
3. THE Auth_System SHALL support English, Hindi, and Marathi for all authentication flows
4. WHEN the user's language preference is not set, THEN THE Auth_System SHALL default to English
5. THE Auth_System SHALL use friendly, non-technical language in all user-facing messages

### Requirement 8: User Profile Management

**User Story:** As a shop owner, I want to view my account information, so that I can verify my registered phone number and account details.

#### Acceptance Criteria

1. WHEN a user is authenticated, THEN THE Auth_System SHALL provide access to user profile information
2. THE User_Account SHALL store the phone number in E.164 format
3. THE User_Account SHALL store the account creation timestamp
4. WHEN viewing profile, THEN THE Auth_System SHALL display the phone number in readable format (+91 XXXXX XXXXX)
5. THE User_Account SHALL be uniquely identified by the phone number

### Requirement 9: Logout Functionality

**User Story:** As a shop owner, I want to log out of my account, so that I can secure my data on shared devices.

#### Acceptance Criteria

1. WHEN a user is authenticated, THEN THE Auth_System SHALL display a logout option
2. WHEN the logout option is selected, THEN THE Session_Manager SHALL invalidate the current session token
3. WHEN logout completes, THEN THE Session_Manager SHALL clear the session from localStorage
4. WHEN logout completes, THEN THE Auth_System SHALL redirect to the login screen
5. WHEN logged out, THEN THE Auth_System SHALL prevent access to authenticated features

### Requirement 10: Data Isolation with RLS

**User Story:** As a shop owner, I want my business data to be private, so that other users cannot see my transactions.

#### Acceptance Criteria

1. WHEN a user queries their data, THEN THE RLS_Policy SHALL filter results to only that user's records
2. WHEN a user attempts to access another user's data, THEN THE RLS_Policy SHALL deny the request
3. THE RLS_Policy SHALL apply to all user data tables (daily entries, credit tracking)
4. WHEN a user is not authenticated, THEN THE RLS_Policy SHALL deny all data access
5. THE RLS_Policy SHALL enforce isolation at the database level without application-layer checks

### Requirement 11: Error Handling and User Feedback

**User Story:** As a shop owner, I want clear feedback when something goes wrong, so that I know what to do next.

#### Acceptance Criteria

1. WHEN SMS delivery fails, THEN THE Auth_System SHALL display a message suggesting to check phone number and network
2. WHEN network connectivity is lost, THEN THE Auth_System SHALL display an offline message
3. WHEN rate limits are exceeded, THEN THE Auth_System SHALL display a message with wait time
4. WHEN an unexpected error occurs, THEN THE Auth_System SHALL display a generic friendly error and log details for debugging
5. THE Auth_System SHALL provide actionable next steps in all error messages

### Requirement 12: Remember Device Option

**User Story:** As a shop owner using my personal phone, I want the option to stay logged in longer, so that I don't have to verify frequently.

#### Acceptance Criteria

1. WHEN logging in, THEN THE Auth_System SHALL display a "Remember this device" checkbox
2. WHEN "Remember this device" is checked, THEN THE Session_Manager SHALL extend session duration to 30 days
3. WHEN "Remember this device" is not checked, THEN THE Session_Manager SHALL use default session duration of 7 days
4. THE Session_Manager SHALL store the remember preference in localStorage
5. WHEN a user logs out explicitly, THEN THE Session_Manager SHALL clear the remember preference
