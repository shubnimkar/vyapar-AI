import { SegmentCacheManager } from './segmentCacheManager';
import { SegmentStore } from './segmentStore';
import { SegmentData, UserProfile, UserMetrics, BenchmarkComparison, CityTier, BusinessType } from './types';
import { isValidCityTier, isValidBusinessType } from './finance/segmentKeyFormatter';
import { compareWithSegment } from './finance/compareWithSegment';
import { logger } from './logger';

/**
 * Orchestrate benchmark comparison workflow
 * 
 * Implements cache-first data retrieval strategy:
 * 1. Check localStorage cache first
 * 2. If cache miss or stale, fetch from DynamoDB (when online)
 * 3. Update cache with fresh data
 * 4. Fall back to stale cache if offline
 * 
 * Follows requirements 3.1-3.7, 7.1-7.4 from segment-benchmark spec
 */
export class BenchmarkService {
  private cacheManager: SegmentCacheManager;
  private segmentStore: SegmentStore;
  
  constructor() {
    this.cacheManager = new SegmentCacheManager();
    this.segmentStore = new SegmentStore();
  }
  
  /**
   * Get user's segment from profile
   * 
   * Validates profile completeness and field values
   * Returns null if profile is incomplete or invalid
   * 
   * @param userProfile - User profile with city_tier and business_type
   * @returns Segment identifiers or null if invalid
   */
  getUserSegment(userProfile: UserProfile): { cityTier: CityTier; businessType: BusinessType } | null {
    // Validate profile completeness
    if (!userProfile.city_tier || !userProfile.business_type) {
      logger.debug('Profile incomplete: missing city_tier or business_type');
      return null;
    }
    
    // Validate values
    if (!isValidCityTier(userProfile.city_tier) || !isValidBusinessType(userProfile.business_type)) {
      logger.warn('Invalid profile values', { 
        city_tier: userProfile.city_tier, 
        business_type: userProfile.business_type 
      });
      return null;
    }
    
    return {
      cityTier: userProfile.city_tier as CityTier,
      businessType: userProfile.business_type as BusinessType
    };
  }
  
  /**
   * Get segment data (cache-first, then DynamoDB)
   * 
   * Implements offline-first strategy:
   * - Returns fresh cache if available and not stale
   * - Fetches from DynamoDB if online and cache miss/stale
   * - Updates cache with fresh data
   * - Falls back to stale cache if offline
   * 
   * @param cityTier - City tier classification
   * @param businessType - Business category
   * @returns Segment data or null if unavailable
   */
  async getSegmentData(
    cityTier: CityTier,
    businessType: BusinessType
  ): Promise<SegmentData | null> {
    // Try cache first
    const cached = this.cacheManager.getFromCache(cityTier, businessType);
    
    if (cached && !this.cacheManager.isCacheStale(cached)) {
      logger.debug('Segment data retrieved from cache', { cityTier, businessType });
      return cached;
    }
    
    // Try DynamoDB if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const segmentData = await this.segmentStore.getSegmentData(cityTier, businessType);
        
        if (segmentData) {
          // Update cache with fresh data
          this.cacheManager.saveToCache(segmentData);
          logger.debug('Segment data retrieved from DynamoDB and cached', { cityTier, businessType });
          return segmentData;
        }
      } catch (error) {
        logger.error('Failed to fetch segment data from DynamoDB', { error, cityTier, businessType });
      }
    } else {
      logger.debug('Offline mode: skipping DynamoDB fetch');
    }
    
    // Return stale cache if available (offline fallback)
    if (cached) {
      logger.debug('Using stale cache data (offline fallback)', { cityTier, businessType });
      return cached;
    }
    
    logger.warn('No segment data available', { cityTier, businessType });
    return null;
  }
  
  /**
   * Get benchmark comparison for user
   * 
   * Orchestrates complete workflow:
   * 1. Extract segment from user profile
   * 2. Retrieve segment data (cache-first)
   * 3. Compare user metrics with segment medians
   * 
   * @param userProfile - User profile with segment fields
   * @param userMetrics - User's health score and profit margin
   * @returns Complete benchmark comparison or null if unavailable
   */
  async getBenchmarkComparison(
    userProfile: UserProfile,
    userMetrics: UserMetrics
  ): Promise<BenchmarkComparison | null> {
    // Get user's segment
    const segment = this.getUserSegment(userProfile);
    
    if (!segment) {
      logger.debug('Cannot get benchmark: profile incomplete or invalid');
      return null;
    }
    
    // Get segment data
    const segmentData = await this.getSegmentData(segment.cityTier, segment.businessType);
    
    if (!segmentData) {
      logger.debug('Cannot get benchmark: segment data unavailable');
      return null;
    }
    
    // Compare with segment
    const comparison = compareWithSegment(userMetrics, segmentData);
    
    logger.debug('Benchmark comparison completed', { 
      cityTier: segment.cityTier, 
      businessType: segment.businessType,
      healthCategory: comparison.healthScoreComparison.category,
      marginCategory: comparison.marginComparison.category
    });
    
    return comparison;
  }
}
