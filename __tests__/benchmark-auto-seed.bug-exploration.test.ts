/**
 * Bug Condition Exploration Test for Benchmark Data Auto-Seed
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4**
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * 
 * **Property 1: Fault Condition** - Empty Database Returns 404
 * 
 * This test encodes the EXPECTED behavior (automatic seeding) and will validate
 * the fix when it passes after implementation. On unfixed code, it will fail
 * because the system returns 404 instead of automatically seeding data.
 * 
 * Bug Condition:
 * - User has valid profile with cityTier and businessType
 * - User has daily entries
 * - Segment data does NOT exist in DynamoDB
 * - AWS credentials are configured (not offline mode)
 * 
 * Expected Behavior (after fix):
 * - System should automatically seed benchmark data
 * - Benchmark comparison should succeed without manual intervention
 * 
 * Counterexamples to document (on unfixed code):
 * - SegmentStore.getSegmentData() returns null when database is empty
 * - /api/benchmark endpoint returns 404 with "Benchmark data not available for your segment"
 * - No automatic seeding mechanism is triggered
 */

import fc from 'fast-check';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GET } from '@/app/api/benchmark/route';
import { NextRequest } from 'next/server';
import { ProfileService, DailyEntryService, CreditEntryService } from '@/lib/dynamodb-client';
import { CityTier, BusinessType } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/logger');

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Bugfix: benchmark-data-auto-seed - Bug Condition Exploration', () => {
  const mockUserId = 'test-user-bug-exploration';
  const baseUrl = 'http://localhost:3000/api/benchmark';
  
  // Stateful mock storage to simulate DynamoDB behavior
  let mockDynamoDBStorage: Map<string, any>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    ddbMock.reset();
    mockDynamoDBStorage = new Map();
    
    // Mock navigator.onLine to simulate online environment
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
    
    // Setup stateful mock for GetCommand
    ddbMock.on(GetCommand).callsFake((input) => {
      const key = `${input.Key.PK}#${input.Key.SK}`;
      const item = mockDynamoDBStorage.get(key);
      return { Item: item };
    });
    
    // Setup stateful mock for PutCommand
    ddbMock.on(PutCommand).callsFake((input) => {
      const key = `${input.Item.PK}#${input.Item.SK}`;
      mockDynamoDBStorage.set(key, input.Item);
      return {};
    });
  });
  
  afterEach(() => {
    ddbMock.reset();
    mockDynamoDBStorage.clear();
  });
  
  // Arbitraries for property-based testing
  const cityTierArb = fc.constantFrom<CityTier>('tier1', 'tier2', 'tier3');
  const businessTypeArb = fc.constantFrom<BusinessType>('kirana', 'salon', 'pharmacy', 'restaurant', 'other');
  
  /**
   * Property 1: Fault Condition - Automatic Seeding on Missing Data
   * 
   * For any benchmark request where:
   * - User has valid profile with cityTier and businessType
   * - User has daily entries
   * - Segment data does NOT exist in DynamoDB
   * - AWS credentials are configured
   * 
   * The fixed system SHALL automatically seed all 15 segment combinations
   * to DynamoDB before attempting to retrieve the requested segment data,
   * ensuring the benchmark comparison succeeds without manual intervention.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS with 404 error
   * **EXPECTED OUTCOME ON FIXED CODE**: Test PASSES with successful comparison
   */
  it('Property 1: should automatically seed benchmark data when database is empty (EXPECTED TO FAIL on unfixed code)', async () => {
    await fc.assert(
      fc.asyncProperty(
        cityTierArb,
        businessTypeArb,
        async (cityTier, businessType) => {
          // Setup: User has valid profile
          const mockProfile = {
            userId: mockUserId,
            shopName: 'Test Shop',
            userName: 'Test User',
            language: 'en',
            city_tier: cityTier,
            business_type: businessType,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z'
          };
          
          // Setup: User has daily entries
          const mockDailyEntry = {
            userId: mockUserId,
            date: '2024-01-15',
            totalSales: 10000,
            totalExpense: 7000,
            cashInHand: 5000,
            profitMargin: 0.30,
            expenseRatio: 0.70,
            estimatedProfit: 3000
          };
          
          // Setup: Mock profile and daily entry services
          (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
          (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
          (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
          
          // Setup: Empty DynamoDB - mockDynamoDBStorage is already empty
          // After fix, this should trigger auto-seeding which will populate mockDynamoDBStorage
          
          // Execute: Call benchmark API
          const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
          const response = await GET(request);
          const data = await response.json();
          
          // Assert: After fix, this should succeed with 200
          // On unfixed code, this will fail with 404
          expect(response.status).toBe(200);
          expect(data.success).toBe(true);
          expect(data.data).toBeDefined();
          expect(data.data.healthScoreComparison).toBeDefined();
          expect(data.data.marginComparison).toBeDefined();
          expect(data.data.segmentInfo).toBeDefined();
          
          // Verify that seeding occurred (after fix)
          // The system should have called PutCommand to seed data
          const putCalls = ddbMock.commandCalls(PutCommand);
          expect(putCalls.length).toBeGreaterThan(0);
          
          return true;
        }
      ),
      { numRuns: 10 } // Test with 10 different segment combinations
    );
  });
  
  /**
   * Concrete Test Case 1: tier1/kirana with empty database
   * 
   * This is a specific example of the bug condition to make debugging easier.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: 404 error
   * **EXPECTED OUTCOME ON FIXED CODE**: 200 success with benchmark data
   */
  it('should automatically seed data for tier1/kirana when database is empty (EXPECTED TO FAIL on unfixed code)', async () => {
    // Setup: User has valid profile
    const mockProfile = {
      userId: mockUserId,
      shopName: 'Test Kirana',
      userName: 'Test User',
      language: 'en',
      city_tier: 'tier1',
      business_type: 'kirana',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    };
    
    // Setup: User has daily entries
    const mockDailyEntry = {
      userId: mockUserId,
      date: '2024-01-15',
      totalSales: 10000,
      totalExpense: 7000,
      cashInHand: 5000,
      profitMargin: 0.30,
      expenseRatio: 0.70,
      estimatedProfit: 3000
    };
    
    // Setup: Mock services
    (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
    (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
    
    // Setup: Empty DynamoDB - mockDynamoDBStorage is already empty
    
    // Execute: Call benchmark API
    const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
    const response = await GET(request);
    const data = await response.json();
    
    // Assert: After fix, this should succeed
    // On unfixed code, this will fail with 404
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    
    // Verify seeding occurred
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBeGreaterThan(0);
  });
  
  /**
   * Concrete Test Case 2: tier2/salon with empty database
   * 
   * Another specific example to test different segment combination.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: 404 error
   * **EXPECTED OUTCOME ON FIXED CODE**: 200 success with benchmark data
   */
  it('should automatically seed data for tier2/salon when database is empty (EXPECTED TO FAIL on unfixed code)', async () => {
    // Setup: User has valid profile
    const mockProfile = {
      userId: mockUserId,
      shopName: 'Test Salon',
      userName: 'Test User',
      language: 'en',
      city_tier: 'tier2',
      business_type: 'salon',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    };
    
    // Setup: User has daily entries
    const mockDailyEntry = {
      userId: mockUserId,
      date: '2024-01-15',
      totalSales: 15000,
      totalExpense: 10000,
      cashInHand: 8000,
      profitMargin: 0.33,
      expenseRatio: 0.67,
      estimatedProfit: 5000
    };
    
    // Setup: Mock services
    (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
    (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
    
    // Setup: Empty DynamoDB - mockDynamoDBStorage is already empty
    
    // Execute: Call benchmark API
    const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
    const response = await GET(request);
    const data = await response.json();
    
    // Assert: After fix, this should succeed
    // On unfixed code, this will fail with 404
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    
    // Verify seeding occurred
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBeGreaterThan(0);
  });
  
  /**
   * Concrete Test Case 3: tier3/pharmacy with empty database
   * 
   * Testing tier3 to ensure all tiers are covered.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: 404 error
   * **EXPECTED OUTCOME ON FIXED CODE**: 200 success with benchmark data
   */
  it('should automatically seed data for tier3/pharmacy when database is empty (EXPECTED TO FAIL on unfixed code)', async () => {
    // Setup: User has valid profile
    const mockProfile = {
      userId: mockUserId,
      shopName: 'Test Pharmacy',
      userName: 'Test User',
      language: 'en',
      city_tier: 'tier3',
      business_type: 'pharmacy',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z'
    };
    
    // Setup: User has daily entries
    const mockDailyEntry = {
      userId: mockUserId,
      date: '2024-01-15',
      totalSales: 8000,
      totalExpense: 6000,
      cashInHand: 3000,
      profitMargin: 0.25,
      expenseRatio: 0.75,
      estimatedProfit: 2000
    };
    
    // Setup: Mock services
    (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
    (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
    
    // Setup: Empty DynamoDB - mockDynamoDBStorage is already empty
    
    // Execute: Call benchmark API
    const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
    const response = await GET(request);
    const data = await response.json();
    
    // Assert: After fix, this should succeed
    // On unfixed code, this will fail with 404
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    
    // Verify seeding occurred
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBeGreaterThan(0);
  });
});
