/**
 * @jest-environment node
 */

/**
 * Property-based tests for session-store.ts
 * Feature: dynamodb-session-store
 * 
 * Tests cover:
 * - Property 1: Session Round-Trip Preservation
 * 
 * Using fast-check for property-based testing with 100 iterations
 * 
 * Requirements: 1.1, 1.2
 */

import * as fc from 'fast-check';
import { createSession, getSession, updateSession, deleteSession, generateSessionId } from '../session-store';
import { DynamoDBService } from '../dynamodb-client';
import { SessionData, DailyEntry, CreditEntry, ChatMessage } from '../types';

// Mock dependencies
jest.mock('../dynamodb-client');
jest.mock('../logger');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: global,
  writable: true,
});

// ============================================
// Fast-check Arbitraries (Generators)
// ============================================

/**
 * Generate valid DailyEntry objects
 */
const dailyEntryArbitrary: fc.Arbitrary<DailyEntry> = fc.record({
  date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
    .map(d => d.toISOString().split('T')[0]), // ISO date string YYYY-MM-DD
  totalSales: fc.integer({ min: 0, max: 1000000 }),
  totalExpense: fc.integer({ min: 0, max: 1000000 }),
  cashInHand: fc.option(fc.integer({ min: 0, max: 10000000 }), { nil: undefined }),
  estimatedProfit: fc.integer({ min: -100000, max: 1000000 }),
  expenseRatio: fc.double({ min: 0, max: 2, noNaN: true }),
  profitMargin: fc.double({ min: -1, max: 1, noNaN: true }),
});

/**
 * Generate valid CreditEntry objects
 */
const creditEntryArbitrary: fc.Arbitrary<CreditEntry> = fc.record({
  id: fc.uuid(),
  customerName: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.integer({ min: 1, max: 1000000 }),
  dueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
    .map(d => d.toISOString().split('T')[0]), // ISO date string
  isPaid: fc.boolean(),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
    .map(d => d.toISOString()),
  paidAt: fc.option(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
      .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
      .map(d => d.toISOString()),
    { nil: undefined }
  ),
});

/**
 * Generate valid ChatMessage objects
 */
const chatMessageArbitrary: fc.Arbitrary<ChatMessage> = fc.record({
  role: fc.constantFrom('user' as const, 'assistant' as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
});

/**
 * Generate partial SessionData for updates (without sessionId, createdAt, lastAccessedAt)
 */
const sessionUpdateArbitrary = fc.record({
  dailyEntries: fc.array(dailyEntryArbitrary, { minLength: 0, maxLength: 10 }),
  creditEntries: fc.array(creditEntryArbitrary, { minLength: 0, maxLength: 10 }),
  conversationHistory: fc.array(chatMessageArbitrary, { minLength: 0, maxLength: 10 }),
});

// ============================================
// Property-Based Tests
// ============================================

describe('Feature: dynamodb-session-store - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Mock DynamoDB operations
    (DynamoDBService.putItem as jest.Mock).mockResolvedValue(undefined);
    (DynamoDBService.updateItem as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Property 1: Session Round-Trip Preservation
   * **Validates: Requirements 1.1, 1.2**
   * 
   * For any valid SessionData object, creating a session and then immediately
   * retrieving it by session ID should return a SessionData object with equivalent
   * data (same sessionId, dailyEntries, creditEntries, conversationHistory, and
   * optional CSV data).
   */
  describe('Property 1: Session Round-Trip Preservation', () => {
    it('should preserve session data through create and retrieve cycle', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            
            // Manually construct what the updated session should look like in DynamoDB
            // This simulates what would happen if we directly stored the session data
            const mockUpdatedSession: SessionData = {
              ...created,
              ...sessionData,
              lastAccessedAt: new Date(), // This gets updated
            };
            
            // Convert to DynamoDB format (what would be stored)
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession to return the stored item
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: Verify equivalence
            expect(retrieved).toBeDefined();
            expect(retrieved?.sessionId).toBe(created.sessionId);
            
            // Verify dailyEntries are preserved
            expect(retrieved?.dailyEntries).toHaveLength(sessionData.dailyEntries.length);
            for (let i = 0; i < sessionData.dailyEntries.length; i++) {
              expect(retrieved?.dailyEntries[i]).toEqual(sessionData.dailyEntries[i]);
            }
            
            // Verify creditEntries are preserved
            expect(retrieved?.creditEntries).toHaveLength(sessionData.creditEntries.length);
            for (let i = 0; i < sessionData.creditEntries.length; i++) {
              expect(retrieved?.creditEntries[i]).toEqual(sessionData.creditEntries[i]);
            }
            
            // Verify conversationHistory is preserved
            expect(retrieved?.conversationHistory).toHaveLength(sessionData.conversationHistory.length);
            for (let i = 0; i < sessionData.conversationHistory.length; i++) {
              expect(retrieved?.conversationHistory[i].role).toBe(sessionData.conversationHistory[i].role);
              expect(retrieved?.conversationHistory[i].content).toBe(sessionData.conversationHistory[i].content);
              // Timestamps should be preserved (converted to Date objects)
              expect(retrieved?.conversationHistory[i].timestamp).toBeInstanceOf(Date);
              expect(retrieved?.conversationHistory[i].timestamp.getTime()).toBe(
                sessionData.conversationHistory[i].timestamp.getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve empty arrays through round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant({
            dailyEntries: [],
            creditEntries: [],
            conversationHistory: [],
          }),
          async (sessionData) => {
            // Arrange: Create session with empty data
            const created = await createSession();
            
            // Manually construct stored item
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: [],
              creditEntries: [],
              conversationHistory: [],
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: Empty arrays should be preserved
            expect(retrieved?.dailyEntries).toEqual([]);
            expect(retrieved?.creditEntries).toEqual([]);
            expect(retrieved?.conversationHistory).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve sessionId through round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            
            // Manually construct stored item
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: sessionId should be preserved
            expect(retrieved?.sessionId).toBe(created.sessionId);
            expect(retrieved?.sessionId).toHaveLength(32); // 16 bytes = 32 hex chars
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve Date objects through round-trip (createdAt, lastAccessedAt)', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            const createdAtISO = created.createdAt.toISOString();
            
            // Manually construct stored item (simulating what would be in DynamoDB)
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: createdAtISO, // Use the original createdAt
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: Date objects should be preserved
            expect(retrieved?.createdAt).toBeInstanceOf(Date);
            // Compare ISO strings since Date objects are reconstructed from storage
            expect(retrieved?.createdAt.toISOString()).toBe(createdAtISO);
            
            expect(retrieved?.lastAccessedAt).toBeInstanceOf(Date);
            // lastAccessedAt is updated on retrieval, so it should be recent
            expect(retrieved?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(created.createdAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve varying numbers of dailyEntries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(dailyEntryArbitrary, { minLength: 0, maxLength: 20 }),
          async (dailyEntries) => {
            // Arrange: Create session with varying dailyEntries
            const created = await createSession();
            
            // Manually construct stored item
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: dailyEntries,
              creditEntries: [],
              conversationHistory: [],
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: dailyEntries count should match
            expect(retrieved?.dailyEntries).toHaveLength(dailyEntries.length);
            
            // Verify each entry is preserved
            for (let i = 0; i < dailyEntries.length; i++) {
              expect(retrieved?.dailyEntries[i]).toEqual(dailyEntries[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve varying numbers of creditEntries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(creditEntryArbitrary, { minLength: 0, maxLength: 20 }),
          async (creditEntries) => {
            // Arrange: Create session with varying creditEntries
            const created = await createSession();
            
            // Manually construct stored item
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: [],
              creditEntries: creditEntries,
              conversationHistory: [],
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: creditEntries count should match
            expect(retrieved?.creditEntries).toHaveLength(creditEntries.length);
            
            // Verify each entry is preserved
            for (let i = 0; i < creditEntries.length; i++) {
              expect(retrieved?.creditEntries[i]).toEqual(creditEntries[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve varying numbers of conversationHistory messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(chatMessageArbitrary, { minLength: 0, maxLength: 20 }),
          async (conversationHistory) => {
            // Arrange: Create session with varying conversation history
            const created = await createSession();
            
            // Manually construct stored item
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: [],
              creditEntries: [],
              conversationHistory: conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: conversationHistory count should match
            expect(retrieved?.conversationHistory).toHaveLength(conversationHistory.length);
            
            // Verify each message is preserved
            for (let i = 0; i < conversationHistory.length; i++) {
              expect(retrieved?.conversationHistory[i].role).toBe(conversationHistory[i].role);
              expect(retrieved?.conversationHistory[i].content).toBe(conversationHistory[i].content);
              expect(retrieved?.conversationHistory[i].timestamp).toBeInstanceOf(Date);
              expect(retrieved?.conversationHistory[i].timestamp.getTime()).toBe(
                conversationHistory[i].timestamp.getTime()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Session Updates Persist
   * **Validates: Requirements 1.3**
   * 
   * For any existing session and any valid partial update (changes to dailyEntries,
   * creditEntries, conversationHistory, or CSV data), after calling updateSession()
   * and then retrieving the session, the retrieved session should contain the updated values.
   */
  describe('Property 2: Session Updates Persist', () => {
    it('should persist updates to session data', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          sessionUpdateArbitrary,
          async (initialData, updates) => {
            // Arrange: Create session with initial data
            const created = await createSession();
            
            // Mock initial session in DynamoDB
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const initialItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: initialData.dailyEntries,
              creditEntries: initialData.creditEntries,
              conversationHistory: initialData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getSession to return initial data
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(initialItem);
            
            // Act: Update session
            const updated = await updateSession(created.sessionId, updates);
            
            // Assert: Updates should be applied
            expect(updated).toBeDefined();
            expect(updated?.dailyEntries).toEqual(updates.dailyEntries);
            expect(updated?.creditEntries).toEqual(updates.creditEntries);
            expect(updated?.conversationHistory).toHaveLength(updates.conversationHistory.length);
            
            // Verify putItem was called with updated data
            expect(DynamoDBService.putItem).toHaveBeenCalled();
            const putItemCall = (DynamoDBService.putItem as jest.Mock).mock.calls.slice(-1)[0][0];
            expect(putItemCall.dailyEntries).toEqual(updates.dailyEntries);
            expect(putItemCall.creditEntries).toEqual(updates.creditEntries);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Session Deletion Removes Data
   * **Validates: Requirements 1.4**
   * 
   * For any existing session, after calling deleteSession(), attempting to retrieve
   * that session should return undefined, indicating the session no longer exists in DynamoDB.
   */
  describe('Property 3: Session Deletion Removes Data', () => {
    it('should remove session data after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            
            // Mock session exists in DynamoDB
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getItem to return session (for deletion check)
            (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(storedItem);
            
            // Act: Delete session
            const deleted = await deleteSession(created.sessionId);
            
            // Assert: Deletion should succeed
            expect(deleted).toBe(true);
            expect(DynamoDBService.deleteItem).toHaveBeenCalledWith(
              `SESSION#${created.sessionId}`,
              'METADATA'
            );
            
            // Mock getItem to return null (session deleted)
            (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(null);
            
            // Attempt to retrieve deleted session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: Should return undefined
            expect(retrieved).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: DynamoDB Item Schema Compliance
   * **Validates: Requirements 1.5, 6.3**
   * 
   * For any created session, the corresponding DynamoDB item should have:
   * - PK matching the pattern `SESSION#{sessionId}`
   * - SK equal to `METADATA`
   * - entityType equal to `SESSION`
   */
  describe('Property 4: DynamoDB Item Schema Compliance', () => {
    it('should create DynamoDB items with correct schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange & Act: Create session
            const created = await createSession();
            
            // Assert: Verify putItem was called with correct schema
            expect(DynamoDBService.putItem).toHaveBeenCalled();
            const putItemCall = (DynamoDBService.putItem as jest.Mock).mock.calls.slice(-1)[0][0];
            
            // Verify PK format
            expect(putItemCall.PK).toBe(`SESSION#${created.sessionId}`);
            expect(putItemCall.PK).toMatch(/^SESSION#[a-f0-9]{32}$/);
            
            // Verify SK
            expect(putItemCall.SK).toBe('METADATA');
            
            // Verify entityType
            expect(putItemCall.entityType).toBe('SESSION');
            
            // Verify sessionId is present
            expect(putItemCall.sessionId).toBe(created.sessionId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: TTL Calculation Correctness
   * **Validates: Requirements 2.2, 2.3**
   * 
   * For any session creation timestamp, the TTL field in the DynamoDB item should be:
   * - A Unix timestamp in seconds (not milliseconds)
   * - Equal to the expires_at timestamp converted to Unix seconds
   * - Approximately 2 hours (7200 seconds) greater than the createdAt timestamp
   */
  describe('Property 5: TTL Calculation Correctness', () => {
    it('should calculate TTL correctly as Unix seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant({}),
          async () => {
            // Arrange & Act: Create session
            const created = await createSession();
            
            // Assert: Verify putItem was called with correct TTL
            expect(DynamoDBService.putItem).toHaveBeenCalled();
            const putItemCall = (DynamoDBService.putItem as jest.Mock).mock.calls.slice(-1)[0][0];
            
            // Verify TTL is a number (Unix seconds)
            expect(typeof putItemCall.ttl).toBe('number');
            
            // Verify TTL is in seconds (not milliseconds)
            // Unix seconds should be ~10 digits, milliseconds would be ~13 digits
            expect(putItemCall.ttl.toString().length).toBeLessThanOrEqual(11);
            
            // Verify TTL is approximately 2 hours (7200 seconds) after createdAt
            const createdAtSeconds = Math.floor(created.createdAt.getTime() / 1000);
            const expectedTTL = createdAtSeconds + 7200;
            
            // Allow 5 second tolerance for test execution time
            expect(putItemCall.ttl).toBeGreaterThanOrEqual(expectedTTL - 5);
            expect(putItemCall.ttl).toBeLessThanOrEqual(expectedTTL + 5);
            
            // Verify TTL equals expires_at converted to Unix seconds
            const expiresAtSeconds = Math.floor(new Date(putItemCall.expires_at).getTime() / 1000);
            expect(putItemCall.ttl).toBe(expiresAtSeconds);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Expires_at Is Two Hours From Creation
   * **Validates: Requirements 2.1**
   * 
   * For any created session, the expires_at timestamp should be exactly 2 hours
   * (7200000 milliseconds) after the createdAt timestamp.
   */
  describe('Property 6: Expires_at Is Two Hours From Creation', () => {
    it('should set expires_at to exactly 2 hours after creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant({}),
          async () => {
            // Arrange & Act: Create session
            const created = await createSession();
            
            // Assert: Verify putItem was called with correct expires_at
            expect(DynamoDBService.putItem).toHaveBeenCalled();
            const putItemCall = (DynamoDBService.putItem as jest.Mock).mock.calls.slice(-1)[0][0];
            
            // Parse expires_at
            const expiresAt = new Date(putItemCall.expires_at);
            const createdAt = created.createdAt;
            
            // Calculate expected expires_at (2 hours = 7200000 milliseconds)
            const expectedExpiresAt = new Date(createdAt.getTime() + 7200000);
            
            // Verify expires_at is approximately 2 hours after createdAt
            // Allow 5 second tolerance for test execution time
            const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiresAt.getTime());
            expect(timeDiff).toBeLessThanOrEqual(5000); // 5 seconds tolerance
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Timestamp Format Is ISO 8601
   * **Validates: Requirements 5.3, 5.4, 5.5**
   * 
   * For any session stored in DynamoDB, the createdAt, lastAccessedAt, and expires_at
   * fields should all be valid ISO 8601 formatted strings that can be parsed back into
   * Date objects without loss of precision (to the millisecond).
   */
  describe('Property 7: Timestamp Format Is ISO 8601', () => {
    it('should store timestamps in ISO 8601 format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant({}),
          async () => {
            // Arrange & Act: Create session
            const created = await createSession();
            
            // Assert: Verify putItem was called with ISO 8601 timestamps
            expect(DynamoDBService.putItem).toHaveBeenCalled();
            const putItemCall = (DynamoDBService.putItem as jest.Mock).mock.calls.slice(-1)[0][0];
            
            // Verify createdAt is ISO 8601
            expect(typeof putItemCall.createdAt).toBe('string');
            const createdAtParsed = new Date(putItemCall.createdAt);
            expect(createdAtParsed.toISOString()).toBe(putItemCall.createdAt);
            expect(isNaN(createdAtParsed.getTime())).toBe(false);
            
            // Verify lastAccessedAt is ISO 8601
            expect(typeof putItemCall.lastAccessedAt).toBe('string');
            const lastAccessedAtParsed = new Date(putItemCall.lastAccessedAt);
            expect(lastAccessedAtParsed.toISOString()).toBe(putItemCall.lastAccessedAt);
            expect(isNaN(lastAccessedAtParsed.getTime())).toBe(false);
            
            // Verify expires_at is ISO 8601
            expect(typeof putItemCall.expires_at).toBe('string');
            const expiresAtParsed = new Date(putItemCall.expires_at);
            expect(expiresAtParsed.toISOString()).toBe(putItemCall.expires_at);
            expect(isNaN(expiresAtParsed.getTime())).toBe(false);
            
            // Verify no precision loss (milliseconds preserved)
            expect(createdAtParsed.getTime()).toBe(created.createdAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: LastAccessedAt Updates On Retrieval
   * **Validates: Requirements 2.4**
   * 
   * For any existing session, after calling getSession(), the session's lastAccessedAt
   * timestamp should be updated to approximately the current time (within 1 second tolerance).
   */
  describe('Property 8: LastAccessedAt Updates On Retrieval', () => {
    it('should update lastAccessedAt when session is retrieved', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            const originalLastAccessed = created.lastAccessedAt;
            
            // Wait a brief moment to ensure time difference
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Mock session in DynamoDB with old lastAccessedAt
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: originalLastAccessed.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getItem
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve session
            const beforeRetrieval = new Date();
            const retrieved = await getSession(created.sessionId);
            const afterRetrieval = new Date();
            
            // Assert: lastAccessedAt should be updated
            expect(retrieved).toBeDefined();
            expect(retrieved?.lastAccessedAt).toBeInstanceOf(Date);
            
            // Verify lastAccessedAt is approximately current time (within 1 second)
            expect(retrieved?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeRetrieval.getTime() - 1000);
            expect(retrieved?.lastAccessedAt.getTime()).toBeLessThanOrEqual(afterRetrieval.getTime() + 1000);
            
            // Verify updateItem was called to persist the timestamp
            expect(DynamoDBService.updateItem).toHaveBeenCalledWith(
              `SESSION#${created.sessionId}`,
              'METADATA',
              expect.objectContaining({
                lastAccessedAt: expect.any(String),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Expired Sessions Return Undefined
   * **Validates: Requirements 2.5**
   * 
   * For any session where the expires_at timestamp is in the past (current time > expires_at),
   * calling getSession() should return undefined, treating the expired session as non-existent.
   */
  describe('Property 9: Expired Sessions Return Undefined', () => {
    it('should return undefined for expired sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          fc.integer({ min: 1, max: 86400 }), // Random seconds in the past (1 second to 1 day)
          async (sessionData, secondsAgo) => {
            // Arrange: Create session
            const created = await createSession();
            
            // Mock session in DynamoDB with expires_at in the past
            const now = new Date();
            const expiresAt = new Date(now.getTime() - (secondsAgo * 1000)); // In the past
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(), // Expired
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getItem
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            
            // Act: Retrieve expired session
            const retrieved = await getSession(created.sessionId);
            
            // Assert: Should return undefined
            expect(retrieved).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Stateless Persistence Across Restarts
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any session, if we create the session, clear all in-memory state (simulating a
   * server restart), and then retrieve the session, we should get back the same session
   * data, demonstrating that no instance-level state is required for session persistence.
   */
  describe('Property 10: Stateless Persistence Across Restarts', () => {
    it('should persist session data across simulated restarts', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            
            // Simulate storing data in DynamoDB
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: sessionData.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp.toISOString(),
              })),
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Simulate restart: Clear mocks (simulates new instance)
            jest.clearAllMocks();
            
            // Mock getItem to return stored data (from DynamoDB)
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            (DynamoDBService.updateItem as jest.Mock).mockResolvedValue(undefined);
            
            // Act: Retrieve session after "restart"
            const retrieved = await getSession(created.sessionId);
            
            // Assert: Session data should be intact
            expect(retrieved).toBeDefined();
            expect(retrieved?.sessionId).toBe(created.sessionId);
            expect(retrieved?.dailyEntries).toEqual(sessionData.dailyEntries);
            expect(retrieved?.creditEntries).toEqual(sessionData.creditEntries);
            expect(retrieved?.conversationHistory).toHaveLength(sessionData.conversationHistory.length);
            
            // Verify data came from DynamoDB (not in-memory)
            expect(DynamoDBService.getItem).toHaveBeenCalledWith(
              `SESSION#${created.sessionId}`,
              'METADATA'
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: CreateSession Returns Valid SessionData
   * **Validates: Requirements 4.1**
   * 
   * For any call to createSession(), the returned object should be a valid SessionData with:
   * - A non-empty sessionId string
   * - createdAt as a Date object
   * - lastAccessedAt as a Date object
   * - dailyEntries as an array (possibly empty)
   * - creditEntries as an array (possibly empty)
   * - conversationHistory as an empty array
   */
  describe('Property 11: CreateSession Returns Valid SessionData', () => {
    it('should return valid SessionData on creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant({}),
          async () => {
            // Act: Create session
            const created = await createSession();
            
            // Assert: Verify valid SessionData structure
            expect(created).toBeDefined();
            
            // Verify sessionId
            expect(typeof created.sessionId).toBe('string');
            expect(created.sessionId.length).toBeGreaterThan(0);
            expect(created.sessionId).toHaveLength(32); // 16 bytes = 32 hex chars
            expect(created.sessionId).toMatch(/^[a-f0-9]{32}$/);
            
            // Verify createdAt
            expect(created.createdAt).toBeInstanceOf(Date);
            expect(isNaN(created.createdAt.getTime())).toBe(false);
            
            // Verify lastAccessedAt
            expect(created.lastAccessedAt).toBeInstanceOf(Date);
            expect(isNaN(created.lastAccessedAt.getTime())).toBe(false);
            
            // Verify arrays
            expect(Array.isArray(created.dailyEntries)).toBe(true);
            expect(Array.isArray(created.creditEntries)).toBe(true);
            expect(Array.isArray(created.conversationHistory)).toBe(true);
            
            // Verify conversationHistory is empty on creation
            expect(created.conversationHistory).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 12: DeleteSession Returns Correct Boolean
   * **Validates: Requirements 4.4**
   * 
   * For any session ID, deleteSession() should return true if the session existed before
   * deletion, and false if the session did not exist.
   */
  describe('Property 12: DeleteSession Returns Correct Boolean', () => {
    it('should return true when deleting existing session', async () => {
      await fc.assert(
        fc.asyncProperty(
          sessionUpdateArbitrary,
          async (sessionData) => {
            // Arrange: Create session
            const created = await createSession();
            
            // Mock session exists in DynamoDB
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const storedItem = {
              PK: `SESSION#${created.sessionId}`,
              SK: 'METADATA',
              entityType: 'SESSION',
              sessionId: created.sessionId,
              createdAt: created.createdAt.toISOString(),
              lastAccessedAt: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              dailyEntries: sessionData.dailyEntries,
              creditEntries: sessionData.creditEntries,
              conversationHistory: [],
              ttl: Math.floor(expiresAt.getTime() / 1000),
            };
            
            // Mock getItem to return session (exists)
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(storedItem);
            (DynamoDBService.deleteItem as jest.Mock).mockResolvedValue(undefined);
            
            // Act: Delete existing session
            const result = await deleteSession(created.sessionId);
            
            // Assert: Should return true
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when deleting non-existent session', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 32 }).map(arr => 
            arr.map(n => n.toString(16)).join('')
          ),
          async (randomSessionId) => {
            // Arrange: Mock session does not exist
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
            
            // Act: Delete non-existent session
            const result = await deleteSession(randomSessionId);
            
            // Assert: Should return false
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: GenerateSessionId Produces Unique IDs
   * **Validates: Requirements 4.5**
   * 
   * For any sequence of N calls to generateSessionId() (where N >= 100), all returned
   * session IDs should be unique (no duplicates), and each should be a 32-character
   * hexadecimal string.
   */
  describe('Property 13: GenerateSessionId Produces Unique IDs', () => {
    it('should generate unique session IDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 200 }),
          async (count) => {
            // Act: Generate multiple session IDs
            const sessionIds = new Set<string>();
            
            for (let i = 0; i < count; i++) {
              const id = generateSessionId();
              
              // Verify format
              expect(typeof id).toBe('string');
              expect(id).toHaveLength(32);
              expect(id).toMatch(/^[a-f0-9]{32}$/);
              
              // Add to set (duplicates would not increase size)
              sessionIds.add(id);
            }
            
            // Assert: All IDs should be unique
            expect(sessionIds.size).toBe(count);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Non-Existent Sessions Return Undefined
   * **Validates: Requirements 7.3**
   * 
   * For any randomly generated session ID that has never been created, calling getSession()
   * should return undefined without throwing an error.
   */
  describe('Property 14: Non-Existent Sessions Return Undefined', () => {
    it('should return undefined for non-existent sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 32 }).map(arr => 
            arr.map(n => n.toString(16)).join('')
          ),
          async (randomSessionId) => {
            // Arrange: Mock session does not exist
            (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
            
            // Act: Retrieve non-existent session
            const retrieved = await getSession(randomSessionId);
            
            // Assert: Should return undefined without throwing
            expect(retrieved).toBeUndefined();
            
            // Verify getItem was called
            expect(DynamoDBService.getItem).toHaveBeenCalledWith(
              `SESSION#${randomSessionId}`,
              'METADATA'
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
