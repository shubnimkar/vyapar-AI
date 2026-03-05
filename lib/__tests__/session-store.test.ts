/**
 * Unit tests for session-store.ts - createSession() function
 * Feature: dynamodb-session-store
 * 
 * Tests cover:
 * - Session creation with empty data
 * - Session creation with pre-loaded localStorage data
 * - DynamoDB item has correct PK, SK, entityType
 * - TTL is set correctly
 * - Credential error handling (degraded mode)
 * 
 * Requirements: 1.1, 6.1, 6.2, 6.3, 6.5, 7.1
 */

import { createSession, generateSessionId, loadDailyEntriesFromStorage, loadCreditEntriesFromStorage, getSession, updateSession } from '../session-store';
import { DynamoDBService } from '../dynamodb-client';
import { logger } from '../logger';

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

describe('Feature: dynamodb-session-store - createSession()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock: DynamoDB operations succeed
    (DynamoDBService.putItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Session creation with empty data', () => {
    it('should create a session with empty dailyEntries and creditEntries when localStorage is empty', async () => {
      // Arrange: localStorage is empty (default state)
      
      // Act
      const session = await createSession();
      
      // Assert
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastAccessedAt).toBeInstanceOf(Date);
      expect(session.dailyEntries).toEqual([]);
      expect(session.creditEntries).toEqual([]);
      expect(session.conversationHistory).toEqual([]);
    });

    it('should generate unique session IDs for multiple sessions', async () => {
      // Act
      const session1 = await createSession();
      const session2 = await createSession();
      const session3 = await createSession();
      
      // Assert
      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session2.sessionId).not.toBe(session3.sessionId);
      expect(session1.sessionId).not.toBe(session3.sessionId);
    });

    it('should set createdAt and lastAccessedAt to approximately the same time', async () => {
      // Act
      const session = await createSession();
      
      // Assert
      const timeDiff = Math.abs(
        session.lastAccessedAt.getTime() - session.createdAt.getTime()
      );
      expect(timeDiff).toBeLessThan(100); // Within 100ms
    });
  });

  describe('Session creation with pre-loaded localStorage data', () => {
    it('should load dailyEntries from localStorage when available', async () => {
      // Arrange
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
        {
          date: '2024-01-16',
          totalSales: 6000,
          totalExpense: 3500,
          cashInHand: 12500,
          estimatedProfit: 2500,
          expenseRatio: 0.58,
          profitMargin: 0.42,
        },
      ];
      
      localStorageMock.setItem('vyapar-daily-entries', JSON.stringify(dailyEntries));
      
      // Act
      const session = await createSession();
      
      // Assert
      expect(session.dailyEntries).toEqual(dailyEntries);
      expect(session.dailyEntries).toHaveLength(2);
    });

    it('should load creditEntries from localStorage when available', async () => {
      // Arrange
      const creditEntries = [
        {
          id: 'credit-1',
          customerName: 'Rajesh Kumar',
          amount: 1500,
          dueDate: '2024-01-20',
          isPaid: false,
          createdAt: '2024-01-10',
        },
        {
          id: 'credit-2',
          customerName: 'Priya Sharma',
          amount: 2000,
          dueDate: '2024-01-25',
          isPaid: false,
          createdAt: '2024-01-12',
        },
      ];
      
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(creditEntries));
      
      // Act
      const session = await createSession();
      
      // Assert
      expect(session.creditEntries).toEqual(creditEntries);
      expect(session.creditEntries).toHaveLength(2);
    });

    it('should load both dailyEntries and creditEntries when both are present', async () => {
      // Arrange
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
      
      localStorageMock.setItem('vyapar-daily-entries', JSON.stringify(dailyEntries));
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(creditEntries));
      
      // Act
      const session = await createSession();
      
      // Assert
      expect(session.dailyEntries).toEqual(dailyEntries);
      expect(session.creditEntries).toEqual(creditEntries);
    });

    it('should handle corrupted localStorage data gracefully', async () => {
      // Arrange: Invalid JSON in localStorage
      localStorageMock.setItem('vyapar-daily-entries', 'invalid-json{');
      
      // Act
      const session = await createSession();
      
      // Assert: Should fall back to empty array
      expect(session.dailyEntries).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        '[Storage] Failed to load daily entries',
        expect.any(Object)
      );
    });
  });

  describe('DynamoDB item schema validation', () => {
    it('should persist session to DynamoDB with correct PK format', async () => {
      // Act
      const session = await createSession();
      
      // Assert
      expect(DynamoDBService.putItem).toHaveBeenCalledTimes(1);
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      
      expect(dynamoItem.PK).toBe(`SESSION#${session.sessionId}`);
    });

    it('should persist session to DynamoDB with correct SK', async () => {
      // Act
      await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      expect(dynamoItem.SK).toBe('METADATA');
    });

    it('should persist session to DynamoDB with correct entityType', async () => {
      // Act
      await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      expect(dynamoItem.entityType).toBe('SESSION');
    });

    it('should include all required session fields in DynamoDB item', async () => {
      // Act
      const session = await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      
      expect(dynamoItem).toHaveProperty('sessionId', session.sessionId);
      expect(dynamoItem).toHaveProperty('createdAt');
      expect(dynamoItem).toHaveProperty('lastAccessedAt');
      expect(dynamoItem).toHaveProperty('expires_at');
      expect(dynamoItem).toHaveProperty('dailyEntries');
      expect(dynamoItem).toHaveProperty('creditEntries');
      expect(dynamoItem).toHaveProperty('conversationHistory');
      expect(dynamoItem).toHaveProperty('ttl');
    });

    it('should convert Date objects to ISO 8601 strings in DynamoDB item', async () => {
      // Act
      await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      
      expect(dynamoItem.createdAt).toMatch(iso8601Regex);
      expect(dynamoItem.lastAccessedAt).toMatch(iso8601Regex);
      expect(dynamoItem.expires_at).toMatch(iso8601Regex);
    });
  });

  describe('TTL calculation', () => {
    it('should set TTL to 2 hours (7200 seconds) from creation time', async () => {
      // Arrange
      const beforeCreate = Date.now();
      
      // Act
      await createSession();
      
      const afterCreate = Date.now();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      const ttl = dynamoItem.ttl as number;
      
      // TTL should be approximately 2 hours (7200 seconds) from now
      const expectedTTLMin = Math.floor((beforeCreate + 7200000) / 1000);
      const expectedTTLMax = Math.floor((afterCreate + 7200000) / 1000);
      
      expect(ttl).toBeGreaterThanOrEqual(expectedTTLMin);
      expect(ttl).toBeLessThanOrEqual(expectedTTLMax);
    });

    it('should set TTL as Unix timestamp in seconds (not milliseconds)', async () => {
      // Act
      await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      const ttl = dynamoItem.ttl as number;
      
      // Unix timestamp in seconds should be 10 digits (as of 2024)
      // Unix timestamp in milliseconds would be 13 digits
      expect(ttl.toString()).toHaveLength(10);
      
      // Should be a reasonable future timestamp (within next 3 hours)
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const threeHoursInSeconds = 3 * 60 * 60;
      
      expect(ttl).toBeGreaterThan(nowInSeconds);
      expect(ttl).toBeLessThan(nowInSeconds + threeHoursInSeconds);
    });

    it('should set expires_at to exactly 2 hours from createdAt', async () => {
      // Act
      await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      
      const createdAt = new Date(dynamoItem.createdAt as string);
      const expiresAt = new Date(dynamoItem.expires_at as string);
      
      const diffInMs = expiresAt.getTime() - createdAt.getTime();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      
      // Should be exactly 2 hours (allowing for small rounding differences)
      expect(Math.abs(diffInMs - twoHoursInMs)).toBeLessThan(1000); // Within 1 second
    });

    it('should have TTL matching expires_at timestamp', async () => {
      // Act
      await createSession();
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      
      const expiresAt = new Date(dynamoItem.expires_at as string);
      const ttl = dynamoItem.ttl as number;
      
      const expiresAtInSeconds = Math.floor(expiresAt.getTime() / 1000);
      
      expect(ttl).toBe(expiresAtInSeconds);
    });
  });

  describe('Credential error handling (degraded mode)', () => {
    it('should handle AWS credential errors gracefully without throwing', async () => {
      // Arrange: Simulate credential error
      const credentialError = new Error('UnrecognizedClientException');
      credentialError.name = 'UnrecognizedClientException';
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(credentialError);
      
      // Act & Assert: Should not throw
      await expect(createSession()).resolves.toBeDefined();
    });

    it('should log warning when DynamoDB persistence fails', async () => {
      // Arrange: Simulate DynamoDB failure
      const error = new Error('DynamoDB connection failed');
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(error);
      
      // Act
      const session = await createSession();
      
      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[Session Store] Failed to persist session to DynamoDB, operating in degraded mode',
        expect.objectContaining({
          sessionId: session.sessionId,
          error,
        })
      );
    });

    it('should still return valid SessionData when DynamoDB fails', async () => {
      // Arrange: Simulate DynamoDB failure
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      
      // Act
      const session = await createSession();
      
      // Assert: Session should still be valid
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.lastAccessedAt).toBeInstanceOf(Date);
      expect(session.dailyEntries).toEqual([]);
      expect(session.creditEntries).toEqual([]);
      expect(session.conversationHistory).toEqual([]);
    });

    it('should continue to load localStorage data even when DynamoDB fails', async () => {
      // Arrange
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
      
      localStorageMock.setItem('vyapar-daily-entries', JSON.stringify(dailyEntries));
      
      // Simulate DynamoDB failure
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(
        new Error('Credential error')
      );
      
      // Act
      const session = await createSession();
      
      // Assert: Should still have localStorage data
      expect(session.dailyEntries).toEqual(dailyEntries);
    });
  });

  describe('Logging behavior', () => {
    it('should log session creation success', async () => {
      // Act
      const session = await createSession();
      
      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        '[Session Store] Created session',
        { sessionId: session.sessionId }
      );
    });

    it('should log localStorage data loading', async () => {
      // Arrange
      const dailyEntries = [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }];
      const creditEntries = [{ id: 'credit-1', customerName: 'Test', amount: 1000, dueDate: '2024-01-20', isPaid: false, createdAt: '2024-01-10' }];
      
      localStorageMock.setItem('vyapar-daily-entries', JSON.stringify(dailyEntries));
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(creditEntries));
      
      // Act
      await createSession();
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Loaded from storage',
        { dailyCount: 1, creditCount: 1 }
      );
    });
  });
});


/**
 * Unit tests for session-store.ts - getSession() function
 * Feature: dynamodb-session-store
 * 
 * Tests cover:
 * - Retrieving existing session
 * - Session not found returns undefined
 * - Expired session returns undefined
 * - lastAccessedAt is updated on retrieval
 * - Invalid session data returns undefined
 * 
 * Requirements: 1.2, 2.5, 7.3, 7.4, 7.5
 */

describe('Feature: dynamodb-session-store - getSession()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock: DynamoDB operations succeed
    (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
    (DynamoDBService.updateItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Retrieving existing session', () => {
    it('should retrieve an existing session by sessionId', async () => {
      // Arrange
      const sessionId = 'test-session-123';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        dailyEntries: [
          {
            date: '2024-01-15',
            totalSales: 5000,
            totalExpense: 3000,
            cashInHand: 10000,
            estimatedProfit: 2000,
            expenseRatio: 0.6,
            profitMargin: 0.4,
          },
        ],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.lastAccessedAt).toBeInstanceOf(Date);
      expect(session?.dailyEntries).toHaveLength(1);
      expect(session?.creditEntries).toEqual([]);
      expect(session?.conversationHistory).toEqual([]);
    });

    it('should call DynamoDBService.getItem with correct PK and SK', async () => {
      // Arrange
      const sessionId = 'test-session-456';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(DynamoDBService.getItem).toHaveBeenCalledWith(
        `SESSION#${sessionId}`,
        'METADATA'
      );
    });

    it('should convert ISO 8601 strings back to Date objects', async () => {
      // Arrange
      const sessionId = 'test-session-789';
      const createdAtStr = '2024-01-15T10:30:45.123Z';
      const lastAccessedAtStr = '2024-01-15T11:00:00.456Z';
      
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: createdAtStr,
        lastAccessedAt: lastAccessedAtStr,
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session?.createdAt).toBeInstanceOf(Date);
      expect(session?.createdAt.toISOString()).toBe(createdAtStr);
      expect(session?.lastAccessedAt).toBeInstanceOf(Date);
    });

    it('should preserve conversation history with timestamps', async () => {
      // Arrange
      const sessionId = 'test-session-conv';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [
          {
            role: 'user',
            content: 'What is my profit margin?',
            timestamp: '2024-01-15T10:00:00.000Z',
          },
          {
            role: 'assistant',
            content: 'Your profit margin is 40%',
            timestamp: '2024-01-15T10:00:05.000Z',
          },
        ],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session?.conversationHistory).toHaveLength(2);
      expect(session?.conversationHistory[0].role).toBe('user');
      expect(session?.conversationHistory[0].content).toBe('What is my profit margin?');
      expect(session?.conversationHistory[0].timestamp).toBeInstanceOf(Date);
      expect(session?.conversationHistory[1].role).toBe('assistant');
      expect(session?.conversationHistory[1].timestamp).toBeInstanceOf(Date);
    });

    it('should handle optional CSV data fields', async () => {
      // Arrange
      const sessionId = 'test-session-csv';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        salesData: { headers: ['Date', 'Amount'], rows: [['2024-01-15', '5000']] },
        expensesData: { headers: ['Date', 'Amount'], rows: [['2024-01-15', '3000']] },
        inventoryData: undefined,
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session?.salesData).toBeDefined();
      expect(session?.expensesData).toBeDefined();
      expect(session?.inventoryData).toBeUndefined();
    });
  });

  describe('Session not found returns undefined', () => {
    it('should return undefined when session does not exist in DynamoDB', async () => {
      // Arrange
      const sessionId = 'non-existent-session';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session).toBeUndefined();
    });

    it('should log debug message when session not found', async () => {
      // Arrange
      const sessionId = 'missing-session';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Session not found',
        { sessionId }
      );
    });

    it('should return undefined for empty sessionId', async () => {
      // Act
      const session1 = await getSession('');
      const session2 = await getSession('   ');
      
      // Assert
      expect(session1).toBeUndefined();
      expect(session2).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        '[Session Store] Invalid sessionId provided to getSession'
      );
    });

    it('should not call DynamoDB when sessionId is invalid', async () => {
      // Act
      await getSession('');
      
      // Assert
      expect(DynamoDBService.getItem).not.toHaveBeenCalled();
    });
  });

  describe('Expired session returns undefined', () => {
    it('should return undefined when session has expired', async () => {
      // Arrange
      const sessionId = 'expired-session';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        expires_at: new Date('2024-01-15T10:00:00.000Z').toISOString(), // Past timestamp
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date('2024-01-15T10:00:00.000Z').getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session).toBeUndefined();
    });

    it('should log debug message when session is expired', async () => {
      // Arrange
      const sessionId = 'expired-session-2';
      const expiresAt = new Date('2024-01-15T10:00:00.000Z').toISOString();
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        expires_at: expiresAt,
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date('2024-01-15T10:00:00.000Z').getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Session expired',
        { sessionId, expires_at: expiresAt }
      );
    });

    it('should not update lastAccessedAt for expired sessions', async () => {
      // Arrange
      const sessionId = 'expired-session-3';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        expires_at: new Date('2024-01-15T10:00:00.000Z').toISOString(), // Past
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date('2024-01-15T10:00:00.000Z').getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(DynamoDBService.updateItem).not.toHaveBeenCalled();
    });

    it('should return session when expires_at is in the future', async () => {
      // Arrange
      const sessionId = 'valid-session';
      const futureExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: futureExpiry,
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date(futureExpiry).getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session).toBeDefined();
      expect(session?.sessionId).toBe(sessionId);
    });
  });

  describe('lastAccessedAt is updated on retrieval', () => {
    it('should update lastAccessedAt to current time when retrieving session', async () => {
      // Arrange
      const sessionId = 'test-session-update';
      const oldLastAccessed = new Date('2024-01-15T10:00:00.000Z').toISOString();
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T09:00:00.000Z').toISOString(),
        lastAccessedAt: oldLastAccessed,
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      const beforeRetrieval = Date.now();
      
      // Act
      const session = await getSession(sessionId);
      
      const afterRetrieval = Date.now();
      
      // Assert
      expect(session).toBeDefined();
      expect(session?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeRetrieval);
      expect(session?.lastAccessedAt.getTime()).toBeLessThanOrEqual(afterRetrieval);
    });

    it('should call DynamoDBService.updateItem to persist updated lastAccessedAt', async () => {
      // Arrange
      const sessionId = 'test-session-persist';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(DynamoDBService.updateItem).toHaveBeenCalledWith(
        `SESSION#${sessionId}`,
        'METADATA',
        expect.objectContaining({
          lastAccessedAt: expect.any(String),
        })
      );
    });

    it('should update lastAccessedAt with ISO 8601 formatted string', async () => {
      // Arrange
      const sessionId = 'test-session-iso';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      const updateCall = (DynamoDBService.updateItem as jest.Mock).mock.calls[0];
      const lastAccessedAt = updateCall[2].lastAccessedAt;
      
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(lastAccessedAt).toMatch(iso8601Regex);
    });

    it('should log debug message when session is retrieved successfully', async () => {
      // Arrange
      const sessionId = 'test-session-log';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Retrieved session',
        { sessionId }
      );
    });
  });

  describe('Invalid session data returns undefined', () => {
    it('should return undefined when DynamoDB operation fails', async () => {
      // Arrange
      const sessionId = 'test-session-error';
      const error = new Error('DynamoDB connection failed');
      (DynamoDBService.getItem as jest.Mock).mockRejectedValue(error);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session).toBeUndefined();
    });

    it('should log error when DynamoDB operation fails', async () => {
      // Arrange
      const sessionId = 'test-session-error-2';
      const error = new Error('Network timeout');
      (DynamoDBService.getItem as jest.Mock).mockRejectedValue(error);
      
      // Act
      await getSession(sessionId);
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        '[Session Store] Failed to retrieve session from DynamoDB',
        { sessionId, error }
      );
    });

    it('should handle credential errors gracefully', async () => {
      // Arrange
      const sessionId = 'test-session-creds';
      const credentialError = new Error('UnrecognizedClientException');
      credentialError.name = 'UnrecognizedClientException';
      (DynamoDBService.getItem as jest.Mock).mockRejectedValue(credentialError);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert
      expect(session).toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle missing required fields in DynamoDB item', async () => {
      // Arrange
      const sessionId = 'test-session-invalid';
      const invalidItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        // Missing required fields like sessionId, createdAt, etc.
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(invalidItem);
      
      // Act & Assert: Should not throw, but may return undefined or partial data
      await expect(getSession(sessionId)).resolves.toBeDefined();
    });

    it('should handle corrupted timestamp data', async () => {
      // Arrange
      const sessionId = 'test-session-corrupt';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: 'invalid-date-string',
        lastAccessedAt: 'invalid-date-string',
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const session = await getSession(sessionId);
      
      // Assert: Should handle gracefully (Date constructor creates Invalid Date)
      expect(session).toBeDefined();
      // Invalid Date objects will have NaN as their time value
      const createdAtTime = session?.createdAt.getTime();
      expect(isNaN(createdAtTime as number)).toBe(true);
    });
  });
});

/**
 * Unit tests for session-store.ts - updateSession() function
 * Feature: dynamodb-session-store
 * 
 * Tests cover:
 * - Updating existing session with new data
 * - Updating non-existent session returns undefined
 * - sessionId cannot be changed
 * - lastAccessedAt is updated
 * - DynamoDB operation failure throws error
 * 
 * Requirements: 1.3, 4.3, 7.2
 */

describe('Feature: dynamodb-session-store - updateSession()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Default mock: DynamoDB operations succeed
    (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
    (DynamoDBService.updateItem as jest.Mock).mockResolvedValue(undefined);
    (DynamoDBService.putItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Updating existing session with new data', () => {
    it('should update session with new conversation message', async () => {
      // Arrange
      const sessionId = 'test-session-update-1';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [
          {
            role: 'user',
            content: 'What is my profit?',
            timestamp: '2024-01-15T10:00:00.000Z',
          },
        ],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      const newMessage = {
        role: 'assistant' as const,
        content: 'Your profit is 2000',
        timestamp: new Date('2024-01-15T10:00:05.000Z'),
      };
      
      // Act
      const updatedSession = await updateSession(sessionId, {
        conversationHistory: [
          ...existingSession.conversationHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.timestamp),
          })),
          newMessage,
        ],
      });
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.conversationHistory).toHaveLength(2);
      expect(updatedSession?.conversationHistory[1].content).toBe('Your profit is 2000');
    });

    it('should update session with new daily entries', async () => {
      // Arrange
      const sessionId = 'test-session-update-2';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      const newDailyEntry = {
        date: '2024-01-15',
        totalSales: 5000,
        totalExpense: 3000,
        cashInHand: 10000,
        estimatedProfit: 2000,
        expenseRatio: 0.6,
        profitMargin: 0.4,
      };
      
      // Act
      const updatedSession = await updateSession(sessionId, {
        dailyEntries: [newDailyEntry],
      });
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.dailyEntries).toHaveLength(1);
      expect(updatedSession?.dailyEntries[0].totalSales).toBe(5000);
    });

    it('should update session with new credit entries', async () => {
      // Arrange
      const sessionId = 'test-session-update-3';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      const newCreditEntry = {
        id: 'credit-1',
        customerName: 'Rajesh Kumar',
        amount: 1500,
        dueDate: '2024-01-20',
        isPaid: false,
        createdAt: '2024-01-15',
      };
      
      // Act
      const updatedSession = await updateSession(sessionId, {
        creditEntries: [newCreditEntry],
      });
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.creditEntries).toHaveLength(1);
      expect(updatedSession?.creditEntries[0].customerName).toBe('Rajesh Kumar');
    });

    it('should update session with CSV data', async () => {
      // Arrange
      const sessionId = 'test-session-update-4';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      const salesData = {
        headers: ['Date', 'Amount'],
        rows: [{ Date: '2024-01-15', Amount: 5000 }],
      };
      
      // Act
      const updatedSession = await updateSession(sessionId, {
        salesData,
      });
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.salesData).toBeDefined();
      expect(updatedSession?.salesData?.headers).toEqual(['Date', 'Amount']);
    });

    it('should call DynamoDBService.putItem with updated session data', async () => {
      // Arrange
      const sessionId = 'test-session-update-5';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      // Act
      await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(DynamoDBService.putItem).toHaveBeenCalledTimes(1);
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      expect(dynamoItem.PK).toBe(`SESSION#${sessionId}`);
      expect(dynamoItem.SK).toBe('METADATA');
      expect(dynamoItem.entityType).toBe('SESSION');
    });
  });


  describe('Updating non-existent session returns undefined', () => {
    it('should return undefined when session does not exist', async () => {
      // Arrange
      const sessionId = 'non-existent-session';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when session has expired', async () => {
      // Arrange
      const sessionId = 'expired-session';
      const expiredSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        expires_at: new Date('2024-01-15T10:00:00.000Z').toISOString(), // Past timestamp
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date('2024-01-15T10:00:00.000Z').getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(expiredSession);
      
      // Act
      const result = await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(result).toBeUndefined();
    });


    it('should not call DynamoDBService.putItem when session does not exist', async () => {
      // Arrange
      const sessionId = 'non-existent-session-2';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(DynamoDBService.putItem).not.toHaveBeenCalled();
    });

    it('should not call DynamoDBService.putItem when session has expired', async () => {
      // Arrange
      const sessionId = 'expired-session-2';
      const expiredSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T08:00:00.000Z').toISOString(),
        expires_at: new Date('2024-01-15T10:00:00.000Z').toISOString(), // Past
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor(new Date('2024-01-15T10:00:00.000Z').getTime() / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(expiredSession);
      
      // Act
      await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(DynamoDBService.putItem).not.toHaveBeenCalled();
    });
  });


  describe('sessionId cannot be changed', () => {
    it('should preserve original sessionId even if update attempts to change it', async () => {
      // Arrange
      const originalSessionId = 'original-session-id';
      const attemptedSessionId = 'attempted-new-session-id';
      
      const existingSession = {
        PK: `SESSION#${originalSessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId: originalSessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      // Act
      const updatedSession = await updateSession(originalSessionId, {
        sessionId: attemptedSessionId, // Attempt to change sessionId
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      } as any);
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.sessionId).toBe(originalSessionId);
      expect(updatedSession?.sessionId).not.toBe(attemptedSessionId);
    });

    it('should persist original sessionId to DynamoDB', async () => {
      // Arrange
      const originalSessionId = 'original-session-id-2';
      const existingSession = {
        PK: `SESSION#${originalSessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId: originalSessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      // Act
      await updateSession(originalSessionId, {
        sessionId: 'attempted-change', // Attempt to change
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      } as any);
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      expect(dynamoItem.sessionId).toBe(originalSessionId);
      expect(dynamoItem.PK).toBe(`SESSION#${originalSessionId}`);
    });
  });

  describe('lastAccessedAt is updated', () => {
    it('should update lastAccessedAt to current time', async () => {
      // Arrange
      const sessionId = 'test-session-timestamp';
      const oldLastAccessed = new Date('2024-01-15T10:00:00.000Z').toISOString();
      
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T09:00:00.000Z').toISOString(),
        lastAccessedAt: oldLastAccessed,
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      const beforeUpdate = Date.now();
      
      // Act
      const updatedSession = await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      const afterUpdate = Date.now();
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
      expect(updatedSession?.lastAccessedAt.getTime()).toBeLessThanOrEqual(afterUpdate);
    });


    it('should persist updated lastAccessedAt to DynamoDB', async () => {
      // Arrange
      const sessionId = 'test-session-timestamp-2';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T09:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      // Act
      await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      const dynamoItem = (DynamoDBService.putItem as jest.Mock).mock.calls[0][0];
      
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(dynamoItem.lastAccessedAt).toMatch(iso8601Regex);
      
      // Should be recent timestamp
      const lastAccessedTime = new Date(dynamoItem.lastAccessedAt).getTime();
      const now = Date.now();
      expect(Math.abs(now - lastAccessedTime)).toBeLessThan(5000); // Within 5 seconds
    });

    it('should update lastAccessedAt even when no other fields change', async () => {
      // Arrange
      const sessionId = 'test-session-timestamp-3';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T09:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      const beforeUpdate = Date.now();
      
      // Act: Update with empty object (no field changes)
      const updatedSession = await updateSession(sessionId, {});
      
      const afterUpdate = Date.now();
      
      // Assert
      expect(updatedSession).toBeDefined();
      expect(updatedSession?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
      expect(updatedSession?.lastAccessedAt.getTime()).toBeLessThanOrEqual(afterUpdate);
    });
  });

  describe('DynamoDB operation failure throws error', () => {
    it('should throw error when DynamoDB putItem fails', async () => {
      // Arrange
      const sessionId = 'test-session-error';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(new Error('DynamoDB connection failed'));
      
      // Act & Assert
      await expect(
        updateSession(sessionId, {
          dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
        })
      ).rejects.toThrow('Failed to update session data');
    });

    it('should log error when DynamoDB putItem fails', async () => {
      // Arrange
      const sessionId = 'test-session-error-2';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      const error = new Error('Network timeout');
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(error);
      
      // Act
      try {
        await updateSession(sessionId, {
          dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
        });
      } catch (e) {
        // Expected to throw
      }
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        '[Session Store] Failed to update session in DynamoDB',
        { sessionId, error }
      );
    });

    it('should throw descriptive error message', async () => {
      // Arrange
      const sessionId = 'test-session-error-3';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(new Error('AWS throttling'));
      
      // Act & Assert
      await expect(
        updateSession(sessionId, {
          dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
        })
      ).rejects.toThrow('Failed to update session data');
    });

    it('should not throw when getSession fails (returns undefined instead)', async () => {
      // Arrange
      const sessionId = 'test-session-get-error';
      (DynamoDBService.getItem as jest.Mock).mockRejectedValue(new Error('DynamoDB error'));
      
      // Act
      const result = await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Logging behavior', () => {
    it('should log debug message when session is updated successfully', async () => {
      // Arrange
      const sessionId = 'test-session-log';
      const existingSession = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        lastAccessedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(existingSession);
      
      // Act
      await updateSession(sessionId, {
        dailyEntries: [{ date: '2024-01-15', totalSales: 5000, totalExpense: 3000, cashInHand: 10000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }],
      });
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Updated session',
        { sessionId }
      );
    });
  });
});


/**
 * Unit tests for session-store.ts - deleteSession() function
 * Feature: dynamodb-session-store
 * Task 5.1: Update deleteSession() to delete from DynamoDB
 * 
 * Tests cover:
 * - Deleting existing session returns true
 * - Deleting non-existent session returns false
 * - Invalid sessionId returns false
 * - DynamoDB operation failures throw error
 * - Correct PK and SK are used
 * 
 * Requirements: 1.4, 4.4, 7.2
 */

import { deleteSession } from '../session-store';

describe('Feature: dynamodb-session-store - deleteSession()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock: DynamoDB operations succeed
    (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
    (DynamoDBService.deleteItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Deleting existing session', () => {
    it('should return true when deleting an existing session', async () => {
      // Arrange
      const sessionId = 'test-session-delete';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      const result = await deleteSession(sessionId);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should call DynamoDBService.getItem with correct PK and SK', async () => {
      // Arrange
      const sessionId = 'test-session-check';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await deleteSession(sessionId);
      
      // Assert
      expect(DynamoDBService.getItem).toHaveBeenCalledWith(
        `SESSION#${sessionId}`,
        'METADATA'
      );
    });

    it('should call DynamoDBService.deleteItem with correct PK and SK', async () => {
      // Arrange
      const sessionId = 'test-session-delete-call';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await deleteSession(sessionId);
      
      // Assert
      expect(DynamoDBService.deleteItem).toHaveBeenCalledWith(
        `SESSION#${sessionId}`,
        'METADATA'
      );
    });

    it('should log success message when session is deleted', async () => {
      // Arrange
      const sessionId = 'test-session-log';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      
      // Act
      await deleteSession(sessionId);
      
      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        '[Session Store] Deleted session',
        { sessionId }
      );
    });
  });

  describe('Deleting non-existent session', () => {
    it('should return false when session does not exist', async () => {
      // Arrange
      const sessionId = 'non-existent-session';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await deleteSession(sessionId);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should not call deleteItem when session does not exist', async () => {
      // Arrange
      const sessionId = 'missing-session';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      await deleteSession(sessionId);
      
      // Assert
      expect(DynamoDBService.deleteItem).not.toHaveBeenCalled();
    });

    it('should log debug message when session not found', async () => {
      // Arrange
      const sessionId = 'missing-session-log';
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);
      
      // Act
      await deleteSession(sessionId);
      
      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        '[Session Store] Session not found for deletion',
        { sessionId }
      );
    });
  });

  describe('Invalid sessionId handling', () => {
    it('should return false for empty sessionId', async () => {
      // Act
      const result = await deleteSession('');
      
      // Assert
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only sessionId', async () => {
      // Act
      const result = await deleteSession('   ');
      
      // Assert
      expect(result).toBe(false);
    });

    it('should log warning for invalid sessionId', async () => {
      // Act
      await deleteSession('');
      
      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        '[Session Store] Invalid sessionId provided to deleteSession'
      );
    });

    it('should not call DynamoDB when sessionId is invalid', async () => {
      // Act
      await deleteSession('');
      
      // Assert
      expect(DynamoDBService.getItem).not.toHaveBeenCalled();
      expect(DynamoDBService.deleteItem).not.toHaveBeenCalled();
    });
  });

  describe('DynamoDB operation failures', () => {
    it('should throw error when DynamoDB deleteItem fails', async () => {
      // Arrange
      const sessionId = 'test-session-error';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      (DynamoDBService.deleteItem as jest.Mock).mockRejectedValue(
        new Error('DynamoDB connection failed')
      );
      
      // Act & Assert
      await expect(deleteSession(sessionId)).rejects.toThrow('Failed to delete session data');
    });

    it('should log error when DynamoDB operation fails', async () => {
      // Arrange
      const sessionId = 'test-session-error-log';
      const mockDynamoItem = {
        PK: `SESSION#${sessionId}`,
        SK: 'METADATA',
        entityType: 'SESSION',
        sessionId,
        createdAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7200000).toISOString(),
        dailyEntries: [],
        creditEntries: [],
        conversationHistory: [],
        ttl: Math.floor((Date.now() + 7200000) / 1000),
      };
      
      const error = new Error('Network error');
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(mockDynamoItem);
      (DynamoDBService.deleteItem as jest.Mock).mockRejectedValue(error);
      
      // Act
      try {
        await deleteSession(sessionId);
      } catch (e) {
        // Expected to throw
      }
      
      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        '[Session Store] Failed to delete session from DynamoDB',
        expect.objectContaining({
          sessionId,
          error,
        })
      );
    });

    it('should throw error when getItem fails', async () => {
      // Arrange
      const sessionId = 'test-session-getitem-error';
      (DynamoDBService.getItem as jest.Mock).mockRejectedValue(
        new Error('DynamoDB read failed')
      );
      
      // Act & Assert
      await expect(deleteSession(sessionId)).rejects.toThrow('Failed to delete session data');
    });
  });
});
