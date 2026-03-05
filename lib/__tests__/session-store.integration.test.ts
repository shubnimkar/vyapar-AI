/**
 * Integration tests for session-store.ts
 * Feature: dynamodb-session-store
 * 
 * These are end-to-end integration tests that verify complete workflows work correctly.
 * 
 * Tests cover:
 * - Test 9.1: Multi-turn conversation flow (Req 1.1, 1.2, 1.3, 5.8)
 * - Test 9.2: Simulated restart (Req 3.1, 3.2, 3.3)
 * - Test 9.3: Session expiration (Req 2.1, 2.5)
 */

import { createSession, getSession, updateSession } from '../session-store';
import { DynamoDBService } from '../dynamodb-client';
import { logger } from '../logger';
import { ChatMessage } from '../types';

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

// Helper to create a mock DynamoDB item from session data
function createMockDynamoItem(sessionId: string, data: any) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  return {
    PK: `SESSION#${sessionId}`,
    SK: 'METADATA',
    entityType: 'SESSION',
    sessionId,
    createdAt: data.createdAt || now.toISOString(),
    lastAccessedAt: now.toISOString(),
    expires_at: data.expires_at || expiresAt.toISOString(),
    dailyEntries: data.dailyEntries || [],
    creditEntries: data.creditEntries || [],
    conversationHistory: (data.conversationHistory || []).map((msg: ChatMessage) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    })),
    ttl: Math.floor((data.expires_at ? new Date(data.expires_at).getTime() : expiresAt.getTime()) / 1000),
  };
}

describe('Feature: dynamodb-session-store - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock: DynamoDB operations succeed
    (DynamoDBService.putItem as jest.Mock).mockResolvedValue(undefined);
    (DynamoDBService.updateItem as jest.Mock).mockResolvedValue(undefined);
    (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
  });

  /**
   * Test 9.1: Multi-turn conversation flow
   * **Validates: Requirements 1.1, 1.2, 1.3, 5.8**
   * 
   * This test verifies that a complete multi-turn conversation workflow works correctly:
   * 1. Create session
   * 2. Add daily entries
   * 3. Add conversation message
   * 4. Retrieve session, verify data present
   * 5. Add another conversation message
   * 6. Retrieve session, verify both messages present
   */
  describe('Test 9.1: Multi-turn conversation flow', () => {
    it('should maintain conversation history across multiple updates and retrievals', async () => {
      // Step 1: Create session
      const session = await createSession();
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.conversationHistory).toEqual([]);
      
      // Step 2: Add daily entries
      const dailyEntries = [
        {
          date: '2024-01-15',
          totalSales: 5000,
          totalExpense: 3000,
          cashInHand: 10000,
          estimatedProfit: 2000,
          expenseRatio: 0.6,
          profitMargin: 0.4,
        },
      ];
      
      // Mock getSession to return session with daily entries
      let mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries,
        conversationHistory: [],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Update session with daily entries
      const updatedSession1 = await updateSession(session.sessionId, { dailyEntries });
      expect(updatedSession1).toBeDefined();
      expect(updatedSession1?.dailyEntries).toEqual(dailyEntries);
      
      // Step 3: Add first conversation message
      const firstMessage: ChatMessage = {
        role: 'user',
        content: 'What is my profit margin?',
        timestamp: new Date(),
      };
      
      // Mock getSession to return session with daily entries
      mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries,
        conversationHistory: [],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Update session with first message
      const updatedSession2 = await updateSession(session.sessionId, {
        conversationHistory: [firstMessage],
      });
      expect(updatedSession2).toBeDefined();
      expect(updatedSession2?.conversationHistory).toHaveLength(1);
      
      // Step 4: Retrieve session, verify data present
      mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries,
        conversationHistory: [firstMessage],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrievedSession1 = await getSession(session.sessionId);
      expect(retrievedSession1).toBeDefined();
      expect(retrievedSession1?.sessionId).toBe(session.sessionId);
      expect(retrievedSession1?.dailyEntries).toEqual(dailyEntries);
      expect(retrievedSession1?.conversationHistory).toHaveLength(1);
      expect(retrievedSession1?.conversationHistory[0].role).toBe('user');
      expect(retrievedSession1?.conversationHistory[0].content).toBe('What is my profit margin?');
      
      // Step 5: Add second conversation message
      const secondMessage: ChatMessage = {
        role: 'assistant',
        content: 'Your profit margin is 40%',
        timestamp: new Date(),
      };
      
      // Mock getSession to return session with first message
      mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries,
        conversationHistory: [firstMessage],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Update session with both messages
      const updatedSession3 = await updateSession(session.sessionId, {
        conversationHistory: [firstMessage, secondMessage],
      });
      expect(updatedSession3).toBeDefined();
      expect(updatedSession3?.conversationHistory).toHaveLength(2);
      
      // Step 6: Retrieve session, verify both messages present
      mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries,
        conversationHistory: [firstMessage, secondMessage],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrievedSession2 = await getSession(session.sessionId);
      expect(retrievedSession2).toBeDefined();
      expect(retrievedSession2?.sessionId).toBe(session.sessionId);
      expect(retrievedSession2?.dailyEntries).toEqual(dailyEntries);
      expect(retrievedSession2?.conversationHistory).toHaveLength(2);
      expect(retrievedSession2?.conversationHistory[0].role).toBe('user');
      expect(retrievedSession2?.conversationHistory[0].content).toBe('What is my profit margin?');
      expect(retrievedSession2?.conversationHistory[1].role).toBe('assistant');
      expect(retrievedSession2?.conversationHistory[1].content).toBe('Your profit margin is 40%');
      
      // Verify DynamoDB operations were called
      expect(DynamoDBService.putItem).toHaveBeenCalled();
      expect(DynamoDBService.getItem).toHaveBeenCalled();
      expect(DynamoDBService.updateItem).toHaveBeenCalled();
    });

    it('should preserve credit entries alongside conversation history', async () => {
      // Create session
      const session = await createSession();
      
      // Add credit entries and conversation
      const creditEntries = [
        {
          id: 'credit-1',
          customerName: 'Rajesh Kumar',
          amount: 1500,
          dueDate: '2024-01-20',
          isPaid: false,
          createdAt: '2024-01-10',
        },
      ];
      
      const message: ChatMessage = {
        role: 'user',
        content: 'Show me overdue credits',
        timestamp: new Date(),
      };
      
      // Mock getSession to return empty session
      let mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        creditEntries: [],
        conversationHistory: [],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Update with credit entries
      await updateSession(session.sessionId, { creditEntries });
      
      // Mock getSession to return session with credit entries
      mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        creditEntries,
        conversationHistory: [],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Update with conversation
      await updateSession(session.sessionId, { conversationHistory: [message] });
      
      // Retrieve and verify both are present
      mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        creditEntries,
        conversationHistory: [message],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrieved = await getSession(session.sessionId);
      expect(retrieved?.creditEntries).toEqual(creditEntries);
      expect(retrieved?.conversationHistory).toHaveLength(1);
    });
  });

  /**
   * Test 9.2: Simulated restart
   * **Validates: Requirements 3.1, 3.2, 3.3**
   * 
   * This test verifies that sessions persist correctly across server restarts:
   * 1. Create session with data
   * 2. Note session ID
   * 3. Clear all in-memory state (simulate restart)
   * 4. Retrieve session by ID
   * 5. Verify all data intact
   */
  describe('Test 9.2: Simulated restart', () => {
    it('should retrieve session data after simulated server restart', async () => {
      // Step 1: Create session with data
      const dailyEntries = [
        {
          date: '2024-01-15',
          totalSales: 5000,
          totalExpense: 3000,
          cashInHand: 10000,
          estimatedProfit: 2000,
          expenseRatio: 0.6,
          profitMargin: 0.4,
        },
      ];
      
      const creditEntries = [
        {
          id: 'credit-1',
          customerName: 'Rajesh Kumar',
          amount: 1500,
          dueDate: '2024-01-20',
          isPaid: false,
          createdAt: '2024-01-10',
        },
      ];
      
      const conversationHistory: ChatMessage[] = [
        {
          role: 'user',
          content: 'What is my profit margin?',
          timestamp: new Date('2024-01-15T10:00:00.000Z'),
        },
        {
          role: 'assistant',
          content: 'Your profit margin is 40%',
          timestamp: new Date('2024-01-15T10:00:05.000Z'),
        },
      ];
      
      const session = await createSession();
      
      // Mock getSession to return empty session
      let mockItem = createMockDynamoItem(session.sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Update session with all data
      await updateSession(session.sessionId, {
        dailyEntries,
        creditEntries,
        conversationHistory,
      });
      
      // Step 2: Note session ID
      const sessionId = session.sessionId;
      expect(sessionId).toBeDefined();
      expect(sessionId).toHaveLength(32);
      
      // Step 3: Clear all in-memory state (simulate restart)
      // In a real scenario, this would be a server restart
      // Here we simulate it by clearing mocks and resetting state
      jest.clearAllMocks();
      
      // Step 4: Retrieve session by ID (after "restart")
      // Mock DynamoDB to return the persisted session data
      mockItem = createMockDynamoItem(sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries,
        creditEntries,
        conversationHistory,
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrievedSession = await getSession(sessionId);
      
      // Step 5: Verify all data intact
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.sessionId).toBe(sessionId);
      
      // Verify daily entries preserved
      expect(retrievedSession?.dailyEntries).toEqual(dailyEntries);
      
      // Verify credit entries preserved
      expect(retrievedSession?.creditEntries).toEqual(creditEntries);
      
      // Verify conversation history preserved
      expect(retrievedSession?.conversationHistory).toHaveLength(2);
      expect(retrievedSession?.conversationHistory[0].role).toBe('user');
      expect(retrievedSession?.conversationHistory[0].content).toBe('What is my profit margin?');
      expect(retrievedSession?.conversationHistory[1].role).toBe('assistant');
      expect(retrievedSession?.conversationHistory[1].content).toBe('Your profit margin is 40%');
      
      // Verify timestamps are Date objects
      expect(retrievedSession?.createdAt).toBeInstanceOf(Date);
      expect(retrievedSession?.lastAccessedAt).toBeInstanceOf(Date);
      expect(retrievedSession?.conversationHistory[0].timestamp).toBeInstanceOf(Date);
      expect(retrievedSession?.conversationHistory[1].timestamp).toBeInstanceOf(Date);
    });

    it('should work correctly when consecutive requests hit different instances', async () => {
      // This simulates the scenario where different serverless instances handle requests
      
      // Instance 1: Create session
      const session = await createSession();
      const sessionId = session.sessionId;
      
      // Mock getSession for Instance 1
      let mockItem = createMockDynamoItem(sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries: [],
        conversationHistory: [],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Instance 1: Add first message
      const message1: ChatMessage = {
        role: 'user',
        content: 'First message',
        timestamp: new Date(),
      };
      await updateSession(sessionId, { conversationHistory: [message1] });
      
      // Simulate instance switch - clear mocks
      jest.clearAllMocks();
      
      // Instance 2: Retrieve session (should get data from DynamoDB)
      mockItem = createMockDynamoItem(sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries: [],
        conversationHistory: [message1],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrieved1 = await getSession(sessionId);
      expect(retrieved1?.conversationHistory).toHaveLength(1);
      expect(retrieved1?.conversationHistory[0].content).toBe('First message');
      
      // Instance 2: Add second message
      const message2: ChatMessage = {
        role: 'assistant',
        content: 'Second message',
        timestamp: new Date(),
      };
      
      mockItem = createMockDynamoItem(sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries: [],
        conversationHistory: [message1],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      await updateSession(sessionId, { conversationHistory: [message1, message2] });
      
      // Simulate another instance switch
      jest.clearAllMocks();
      
      // Instance 3: Retrieve session (should get both messages)
      mockItem = createMockDynamoItem(sessionId, {
        createdAt: session.createdAt.toISOString(),
        dailyEntries: [],
        conversationHistory: [message1, message2],
      });
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrieved2 = await getSession(sessionId);
      expect(retrieved2?.conversationHistory).toHaveLength(2);
      expect(retrieved2?.conversationHistory[0].content).toBe('First message');
      expect(retrieved2?.conversationHistory[1].content).toBe('Second message');
    });
  });

  /**
   * Test 9.3: Session expiration
   * **Validates: Requirements 2.1, 2.5**
   * 
   * This test verifies that sessions expire correctly after the TTL period:
   * 1. Create session with expires_at = now + 1 second
   * 2. Wait 2 seconds
   * 3. Retrieve session
   * 4. Verify returns undefined
   */
  describe('Test 9.3: Session expiration', () => {
    it('should return undefined when retrieving expired session', async () => {
      // Step 1: Create session with expires_at = now + 1 second
      const session = await createSession();
      const sessionId = session.sessionId;
      
      // Create a mock item with expires_at set to 1 second from now
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 1000); // 1 second from now
      
      const mockItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: session.createdAt.toISOString(),
        lastAccessedAt: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(expiresAt.getTime() / 1000),
      };
      
      // Step 2: Wait 2 seconds (simulate time passing)
      // We'll mock this by setting expires_at to a past timestamp
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Retrieve session (with expired timestamp)
      const expiredItem = {
        ...mockItem,
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second in the past
      };
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(expiredItem);
      
      const retrievedSession = await getSession(sessionId);
      
      // Step 4: Verify returns undefined
      expect(retrievedSession).toBeUndefined();
      
      // Verify that updateItem was NOT called (no lastAccessedAt update for expired sessions)
      expect(DynamoDBService.updateItem).not.toHaveBeenCalled();
    });

    it('should return session when expires_at is in the future', async () => {
      // Create session
      const session = await createSession();
      const sessionId = session.sessionId;
      
      // Create mock item with expires_at in the future (1 hour from now)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 3600000); // 1 hour from now
      
      const mockItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: session.createdAt.toISOString(),
        lastAccessedAt: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(expiresAt.getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      const retrievedSession = await getSession(sessionId);
      
      // Should return session (not expired)
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.sessionId).toBe(sessionId);
      
      // Verify that updateItem WAS called (lastAccessedAt update for valid sessions)
      expect(DynamoDBService.updateItem).toHaveBeenCalled();
    });

    it('should handle edge case where expires_at is exactly now', async () => {
      // Create session
      const session = await createSession();
      const sessionId = session.sessionId;
      
      // Create mock item with expires_at exactly at current time
      const now = new Date();
      
      const mockItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: session.createdAt.toISOString(),
        lastAccessedAt: now.toISOString(),
        expires_at: now.toISOString(), // Exactly now
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(now.getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      // Wait a tiny bit to ensure current time > expires_at
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrievedSession = await getSession(sessionId);
      
      // Should return undefined (expired)
      expect(retrievedSession).toBeUndefined();
    });

    it('should log appropriate message when session is expired', async () => {
      // Create session
      const session = await createSession();
      const sessionId = session.sessionId;
      
      // Create mock item with expired timestamp
      const expiresAt = new Date(Date.now() - 1000).toISOString(); // 1 second in the past
      
      const mockItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: session.createdAt.toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: expiresAt,
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date(expiresAt).getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValueOnce(mockItem);
      
      await getSession(sessionId);
      
      // Verify appropriate log message
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Session expired',
        { sessionId, expires_at: expiresAt }
      );
    });
  });
});
