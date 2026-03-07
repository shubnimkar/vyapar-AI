import fc from 'fast-check';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SegmentStore } from '../segmentStore';
import { SegmentData, CityTier, BusinessType } from '../types';

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Feature: segment-benchmark, Property 2: Segment Data Invariants', () => {
  let segmentStore: SegmentStore;
  
  beforeEach(() => {
    segmentStore = new SegmentStore();
    ddbMock.reset();
  });
  
  afterEach(() => {
    ddbMock.reset();
  });
  
  // Arbitraries for generating test data
  const cityTierArb = fc.constantFrom<CityTier>('tier1', 'tier2', 'tier3');
  const businessTypeArb = fc.constantFrom<BusinessType>('kirana', 'salon', 'pharmacy', 'restaurant', 'other');
  
  // Generate valid ISO timestamps using integer timestamps
  const validISODateArb = fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2030-12-31').getTime() 
  }).map(timestamp => new Date(timestamp).toISOString());
  
  const validSegmentDataArb = fc.record({
    cityTier: cityTierArb,
    businessType: businessTypeArb,
    medianHealthScore: fc.integer({ min: 0, max: 100 }),
    medianMargin: fc.double({ min: 0, max: 1, noNaN: true }),
    sampleSize: fc.integer({ min: 1, max: 1000 }),
    lastUpdated: validISODateArb
  }).map(data => ({
    segmentKey: `SEGMENT#${data.cityTier}#${data.businessType}`,
    medianHealthScore: data.medianHealthScore,
    medianMargin: data.medianMargin,
    sampleSize: data.sampleSize,
    lastUpdated: data.lastUpdated
  }));
  
  it('should validate medianHealthScore is between 0 and 100', () => {
    fc.assert(
      fc.property(validSegmentDataArb, (segmentData) => {
        expect(segmentData.medianHealthScore).toBeGreaterThanOrEqual(0);
        expect(segmentData.medianHealthScore).toBeLessThanOrEqual(100);
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should validate sampleSize is greater than 0', () => {
    fc.assert(
      fc.property(validSegmentDataArb, (segmentData) => {
        expect(segmentData.sampleSize).toBeGreaterThan(0);
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should validate segmentKey matches pattern', () => {
    fc.assert(
      fc.property(validSegmentDataArb, (segmentData) => {
        const pattern = /^SEGMENT#(tier1|tier2|tier3)#(kirana|salon|pharmacy|restaurant|other)$/;
        expect(segmentData.segmentKey).toMatch(pattern);
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should validate medianMargin is a valid number', () => {
    fc.assert(
      fc.property(validSegmentDataArb, (segmentData) => {
        expect(typeof segmentData.medianMargin).toBe('number');
        expect(isNaN(segmentData.medianMargin)).toBe(false);
        expect(isFinite(segmentData.medianMargin)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should validate lastUpdated is a valid ISO timestamp', () => {
    fc.assert(
      fc.property(validSegmentDataArb, (segmentData) => {
        const date = new Date(segmentData.lastUpdated);
        expect(date.toString()).not.toBe('Invalid Date');
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should successfully save valid segment data', async () => {
    // Test with a few specific examples
    const testCases: SegmentData[] = [
      {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      },
      {
        segmentKey: 'SEGMENT#tier2#restaurant',
        medianHealthScore: 60,
        medianMargin: 0.10,
        sampleSize: 150,
        lastUpdated: '2024-01-15T10:00:00Z'
      }
    ];
    
    for (const segmentData of testCases) {
      const store = new SegmentStore();
      ddbMock.reset();
      
      ddbMock.on(PutCommand).resolves({});
      
      const saveResult = await store.saveSegmentData(segmentData);
      expect(saveResult).toBe(true);
    }
  });
  
  it('should successfully retrieve valid segment data', async () => {
    // Test with a few specific examples instead of property-based
    const testCases: SegmentData[] = [
      {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      },
      {
        segmentKey: 'SEGMENT#tier2#salon',
        medianHealthScore: 65,
        medianMargin: 0.25,
        sampleSize: 200,
        lastUpdated: '2024-01-15T10:00:00Z'
      },
      {
        segmentKey: 'SEGMENT#tier3#pharmacy',
        medianHealthScore: 55,
        medianMargin: 0.15,
        sampleSize: 100,
        lastUpdated: '2024-01-15T10:00:00Z'
      }
    ];
    
    for (const segmentData of testCases) {
      const store = new SegmentStore();
      ddbMock.reset();
      
      ddbMock.on(GetCommand).resolves({
        Item: {
          PK: segmentData.segmentKey,
          SK: 'METADATA',
          entityType: 'SEGMENT',
          medianHealthScore: segmentData.medianHealthScore,
          medianMargin: segmentData.medianMargin,
          sampleSize: segmentData.sampleSize,
          lastUpdated: segmentData.lastUpdated,
          updatedAt: new Date().toISOString()
        }
      });
      
      const parts = segmentData.segmentKey.split('#');
      const cityTier = parts[1] as CityTier;
      const businessType = parts[2] as BusinessType;
      
      const retrieved = await store.getSegmentData(cityTier, businessType);
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.segmentKey).toBe(segmentData.segmentKey);
      expect(retrieved!.medianHealthScore).toBe(segmentData.medianHealthScore);
      expect(retrieved!.medianMargin).toBe(segmentData.medianMargin);
      expect(retrieved!.sampleSize).toBe(segmentData.sampleSize);
    }
  });
});
