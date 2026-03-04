# Design Document: DynamoDB Session Store

## Overview

The DynamoDB Session Store replaces Vyapar AI's in-memory Map-based session storage with a persistent, stateless session management system backed by AWS DynamoDB. This design ensures AI conversation flows and analysis sessions survive serverless function restarts and work correctly across distributed instances.

### Problem Statement

The current implementation stores sessions in a Map that exists only in the memory of a single serverless instance. When:
- A serverless function cold-starts or restarts
- Consecutive requests hit different instances (common in serverless environments)
- The application redeploys

...all session data is lost, breaking multi-turn AI conversations and forcing users to re-upload their data.

### Solution Approach

Replace the in-memory Map with DynamoDB persistence while maintaining the exact same public API. The implementation will:
- Store all session data in DynamoDB using the existing single-table design
- Use DynamoDB's native TTL feature for automatic 2-hour expiration
- Maintain backward compatibility with existing API routes
- Handle AWS credential errors gracefully (degraded mode for local development)
- Ensure stateless operation across all serverless instances

### Key Design Decisions

1. **Reuse Existing DynamoDB Client**: Use the established `dynamodb-client.ts` wrapper instead of creating new AWS SDK code
2. **Single-Table Design**: Follow the existing PK/SK pattern (`SESSION#{id}` / `METADATA`)
3. **Backward Compatible Interface**: Keep all public function signatures unchanged
4. **TTL-Based Expiration**: Leverage DynamoDB's automatic cleanup instead of manual cleanup jobs
5. **Graceful Degradation**: Log warnings for credential errors but don't crash (supports local development)

## Architecture

### High-Level Data Flow

```
┌─────────────────┐
│   API Routes    │
│  (upload.ts,    │
│   analyze.ts,   │
│   ask.ts)       │
└────────┬────────┘
         │
         │ createSession()
         │ getSession(id)
         │ updateSession(id, data)
         │ deleteSession(id)
         │
         v
┌─────────────────────────────────────────┐
│      lib/session-store.ts               │
│  ┌───────────────────────────────────┐  │
│  │  Public API (unchanged)           │  │
│  │  - createSession()                │  │
│  │  - getSession()                   │  │
│  │  - updateSession()                │  │
│  │  - deleteSession()                │  │
│  │  - generateSessionId()            │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────v───────────────────┐  │
│  │  Internal DynamoDB Helpers        │  │
│  │  - sessionToDynamoItem()          │  │
│  │  - dynamoItemToSession()          │  │
│  │  - calculateTTL()                 │  │
│  │  - isSessionExpired()             │  │
│  └───────────────┬───────────────────┘  │
└──────────────────┼─────────────────────┘
                   │
                   │ DynamoDBService.putItem()
                   │ DynamoDBService.getItem()
                   │ DynamoDBService.updateItem()
                   │ DynamoDBService.deleteItem()
                   │
                   v
┌─────────────────────────────────────────┐
│      lib/dynamodb-client.ts             │
│  (existing, no changes needed)          │
│                                         │
│  - DynamoDBService.putItem()            │
│  - DynamoDBService.getItem()            │
│  - DynamoDBService.updateItem()         │
│  - DynamoDBService.deleteItem()         │
└────────────────┬────────────────────────┘
                 │
                 │ AWS SDK v3
                 │
                 v
┌─────────────────────────────────────────┐
│         AWS DynamoDB                    │
│                                         │
│  Table: vyapar-ai                       │
│  PK: SESSION#{session_id}               │
│  SK: METADATA                           │
│  TTL: ttl (auto-cleanup)                │
└─────────────────────────────────────────┘
```

### Component Responsibilities

**API Routes** (`app/api/*/route.ts`)
- Call session-store functions to manage session lifecycle
- No changes required (backward compatible interface)

**Session Store** (`lib/session-store.ts`)
- Public API: Maintain existing function signatures
- Internal: Convert between SessionData and DynamoDB items
- Handle expiration checks before returning sessions
- Delegate all persistence to DynamoDB client

**DynamoDB Client** (`lib/dynamodb-client.ts`)
- Existing component, no modifications needed
- Provides putItem, getItem, updateItem, deleteItem operations
- Handles AWS credential errors gracefully

**DynamoDB**
- Persistent storage for all session data
- Automatic TTL-based cleanup after 2 hours
- Single-table design with PK/SK pattern

## Components and Interfaces

### Public API (Unchanged)

```typescript
// These functions maintain exact same signatures
export function generateSessionId(): string;
export function createSession(): SessionData;
export function getSession(sessionId: string): SessionData | undefined;
export function updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | undefined;
export function deleteSession(sessionId: string): boolean;

// LocalStorage functions remain unchanged (client-side only)
export function loadDailyEntriesFromStorage(): DailyEntry[];
export function saveDailyEntriesToStorage(entries: DailyEntry[]): void;
export function loadCreditEntriesFromStorage(): CreditEntry[];
export function saveCreditEntriesToStorage(entries: CreditEntry[]): void;
```

### Internal Helper Functions (New)

```typescript
/**
 * Convert SessionData to DynamoDB item format
 */
function sessionToDynamoItem(session: SessionData): Record<string, unknown>;

/**
 * Convert DynamoDB item to SessionData format
 */
function dynamoItemToSession(item: Record<string, unknown>): SessionData;

/**
 * Calculate TTL timestamp (Unix seconds) for 2-hour expiration
 */
function calculateTTL(fromDate: Date): number;

/**
 * Check if session has expired based on expires_at timestamp
 */
function isSessionExpired(expiresAt: string): boolean;

/**
 * Generate expires_at timestamp (2 hours from now)
 */
function generateExpiresAt(): string;
```

### SessionData Type (Existing)

```typescript
export interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  
  // Daily entries (loaded from localStorage on creation)
  dailyEntries: DailyEntry[];
  
  // Credit tracking
  creditEntries: CreditEntry[];
  
  // CSV data (advanced mode)
  salesData?: ParsedCSV;
  expensesData?: ParsedCSV;
  inventoryData?: ParsedCSV;
  
  // AI conversation history
  conversationHistory: ChatMessage[];
}
```

### DynamoDB Item Schema

```typescript
interface SessionDynamoItem {
  // Primary keys (required)
  PK: string;                    // "SESSION#{session_id}"
  SK: string;                    // "METADATA"
  
  // Entity metadata
  entityType: string;            // "SESSION"
  
  // Session data
  sessionId: string;
  user_id?: string;              // Optional: for authenticated users
  createdAt: string;             // ISO 8601 timestamp
  lastAccessedAt: string;        // ISO 8601 timestamp
  expires_at: string;            // ISO 8601 timestamp (2 hours from creation)
  
  // Business data (JSON serialized)
  dailyEntries: DailyEntry[];
  creditEntries: CreditEntry[];
  salesData?: ParsedCSV;
  expensesData?: ParsedCSV;
  inventoryData?: ParsedCSV;
  conversationHistory: ChatMessage[];
  
  // DynamoDB TTL (automatic cleanup)
  ttl: number;                   // Unix timestamp in seconds
  
  // Audit fields
  updatedAt: string;             // ISO 8601 timestamp (auto-added by DynamoDB client)
}
```

## Data Models

### Session Lifecycle States

```
┌──────────────┐
│   Created    │  createSession() → Store in DynamoDB with 2hr TTL
└──────┬───────┘
       │
       v
┌──────────────┐
│    Active    │  getSession() → Update lastAccessedAt
└──────┬───────┘  updateSession() → Modify data, update lastAccessedAt
       │
       ├─────────────────────────────────┐
       │                                 │
       v                                 v
┌──────────────┐                  ┌──────────────┐
│   Expired    │                  │   Deleted    │
│ (TTL cleanup)│                  │  (explicit)  │
└──────────────┘                  └──────────────┘
```

### Key Algorithms

#### Session Creation Algorithm

```
1. Generate unique session ID (32 hex characters)
2. Load daily entries from localStorage (browser-side only)
3. Load credit entries from localStorage (browser-side only)
4. Create SessionData object with:
   - sessionId
   - createdAt = now
   - lastAccessedAt = now
   - expires_at = now + 2 hours
   - dailyEntries (from localStorage)
   - creditEntries (from localStorage)
   - empty conversationHistory
5. Convert SessionData to DynamoDB item:
   - PK = "SESSION#{sessionId}"
   - SK = "METADATA"
   - entityType = "SESSION"
   - ttl = Unix timestamp (expires_at in seconds)
   - All session fields serialized
6. Call DynamoDBService.putItem()
7. Return SessionData object
```

#### Session Retrieval Algorithm

```
1. Validate sessionId is non-empty
2. Build DynamoDB keys:
   - PK = "SESSION#{sessionId}"
   - SK = "METADATA"
3. Call DynamoDBService.getItem(PK, SK)
4. If item is null:
   - Log "Session not found"
   - Return undefined
5. If item exists:
   - Check if expired: current time > expires_at
   - If expired:
     - Log "Session expired"
     - Return undefined
   - If not expired:
     - Convert DynamoDB item to SessionData
     - Update lastAccessedAt to now
     - Call DynamoDBService.updateItem() to persist timestamp
     - Return SessionData
```

#### Session Update Algorithm

```
1. Retrieve existing session using getSession()
2. If session not found or expired:
   - Return undefined
3. Merge updates into existing session:
   - Spread existing session data
   - Spread updates
   - Preserve sessionId (cannot be changed)
   - Set lastAccessedAt = now
4. Convert updated SessionData to DynamoDB item
5. Call DynamoDBService.putItem() (full replace)
6. Return updated SessionData
```

#### TTL Calculation

```
Input: Date object (typically now or createdAt)
Output: Unix timestamp in seconds

1. Add 2 hours to input date:
   ttlDate = new Date(inputDate.getTime() + (2 * 60 * 60 * 1000))
2. Convert to Unix seconds:
   ttl = Math.floor(ttlDate.getTime() / 1000)
3. Return ttl
```

#### Expiration Check

```
Input: expires_at (ISO 8601 string)
Output: boolean (true if expired)

1. Parse expires_at to Date object
2. Get current time as Date object
3. Compare: currentTime > expiresAt
4. Return comparison result
```

### Data Transformation

#### SessionData → DynamoDB Item

```typescript
function sessionToDynamoItem(session: SessionData): Record<string, unknown> {
  const expiresAt = new Date(session.createdAt.getTime() + (2 * 60 * 60 * 1000));
  const ttl = Math.floor(expiresAt.getTime() / 1000);
  
  return {
    PK: `SESSION#${session.sessionId}`,
    SK: 'METADATA',
    entityType: 'SESSION',
    sessionId: session.sessionId,
    createdAt: session.createdAt.toISOString(),
    lastAccessedAt: session.lastAccessedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    dailyEntries: session.dailyEntries,
    creditEntries: session.creditEntries,
    salesData: session.salesData,
    expensesData: session.expensesData,
    inventoryData: session.inventoryData,
    conversationHistory: session.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    })),
    ttl,
  };
}
```

#### DynamoDB Item → SessionData

```typescript
function dynamoItemToSession(item: Record<string, unknown>): SessionData {
  return {
    sessionId: item.sessionId as string,
    createdAt: new Date(item.createdAt as string),
    lastAccessedAt: new Date(item.lastAccessedAt as string),
    dailyEntries: (item.dailyEntries as DailyEntry[]) || [],
    creditEntries: (item.creditEntries as CreditEntry[]) || [],
    salesData: item.salesData as ParsedCSV | undefined,
    expensesData: item.expensesData as ParsedCSV | undefined,
    inventoryData: item.inventoryData as ParsedCSV | undefined,
    conversationHistory: ((item.conversationHistory as any[]) || []).map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    })),
  };
}
```

### Migration Strategy

The migration from in-memory Map to DynamoDB follows these steps:

#### Phase 1: Implementation (No Breaking Changes)

1. **Add Internal Helper Functions**
   - Implement `sessionToDynamoItem()`
   - Implement `dynamoItemToSession()`
   - Implement `calculateTTL()`
   - Implement `isSessionExpired()`
   - Implement `generateExpiresAt()`

2. **Replace createSession() Implementation**
   ```typescript
   // OLD: sessionStore.set(sessionId, session)
   // NEW: DynamoDBService.putItem(sessionToDynamoItem(session))
   ```

3. **Replace getSession() Implementation**
   ```typescript
   // OLD: sessionStore.get(sessionId)
   // NEW: DynamoDBService.getItem() + expiration check + conversion
   ```

4. **Replace updateSession() Implementation**
   ```typescript
   // OLD: sessionStore.set(sessionId, updatedSession)
   // NEW: DynamoDBService.putItem(sessionToDynamoItem(updatedSession))
   ```

5. **Replace deleteSession() Implementation**
   ```typescript
   // OLD: sessionStore.delete(sessionId)
   // NEW: DynamoDBService.deleteItem(PK, SK)
   ```

#### Phase 2: Cleanup (Remove Dead Code)

1. **Remove In-Memory Map**
   - Delete `sessionStore` Map declaration
   - Delete `globalForSession` declaration
   - Remove `cleanupExpiredSessions()` function (DynamoDB TTL handles this)
   - Remove `getActiveSessionCount()` function (not needed)

2. **Keep LocalStorage Functions**
   - `loadDailyEntriesFromStorage()` - still needed for client-side
   - `saveDailyEntriesToStorage()` - still needed for client-side
   - `loadCreditEntriesFromStorage()` - still needed for client-side
   - `saveCreditEntriesToStorage()` - still needed for client-side

#### Phase 3: Verification

1. **Unit Tests**
   - Test session creation with mock DynamoDB
   - Test session retrieval with expired sessions
   - Test session updates
   - Test session deletion
   - Test TTL calculation
   - Test expiration checks

2. **Integration Tests**
   - Create session → restart server → retrieve session (should work)
   - Multi-turn conversation across multiple requests
   - Session expiration after 2 hours
   - Verify DynamoDB items have correct PK, SK, TTL

3. **Manual Testing**
   - Upload CSV → analyze → ask follow-up questions
   - Verify session persists across page refreshes
   - Check DynamoDB console for correct item structure

### Backward Compatibility Guarantees

1. **API Routes**: No changes required to any API route
2. **Function Signatures**: All public functions maintain exact same signatures
3. **Return Types**: SessionData type unchanged
4. **Error Handling**: Undefined/null returns remain the same
5. **LocalStorage**: Client-side persistence functions unchanged

## Error Handling

### Error Categories and Responses

#### 1. AWS Credential Errors

**Scenario**: DynamoDB credentials missing or invalid (common in local development)

**Detection**: `isCredentialError()` checks for:
- `UnrecognizedClientException`
- `CredentialsProviderError`
- `InvalidSignatureException`

**Response**:
```typescript
// Log warning but don't crash
console.warn('[Session Store] AWS credentials not configured, operating in degraded mode');
// Return graceful fallback:
// - createSession: return in-memory session (temporary)
// - getSession: return undefined
// - updateSession: return undefined
// - deleteSession: return false
```

**User Impact**: Sessions won't persist across restarts, but app remains functional

#### 2. Session Not Found

**Scenario**: Session ID doesn't exist in DynamoDB

**Detection**: `DynamoDBService.getItem()` returns null

**Response**:
```typescript
console.log('[Session Store] Session not found:', sessionId);
return undefined;
```

**User Impact**: User needs to create new session (upload data again)

#### 3. Session Expired

**Scenario**: Session exists but `expires_at` < current time

**Detection**: `isSessionExpired(item.expires_at)` returns true

**Response**:
```typescript
console.log('[Session Store] Session expired:', sessionId);
return undefined;
```

**User Impact**: Same as "not found" - user creates new session

#### 4. DynamoDB Operation Failure

**Scenario**: Network error, throttling, or other AWS service error

**Detection**: Exception thrown from DynamoDB client (not credential error)

**Response**:
```typescript
console.error('[Session Store] DynamoDB operation failed:', error);
throw new Error('Failed to persist session data');
```

**User Impact**: API route returns 500 error with message

#### 5. Invalid Session Data

**Scenario**: Corrupted data in DynamoDB (missing required fields)

**Detection**: Type conversion fails in `dynamoItemToSession()`

**Response**:
```typescript
console.error('[Session Store] Invalid session data:', sessionId);
return undefined;
```

**User Impact**: Treated as "not found" - user creates new session

### Error Logging Strategy

All session operations log with structured format:

```typescript
// Success logs
console.log('[Session Store] Created session:', sessionId);
console.log('[Session Store] Retrieved session:', sessionId);
console.log('[Session Store] Updated session:', sessionId);
console.log('[Session Store] Deleted session:', sessionId);

// Warning logs (non-fatal)
console.warn('[Session Store] AWS credentials not configured, operating in degraded mode');
console.warn('[Session Store] Session not found:', sessionId);
console.warn('[Session Store] Session expired:', sessionId);

// Error logs (fatal)
console.error('[Session Store] DynamoDB operation failed:', error);
console.error('[Session Store] Invalid session data:', sessionId, error);
```

### Graceful Degradation for Local Development

When AWS credentials are not configured (local development):

1. **Log Warning Once**: On first credential error, log warning message
2. **Continue Operation**: Don't crash the application
3. **Fallback Behavior**:
   - Sessions work within single request
   - Sessions don't persist across restarts
   - LocalStorage still works for daily/credit entries
4. **Clear User Feedback**: API responses indicate degraded mode

This allows developers to work on features without requiring AWS credentials.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Session Round-Trip Preservation

*For any* valid SessionData object, creating a session and then immediately retrieving it by session ID should return a SessionData object with equivalent data (same sessionId, dailyEntries, creditEntries, conversationHistory, and optional CSV data).

**Validates: Requirements 1.1, 1.2**

### Property 2: Session Updates Persist

*For any* existing session and any valid partial update (changes to dailyEntries, creditEntries, conversationHistory, or CSV data), after calling updateSession() and then retrieving the session, the retrieved session should contain the updated values.

**Validates: Requirements 1.3**

### Property 3: Session Deletion Removes Data

*For any* existing session, after calling deleteSession(), attempting to retrieve that session should return undefined, indicating the session no longer exists in DynamoDB.

**Validates: Requirements 1.4**

### Property 4: DynamoDB Item Schema Compliance

*For any* created session, the corresponding DynamoDB item should have:
- PK matching the pattern `SESSION#{sessionId}`
- SK equal to `METADATA`
- entityType equal to `SESSION`

**Validates: Requirements 1.5, 6.3**

### Property 5: TTL Calculation Correctness

*For any* session creation timestamp, the TTL field in the DynamoDB item should be:
- A Unix timestamp in seconds (not milliseconds)
- Equal to the expires_at timestamp converted to Unix seconds
- Approximately 2 hours (7200 seconds) greater than the createdAt timestamp

**Validates: Requirements 2.2, 2.3**

### Property 6: Expires_at Is Two Hours From Creation

*For any* created session, the expires_at timestamp should be exactly 2 hours (7200000 milliseconds) after the createdAt timestamp.

**Validates: Requirements 2.1**

### Property 7: Timestamp Format Is ISO 8601

*For any* session stored in DynamoDB, the createdAt, lastAccessedAt, and expires_at fields should all be valid ISO 8601 formatted strings that can be parsed back into Date objects without loss of precision (to the millisecond).

**Validates: Requirements 5.3, 5.4, 5.5**

### Property 8: LastAccessedAt Updates On Retrieval

*For any* existing session, after calling getSession(), the session's lastAccessedAt timestamp should be updated to approximately the current time (within 1 second tolerance).

**Validates: Requirements 2.4**

### Property 9: Expired Sessions Return Undefined

*For any* session where the expires_at timestamp is in the past (current time > expires_at), calling getSession() should return undefined, treating the expired session as non-existent.

**Validates: Requirements 2.5**

### Property 10: Stateless Persistence Across Restarts

*For any* session, if we create the session, clear all in-memory state (simulating a server restart), and then retrieve the session, we should get back the same session data, demonstrating that no instance-level state is required for session persistence.

**Validates: Requirements 3.1, 3.2**

### Property 11: CreateSession Returns Valid SessionData

*For any* call to createSession(), the returned object should be a valid SessionData with:
- A non-empty sessionId string
- createdAt as a Date object
- lastAccessedAt as a Date object
- dailyEntries as an array (possibly empty)
- creditEntries as an array (possibly empty)
- conversationHistory as an empty array

**Validates: Requirements 4.1**

### Property 12: DeleteSession Returns Correct Boolean

*For any* session ID, deleteSession() should return true if the session existed before deletion, and false if the session did not exist.

**Validates: Requirements 4.4**

### Property 13: GenerateSessionId Produces Unique IDs

*For any* sequence of N calls to generateSessionId() (where N ≥ 100), all returned session IDs should be unique (no duplicates), and each should be a 32-character hexadecimal string.

**Validates: Requirements 4.5**

### Property 14: Non-Existent Sessions Return Undefined

*For any* randomly generated session ID that has never been created, calling getSession() should return undefined without throwing an error.

**Validates: Requirements 7.3**

## Testing Strategy

### Dual Testing Approach

The DynamoDB Session Store will be validated using both unit tests and property-based tests, as they serve complementary purposes:

**Unit Tests** focus on:
- Specific examples of session creation, retrieval, update, and deletion
- Edge cases like empty conversation history, missing optional fields
- Error conditions: credential errors, DynamoDB failures, invalid data
- Integration with the existing DynamoDB client
- Mocking DynamoDB responses for isolated testing

**Property-Based Tests** focus on:
- Universal properties that hold across all possible session data
- Randomized session content (varying numbers of daily entries, credit entries, conversation messages)
- Round-trip preservation with diverse data structures
- Timestamp calculations with random creation times
- Session ID uniqueness across many generations

Together, unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library Selection**: Use `fast-check` for TypeScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each test tagged with feature name and property number
- Tag format: `Feature: dynamodb-session-store, Property {N}: {property description}`

**Example Property Test Structure**:

```typescript
import fc from 'fast-check';
import { createSession, getSession } from '../session-store';

describe('Feature: dynamodb-session-store, Property 1: Session Round-Trip Preservation', () => {
  it('should preserve session data through create and retrieve cycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          dailyEntries: fc.array(dailyEntryArbitrary),
          creditEntries: fc.array(creditEntryArbitrary),
          conversationHistory: fc.array(chatMessageArbitrary),
        }),
        async (sessionData) => {
          // Create session with generated data
          const created = await createSession();
          await updateSession(created.sessionId, sessionData);
          
          // Retrieve session
          const retrieved = await getSession(created.sessionId);
          
          // Verify equivalence
          expect(retrieved).toBeDefined();
          expect(retrieved.dailyEntries).toEqual(sessionData.dailyEntries);
          expect(retrieved.creditEntries).toEqual(sessionData.creditEntries);
          expect(retrieved.conversationHistory.length).toBe(sessionData.conversationHistory.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Mock DynamoDB Client**: Create a mock implementation of DynamoDBService for isolated testing

**Test Categories**:

1. **Session Lifecycle Tests**
   - Create session with empty data
   - Create session with pre-loaded localStorage data
   - Retrieve existing session
   - Update session with new conversation message
   - Delete existing session

2. **Expiration Tests**
   - Retrieve session before expiration (should succeed)
   - Retrieve session after expiration (should return undefined)
   - Verify TTL calculation for various creation times

3. **Error Handling Tests**
   - Missing AWS credentials (should log warning, not crash)
   - DynamoDB operation failure (should throw descriptive error)
   - Session not found (should return undefined)
   - Invalid session data in DynamoDB (should return undefined)

4. **Data Transformation Tests**
   - sessionToDynamoItem() converts all fields correctly
   - dynamoItemToSession() reconstructs SessionData correctly
   - Date objects convert to/from ISO 8601 strings
   - Conversation history timestamps preserve millisecond precision

5. **Schema Validation Tests**
   - Verify PK format: `SESSION#{sessionId}`
   - Verify SK value: `METADATA`
   - Verify entityType: `SESSION`
   - Verify TTL is Unix seconds (not milliseconds)

### Integration Testing

**End-to-End Flow Tests**:

1. **Multi-Turn Conversation Test**
   ```
   1. Create session
   2. Add daily entries
   3. Add conversation message
   4. Retrieve session (verify data present)
   5. Add another conversation message
   6. Retrieve session (verify both messages present)
   ```

2. **Simulated Restart Test**
   ```
   1. Create session with data
   2. Note session ID
   3. Clear all in-memory state (simulate restart)
   4. Retrieve session by ID
   5. Verify all data intact
   ```

3. **Expiration Test**
   ```
   1. Create session with expires_at = now + 1 second
   2. Wait 2 seconds
   3. Retrieve session
   4. Verify returns undefined
   ```

### Test Coverage Goals

- **Line Coverage**: ≥ 90% for session-store.ts
- **Branch Coverage**: ≥ 85% (covering all error paths)
- **Property Tests**: All 14 properties implemented
- **Unit Tests**: Minimum 20 test cases covering examples and edge cases

### Manual Verification Checklist

Before deployment, manually verify:

- [ ] Create session → check DynamoDB console for correct item structure
- [ ] Upload CSV → analyze → ask question → refresh page → ask another question (session persists)
- [ ] Create session → wait 2+ hours → verify session returns undefined
- [ ] Check DynamoDB TTL is set correctly (Unix seconds, not milliseconds)
- [ ] Verify no in-memory Map usage in production code
- [ ] Test with missing AWS credentials (should log warning, not crash)

