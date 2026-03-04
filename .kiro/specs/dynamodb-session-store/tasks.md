# Implementation Plan: DynamoDB Session Store

## Overview

This implementation plan converts the in-memory Map-based session store to a DynamoDB-backed persistent session store. The approach maintains backward compatibility by keeping all public function signatures unchanged while replacing the internal implementation to use DynamoDB for persistence. The migration follows a phased approach: implement internal helpers, replace public API implementations, remove dead code, and verify with comprehensive testing.

## Tasks

- [ ] 1. Implement internal helper functions for data transformation
  - [ ] 1.1 Implement sessionToDynamoItem() function
    - Convert SessionData to DynamoDB item format with PK, SK, entityType, TTL
    - Transform Date objects to ISO 8601 strings
    - Calculate TTL as Unix timestamp (seconds)
    - Map conversationHistory timestamps to ISO 8601
    - _Requirements: 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 1.2 Implement dynamoItemToSession() function
    - Convert DynamoDB item to SessionData format
    - Parse ISO 8601 strings back to Date objects
    - Reconstruct conversationHistory with Date timestamps
    - Handle optional fields (salesData, expensesData, inventoryData)
    - _Requirements: 5.1, 5.6, 5.7, 5.8, 5.9_
  
  - [ ] 1.3 Implement calculateTTL() function
    - Accept Date object as input
    - Add 2 hours (7200000 milliseconds) to input date
    - Convert result to Unix timestamp in seconds
    - Return integer timestamp for DynamoDB TTL
    - _Requirements: 2.2, 2.3, 6.5_
  
  - [ ] 1.4 Implement isSessionExpired() function
    - Accept expires_at ISO 8601 string as input
    - Parse to Date object
    - Compare with current time
    - Return true if current time > expires_at
    - _Requirements: 2.5_
  
  - [ ] 1.5 Implement generateExpiresAt() helper function
    - Calculate timestamp 2 hours from now
    - Return as ISO 8601 string
    - Used by sessionToDynamoItem()
    - _Requirements: 2.1_

- [ ] 2. Replace createSession() implementation with DynamoDB persistence
  - [ ] 2.1 Update createSession() to use DynamoDB
    - Generate session ID using existing generateSessionId()
    - Load dailyEntries and creditEntries from localStorage (keep existing logic)
    - Create SessionData object with timestamps
    - Convert to DynamoDB item using sessionToDynamoItem()
    - Call DynamoDBService.putItem() to persist
    - Handle credential errors gracefully (log warning, return session)
    - Return SessionData object
    - _Requirements: 1.1, 4.1, 7.1_
  
  - [ ]* 2.2 Write unit tests for createSession()
    - Test session creation with empty data
    - Test session creation with pre-loaded localStorage data
    - Test DynamoDB item has correct PK, SK, entityType
    - Test TTL is set correctly
    - Test credential error handling (degraded mode)
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.5, 7.1_

- [ ] 3. Replace getSession() implementation with DynamoDB retrieval
  - [ ] 3.1 Update getSession() to retrieve from DynamoDB
    - Validate sessionId is non-empty
    - Build PK = SESSION#{sessionId}, SK = METADATA
    - Call DynamoDBService.getItem(PK, SK)
    - If item is null, log and return undefined
    - Check if session expired using isSessionExpired()
    - If expired, log and return undefined
    - Convert DynamoDB item to SessionData using dynamoItemToSession()
    - Update lastAccessedAt to current time
    - Call DynamoDBService.updateItem() to persist timestamp
    - Return SessionData
    - _Requirements: 1.2, 2.4, 2.5, 4.2, 7.3, 7.4_
  
  - [ ]* 3.2 Write unit tests for getSession()
    - Test retrieving existing session
    - Test session not found returns undefined
    - Test expired session returns undefined
    - Test lastAccessedAt is updated on retrieval
    - Test invalid session data returns undefined
    - _Requirements: 1.2, 2.5, 7.3, 7.4, 7.5_

- [ ] 4. Replace updateSession() implementation with DynamoDB updates
  - [ ] 4.1 Update updateSession() to persist to DynamoDB
    - Call getSession() to retrieve existing session
    - If session not found or expired, return undefined
    - Merge updates into existing session (spread operator)
    - Preserve sessionId (cannot be changed)
    - Set lastAccessedAt to current time
    - Convert updated SessionData to DynamoDB item
    - Call DynamoDBService.putItem() for full replace
    - Handle DynamoDB operation failures
    - Return updated SessionData
    - _Requirements: 1.3, 4.3, 7.2_
  
  - [ ]* 4.2 Write unit tests for updateSession()
    - Test updating existing session with new data
    - Test updating non-existent session returns undefined
    - Test sessionId cannot be changed
    - Test lastAccessedAt is updated
    - Test DynamoDB operation failure throws error
    - _Requirements: 1.3, 4.3, 7.2_

- [ ] 5. Replace deleteSession() implementation with DynamoDB deletion
  - [ ] 5.1 Update deleteSession() to delete from DynamoDB
    - Build PK = SESSION#{sessionId}, SK = METADATA
    - Call DynamoDBService.deleteItem(PK, SK)
    - Return true if deletion succeeded
    - Return false if session didn't exist
    - Handle DynamoDB operation failures
    - _Requirements: 1.4, 4.4, 7.2_
  
  - [ ]* 5.2 Write unit tests for deleteSession()
    - Test deleting existing session returns true
    - Test deleting non-existent session returns false
    - Test DynamoDB operation failure throws error
    - _Requirements: 1.4, 4.4, 7.2_

- [ ] 6. Checkpoint - Ensure all core functionality tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Remove in-memory Map and cleanup functions
  - [ ] 7.1 Remove dead code from session-store.ts
    - Delete sessionStore Map declaration
    - Delete globalForSession declaration
    - Remove cleanupExpiredSessions() function (DynamoDB TTL handles this)
    - Remove getActiveSessionCount() function (not needed)
    - Keep all localStorage functions unchanged
    - Verify no references to in-memory Map remain
    - _Requirements: 3.1, 8.2_
  
  - [ ] 7.2 Verify generateSessionId() remains unchanged
    - Confirm function still uses randomBytes(16).toString('hex')
    - Confirm function signature unchanged
    - _Requirements: 4.5_

- [ ] 8. Implement property-based tests for correctness properties
  - [ ]* 8.1 Write property test for Property 1: Session Round-Trip Preservation
    - **Property 1: Session Round-Trip Preservation**
    - **Validates: Requirements 1.1, 1.2**
    - Generate random SessionData with varying dailyEntries, creditEntries, conversationHistory
    - Create session, retrieve by ID, verify data equivalence
    - Run 100 iterations with fast-check
  
  - [ ]* 8.2 Write property test for Property 2: Session Updates Persist
    - **Property 2: Session Updates Persist**
    - **Validates: Requirements 1.3**
    - Generate random session and random partial updates
    - Update session, retrieve, verify updated values present
    - Run 100 iterations with fast-check
  
  - [ ]* 8.3 Write property test for Property 3: Session Deletion Removes Data
    - **Property 3: Session Deletion Removes Data**
    - **Validates: Requirements 1.4**
    - Create session, delete, attempt retrieval
    - Verify retrieval returns undefined
    - Run 100 iterations with fast-check
  
  - [ ]* 8.4 Write property test for Property 4: DynamoDB Item Schema Compliance
    - **Property 4: DynamoDB Item Schema Compliance**
    - **Validates: Requirements 1.5, 6.3**
    - Create session, inspect DynamoDB item
    - Verify PK matches SESSION#{sessionId} pattern
    - Verify SK equals METADATA
    - Verify entityType equals SESSION
    - Run 100 iterations with fast-check
  
  - [ ]* 8.5 Write property test for Property 5: TTL Calculation Correctness
    - **Property 5: TTL Calculation Correctness**
    - **Validates: Requirements 2.2, 2.3**
    - Generate random creation timestamps
    - Verify TTL is Unix seconds (not milliseconds)
    - Verify TTL equals expires_at converted to Unix seconds
    - Verify TTL is approximately 7200 seconds after createdAt
    - Run 100 iterations with fast-check
  
  - [ ]* 8.6 Write property test for Property 6: Expires_at Is Two Hours From Creation
    - **Property 6: Expires_at Is Two Hours From Creation**
    - **Validates: Requirements 2.1**
    - Generate random creation timestamps
    - Verify expires_at is exactly 7200000ms after createdAt
    - Run 100 iterations with fast-check
  
  - [ ]* 8.7 Write property test for Property 7: Timestamp Format Is ISO 8601
    - **Property 7: Timestamp Format Is ISO 8601**
    - **Validates: Requirements 5.3, 5.4, 5.5**
    - Create session, retrieve DynamoDB item
    - Verify createdAt, lastAccessedAt, expires_at are valid ISO 8601
    - Parse back to Date objects, verify no precision loss
    - Run 100 iterations with fast-check
  
  - [ ]* 8.8 Write property test for Property 8: LastAccessedAt Updates On Retrieval
    - **Property 8: LastAccessedAt Updates On Retrieval**
    - **Validates: Requirements 2.4**
    - Create session, wait brief moment, retrieve
    - Verify lastAccessedAt updated to approximately current time (1 second tolerance)
    - Run 100 iterations with fast-check
  
  - [ ]* 8.9 Write property test for Property 9: Expired Sessions Return Undefined
    - **Property 9: Expired Sessions Return Undefined**
    - **Validates: Requirements 2.5**
    - Create session with expires_at in the past
    - Retrieve session
    - Verify returns undefined
    - Run 100 iterations with fast-check
  
  - [ ]* 8.10 Write property test for Property 10: Stateless Persistence Across Restarts
    - **Property 10: Stateless Persistence Across Restarts**
    - **Validates: Requirements 3.1, 3.2**
    - Create session, clear all in-memory state (simulate restart)
    - Retrieve session by ID
    - Verify same session data returned
    - Run 100 iterations with fast-check
  
  - [ ]* 8.11 Write property test for Property 11: CreateSession Returns Valid SessionData
    - **Property 11: CreateSession Returns Valid SessionData**
    - **Validates: Requirements 4.1**
    - Call createSession() multiple times
    - Verify each returns valid SessionData with non-empty sessionId, Date objects, arrays
    - Run 100 iterations with fast-check
  
  - [ ]* 8.12 Write property test for Property 12: DeleteSession Returns Correct Boolean
    - **Property 12: DeleteSession Returns Correct Boolean**
    - **Validates: Requirements 4.4**
    - Test with existing sessions (should return true)
    - Test with non-existent sessions (should return false)
    - Run 100 iterations with fast-check
  
  - [ ]* 8.13 Write property test for Property 13: GenerateSessionId Produces Unique IDs
    - **Property 13: GenerateSessionId Produces Unique IDs**
    - **Validates: Requirements 4.5**
    - Generate 100+ session IDs
    - Verify all are unique (no duplicates)
    - Verify each is 32-character hexadecimal string
    - Run 100 iterations with fast-check
  
  - [ ]* 8.14 Write property test for Property 14: Non-Existent Sessions Return Undefined
    - **Property 14: Non-Existent Sessions Return Undefined**
    - **Validates: Requirements 7.3**
    - Generate random session IDs that were never created
    - Call getSession() with each
    - Verify returns undefined without throwing error
    - Run 100 iterations with fast-check

- [ ] 9. Implement integration tests for end-to-end flows
  - [ ]* 9.1 Write integration test for multi-turn conversation flow
    - Create session
    - Add daily entries
    - Add conversation message
    - Retrieve session, verify data present
    - Add another conversation message
    - Retrieve session, verify both messages present
    - _Requirements: 1.1, 1.2, 1.3, 5.8_
  
  - [ ]* 9.2 Write integration test for simulated restart
    - Create session with data
    - Note session ID
    - Clear all in-memory state (simulate restart)
    - Retrieve session by ID
    - Verify all data intact
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 9.3 Write integration test for session expiration
    - Create session with expires_at = now + 1 second
    - Wait 2 seconds
    - Retrieve session
    - Verify returns undefined
    - _Requirements: 2.1, 2.5_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Manual verification and DynamoDB console checks
  - [ ] 11.1 Verify session creation in DynamoDB console
    - Create session via API
    - Check DynamoDB console for item
    - Verify PK = SESSION#{sessionId}
    - Verify SK = METADATA
    - Verify TTL field is Unix seconds
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ] 11.2 Test session persistence across page refreshes
    - Upload CSV data
    - Run analysis
    - Ask follow-up question
    - Refresh page
    - Ask another question (session should persist)
    - _Requirements: 3.3, 10.2_
  
  - [ ] 11.3 Verify session expiration after 2 hours
    - Create session
    - Wait 2+ hours (or manually set expires_at in past)
    - Attempt to retrieve session
    - Verify returns undefined
    - _Requirements: 2.1, 2.5, 10.3_
  
  - [ ] 11.4 Test graceful degradation without AWS credentials
    - Remove AWS credentials from environment
    - Attempt to create session
    - Verify warning logged (not crash)
    - Verify app remains functional
    - _Requirements: 7.1_

- [ ] 12. Final checkpoint - Verify all requirements met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (14 properties total)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Manual verification ensures production readiness
- The implementation maintains backward compatibility - no API route changes required
- DynamoDB TTL handles automatic cleanup - no manual cleanup jobs needed
- LocalStorage functions remain unchanged (client-side persistence)
