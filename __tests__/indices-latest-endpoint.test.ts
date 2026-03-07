/**
 * Tests for GET /api/indices/latest endpoint
 * 
 * Validates:
 * - Requirements 4.8: Retrieve the most recent index for dashboard display
 * - Requirements 5.8: Dashboard displays latest indices
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/indices/latest/route';
import { indexSyncManager } from '@/lib/index-sync';
import type { IndexData } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/index-sync');
jest.mock('@/lib/logger');

describe('GET /api/indices/latest', () => {
  const mockUserId = 'user123';
  const mockIndexData: IndexData = {
    userId: mockUserId,
    date: '2024-01-15',
    stressIndex: {
      score: 45,
      breakdown: {
        creditRatioScore: 20,
        cashBufferScore: 15,
        expenseVolatilityScore: 10
      },
      calculatedAt: '2024-01-15T10:30:00Z',
      inputParameters: {
        creditRatio: 0.35,
        cashBuffer: 1.2,
        expenseVolatility: 0.25
      }
    },
    affordabilityIndex: null,
    dataPoints: 45,
    calculationPeriod: {
      startDate: '2023-12-01',
      endDate: '2024-01-15'
    },
    createdAt: '2024-01-15T10:30:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should return latest index data when found', async () => {
      // Mock sync manager to return index data
      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(mockIndexData);

      // Create request with userId query parameter
      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      // Call endpoint
      const response = await GET(request);
      const data = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockIndexData);
      expect(data.data.userId).toBe(mockUserId);
      expect(data.data.stressIndex).toBeDefined();
      expect(data.data.stressIndex?.score).toBe(45);
    });

    it('should return index with both stress and affordability indices', async () => {
      // Mock index data with affordability index
      const indexWithAffordability: IndexData = {
        ...mockIndexData,
        affordabilityIndex: {
          score: 75,
          breakdown: {
            costToProfitRatio: 0.4,
            affordabilityCategory: 'Affordable'
          },
          calculatedAt: '2024-01-15T10:30:00Z',
          inputParameters: {
            plannedCost: 20000,
            avgMonthlyProfit: 50000
          }
        }
      };

      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(indexWithAffordability);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.affordabilityIndex).toBeDefined();
      expect(data.data.affordabilityIndex?.score).toBe(75);
      expect(data.data.affordabilityIndex?.breakdown.affordabilityCategory).toBe('Affordable');
    });

    it('should call sync manager with correct userId', async () => {
      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(mockIndexData);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      await GET(request);

      expect(indexSyncManager.getLatestIndex).toHaveBeenCalledWith(mockUserId);
      expect(indexSyncManager.getLatestIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 when userId is missing', async () => {
      // Create request without userId
      const request = new NextRequest('http://localhost:3000/api/indices/latest');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_REQUIRED');
      expect(data.message).toBeDefined();
    });

    it('should return 404 when no index data found', async () => {
      // Mock sync manager to return null (no data)
      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_FOUND');
      expect(data.message).toBeDefined();
    });

    it('should return 500 when sync manager throws error', async () => {
      // Mock sync manager to throw error
      (indexSyncManager.getLatestIndex as jest.Mock).mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('SERVER_ERROR');
      expect(data.message).toBeDefined();
    });

    it('should return 400 when userId is empty string', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/indices/latest?userId='
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('Response Format', () => {
    it('should return structured JSON response with success flag', async () => {
      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(mockIndexData);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
      expect(data).toHaveProperty('data');
    });

    it('should include all required IndexData fields', async () => {
      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(mockIndexData);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveProperty('userId');
      expect(data.data).toHaveProperty('date');
      expect(data.data).toHaveProperty('stressIndex');
      expect(data.data).toHaveProperty('affordabilityIndex');
      expect(data.data).toHaveProperty('dataPoints');
      expect(data.data).toHaveProperty('calculationPeriod');
      expect(data.data).toHaveProperty('createdAt');
    });

    it('should not expose stack traces in error responses', async () => {
      (indexSyncManager.getLatestIndex as jest.Mock).mockRejectedValue(
        new Error('Internal error with sensitive info')
      );

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data).not.toHaveProperty('stack');
      expect(data.message).not.toContain('sensitive info');
    });
  });

  describe('Offline-First Behavior', () => {
    it('should work when sync manager returns localStorage data', async () => {
      // Simulate offline scenario where sync manager returns localStorage data
      const offlineIndexData: IndexData = {
        ...mockIndexData,
        syncedAt: undefined // Not synced to DynamoDB
      };

      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(offlineIndexData);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(offlineIndexData);
    });

    it('should work when sync manager returns DynamoDB data', async () => {
      // Simulate online scenario where sync manager returns DynamoDB data
      const onlineIndexData: IndexData = {
        ...mockIndexData,
        syncedAt: '2024-01-15T10:31:00Z' // Synced to DynamoDB
      };

      (indexSyncManager.getLatestIndex as jest.Mock).mockResolvedValue(onlineIndexData);

      const request = new NextRequest(
        `http://localhost:3000/api/indices/latest?userId=${mockUserId}`
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(onlineIndexData);
    });
  });
});
