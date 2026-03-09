import { CachedSegmentData, SegmentData, CityTier, BusinessType } from './types';
import { parseSegmentKey } from './finance/segmentKeyFormatter';

/**
 * Manage segment data caching in localStorage
 * 
 * Follows offline-first architecture with 7-day TTL
 * Handles localStorage quota exceeded errors gracefully
 */
export class SegmentCacheManager {
  private readonly CACHE_KEY_PREFIX = 'vyapar_segment_';
  private readonly CACHE_DURATION_DAYS = 7;
  
  /**
   * Get cache key for segment
   */
  private getCacheKey(cityTier: CityTier, businessType: BusinessType): string {
    return `${this.CACHE_KEY_PREFIX}${cityTier}_${businessType}`;
  }
  
  /**
   * Save segment data to cache
   * 
   * Handles QuotaExceededError gracefully by logging warning
   * and continuing without caching
   * 
   * Skips caching on server-side (localStorage only available in browser)
   */
  saveToCache(segmentData: SegmentData): void {
    // Skip if running on server-side
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const parsed = parseSegmentKey(segmentData.segmentKey);
      if (!parsed) {
        console.error('Invalid segment key:', segmentData.segmentKey);
        return;
      }
      
      const cacheKey = this.getCacheKey(parsed.cityTier, parsed.businessType);
      const cachedData: CachedSegmentData = {
        ...segmentData,
        cachedAt: new Date().toISOString()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      // Handle QuotaExceededError gracefully
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, skipping cache save');
      } else {
        console.error('Failed to save segment data to cache:', error);
      }
    }
  }
  
  /**
   * Get segment data from cache
   * 
   * Returns null if cache miss or corrupted data
   * Returns null on server-side (localStorage only available in browser)
   */
  getFromCache(cityTier: CityTier, businessType: BusinessType): CachedSegmentData | null {
    // Return null if running on server-side
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const cacheKey = this.getCacheKey(cityTier, businessType);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }
      
      const parsed = JSON.parse(cached) as CachedSegmentData;
      
      // Validate required fields
      if (!parsed.segmentKey || !parsed.cachedAt || 
          typeof parsed.medianHealthScore !== 'number' ||
          typeof parsed.medianMargin !== 'number' ||
          typeof parsed.sampleSize !== 'number') {
        console.warn('Corrupted cache data, removing:', cacheKey);
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to get segment data from cache:', error);
      return null;
    }
  }
  
  /**
   * Check if cached data is stale (older than 7 days)
   */
  isCacheStale(cachedData: CachedSegmentData): boolean {
    try {
      const cachedDate = new Date(cachedData.cachedAt);
      
      // Check if date is invalid
      if (isNaN(cachedDate.getTime())) {
        return true;
      }
      
      const now = new Date();
      const daysDiff = (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      return daysDiff > this.CACHE_DURATION_DAYS;
    } catch (error) {
      console.error('Failed to check cache staleness:', error);
      return true; // Treat as stale if error
    }
  }
  
  /**
   * Clear all segment cache
   * 
   * Skips on server-side (localStorage only available in browser)
   */
  clearCache(): void {
    // Skip if running on server-side
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Get all keys first to avoid modification during iteration
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all segment cache keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear segment cache:', error);
    }
  }
}
