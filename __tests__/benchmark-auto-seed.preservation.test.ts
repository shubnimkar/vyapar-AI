/**
 * Preservation Property Tests for Benchmark Data Auto-Seed
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * **Property 2: Preservation** - Existing Data Retrieval Behavior
 * 
 * These tests observe and validate the CURRENT behavior on UNFIXED code
 * for scenarios where the bug does NOT occur (non-buggy inputs).
 * 
 * **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline behavior)
 * 
 * Preservation Requirements:
 * 3.1 - When segment data exists in DynamoDB, retrieve without re-seeding
 * 3.2 - Manual seeding endpoint continues to work as it currently does
 * 3.3 - SegmentStore.saveSegmentData() uses same single-table design
 * 3.4 - Offline mode handles credential errors gracefully
 * 3.5 - generateDemoSegmentData() generates same 15 segment combinations
 * 3.6 - Benchmark comparison uses same calculation logic
 * 
 * Testing Approach:
 * - Observe behavior on UNFIXED code first
 * - Write property-based tests capturing observed patterns
 * - Run tests on UNFIXED code to confirm they pass
 * - After fix, re-run to ensure no regressions
 */

import fc from 'fast-check';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { BenchmarkService } from '@/lib/benchmarkService';
import { SegmentStore } from '@/lib/segmentStore';
import { generateDemoSegmentData, seedDemoData } from '@/lib/demoSegmentData';
import { GET } from '@/app/api/benchmark/route';
import { POST } from '@/app/api/admin/seed-benchmark/route';
import { NextRequest } from 'next/server';
import { ProfileService, DailyEntryService, CreditEntryService } from '@/lib/dynamodb-client';
import { CityTier, BusinessType, SegmentData } from '@/lib/types';
import { formatSegmentKey } from '@/lib/finance/segmentKeyFormatter';

// Mock dependencies
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/logger');

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Bugfix: benchmark-data-auto-seed - Preservation Tests', () => {
  const mockUserId = 'test-user-preservation';
  const baseUrl = 'http://localhost:3000/api/benchmark';

  
  beforeEach(() => {
    jest.clearAllMocks();
    ddbMock.reset();
    
    // Mock navigator.onLine to simulate online environment
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
  });
  
  afterEach(() => {
    ddbMock.reset();
  });
  
  // Arbitraries for property-based testing
  const cityTierArb = fc.constantFrom<CityTier>('tier1', 'tier2', 'tier3');
  const businessTypeArb = fc.constantFrom<BusinessType>('kirana', 'salon', 'pharmacy', 'restaurant', 'other');
  
  // Helper to create mock segment data
  const createMockSegmentData = (cityTier: CityTier, businessType: BusinessType): SegmentData => ({
    segmentKey: formatSegmentKey(cityTier, businessType),
    medianHealthScore: 65,
    medianMargin: 0.20,
    sampleSize: 250,
    lastUpdated: '2024-01-15T00:00:00Z'
  });
  
  /**
   * Property 2.1: Preservation - Existing Data Retrieval Without Re-seeding
   * 
   * **Validates: Requirement 3.1**
   * 
   * For any benchmark request where segment data already exists in DynamoDB,
   * the system SHALL retrieve and return that data without re-seeding.
   * 
   * This test observes the current behavior: when data exists, it is retrieved
   * directly without any seeding operations.
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   */
  it('Property 2.1: should retrieve existing segment data without re-seeding', async () => {
    // Test with concrete examples to ensure proper mock setup
    const testCases: Array<{ cityTier: CityTier; businessType: BusinessType }> = [
      { cityTier: 'tier1', businessType: 'kirana' },
      { cityTier: 'tier2', businessType: 'salon' },
      { cityTier: 'tier3', businessType: 'pharmacy' }
    ];
    
    for (const { cityTier, businessType } of testCases) {
      // Reset mocks for each test case
      jest.clearAllMocks();
      ddbMock.reset();
      
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
      
      // Setup: Mock services
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
      (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
      
      // Setup: Segment data EXISTS in DynamoDB
      const existingSegmentData = createMockSegmentData(cityTier, businessType);
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: existingSegmentData.segmentKey,
          SK: 'METADATA',
          entityType: 'SEGMENT',
          medianHealthScore: existingSegmentData.medianHealthScore,
          medianMargin: existingSegmentData.medianMargin,
          sampleSize: existingSegmentData.sampleSize,
          lastUpdated: existingSegmentData.lastUpdated
        }
      });
      
      // Execute: Call benchmark API
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      const response = await GET(request);
      const data = await response.json();
      
      // Assert: Should succeed with existing data
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      
      // Assert: NO seeding should occur (no PutCommand calls)
      const putCalls = ddbMock.commandCalls(PutCommand);
      expect(putCalls.length).toBe(0);
      
      // Assert: GetCommand was called to retrieve data
      const getCalls = ddbMock.commandCalls(GetCommand);
      expect(getCalls.length).toBeGreaterThan(0);
    }
  });

  
  /**
   * Property 2.2: Preservation - Manual Seeding Endpoint Behavior
   * 
   * **Validates: Requirement 3.2**
   * 
   * When the /api/admin/seed-benchmark endpoint is called manually,
   * the system SHALL continue to seed benchmark data as it currently does.
   * 
   * This test observes the current manual seeding behavior and ensures
   * it remains unchanged after the fix.
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   */
  it('Property 2.2: should seed data via manual admin endpoint', async () => {
    // Setup: Mock DynamoDB to accept PutCommand
    ddbMock.on(PutCommand).resolves({});
    
    // Execute: Call manual seeding endpoint
    const response = await POST();
    const data = await response.json();
    
    // Assert: Should succeed
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.segments).toBe(15);
    
    // Assert: Should have called PutCommand for all 15 segments
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls.length).toBe(15);
    
    // Verify all segment combinations were seeded
    const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
    const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
    
    const expectedSegments = cityTiers.flatMap(tier =>
      businessTypes.map(type => formatSegmentKey(tier, type))
    );
    
    const seededSegments = putCalls.map(call => call.args[0].input.Item?.PK);
    
    expectedSegments.forEach(expectedKey => {
      expect(seededSegments).toContain(expectedKey);
    });
  });
  
  /**
   * Property 2.3: Preservation - SegmentStore Save Uses Single-Table Design
   * 
   * **Validates: Requirement 3.3**
   * 
   * When SegmentStore.saveSegmentData() is called, the system SHALL
   * continue to save data to DynamoDB using the same single-table design pattern.
   * 
   * This test verifies the DynamoDB key structure remains unchanged:
   * - PK: SEGMENT#{city_tier}#{business_type}
   * - SK: METADATA
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   */
  it('Property 2.3: should use single-table design pattern for saving', async () => {
    await fc.assert(
      fc.asyncProperty(
        cityTierArb,
        businessTypeArb,
        async (cityTier, businessType) => {
          // Reset mocks for each property test run
          jest.clearAllMocks();
          ddbMock.reset();
          
          // Setup: Create segment data
          const segmentData = createMockSegmentData(cityTier, businessType);
          
          // Setup: Mock DynamoDB
          ddbMock.on(PutCommand).resolves({});
          
          // Execute: Save segment data
          const segmentStore = new SegmentStore();
          const result = await segmentStore.saveSegmentData(segmentData);
          
          // Assert: Should succeed
          expect(result).toBe(true);
          
          // Assert: Should use correct key structure
          const putCalls = ddbMock.commandCalls(PutCommand);
          expect(putCalls.length).toBe(1);
          
          const putItem = putCalls[0].args[0].input.Item;
          expect(putItem?.PK).toBe(formatSegmentKey(cityTier, businessType));
          expect(putItem?.SK).toBe('METADATA');
          expect(putItem?.entityType).toBe('SEGMENT');
          expect(putItem?.medianHealthScore).toBe(segmentData.medianHealthScore);
          expect(putItem?.medianMargin).toBe(segmentData.medianMargin);
          expect(putItem?.sampleSize).toBe(segmentData.sampleSize);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  
  /**
   * Property 2.4: Preservation - Offline Mode Graceful Fallback
   * 
   * **Validates: Requirement 3.4**
   * 
   * When AWS credentials are not configured (offline mode), the system SHALL
   * continue to handle credential errors gracefully and fall back to cached data.
   * 
   * This test verifies that credential errors don't crash the system and
   * that the offline fallback behavior remains unchanged.
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   */
  it('Property 2.4: should handle credential errors gracefully in offline mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        cityTierArb,
        businessTypeArb,
        async (cityTier, businessType) => {
          // Reset mocks for each property test run
          jest.clearAllMocks();
          ddbMock.reset();
          
          // Setup: Mock DynamoDB to throw credential error
          ddbMock.on(GetCommand).rejects({
            name: 'UnrecognizedClientException',
            message: 'The security token included in the request is invalid'
          });
          
          // Execute: Try to get segment data
          const segmentStore = new SegmentStore();
          const result = await segmentStore.getSegmentData(cityTier, businessType);
          
          // Assert: Should return null gracefully (not throw)
          expect(result).toBeNull();
          
          // Assert: Should have attempted GetCommand
          const getCalls = ddbMock.commandCalls(GetCommand);
          expect(getCalls.length).toBe(1);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
  
  /**
   * Property 2.5: Preservation - Demo Data Generation Consistency
   * 
   * **Validates: Requirement 3.5**
   * 
   * When generateDemoSegmentData() is called, the system SHALL continue
   * to generate the same 15 segment combinations with consistent realistic values.
   * 
   * This test verifies that the demo data generation logic remains unchanged
   * and produces the expected segment combinations.
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   */
  it('Property 2.5: should generate consistent 15 segment combinations', () => {
    // Execute: Generate demo data
    const demoData = generateDemoSegmentData();
    
    // Assert: Should generate exactly 15 segments
    expect(demoData.length).toBe(15);
    
    // Assert: All combinations should be present
    const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
    const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
    
    const expectedSegments = cityTiers.flatMap(tier =>
      businessTypes.map(type => formatSegmentKey(tier, type))
    );
    
    const generatedKeys = demoData.map(d => d.segmentKey);
    
    expectedSegments.forEach(expectedKey => {
      expect(generatedKeys).toContain(expectedKey);
    });
    
    // Assert: All segments have required fields
    demoData.forEach(segment => {
      expect(segment.segmentKey).toBeDefined();
      expect(typeof segment.medianHealthScore).toBe('number');
      expect(typeof segment.medianMargin).toBe('number');
      expect(typeof segment.sampleSize).toBe('number');
      expect(segment.lastUpdated).toBeDefined();
      
      // Assert: Values are within realistic ranges
      expect(segment.medianHealthScore).toBeGreaterThanOrEqual(0);
      expect(segment.medianHealthScore).toBeLessThanOrEqual(100);
      expect(segment.medianMargin).toBeGreaterThanOrEqual(0);
      expect(segment.medianMargin).toBeLessThanOrEqual(1);
      expect(segment.sampleSize).toBeGreaterThan(0);
    });
  });

  
  /**
   * Property 2.6: Preservation - Benchmark Comparison Calculation Logic
   * 
   * **Validates: Requirement 3.6**
   * 
   * When benchmark comparison calculation is performed, the system SHALL
   * continue to use the same comparison logic and categorization rules.
   * 
   * This test verifies that the comparison algorithm remains unchanged
   * and produces consistent categorization results.
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   */
  it('Property 2.6: should use consistent comparison logic', async () => {
    // Test with concrete examples
    const testCases = [
      { cityTier: 'tier1' as CityTier, businessType: 'kirana' as BusinessType, healthScore: 70, profitMargin: 0.25 },
      { cityTier: 'tier2' as CityTier, businessType: 'salon' as BusinessType, healthScore: 60, profitMargin: 0.30 },
      { cityTier: 'tier3' as CityTier, businessType: 'pharmacy' as BusinessType, healthScore: 50, profitMargin: 0.15 }
    ];
    
    for (const { cityTier, businessType, healthScore, profitMargin } of testCases) {
      // Reset mocks for each test case
      jest.clearAllMocks();
      ddbMock.reset();
      
      // Setup: User profile
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
      
      // Setup: User metrics
      const userMetrics = {
        healthScore,
        profitMargin
      };
      
      // Setup: Segment data exists
      const segmentData = createMockSegmentData(cityTier, businessType);
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: segmentData.segmentKey,
          SK: 'METADATA',
          entityType: 'SEGMENT',
          medianHealthScore: segmentData.medianHealthScore,
          medianMargin: segmentData.medianMargin,
          sampleSize: segmentData.sampleSize,
          lastUpdated: segmentData.lastUpdated
        }
      });
      
      // Execute: Get benchmark comparison
      const benchmarkService = new BenchmarkService();
      const comparison = await benchmarkService.getBenchmarkComparison(
        mockProfile,
        userMetrics
      );
      
      // Assert: Should return comparison
      expect(comparison).not.toBeNull();
      expect(comparison?.healthScoreComparison).toBeDefined();
      expect(comparison?.marginComparison).toBeDefined();
      expect(comparison?.segmentInfo).toBeDefined();
      
      // Assert: Comparison should have expected structure
      if (comparison) {
        expect(comparison.healthScoreComparison.userValue).toBe(healthScore);
        expect(comparison.healthScoreComparison.segmentMedian).toBe(segmentData.medianHealthScore);
        expect(['above_average', 'at_average', 'below_average']).toContain(comparison.healthScoreComparison.category);
        
        expect(comparison.marginComparison.userValue).toBe(profitMargin);
        expect(comparison.marginComparison.segmentMedian).toBe(segmentData.medianMargin);
        expect(['above_average', 'at_average', 'below_average']).toContain(comparison.marginComparison.category);
        
        expect(comparison.segmentInfo.segmentKey).toBe(segmentData.segmentKey);
        expect(comparison.segmentInfo.sampleSize).toBe(segmentData.sampleSize);
        expect(comparison.segmentInfo.lastUpdated).toBe(segmentData.lastUpdated);
      }
    }
  });
  
  /**
   * Property 2.7: Preservation - Cache-First Retrieval Logic
   * 
   * **Validates: Cache behavior preservation (implicit in 3.1)**
   * 
   * When cache-first retrieval is performed, the system SHALL continue
   * to check localStorage cache before attempting DynamoDB access.
   * 
   * This test verifies that the caching strategy remains unchanged.
   * 
   * **EXPECTED OUTCOME**: Test PASSES on unfixed code
   * 
   * Note: This test runs on server-side where localStorage is not available,
   * so it verifies that the system correctly skips cache and goes to DynamoDB.
   */
  it('Property 2.7: should maintain cache-first retrieval strategy', async () => {
    // Test with concrete examples
    const testCases: Array<{ cityTier: CityTier; businessType: BusinessType }> = [
      { cityTier: 'tier1', businessType: 'kirana' },
      { cityTier: 'tier2', businessType: 'restaurant' }
    ];
    
    for (const { cityTier, businessType } of testCases) {
      // Reset mocks for each test case
      jest.clearAllMocks();
      ddbMock.reset();
      
      // Setup: Segment data exists in DynamoDB
      const segmentData = createMockSegmentData(cityTier, businessType);
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: segmentData.segmentKey,
          SK: 'METADATA',
          entityType: 'SEGMENT',
          medianHealthScore: segmentData.medianHealthScore,
          medianMargin: segmentData.medianMargin,
          sampleSize: segmentData.sampleSize,
          lastUpdated: segmentData.lastUpdated
        }
      });
      
      // Execute: Get segment data (server-side, no cache)
      const benchmarkService = new BenchmarkService();
      const result = await benchmarkService.getSegmentData(cityTier, businessType);
      
      // Assert: Should retrieve from DynamoDB
      expect(result).not.toBeNull();
      expect(result?.segmentKey).toBe(segmentData.segmentKey);
      expect(result?.medianHealthScore).toBe(segmentData.medianHealthScore);
      expect(result?.medianMargin).toBe(segmentData.medianMargin);
      
      // Assert: Should have called GetCommand
      const getCalls = ddbMock.commandCalls(GetCommand);
      expect(getCalls.length).toBeGreaterThan(0);
    }
  });
});
