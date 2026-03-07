import { generateDemoSegmentData, loadDemoDataToCache } from '../demoSegmentData';
import { SegmentCacheManager } from '../segmentCacheManager';
import { CityTier, BusinessType } from '../types';

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

describe('Demo Segment Data Generator', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  describe('generateDemoSegmentData', () => {
    it('should generate data for all 15 segment combinations', () => {
      const demoData = generateDemoSegmentData();
      
      expect(demoData).toHaveLength(15); // 3 tiers × 5 types
    });
    
    it('should generate data for all city tiers', () => {
      const demoData = generateDemoSegmentData();
      const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
      
      cityTiers.forEach(tier => {
        const tierData = demoData.filter(d => d.segmentKey.includes(`#${tier}#`));
        expect(tierData.length).toBe(5); // 5 business types per tier
      });
    });
    
    it('should generate data for all business types', () => {
      const demoData = generateDemoSegmentData();
      const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
      
      businessTypes.forEach(type => {
        const typeData = demoData.filter(d => d.segmentKey.endsWith(`#${type}`));
        expect(typeData.length).toBe(3); // 3 tiers per business type
      });
    });
    
    it('should have medianHealthScore in range [40, 80]', () => {
      const demoData = generateDemoSegmentData();
      
      demoData.forEach(segment => {
        expect(segment.medianHealthScore).toBeGreaterThanOrEqual(40);
        expect(segment.medianHealthScore).toBeLessThanOrEqual(80);
      });
    });
    
    it('should have medianMargin in range [0.05, 0.30]', () => {
      const demoData = generateDemoSegmentData();
      
      demoData.forEach(segment => {
        expect(segment.medianMargin).toBeGreaterThanOrEqual(0.05);
        expect(segment.medianMargin).toBeLessThanOrEqual(0.30);
      });
    });
    
    it('should have sampleSize in range [50, 500]', () => {
      const demoData = generateDemoSegmentData();
      
      demoData.forEach(segment => {
        expect(segment.sampleSize).toBeGreaterThanOrEqual(50);
        expect(segment.sampleSize).toBeLessThanOrEqual(500);
      });
    });
    
    it('should have valid segment keys', () => {
      const demoData = generateDemoSegmentData();
      const pattern = /^SEGMENT#(tier1|tier2|tier3)#(kirana|salon|pharmacy|restaurant|other)$/;
      
      demoData.forEach(segment => {
        expect(segment.segmentKey).toMatch(pattern);
      });
    });
    
    it('should have valid ISO timestamps', () => {
      const demoData = generateDemoSegmentData();
      
      demoData.forEach(segment => {
        const date = new Date(segment.lastUpdated);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });
    
    it('should have higher health scores for tier1 than tier3', () => {
      const demoData = generateDemoSegmentData();
      
      const tier1Data = demoData.filter(d => d.segmentKey.includes('#tier1#'));
      const tier3Data = demoData.filter(d => d.segmentKey.includes('#tier3#'));
      
      const avgTier1Health = tier1Data.reduce((sum, d) => sum + d.medianHealthScore, 0) / tier1Data.length;
      const avgTier3Health = tier3Data.reduce((sum, d) => sum + d.medianHealthScore, 0) / tier3Data.length;
      
      expect(avgTier1Health).toBeGreaterThan(avgTier3Health);
    });
    
    it('should have higher sample sizes for tier1 than tier3', () => {
      const demoData = generateDemoSegmentData();
      
      const tier1Data = demoData.filter(d => d.segmentKey.includes('#tier1#'));
      const tier3Data = demoData.filter(d => d.segmentKey.includes('#tier3#'));
      
      const avgTier1Sample = tier1Data.reduce((sum, d) => sum + d.sampleSize, 0) / tier1Data.length;
      const avgTier3Sample = tier3Data.reduce((sum, d) => sum + d.sampleSize, 0) / tier3Data.length;
      
      expect(avgTier1Sample).toBeGreaterThan(avgTier3Sample);
    });
    
    it('should have consistent data across multiple calls', () => {
      const data1 = generateDemoSegmentData();
      const data2 = generateDemoSegmentData();
      
      expect(data1.length).toBe(data2.length);
      
      // Data should be deterministic (same values for same segments)
      data1.forEach((segment1, index) => {
        const segment2 = data2[index];
        expect(segment1.segmentKey).toBe(segment2.segmentKey);
        expect(segment1.medianHealthScore).toBe(segment2.medianHealthScore);
        expect(segment1.medianMargin).toBe(segment2.medianMargin);
        expect(segment1.sampleSize).toBe(segment2.sampleSize);
      });
    });
  });
  
  describe('loadDemoDataToCache', () => {
    it('should load all segments to cache', () => {
      loadDemoDataToCache();
      
      // Should have 15 cache entries
      expect(localStorage.length).toBe(15);
    });
    
    it('should cache data with correct keys', () => {
      loadDemoDataToCache();
      
      const cacheManager = new SegmentCacheManager();
      
      // Check a few specific segments
      const tier1Kirana = cacheManager.getFromCache('tier1', 'kirana');
      expect(tier1Kirana).not.toBeNull();
      expect(tier1Kirana!.segmentKey).toBe('SEGMENT#tier1#kirana');
      
      const tier2Salon = cacheManager.getFromCache('tier2', 'salon');
      expect(tier2Salon).not.toBeNull();
      expect(tier2Salon!.segmentKey).toBe('SEGMENT#tier2#salon');
      
      const tier3Pharmacy = cacheManager.getFromCache('tier3', 'pharmacy');
      expect(tier3Pharmacy).not.toBeNull();
      expect(tier3Pharmacy!.segmentKey).toBe('SEGMENT#tier3#pharmacy');
    });
    
    it('should cache data with cachedAt timestamp', () => {
      loadDemoDataToCache();
      
      const cacheManager = new SegmentCacheManager();
      const cached = cacheManager.getFromCache('tier1', 'kirana');
      
      expect(cached).not.toBeNull();
      expect(cached!.cachedAt).toBeDefined();
      
      const cachedDate = new Date(cached!.cachedAt);
      expect(cachedDate.toString()).not.toBe('Invalid Date');
    });
    
    it('should allow retrieval of all cached segments', () => {
      loadDemoDataToCache();
      
      const cacheManager = new SegmentCacheManager();
      const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
      const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
      
      let retrievedCount = 0;
      
      for (const tier of cityTiers) {
        for (const type of businessTypes) {
          const cached = cacheManager.getFromCache(tier, type);
          if (cached) {
            retrievedCount++;
          }
        }
      }
      
      expect(retrievedCount).toBe(15);
    });
  });
});
