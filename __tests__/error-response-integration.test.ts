/**
 * Integration Tests for Standardized Error Responses
 * 
 * Tests that all API routes return consistent error format:
 * - Property 1: Error Response Structure Invariant
 * - Property 2: Stack Trace Exclusion
 * 
 * Validates Requirements 1.1, 1.2, 1.3, 1.4, 10.2, 10.3, 10.4
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock uuid before importing routes
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock DynamoDB client before importing routes
jest.mock('@/lib/dynamodb-client', () => ({
  ProfileService: {
    getProfile: jest.fn(),
    saveProfile: jest.fn(),
    deleteProfile: jest.fn(),
  },
  DailyEntryService: {
    getEntries: jest.fn(),
    getEntry: jest.fn(),
    saveEntry: jest.fn(),
    deleteEntry: jest.fn(),
  },
  CreditEntryService: {
    getEntries: jest.fn(),
    getEntry: jest.fn(),
    saveEntry: jest.fn(),
    deleteEntry: jest.fn(),
  },
  DynamoDBService: {
    queryByPK: jest.fn(),
    putItem: jest.fn(),
  },
}));

// Mock logger to prevent console output during tests
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock calculations
jest.mock('@/lib/calculations', () => ({
  calculateCreditSummary: jest.fn(() => ({
    totalCredit: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  })),
}));

import { NextRequest } from 'next/server';
import { GET as profileGET, PUT as profilePUT } from '@/app/api/profile/route';
import { POST as profileSetupPOST } from '@/app/api/profile/setup/route';
import { POST as profileDeletePOST } from '@/app/api/profile/delete/route';
import { GET as dailyGET, POST as dailyPOST, PUT as dailyPUT, DELETE as dailyDELETE } from '@/app/api/daily/route';
import { GET as creditGET, POST as creditPOST, PUT as creditPUT, DELETE as creditDELETE } from '@/app/api/credit/route';
import { GET as reportsGET, POST as reportsPOST } from '@/app/api/reports/route';
import { ProfileService, DailyEntryService, CreditEntryService, DynamoDBService } from '@/lib/dynamodb-client';

describe('Standardized Error Response Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Property 1: Error Response Structure Invariant
   * 
   * For any error response returned by any API route:
   * - The response MUST have exactly three fields: success, code, message
   * - The success field MUST be false
   * - The code field MUST be a non-empty string
   * - The message field MUST be a non-empty string
   */
  describe('Property 1: Error Response Structure Invariant', () => {
    test('Profile GET returns standardized error for missing userId', async () => {
      const req = new NextRequest('http://localhost/api/profile');
      const response = await profileGET(req);
      const data = await response.json();

      // Verify structure
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      
      // Verify types
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
      expect(data.code.length).toBeGreaterThan(0);
      expect(data.message.length).toBeGreaterThan(0);
      
      // Verify no extra fields
      const keys = Object.keys(data);
      expect(keys).toHaveLength(3);
      expect(keys).toEqual(expect.arrayContaining(['success', 'code', 'message']));
    });

    test('Daily POST returns standardized error for missing userId', async () => {
      const req = new NextRequest('http://localhost/api/daily', {
        method: 'POST',
        body: JSON.stringify({ totalSales: 100, totalExpense: 50 }),
      });
      const response = await dailyPOST(req);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
    });

    test('Credit GET returns standardized error for missing userId', async () => {
      const req = new NextRequest('http://localhost/api/credit');
      const response = await creditGET(req);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
    });

    test('Reports GET returns standardized error for missing userId', async () => {
      const req = new NextRequest('http://localhost/api/reports');
      const response = await reportsGET(req);
      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(typeof data.code).toBe('string');
      expect(typeof data.message).toBe('string');
    });
  });

  /**
   * Property 2: Stack Trace Exclusion
   * 
   * For any error response:
   * - The response MUST NOT contain stack trace information
   * - No "at " followed by file paths
   * - No ".ts:" or ".js:" patterns
   * - No "Error:" followed by stack frames
   */
  describe('Property 2: Stack Trace Exclusion', () => {
    test('DynamoDB error does not expose stack traces', async () => {
      // Mock DynamoDB to throw an error
      (ProfileService.getProfile as jest.Mock).mockRejectedValue(
        new Error('DynamoDB connection failed at /lib/dynamodb-client.ts:123')
      );

      const req = new NextRequest('http://localhost/api/profile?userId=test-user');
      const response = await profileGET(req);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      // Verify no stack trace patterns
      expect(responseText).not.toMatch(/\sat\s/); // "at " pattern
      expect(responseText).not.toMatch(/\.ts:/); // TypeScript file references
      expect(responseText).not.toMatch(/\.js:/); // JavaScript file references
      expect(responseText).not.toMatch(/Error:.*at/); // Error with stack frame
      
      // Verify it's still a valid error response
      expect(data.success).toBe(false);
      expect(data.code).toBeTruthy();
      expect(data.message).toBeTruthy();
    });

    test('Daily entry error does not expose stack traces', async () => {
      (DailyEntryService.getEntries as jest.Mock).mockRejectedValue(
        new Error('Query failed\n    at DynamoDBService.query (/lib/dynamodb.ts:45)\n    at DailyEntryService.getEntries')
      );

      const req = new NextRequest('http://localhost/api/daily?userId=test-user');
      const response = await dailyGET(req);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toMatch(/\sat\s/);
      expect(responseText).not.toMatch(/\.ts:/);
      expect(responseText).not.toMatch(/\/lib\//);
      expect(data.success).toBe(false);
    });

    test('Credit entry error does not expose stack traces', async () => {
      (CreditEntryService.getEntries as jest.Mock).mockRejectedValue(
        new Error('Network error at line 100 in credit-service.ts')
      );

      const req = new NextRequest('http://localhost/api/credit?userId=test-user');
      const response = await creditGET(req);
      const data = await response.json();
      const responseText = JSON.stringify(data);

      expect(responseText).not.toMatch(/\.ts/);
      expect(responseText).not.toMatch(/line \d+/);
      expect(data.success).toBe(false);
    });
  });

  /**
   * Test Error Codes Match Expected Values
   */
  describe('Error Code Validation', () => {
    test('Missing userId returns AUTH_REQUIRED code', async () => {
      const req = new NextRequest('http://localhost/api/profile');
      const response = await profileGET(req);
      const data = await response.json();

      expect(data.code).toBe('AUTH_REQUIRED');
      expect(response.status).toBe(401);
    });

    test('Invalid input returns INVALID_INPUT code', async () => {
      const req = new NextRequest('http://localhost/api/daily', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: 'test-user',
          totalSales: 'invalid', // Should be number
          totalExpense: 50 
        }),
      });
      const response = await dailyPOST(req);
      const data = await response.json();

      expect(data.code).toBe('INVALID_INPUT');
      expect(response.status).toBe(400);
    });

    test('Not found resource returns NOT_FOUND code', async () => {
      (DailyEntryService.getEntry as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/daily', {
        method: 'PUT',
        body: JSON.stringify({ 
          userId: 'test-user',
          date: '2024-01-01',
          totalSales: 100,
          totalExpense: 50
        }),
      });
      const response = await dailyPUT(req);
      const data = await response.json();

      expect(data.code).toBe('NOT_FOUND');
      expect(response.status).toBe(404);
    });

    test('DynamoDB error returns DYNAMODB_ERROR code', async () => {
      (ProfileService.getProfile as jest.Mock).mockRejectedValue(
        new Error('DynamoDB error')
      );

      const req = new NextRequest('http://localhost/api/profile?userId=test-user');
      const response = await profileGET(req);
      const data = await response.json();

      expect(data.code).toBe('DYNAMODB_ERROR');
      expect(response.status).toBe(500);
    });
  });

  /**
   * Test Multi-Language Error Messages
   */
  describe('Multi-Language Error Messages', () => {
    test('Error messages are non-empty strings', async () => {
      const req = new NextRequest('http://localhost/api/profile');
      const response = await profileGET(req);
      const data = await response.json();

      expect(typeof data.message).toBe('string');
      expect(data.message.length).toBeGreaterThan(0);
      expect(data.message).not.toBe('undefined');
      expect(data.message).not.toBe('null');
    });

    test('Error messages are user-friendly', async () => {
      const req = new NextRequest('http://localhost/api/daily', {
        method: 'POST',
        body: JSON.stringify({ totalSales: 100, totalExpense: 50 }),
      });
      const response = await dailyPOST(req);
      const data = await response.json();

      // Message should not contain technical jargon
      expect(data.message).not.toMatch(/undefined/i);
      expect(data.message).not.toMatch(/null/i);
      expect(data.message).not.toMatch(/exception/i);
      expect(data.message).not.toMatch(/stack/i);
    });
  });

  /**
   * Test Consistency Across Routes
   */
  describe('Consistency Across All Routes', () => {
    test('All routes return same error structure for missing userId', async () => {
      const routes = [
        { handler: profileGET, url: 'http://localhost/api/profile' },
        { handler: dailyGET, url: 'http://localhost/api/daily' },
        { handler: creditGET, url: 'http://localhost/api/credit' },
        { handler: reportsGET, url: 'http://localhost/api/reports' },
      ];

      for (const route of routes) {
        const req = new NextRequest(route.url);
        const response = await route.handler(req);
        const data = await response.json();

        // All should have same structure
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(Object.keys(data)).toHaveLength(3);
      }
    });

    test('All routes use consistent error codes', async () => {
      const routes = [
        { handler: profileGET, url: 'http://localhost/api/profile' },
        { handler: dailyGET, url: 'http://localhost/api/daily' },
        { handler: creditGET, url: 'http://localhost/api/credit' },
        { handler: reportsGET, url: 'http://localhost/api/reports' },
      ];

      const errorCodes = new Set<string>();

      for (const route of routes) {
        const req = new NextRequest(route.url);
        const response = await route.handler(req);
        const data = await response.json();
        errorCodes.add(data.code);
      }

      // All should return AUTH_REQUIRED for missing userId
      expect(errorCodes.size).toBe(1);
      expect(errorCodes.has('AUTH_REQUIRED')).toBe(true);
    });
  });
});
