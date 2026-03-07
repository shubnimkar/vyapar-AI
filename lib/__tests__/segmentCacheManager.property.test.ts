import fc from 'fast-check';
import { SegmentCacheManager } from '../segmentCacheManager';
import { SegmentData, CachedSegmentData, CityTier, BusinessType } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe('Feature: segment-benchmark, SegmentCacheManager Property Tests', () => {
  let cacheManager: SegmentCacheManager;
  
  beforeEach(() => {
    cacheManager = new SegmentCacheManager();
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  // Arbitraries for generating test data
  const cityTierArb = fc.constantFrom<CityTier>('tier1', 'tier2', 'tier3');
  const businessTypeArb = fc.constantFrom<BusinessType>('kirana', 'salon', 'pharmacy', 'restaurant', 'other');
  
  // Generate valid ISO timestamps using integer timestamps
  const validISODateArb = fc.integer({ 
    min: new Date('2020-01-01').getTime(), 
    max: new Date('2030-12-31').getTime() 
  }).map(timestamp => new Date(timestamp).toISOString());
  
  const segmentDataArb = fc.record({
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
  
  describe('Property 9: Cache Round-Trip Persistence', () => {
    it('should preserve all data fields after save and retrieve', () => {
      fc.assert(
        fc.property(segmentDataArb, (segmentData) => {
          cacheManager.saveToCache(segmentData);
          
          // Extract cityTier and businessType from segmentKey
          const parts = segmentData.segmentKey.split('#');
          const cityTier = parts[1] as CityTier;
          const businessType = parts[2] as BusinessType;
          
          const retrieved = cacheManager.getFromCache(cityTier, businessType);
          
          // Should retrieve successfully
          expect(retrieved).not.toBeNull();
          
          // All fields should match
          expect(retrieved!.segmentKey).toBe(segmentData.segmentKey);
          expect(retrieved!.medianHealthScore).toBe(segmentData.medianHealthScore);
          expect(retrieved!.medianMargin).toBe(segmentData.medianMargin);
          expect(retrieved!.sampleSize).toBe(segmentData.sampleSize);
          expect(retrieved!.lastUpdated).toBe(segmentData.lastUpdated);
          
          // cachedAt should be added
          expect(retrieved!.cachedAt).toBeDefined();
          expect(typeof retrieved!.cachedAt).toBe('string');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 10: Cache Key Format Validity', () => {
    it('should create cache keys matching expected format', () => {
      fc.assert(
        fc.property(
          cityTierArb,
          businessTypeArb,
          fc.integer({ min: 0, max: 100 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 1, max: 1000 }),
          (cityTier, businessType, healthScore, margin, sampleSize) => {
            const segmentData: SegmentData = {
              segmentKey: `SEGMENT#${cityTier}#${businessType}`,
              medianHealthScore: healthScore,
              medianMargin: margin,
              sampleSize: sampleSize,
              lastUpdated: new Date().toISOString()
            };
            
            cacheManager.saveToCache(segmentData);
            
            // Check that the key follows the expected format
            const expectedKey = `vyapar_segment_${cityTier}_${businessType}`;
            const storedValue = localStorage.getItem(expectedKey);
            
            expect(storedValue).not.toBeNull();
            
            // Clean up
            localStorage.removeItem(expectedKey);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 11: Cache Timestamp Presence', () => {
    it('should always include valid cachedAt timestamp', () => {
      fc.assert(
        fc.property(segmentDataArb, (segmentData) => {
          cacheManager.saveToCache(segmentData);
          
          const parts = segmentData.segmentKey.split('#');
          const cityTier = parts[1] as CityTier;
          const businessType = parts[2] as BusinessType;
          
          const retrieved = cacheManager.getFromCache(cityTier, businessType);
          
          expect(retrieved).not.toBeNull();
          expect(retrieved!.cachedAt).toBeDefined();
          
          // Should be a valid ISO timestamp
          const cachedDate = new Date(retrieved!.cachedAt);
          expect(cachedDate.toString()).not.toBe('Invalid Date');
          
          // Should be recent (within last minute)
          const now = new Date();
          const timeDiff = now.getTime() - cachedDate.getTime();
          expect(timeDiff).toBeGreaterThanOrEqual(0);
          expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Property 12: Staleness Detection Accuracy', () => {
    it('should correctly identify stale data (> 7 days)', () => {
      fc.assert(
        fc.property(
          segmentDataArb,
          fc.integer({ min: 8, max: 365 }), // Days old (> 7)
          (segmentData, daysOld) => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - daysOld);
            
            const cachedData: CachedSegmentData = {
              ...segmentData,
              cachedAt: oldDate.toISOString()
            };
            
            const isStale = cacheManager.isCacheStale(cachedData);
            
            expect(isStale).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should correctly identify fresh data (<= 7 days)', () => {
      fc.assert(
        fc.property(
          segmentDataArb,
          fc.integer({ min: 0, max: 7 }), // Days old (<= 7)
          (segmentData, daysOld) => {
            const recentDate = new Date();
            recentDate.setDate(recentDate.getDate() - daysOld);
            
            const cachedData: CachedSegmentData = {
              ...segmentData,
              cachedAt: recentDate.toISOString()
            };
            
            const isStale = cacheManager.isCacheStale(cachedData);
            
            expect(isStale).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Cache isolation', () => {
    it('should not interfere with different segments', () => {
      fc.assert(
        fc.property(
          segmentDataArb,
          segmentDataArb,
          (segment1, segment2) => {
            // Ensure different segments
            fc.pre(segment1.segmentKey !== segment2.segmentKey);
            
            cacheManager.saveToCache(segment1);
            cacheManager.saveToCache(segment2);
            
            const parts1 = segment1.segmentKey.split('#');
            const cityTier1 = parts1[1] as CityTier;
            const businessType1 = parts1[2] as BusinessType;
            
            const parts2 = segment2.segmentKey.split('#');
            const cityTier2 = parts2[1] as CityTier;
            const businessType2 = parts2[2] as BusinessType;
            
            const retrieved1 = cacheManager.getFromCache(cityTier1, businessType1);
            const retrieved2 = cacheManager.getFromCache(cityTier2, businessType2);
            
            // Both should be retrieved correctly
            expect(retrieved1).not.toBeNull();
            expect(retrieved2).not.toBeNull();
            
            // Should not be mixed up
            expect(retrieved1!.segmentKey).toBe(segment1.segmentKey);
            expect(retrieved2!.segmentKey).toBe(segment2.segmentKey);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
