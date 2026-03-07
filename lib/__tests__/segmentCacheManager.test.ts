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

describe('SegmentCacheManager', () => {
  let cacheManager: SegmentCacheManager;
  
  beforeEach(() => {
    cacheManager = new SegmentCacheManager();
    localStorage.clear();
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  describe('saveToCache and getFromCache', () => {
    it('should save and retrieve segment data (cache hit)', () => {
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      cacheManager.saveToCache(segmentData);
      
      const retrieved = cacheManager.getFromCache('tier1', 'kirana');
      
      expect(retrieved).not.toBeNull();
      expect(retrieved!.segmentKey).toBe(segmentData.segmentKey);
      expect(retrieved!.medianHealthScore).toBe(segmentData.medianHealthScore);
      expect(retrieved!.medianMargin).toBe(segmentData.medianMargin);
      expect(retrieved!.sampleSize).toBe(segmentData.sampleSize);
      expect(retrieved!.lastUpdated).toBe(segmentData.lastUpdated);
      expect(retrieved!.cachedAt).toBeDefined();
    });
    
    it('should return null for cache miss', () => {
      const retrieved = cacheManager.getFromCache('tier2', 'salon');
      
      expect(retrieved).toBeNull();
    });
    
    it('should handle corrupted cache data', () => {
      // Manually insert corrupted data
      localStorage.setItem('vyapar_segment_tier1_kirana', 'invalid json');
      
      const retrieved = cacheManager.getFromCache('tier1', 'kirana');
      
      expect(retrieved).toBeNull();
    });
    
    it('should handle incomplete cache data', () => {
      // Manually insert incomplete data (missing required fields)
      const incomplete = {
        segmentKey: 'SEGMENT#tier1#kirana',
        cachedAt: new Date().toISOString()
        // Missing medianHealthScore, medianMargin, sampleSize
      };
      localStorage.setItem('vyapar_segment_tier1_kirana', JSON.stringify(incomplete));
      
      const retrieved = cacheManager.getFromCache('tier1', 'kirana');
      
      expect(retrieved).toBeNull();
      // Should also remove corrupted data
      expect(localStorage.getItem('vyapar_segment_tier1_kirana')).toBeNull();
    });
    
    it('should not save data with invalid segment key', () => {
      const invalidData: SegmentData = {
        segmentKey: 'INVALID_KEY',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      cacheManager.saveToCache(invalidData);
      
      // Should not be saved
      expect(localStorage.length).toBe(0);
    });
  });
  
  describe('isCacheStale', () => {
    it('should return false for fresh data (< 7 days)', () => {
      const cachedData: CachedSegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z',
        cachedAt: new Date().toISOString() // Just cached
      };
      
      const isStale = cacheManager.isCacheStale(cachedData);
      
      expect(isStale).toBe(false);
    });
    
    it('should return true for stale data (> 7 days)', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      const cachedData: CachedSegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z',
        cachedAt: eightDaysAgo.toISOString()
      };
      
      const isStale = cacheManager.isCacheStale(cachedData);
      
      expect(isStale).toBe(true);
    });
    
    it('should return false for data exactly 7 days old (boundary)', () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const cachedData: CachedSegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z',
        cachedAt: sevenDaysAgo.toISOString()
      };
      
      const isStale = cacheManager.isCacheStale(cachedData);
      
      expect(isStale).toBe(false);
    });
    
    it('should return true for invalid timestamp', () => {
      const cachedData: CachedSegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z',
        cachedAt: 'invalid-timestamp'
      };
      
      const isStale = cacheManager.isCacheStale(cachedData);
      
      expect(isStale).toBe(true);
    });
  });
  
  describe('clearCache', () => {
    it('should clear all segment cache entries', () => {
      // Save multiple segments
      const segments: SegmentData[] = [
        {
          segmentKey: 'SEGMENT#tier1#kirana',
          medianHealthScore: 70,
          medianMargin: 0.20,
          sampleSize: 350,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        {
          segmentKey: 'SEGMENT#tier2#salon',
          medianHealthScore: 60,
          medianMargin: 0.25,
          sampleSize: 200,
          lastUpdated: '2024-01-15T10:00:00Z'
        }
      ];
      
      segments.forEach(seg => cacheManager.saveToCache(seg));
      
      // Add non-segment data to ensure it's not cleared
      localStorage.setItem('other_data', 'should_remain');
      
      expect(localStorage.length).toBe(3);
      
      cacheManager.clearCache();
      
      // Only segment cache should be cleared
      expect(localStorage.getItem('vyapar_segment_tier1_kirana')).toBeNull();
      expect(localStorage.getItem('vyapar_segment_tier2_salon')).toBeNull();
      expect(localStorage.getItem('other_data')).toBe('should_remain');
    });
    
    it('should handle empty cache', () => {
      expect(() => cacheManager.clearCache()).not.toThrow();
    });
  });
  
  describe('cache key format', () => {
    it('should use correct cache key format', () => {
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      cacheManager.saveToCache(segmentData);
      
      // Check that the key follows the expected format
      const expectedKey = 'vyapar_segment_tier1_kirana';
      expect(localStorage.getItem(expectedKey)).not.toBeNull();
    });
    
    it('should create unique keys for different segments', () => {
      const segments: SegmentData[] = [
        {
          segmentKey: 'SEGMENT#tier1#kirana',
          medianHealthScore: 70,
          medianMargin: 0.20,
          sampleSize: 350,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        {
          segmentKey: 'SEGMENT#tier1#salon',
          medianHealthScore: 65,
          medianMargin: 0.25,
          sampleSize: 300,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        {
          segmentKey: 'SEGMENT#tier2#kirana',
          medianHealthScore: 60,
          medianMargin: 0.18,
          sampleSize: 200,
          lastUpdated: '2024-01-15T10:00:00Z'
        }
      ];
      
      segments.forEach(seg => cacheManager.saveToCache(seg));
      
      // All should be stored with unique keys
      expect(localStorage.getItem('vyapar_segment_tier1_kirana')).not.toBeNull();
      expect(localStorage.getItem('vyapar_segment_tier1_salon')).not.toBeNull();
      expect(localStorage.getItem('vyapar_segment_tier2_kirana')).not.toBeNull();
    });
  });
  
  describe('quota exceeded handling', () => {
    it('should handle QuotaExceededError gracefully', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        // Create DOMException with proper name parameter
        const error = new DOMException('QuotaExceededError', 'QuotaExceededError');
        throw error;
      });
      
      const segmentData: SegmentData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 350,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      // Should not throw
      expect(() => cacheManager.saveToCache(segmentData)).not.toThrow();
      
      // Restore original
      localStorageMock.setItem = originalSetItem;
    });
  });
});
