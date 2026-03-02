# Requirements Document: Simple Auth Replacement

## 1. Functional Requirements

### 1.1 Authentication System Replacement
- **REQ-1.1.1**: The system SHALL replace the existing phone/OTP authentication with username/password authentication
- **REQ-1.1.2**: The system SHALL use demo credentials from environment variables (DEMO_USERNAME and DEMO_PASSWORD)
- **REQ-1.1.3**: The system SHALL validate credentials against environment variables for authentication
- **REQ-1.1.4**: The system SHALL create valid session objects upon successful authentication

### 1.2 User Interface Components
- **REQ-1.2.1**: The system SHALL replace PhoneInput component with CredentialsInput component
- **REQ-1.2.2**: The system SHALL replace OTPInput component functionality within the new credentials form
- **REQ-1.2.3**: The system SHALL maintain the same visual design and layout structure as existing login page
- **REQ-1.2.4**: The system SHALL support multi-language display (English, Hindi, Marathi) for all form elements

### 1.3 Session Management Compatibility
- **REQ-1.3.1**: The system SHALL maintain existing session structure and format for backward compatibility
- **REQ-1.3.2**: The system SHALL preserve localStorage-based session persistence functionality
- **REQ-1.3.3**: The system SHALL support "remember device" functionality with checkbox option
- **REQ-1.3.4**: The system SHALL maintain existing session validation and expiry logic

### 1.4 Navigation and Redirect Logic
- **REQ-1.4.1**: The system SHALL maintain existing redirect logic after successful authentication
- **REQ-1.4.2**: The system SHALL check profile completion via existing profile API
- **REQ-1.4.3**: The system SHALL redirect to profile setup if profile is incomplete
- **REQ-1.4.4**: The system SHALL redirect to home page if profile is complete

## 2. Non-Functional Requirements

### 2.1 Performance Requirements
- **REQ-2.1.1**: Authentication validation SHALL complete within 100ms for valid credentials
- **REQ-2.1.2**: Session creation SHALL complete within 50ms after successful validation
- **REQ-2.1.3**: Page load time SHALL not exceed existing login page performance

### 2.2 Usability Requirements
- **REQ-2.2.1**: The login form SHALL be accessible via keyboard navigation
- **REQ-2.2.2**: Error messages SHALL be displayed in user's selected language
- **REQ-2.2.3**: Form validation SHALL provide immediate feedback for invalid inputs
- **REQ-2.2.4**: The interface SHALL maintain existing responsive design for mobile devices

### 2.3 Compatibility Requirements
- **REQ-2.3.1**: The system SHALL maintain compatibility with existing session store implementation
- **REQ-2.3.2**: The system SHALL work with existing profile management system
- **REQ-2.3.3**: The system SHALL support existing browser localStorage functionality
- **REQ-2.3.4**: The system SHALL maintain existing translation system integration

### 2.4 Security Requirements (Demo Context)
- **REQ-2.4.1**: The system SHALL validate input to prevent basic injection attacks
- **REQ-2.4.2**: The system SHALL not expose credentials in client-side code or logs
- **REQ-2.4.3**: The system SHALL clear sensitive data from memory after authentication
- **REQ-2.4.4**: The system SHALL maintain existing session token security practices

## 3. Technical Requirements

### 3.1 Environment Configuration
- **REQ-3.1.1**: The system SHALL read DEMO_USERNAME from environment variables
- **REQ-3.1.2**: The system SHALL read DEMO_PASSWORD from environment variables
- **REQ-3.1.3**: The system SHALL handle missing environment variables gracefully with appropriate error messages
- **REQ-3.1.4**: The system SHALL not hardcode credentials in source code

### 3.2 Code Structure Requirements
- **REQ-3.2.1**: The system SHALL implement SimpleAuthManager class to replace existing AuthManager OTP functionality
- **REQ-3.2.2**: The system SHALL create CredentialsInput component to replace PhoneInput and OTPInput
- **REQ-3.2.3**: The system SHALL update login page to use new authentication components
- **REQ-3.2.4**: The system SHALL maintain existing TypeScript interfaces where possible

### 3.3 Error Handling Requirements
- **REQ-3.3.1**: The system SHALL provide specific error messages for invalid username
- **REQ-3.3.2**: The system SHALL provide specific error messages for invalid password
- **REQ-3.3.3**: The system SHALL handle environment configuration errors gracefully
- **REQ-3.3.4**: The system SHALL log authentication attempts for debugging purposes

## 4. Integration Requirements

### 4.1 Existing System Integration
- **REQ-4.1.1**: The system SHALL integrate with existing profile API for completion checking
- **REQ-4.1.2**: The system SHALL integrate with existing data migration system
- **REQ-4.1.3**: The system SHALL integrate with existing translation system
- **REQ-4.1.4**: The system SHALL integrate with existing session management infrastructure

### 4.2 Component Replacement Requirements
- **REQ-4.2.1**: The system SHALL remove dependencies on Twilio SDK
- **REQ-4.2.2**: The system SHALL remove dependencies on Supabase Auth phone provider
- **REQ-4.2.3**: The system SHALL remove OTP generation and validation logic
- **REQ-4.2.4**: The system SHALL remove rate limiting and cooldown mechanisms

## 5. Data Requirements

### 5.1 Session Data Structure
- **REQ-5.1.1**: Session objects SHALL maintain existing structure with accessToken, refreshToken, expiresAt, and user fields
- **REQ-5.1.2**: User objects SHALL maintain existing structure with id, phoneNumber (for compatibility), and createdAt fields
- **REQ-5.1.3**: Session tokens SHALL be unique and non-predictable
- **REQ-5.1.4**: Session expiry SHALL be set to 24 hours from creation time

### 5.2 Credential Validation Data
- **REQ-5.2.1**: Username validation SHALL accept non-empty strings
- **REQ-5.2.2**: Password validation SHALL accept non-empty strings
- **REQ-5.2.3**: Credential comparison SHALL be case-sensitive
- **REQ-5.2.4**: Authentication result SHALL include success status and error messages

## 6. Acceptance Criteria

### 6.1 Authentication Flow
- **AC-6.1.1**: GIVEN valid demo credentials WHEN user submits login form THEN authentication succeeds and session is created
- **AC-6.1.2**: GIVEN invalid credentials WHEN user submits login form THEN authentication fails with appropriate error message
- **AC-6.1.3**: GIVEN successful authentication WHEN profile is complete THEN user is redirected to home page
- **AC-6.1.4**: GIVEN successful authentication WHEN profile is incomplete THEN user is redirected to profile setup

### 6.2 User Interface Behavior
- **AC-6.2.1**: GIVEN login page loads WHEN user views form THEN username and password fields are displayed
- **AC-6.2.2**: GIVEN form validation WHEN user enters invalid input THEN immediate feedback is provided
- **AC-6.2.3**: GIVEN remember device option WHEN user checks checkbox THEN session persistence is extended
- **AC-6.2.4**: GIVEN multi-language support WHEN user changes language THEN all form elements update accordingly

### 6.3 Session Management
- **AC-6.3.1**: GIVEN successful authentication WHEN session is created THEN it persists across browser refreshes
- **AC-6.3.2**: GIVEN existing valid session WHEN user visits login page THEN they are redirected to appropriate page
- **AC-6.3.3**: GIVEN user logout WHEN logout is triggered THEN session is cleared from localStorage
- **AC-6.3.4**: GIVEN session expiry WHEN expired session is accessed THEN user is redirected to login page

### 6.4 Error Handling
- **AC-6.4.1**: GIVEN missing environment variables WHEN authentication is attempted THEN graceful error handling occurs
- **AC-6.4.2**: GIVEN localStorage unavailable WHEN session save is attempted THEN fallback behavior is implemented
- **AC-6.4.3**: GIVEN profile API failure WHEN profile check occurs THEN user is redirected to profile setup as fallback
- **AC-6.4.4**: GIVEN network errors WHEN authentication is attempted THEN appropriate error messages are displayed

## 7. Constraints and Assumptions

### 7.1 Technical Constraints
- Must maintain existing session structure for backward compatibility
- Must work within existing Next.js App Router architecture
- Must support existing browser localStorage functionality
- Must integrate with existing TypeScript codebase

### 7.2 Business Constraints
- Designed for hackathon/demo purposes only
- Not suitable for production deployment
- Must be completed quickly for demo timeline
- Must maintain existing user experience flow

### 7.3 Assumptions
- Environment variables will be properly configured in deployment
- Existing profile API will remain functional
- localStorage will be available in target browsers
- Existing translation system will continue to work
- Demo credentials are acceptable for hackathon context