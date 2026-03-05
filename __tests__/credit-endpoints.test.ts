/**
 * Integration tests for Credit API endpoints
 * 
 * Tests for:
 * - GET /api/credit/overdue (Requirements 1.1, 4.1)
 * - PUT /api/credit/reminder (Requirements 4.1)
 * 
 * Validates:
 * - Overdue credit retrieval with valid userId
 * - Overdue credit retrieval with invalid userId
 * - Reminder recording with valid data
 * - Reminder recording with missing fields
 * - Error response format consistency
 */

import { NextRequest } from 'next/server';
import { GET as overdueGet } from '@/app/api/credit/overdue/route';
import { PUT as reminderPut } from '@/app/api/credit/reminder/route';

// Mock AWS SDK DynamoDB client
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-dynamodb', () => {
  const actualModule = jest.requireActual('@aws-sdk/client-dynamodb');
  return {
    ...actualModule,
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

// Configure mock behavior
beforeEach(() => {
  mockSend.mockImplementation((command) => {
    // Mock QueryCommand for overdue endpoint
    if (command.constructor.name === 'QueryCommand') {
      const userId = command.input.ExpressionAttributeValues[':pk'].S.replace('USER#', '');
      
      if (userId === 'valid-user') {
        // Return mock credit entries
        return Promise.resolve({
          Items: [
            {
              PK: { S: 'USER#valid-user' },
              SK: { S: 'CREDIT#credit-1' },
              id: { S: 'credit-1' },
              userId: { S: 'valid-user' },
              customerName: { S: 'John Doe' },
              phoneNumber: { S: '9876543210' },
              amount: { N: '5000' },
              dateGiven: { S: '2024-01-01' },
              dueDate: { S: '2024-01-05' }, // 10 days overdue from test date
              isPaid: { BOOL: false },
              createdAt: { S: '2024-01-01T00:00:00Z' },
              updatedAt: { S: '2024-01-01T00:00:00Z' },
            },
            {
              PK: { S: 'USER#valid-user' },
              SK: { S: 'CREDIT#credit-2' },
              id: { S: 'credit-2' },
              userId: { S: 'valid-user' },
              customerName: { S: 'Jane Smith' },
              amount: { N: '3000' },
              dateGiven: { S: '2024-01-08' },
              dueDate: { S: '2024-01-10' }, // 5 days overdue from test date
              isPaid: { BOOL: false },
              createdAt: { S: '2024-01-08T00:00:00Z' },
              updatedAt: { S: '2024-01-08T00:00:00Z' },
            },
            {
              PK: { S: 'USER#valid-user' },
              SK: { S: 'CREDIT#credit-3' },
              id: { S: 'credit-3' },
              userId: { S: 'valid-user' },
              customerName: { S: 'Bob Johnson' },
              amount: { N: '2000' },
              dateGiven: { S: '2024-01-12' },
              dueDate: { S: '2024-01-14' }, // 1 day overdue (below threshold)
              isPaid: { BOOL: false },
              createdAt: { S: '2024-01-12T00:00:00Z' },
              updatedAt: { S: '2024-01-12T00:00:00Z' },
            },
            {
              PK: { S: 'USER#valid-user' },
              SK: { S: 'CREDIT#credit-4' },
              id: { S: 'credit-4' },
              userId: { S: 'valid-user' },
              customerName: { S: 'Alice Brown' },
              amount: { N: '4000' },
              dateGiven: { S: '2024-01-01' },
              dueDate: { S: '2024-01-05' },
              isPaid: { BOOL: true }, // Paid credit (should be filtered out)
              paidDate: { S: '2024-01-10T00:00:00Z' },
              createdAt: { S: '2024-01-01T00:00:00Z' },
              updatedAt: { S: '2024-01-10T00:00:00Z' },
            },
          ],
        });
      } else if (userId === 'empty-user') {
        // Return empty result
        return Promise.resolve({ Items: [] });
      } else {
        // Simulate DynamoDB error for invalid user
        throw new Error('DynamoDB query failed');
      }
    }
    
    return Promise.resolve({});
  });
});

// Mock credit-sync for reminder tracker
jest.mock('@/lib/credit-sync', () => ({
  getLocalEntry: jest.fn((creditId: string) => {
    if (creditId === 'valid-credit') {
      return {
        id: 'valid-credit',
        userId: 'valid-user',
        customerName: 'Test Customer',
        amount: 1000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
    }
    return null;
  }),
  saveLocalEntry: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Date for consistent testing
const MOCK_DATE = new Date('2024-01-15T12:00:00Z');
const originalDate = global.Date;

beforeAll(() => {
  global.Date = class extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(MOCK_DATE.getTime());
      } else {
        // @ts-ignore - TypeScript doesn't like spreading args to Date constructor
        super(...args);
      }
    }
    
    static now() {
      return MOCK_DATE.getTime();
    }
  } as any;
});

afterAll(() => {
  global.Date = originalDate;
});

describe('GET /api/credit/overdue', () => {
  describe('Valid userId', () => {
    test('should return overdue credits with valid userId', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.credits).toBeDefined();
      expect(data.data.summary).toBeDefined();
    });

    test('should filter credits by threshold (>= 3 days)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      // Should return 2 credits (10 days and 5 days overdue)
      // Should exclude credit-3 (1 day overdue, below threshold)
      // Should exclude credit-4 (paid)
      expect(data.data.credits).toHaveLength(2);
      expect(data.data.credits[0].daysOverdue).toBeGreaterThanOrEqual(3);
      expect(data.data.credits[1].daysOverdue).toBeGreaterThanOrEqual(3);
    });

    test('should sort credits by urgency (days overdue DESC, amount DESC)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      const credits = data.data.credits;
      
      // First credit should have most days overdue (10 days)
      expect(credits[0].daysOverdue).toBe(10);
      expect(credits[0].id).toBe('credit-1');
      
      // Second credit should have 5 days overdue
      expect(credits[1].daysOverdue).toBe(5);
      expect(credits[1].id).toBe('credit-2');
    });

    test('should calculate summary correctly', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      const summary = data.data.summary;
      
      // 2 overdue credits (credit-1 and credit-2)
      expect(summary.totalOverdue).toBe(2);
      
      // Total amount: 5000 + 3000 = 8000
      expect(summary.totalAmount).toBe(8000);
      
      // Oldest overdue: 10 days
      expect(summary.oldestOverdue).toBe(10);
    });

    test('should use default threshold of 3 days when not specified', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      // Should still filter by 3 days threshold
      expect(data.data.credits).toHaveLength(2);
      expect(data.data.credits[0].daysOverdue).toBeGreaterThanOrEqual(3);
    });

    test('should handle custom threshold', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=7'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      // Should return only 1 credit (10 days overdue)
      // Should exclude credit-2 (5 days overdue, below threshold of 7)
      expect(data.data.credits).toHaveLength(1);
      expect(data.data.credits[0].daysOverdue).toBeGreaterThanOrEqual(7);
      expect(data.data.credits[0].id).toBe('credit-1');
    });
  });

  describe('Invalid userId', () => {
    test('should return 400 for missing userId', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
      expect(data.message).toBeDefined();
    });

    test('should return 400 for invalid threshold (negative)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=-1'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return 400 for invalid threshold (non-numeric)', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=valid-user&threshold=abc'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return empty result for user with no credits', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=empty-user&threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.credits).toHaveLength(0);
      expect(data.data.summary.totalOverdue).toBe(0);
      expect(data.data.summary.totalAmount).toBe(0);
      expect(data.data.summary.oldestOverdue).toBe(0);
    });

    test('should return 500 for DynamoDB error', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=error-user&threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('DYNAMODB_ERROR');
    });
  });

  describe('Error response format', () => {
    test('should return standardized error format', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?threshold=3'
      );

      const response = await overdueGet(request);
      const data = await response.json();

      // Verify standardized error format
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
    });

    test('should not include stack trace in error response', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/credit/overdue?userId=error-user'
      );

      const response = await overdueGet(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Verify no stack trace information
      expect(responseText).not.toContain('at ');
      expect(responseText).not.toMatch(/\.ts:/);
      expect(data).not.toHaveProperty('stack');
    });
  });
});

describe('PUT /api/credit/reminder', () => {
  describe('Valid data', () => {
    test('should record reminder with valid data', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'valid-credit',
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.creditId).toBe('valid-credit');
      expect(data.data.lastReminderAt).toBe('2024-01-15T12:00:00Z');
    });

    test('should call saveLocalEntry with updated credit', async () => {
      const creditSync = require('@/lib/credit-sync');
      creditSync.saveLocalEntry.mockClear();

      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'valid-credit',
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      await reminderPut(request);

      // Verify saveLocalEntry was called
      expect(creditSync.saveLocalEntry).toHaveBeenCalled();
      
      // Verify the saved entry has lastReminderAt and syncStatus
      const savedEntry = creditSync.saveLocalEntry.mock.calls[0][0];
      expect(savedEntry.lastReminderAt).toBeDefined();
      expect(savedEntry.syncStatus).toBe('pending');
    });
  });

  describe('Missing fields', () => {
    test('should return 400 for missing userId', async () => {
      const requestBody = JSON.stringify({
        creditId: 'valid-credit',
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return 400 for missing creditId', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return 400 for missing reminderAt', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'valid-credit',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return 400 for invalid reminderAt format', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'valid-credit',
        reminderAt: 'invalid-date',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return 400 for invalid JSON', async () => {
      const requestBody = 'invalid-json{';

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });

    test('should return 404 for non-existent credit', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'non-existent-credit',
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('Error response format', () => {
    test('should return standardized error format', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        // Missing creditId
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      // Verify standardized error format
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
    });

    test('should not include stack trace in error response', async () => {
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'non-existent-credit',
        reminderAt: '2024-01-15T12:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Verify no stack trace information
      expect(responseText).not.toContain('at ');
      expect(responseText).not.toMatch(/\.ts:/);
      expect(data).not.toHaveProperty('stack');
    });
  });

  describe('Body size validation', () => {
    test('should return 413 for oversized request', async () => {
      const largeData = 'x'.repeat(2 * 1024 * 1024);
      const requestBody = JSON.stringify({
        userId: 'valid-user',
        creditId: 'valid-credit',
        reminderAt: '2024-01-15T12:00:00Z',
        extraData: largeData,
      });

      const request = new NextRequest('http://localhost:3000/api/credit/reminder', {
        method: 'PUT',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await reminderPut(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.success).toBe(false);
      expect(data.code).toBe('BODY_TOO_LARGE');
    });
  });
});
