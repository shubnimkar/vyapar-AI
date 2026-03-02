# Requirements Document

## Introduction

This document specifies requirements for implementing a user registration system in Vyapar AI. The system will replace the current demo-only authentication (hardcoded admin/vyapar123) with a full-featured signup and login flow. Users will be able to create accounts with unique usernames, secure passwords, and business profiles stored in DynamoDB.

## Glossary

- **Registration_System**: The complete user account creation and authentication subsystem
- **Signup_Form**: The user interface component that collects registration information
- **Login_Form**: The user interface component that authenticates existing users
- **Username_Validator**: The component that checks username uniqueness and format compliance
- **Password_Hasher**: The component that applies bcrypt hashing to passwords
- **User_Store**: The DynamoDB table storing user credentials and metadata
- **Profile_Store**: The DynamoDB table storing user business profile information
- **Auth_API**: The backend API endpoints handling authentication operations
- **Session_Manager**: The component managing authenticated user sessions
- **Translation_Engine**: The existing i18n system providing multi-language support

## Requirements

### Requirement 1: User Account Creation

**User Story:** As a new user, I want to create an account with my business details, so that I can start using Vyapar AI with my own data.

#### Acceptance Criteria

1. THE Signup_Form SHALL collect username, password, confirm password, shop name, owner name, business type, city, phone number, and language preference
2. WHEN a user submits the signup form, THE Registration_System SHALL validate all required fields are non-empty
3. THE Signup_Form SHALL provide a business type dropdown with options: Retail, Wholesale, Services, Manufacturing, Restaurant, Other
4. THE Signup_Form SHALL provide a language preference selector with options: English, Hindi, Marathi
5. THE Signup_Form SHALL set English as the default language preference

### Requirement 2: Username Validation

**User Story:** As a new user, I want to choose a unique username, so that I can be identified in the system.

#### Acceptance Criteria

1. THE Username_Validator SHALL accept usernames containing only alphanumeric characters and underscores
2. THE Username_Validator SHALL require usernames to be between 3 and 20 characters in length
3. WHEN a username is entered, THE Username_Validator SHALL check uniqueness against User_Store using case-insensitive comparison
4. WHEN a username already exists, THE Signup_Form SHALL display an error message indicating the username is taken
5. THE Signup_Form SHALL provide real-time feedback on username availability during input
6. FOR ALL usernames, parsing the username format then validating then parsing SHALL produce an equivalent validation result (round-trip property)

### Requirement 3: Password Security

**User Story:** As a new user, I want my password to be stored securely, so that my account cannot be compromised.

#### Acceptance Criteria

1. THE Signup_Form SHALL require passwords to be at least 8 characters in length
2. THE Signup_Form SHALL require passwords to contain at least one uppercase letter, one lowercase letter, and one number
3. WHEN a password is submitted, THE Password_Hasher SHALL apply bcrypt hashing before storage
4. THE Registration_System SHALL never store passwords in plain text format
5. THE Signup_Form SHALL validate password strength on the client side before submission
6. THE Auth_API SHALL validate password strength on the server side upon receipt
7. WHEN confirm password does not match password, THE Signup_Form SHALL display an error message

### Requirement 4: User Data Persistence

**User Story:** As the system, I want to store user credentials and profiles separately, so that I can manage authentication and business data independently.

#### Acceptance Criteria

1. WHEN a user account is created, THE User_Store SHALL store credentials with partition key USER#username and sort key METADATA
2. WHEN a user account is created, THE Profile_Store SHALL store business profile with partition key PROFILE#userId and sort key METADATA
3. THE Registration_System SHALL generate a unique userId for each new account
4. THE Registration_System SHALL link User_Store and Profile_Store records using the userId field
5. THE User_Store SHALL store username, hashed password, userId, and creation timestamp
6. THE Profile_Store SHALL store shop name, owner name, business type, city, phone number, language preference, and userId

### Requirement 5: Authentication API Endpoints

**User Story:** As a developer, I want well-defined API endpoints for authentication, so that I can integrate signup and login functionality.

#### Acceptance Criteria

1. THE Auth_API SHALL provide a POST endpoint at /api/auth/signup for account creation
2. THE Auth_API SHALL provide a POST endpoint at /api/auth/login for user authentication
3. THE Auth_API SHALL provide a GET endpoint at /api/auth/check-username for username availability checking
4. WHEN /api/auth/signup receives valid data, THE Auth_API SHALL create user and profile records then return success with userId
5. WHEN /api/auth/login receives valid credentials, THE Auth_API SHALL verify password hash then return success with user data
6. WHEN /api/auth/check-username receives a username, THE Auth_API SHALL return availability status within 500 milliseconds

### Requirement 6: Login Page User Interface

**User Story:** As a user, I want to easily switch between signing in and signing up, so that I can access the appropriate form for my needs.

#### Acceptance Criteria

1. THE Login_Form SHALL provide a toggle control to switch between Sign In and Sign Up modes
2. WHEN Sign In mode is active, THE Login_Form SHALL display username and password fields only
3. WHEN Sign Up mode is active, THE Login_Form SHALL display the complete Signup_Form
4. THE Login_Form SHALL provide smooth visual transitions when switching between modes
5. THE Login_Form SHALL preserve form input when switching modes is not performed (data should clear on mode switch)

### Requirement 7: Post-Registration Flow

**User Story:** As a new user, I want to be automatically logged in after signup, so that I can immediately start using the application.

#### Acceptance Criteria

1. WHEN signup completes successfully, THE Session_Manager SHALL create an authenticated session for the new user
2. WHEN an authenticated session is created, THE Registration_System SHALL redirect the user to the home page
3. WHEN login completes successfully, THE Session_Manager SHALL create an authenticated session for the existing user
4. WHEN an authenticated session is created after login, THE Registration_System SHALL redirect the user to the appropriate page based on profile completeness

### Requirement 8: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can correct my input and complete the process.

#### Acceptance Criteria

1. WHEN a username already exists, THE Signup_Form SHALL display "Username already taken" in the user's selected language
2. WHEN passwords do not match, THE Signup_Form SHALL display "Passwords do not match" in the user's selected language
3. WHEN password is weak, THE Signup_Form SHALL display specific requirements not met in the user's selected language
4. IF a network error occurs, THEN THE Registration_System SHALL display "Connection error, please try again" in the user's selected language
5. IF a DynamoDB error occurs, THEN THE Auth_API SHALL log the error details and return a generic error message to the client
6. THE Registration_System SHALL display all error messages using the Translation_Engine

### Requirement 9: Multi-Language Support

**User Story:** As a user, I want to see the registration interface in my preferred language, so that I can understand all instructions and labels.

#### Acceptance Criteria

1. THE Signup_Form SHALL display all labels in English, Hindi, and Marathi based on user selection
2. THE Signup_Form SHALL display all error messages in English, Hindi, and Marathi based on user selection
3. THE Signup_Form SHALL display all validation messages in English, Hindi, and Marathi based on user selection
4. THE Translation_Engine SHALL provide translations for all new registration-related text keys
5. WHEN a user selects a language preference during signup, THE Registration_System SHALL store this preference in Profile_Store

### Requirement 10: Security and Rate Limiting

**User Story:** As a system administrator, I want to prevent abuse of the registration system, so that the service remains available for legitimate users.

#### Acceptance Criteria

1. THE Auth_API SHALL limit signup attempts to 5 per IP address per hour
2. THE Auth_API SHALL limit username check requests to 20 per IP address per minute
3. THE Auth_API SHALL sanitize all user input before processing to prevent injection attacks
4. THE Auth_API SHALL escape all user input before rendering in HTML to prevent XSS attacks
5. WHEN rate limits are exceeded, THE Auth_API SHALL return HTTP 429 status code with retry-after header
6. THE Auth_API SHALL log all failed authentication attempts with timestamp and IP address

### Requirement 11: Password Hashing and Verification

**User Story:** As a developer, I want a consistent password hashing implementation, so that authentication is secure and reliable.

#### Acceptance Criteria

1. THE Password_Hasher SHALL use bcryptjs library for all password hashing operations
2. THE Password_Hasher SHALL use a salt rounds value of 10 for bcrypt operations
3. WHEN verifying a password, THE Password_Hasher SHALL use bcrypt compare function against stored hash
4. THE Password_Hasher SHALL complete hashing operations within 2 seconds on standard hardware
5. FOR ALL valid passwords, hashing then verifying with the same password SHALL return true (verification property)
6. FOR ALL valid passwords, hashing then verifying with a different password SHALL return false (security property)

### Requirement 12: Input Validation and Sanitization

**User Story:** As a security-conscious developer, I want all user input validated and sanitized, so that the system is protected from malicious data.

#### Acceptance Criteria

1. THE Signup_Form SHALL validate shop name is between 1 and 100 characters
2. THE Signup_Form SHALL validate owner name is between 1 and 100 characters
3. THE Signup_Form SHALL validate city is between 1 and 100 characters
4. THE Signup_Form SHALL validate phone number matches international phone format if provided
5. THE Auth_API SHALL strip HTML tags from all text inputs before storage
6. THE Auth_API SHALL reject requests containing SQL keywords in unexpected fields
7. WHEN validation fails, THE Signup_Form SHALL display which specific fields are invalid

