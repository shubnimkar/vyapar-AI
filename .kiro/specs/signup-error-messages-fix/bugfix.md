# Bugfix Requirements Document

## Introduction

The signup endpoint returns a generic "INVALID_INPUT" error code with the message "Invalid input. Please check your data." for all validation failures. This makes it impossible for users to understand what specifically went wrong with their signup attempt. When a username is already taken (409 Conflict), users see the same generic message as they would for a weak password, missing field, or invalid format. This creates a poor user experience and prevents users from correcting their input effectively.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN username already exists THEN the system returns 409 status with error code "INVALID_INPUT" and message "Invalid input. Please check your data."

1.2 WHEN password is weak (less than 8 characters or missing uppercase/lowercase/number) THEN the system returns 400 status with error code "INVALID_INPUT" and message "Invalid input. Please check your data."

1.3 WHEN username format is invalid (contains special characters, too short, too long) THEN the system returns 400 status with error code "INVALID_INPUT" and message "Invalid input. Please check your data."

1.4 WHEN required fields are missing (username, password, shopName, ownerName, businessType, city, language) THEN the system returns 400 status with error code "INVALID_INPUT" and message "Invalid input. Please check your data."

1.5 WHEN SQL injection attempt is detected in username, shopName, or ownerName THEN the system returns 400 status with error code "INVALID_INPUT" and message "Invalid input. Please check your data."

1.6 WHEN field lengths are invalid (shopName, ownerName, or city not between 1-100 characters) THEN the system returns 400 status with error code "INVALID_INPUT" and message "Invalid input. Please check your data."

### Expected Behavior (Correct)

2.1 WHEN username already exists THEN the system SHALL return 409 status with error code "USERNAME_TAKEN" and message "Username already taken" (localized)

2.2 WHEN password is weak THEN the system SHALL return 400 status with error code "WEAK_PASSWORD" and message "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number" (localized)

2.3 WHEN username format is invalid THEN the system SHALL return 400 status with error code "INVALID_USERNAME" and message describing the specific username format issue (localized)

2.4 WHEN required fields are missing THEN the system SHALL return 400 status with error code "MISSING_REQUIRED_FIELDS" and message "Required fields are missing" (localized)

2.5 WHEN SQL injection attempt is detected THEN the system SHALL return 400 status with error code "INVALID_INPUT" and message "Invalid input detected" (localized)

2.6 WHEN field lengths are invalid THEN the system SHALL return 400 status with error code "INVALID_FIELD_LENGTH" and message describing which field has invalid length (localized)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN signup is successful THEN the system SHALL CONTINUE TO return 201 status with success response containing userId and username

3.2 WHEN rate limit is exceeded THEN the system SHALL CONTINUE TO return 429 status with error code "RATE_LIMIT_EXCEEDED"

3.3 WHEN password hashing fails THEN the system SHALL CONTINUE TO return 500 status with error code "SERVER_ERROR"

3.4 WHEN DynamoDB operation fails THEN the system SHALL CONTINUE TO return 500 status with error code "DYNAMODB_ERROR"

3.5 WHEN unexpected server error occurs THEN the system SHALL CONTINUE TO return 500 status with error code "SERVER_ERROR"

3.6 WHEN all validation passes and user is created THEN the system SHALL CONTINUE TO sanitize inputs, hash password, and store user and profile records atomically
