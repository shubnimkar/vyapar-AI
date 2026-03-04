# Requirements Document: DynamoDB Session Store

## Introduction

This document specifies the requirements for replacing Vyapar AI's in-memory session storage with a DynamoDB-backed persistent session store. The current implementation uses an in-memory Map that loses session data when serverless function instances restart or when requests hit different instances, breaking AI conversation flows and analysis continuity. The new implementation will provide persistent, stateless session management that works reliably across serverless environments.

## Glossary

- **Session_Store**: The system component responsible for storing and retrieving AI analysis session data
- **DynamoDB_Client**: The existing AWS DynamoDB client wrapper used for database operations
- **Session**: A temporary data container that holds user's daily entries, credit entries, CSV data, and conversation history
- **TTL**: Time-To-Live attribute that enables automatic expiration and cleanup of DynamoDB items
- **Single_Table_Design**: DynamoDB design pattern where multiple entity types share one table using PK/SK patterns
- **Serverless_Instance**: An ephemeral compute instance (Lambda, Vercel) that may be cold-started or replaced
- **AI_Analysis_Flow**: The multi-step process where users upload data, receive analysis, and ask follow-up questions
- **Conversation_History**: The sequence of user questions and AI responses stored within a session

## Requirements

### Requirement 1: Persistent Session Storage

**User Story:** As a shop owner using Vyapar AI, I want my analysis sessions to persist across page refreshes and server restarts, so that I don't lose my conversation history and uploaded data.

#### Acceptance Criteria

1. WHEN a session is created, THE Session_Store SHALL store the session data in DynamoDB with a unique session_id
2. WHEN a session is retrieved, THE Session_Store SHALL fetch the session data from DynamoDB using the session_id
3. WHEN a session is updated, THE Session_Store SHALL persist the updated data to DynamoDB
4. WHEN a session is deleted, THE Session_Store SHALL remove the session data from DynamoDB
5. THE Session_Store SHALL use the existing Single_Table_Design with PK = SESSION#{session_id} and SK = METADATA

### Requirement 2: Automatic Session Expiration

**User Story:** As a system administrator, I want sessions to automatically expire after 2 hours of inactivity, so that stale data is cleaned up without manual intervention.

#### Acceptance Criteria

1. WHEN a session is created, THE Session_Store SHALL set an expires_at timestamp 2 hours in the future
2. WHEN a session is created or updated, THE Session_Store SHALL set a TTL attribute for DynamoDB automatic cleanup
3. THE Session_Store SHALL calculate TTL as Unix timestamp (seconds since epoch) for DynamoDB compatibility
4. WHEN a session is accessed, THE Session_Store SHALL update the lastAccessedAt timestamp
5. IF a session has expired (current time > expires_at), THEN THE Session_Store SHALL return null when retrieving the session

### Requirement 3: Stateless Operation

**User Story:** As a developer, I want the session store to work correctly across different serverless instances, so that users don't experience random session loss.

#### Acceptance Criteria

1. THE Session_Store SHALL NOT use in-memory Map or any instance-level state for production storage
2. THE Session_Store SHALL retrieve all session data from DynamoDB on every request
3. THE Session_Store SHALL work correctly when consecutive requests hit different Serverless_Instances
4. THE Session_Store SHALL use the existing DynamoDB_Client for all database operations
5. THE Session_Store SHALL handle DynamoDB credential errors gracefully by logging warnings

### Requirement 4: Backward Compatible Interface

**User Story:** As a developer, I want the new session store to maintain the same interface as the old one, so that existing API routes require minimal changes.

#### Acceptance Criteria

1. THE Session_Store SHALL provide a createSession() function that returns a SessionData object
2. THE Session_Store SHALL provide a getSession(sessionId: string) function that returns SessionData or undefined
3. THE Session_Store SHALL provide an updateSession(sessionId: string, updates: Partial<SessionData>) function
4. THE Session_Store SHALL provide a deleteSession(sessionId: string) function that returns boolean
5. THE Session_Store SHALL provide a generateSessionId() function that returns a unique string identifier

### Requirement 5: Session Data Structure

**User Story:** As a developer, I want sessions to store all necessary data for AI analysis flows, so that users can have multi-turn conversations and maintain context.

#### Acceptance Criteria

1. THE Session_Store SHALL store session_id as a unique identifier
2. THE Session_Store SHALL store user_id to associate sessions with authenticated users
3. THE Session_Store SHALL store createdAt timestamp as ISO 8601 string
4. THE Session_Store SHALL store lastAccessedAt timestamp as ISO 8601 string
5. THE Session_Store SHALL store expires_at timestamp as ISO 8601 string
6. THE Session_Store SHALL store dailyEntries array for daily business data
7. THE Session_Store SHALL store creditEntries array for credit tracking data
8. THE Session_Store SHALL store conversationHistory array for AI chat messages
9. THE Session_Store SHALL store optional salesData, expensesData, and inventoryData for CSV uploads

### Requirement 6: DynamoDB Schema Compliance

**User Story:** As a system architect, I want the session store to follow the existing single-table design pattern, so that the database schema remains consistent and maintainable.

#### Acceptance Criteria

1. THE Session_Store SHALL use PK = SESSION#{session_id} for partition key
2. THE Session_Store SHALL use SK = METADATA for sort key
3. THE Session_Store SHALL set entityType = SESSION for type identification
4. THE Session_Store SHALL use the existing DYNAMODB_TABLE_NAME environment variable
5. THE Session_Store SHALL store TTL in a field named ttl as Unix timestamp in seconds

### Requirement 7: Error Handling and Resilience

**User Story:** As a user, I want the application to handle database errors gracefully, so that I receive clear error messages instead of cryptic failures.

#### Acceptance Criteria

1. WHEN DynamoDB credentials are missing, THE Session_Store SHALL log a warning and operate in degraded mode
2. WHEN a DynamoDB operation fails, THE Session_Store SHALL throw an error with a descriptive message
3. WHEN a session is not found, THE Session_Store SHALL return null or undefined (not throw an error)
4. WHEN a session has expired, THE Session_Store SHALL treat it as not found
5. THE Session_Store SHALL log all session operations with session_id for debugging

### Requirement 8: Migration from In-Memory Store

**User Story:** As a developer, I want to replace all usages of the in-memory session store with the DynamoDB version, so that no code paths use the unreliable in-memory storage.

#### Acceptance Criteria

1. THE Session_Store SHALL replace the implementation in lib/session-store.ts
2. WHEN the migration is complete, THE Session_Store SHALL NOT use Map or any in-memory storage for sessions
3. THE Session_Store SHALL maintain the localStorage functions for client-side daily/credit entry persistence
4. ALL API routes SHALL continue to work without modification after the migration
5. THE Session_Store SHALL be testable with mock DynamoDB clients

### Requirement 9: Performance and Scalability

**User Story:** As a system administrator, I want session operations to be fast and scalable, so that the application can handle multiple concurrent users.

#### Acceptance Criteria

1. WHEN retrieving a session, THE Session_Store SHALL complete the operation within 200ms under normal conditions
2. WHEN creating a session, THE Session_Store SHALL complete the operation within 200ms under normal conditions
3. THE Session_Store SHALL use DynamoDB's single-item operations (GetItem, PutItem) for optimal performance
4. THE Session_Store SHALL NOT perform table scans for session retrieval
5. THE Session_Store SHALL rely on DynamoDB's TTL feature for automatic cleanup (no manual cleanup required)

### Requirement 10: Testing and Verification

**User Story:** As a developer, I want to verify that sessions persist correctly, so that I can be confident the implementation works in production.

#### Acceptance Criteria

1. THE Session_Store SHALL be verifiable by creating a session, simulating a server restart, and retrieving the session
2. THE Session_Store SHALL be verifiable by testing multi-turn AI conversations across multiple requests
3. THE Session_Store SHALL be verifiable by checking that expired sessions return null after 2 hours
4. THE Session_Store SHALL be verifiable by confirming DynamoDB items have correct PK, SK, and TTL attributes
5. THE Session_Store SHALL support unit testing with mocked DynamoDB clients
