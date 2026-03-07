/**
 * Integration tests for Calculate Indices API endpoint
 * 
 * Tests the /api/indices/calculate endpoint with real data aggregation
 * and calculation functions.
 */

import { POST } from '@/app/api/indices/calculate/route';
import { DailyEntryService, CreditEntryService } from '@/lib/dynamodb-client';
import { indexSyncManager } from '@/lib/index-sync';
import type { DailyEntry, CreditEntry } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/index-sync');
jest.mock('@/lib/logger');

describe('POST /api/indices/calculate', () => {
  const mockUserId = 'test-user-123';
  
  // Sample daily entries (30 days of data)
  const mockDailyEntries: DailyEntry[] = Array.from({ length: 30 }, (_, i) => ({
    userId: mockUserId,
    entryId: `entry-${i}`,
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    totalSales: 10000 + Math.random() * 2000,
    totalExpense: 6000 + Math.random() * 1000,
    cashInHand: 50000,
    estimatedProfit: 4000,
    expenseRatio: 0.6,
    profitMargin: 0.4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Sample credit entries
  const mockCreditEntries: CreditEntry[] = [
    {
      userId: mockUserId,
      id: 'credit-1',
      customerName: 'Customer A',
      amount: 5000,
      dateGiven: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      userId: mockUserId,
      id: 'credit-2',
      customerName: 'Customer B',
      amount: 3000,
      dateGiven: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DynamoDB service methods
    (DailyEntryService.getEntries as jest.Mock).mockResolvedValue(mockDailyEntries);
    (CreditEntryService.getEntries as jest.Mock).mockResolvedValue(mockCreditEntries);
    
    // Mock sync manager
    (indexSyncManager.saveIndex as jest.Mock).mockResolvedValue(undefined);
  });

  it('should calculate stress index successfully with sufficient data', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUserId }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.stressIndex).toBeDefined();
    expect(data.data.stressIndex.score).toBeGreaterThanOrEqual(0);
    expect(data.data.stressIndex.score).toBeLessThanOrEqual(100);
    expect(data.data.stressIndex.breakdown).toBeDefined();
    expect(data.data.affordabilityIndex).toBeNull();
  });

  it('should calculate both stress and affordability indices when plannedCost provided', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: mockUserId,
        plannedCost: 50000,
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stressIndex).toBeDefined();
    expect(data.data.affordabilityIndex).toBeDefined();
    expect(data.data.affordabilityIndex.score).toBeGreaterThanOrEqual(0);
    expect(data.data.affordabilityIndex.score).toBeLessThanOrEqual(100);
    expect(data.data.affordabilityIndex.breakdown.affordabilityCategory).toBeDefined();
  });

  it('should return error when userId is missing', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('should return error when plannedCost is negative', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: mockUserId,
        plannedCost: -1000,
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe('INVALID_INPUT');
  });

  it('should return error when insufficient data (less than 7 days)', async () => {
    // Mock insufficient data
    (DailyEntryService.getEntries as jest.Mock).mockResolvedValue(
      mockDailyEntries.slice(0, 5) // Only 5 days
    );

    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUserId }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe('INVALID_INPUT');
    expect(data.message).toContain('Insufficient data');
  });

  it('should save index data via sync manager', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUserId }),
    });

    await POST(request as any);

    expect(indexSyncManager.saveIndex).toHaveBeenCalledTimes(1);
    expect(indexSyncManager.saveIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockUserId,
        stressIndex: expect.any(Object),
        dataPoints: expect.any(Number),
        calculationPeriod: expect.any(Object),
      })
    );
  });

  it('should include calculation metadata in response', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUserId }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.data.dataPoints).toBeGreaterThanOrEqual(7);
    expect(data.data.calculationPeriod).toBeDefined();
    expect(data.data.calculationPeriod.startDate).toBeDefined();
    expect(data.data.calculationPeriod.endDate).toBeDefined();
    expect(data.data.createdAt).toBeDefined();
  });

  it('should handle DynamoDB errors gracefully', async () => {
    (DailyEntryService.getEntries as jest.Mock).mockRejectedValue(
      new Error('DynamoDB connection failed')
    );

    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: mockUserId }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.code).toBe('SERVER_ERROR');
  });

  it('should skip affordability calculation when plannedCost is zero', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: mockUserId,
        plannedCost: 0, // Zero cost should skip affordability
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stressIndex).toBeDefined();
    // Affordability should be null when plannedCost is 0
    expect(data.data.affordabilityIndex).toBeNull();
  });

  it('should respect language parameter in error messages', async () => {
    const request = new Request('http://localhost:3000/api/indices/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: mockUserId,
        language: 'hi',
      }),
    });

    // Mock insufficient data
    (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([]);

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    // Should return Hindi error message
    expect(data.message).toContain('डेटा');
  });
});
