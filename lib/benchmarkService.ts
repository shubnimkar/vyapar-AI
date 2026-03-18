import { SegmentCacheManager } from './segmentCacheManager';
import { SegmentStore } from './segmentStore';
import { SegmentData, UserProfile, UserMetrics, BenchmarkComparison, CityTier, BusinessType } from './types';
import { isValidCityTier, isValidBusinessType } from './finance/segmentKeyFormatter';
import { compareWithSegment } from './finance/compareWithSegment';
import { logger } from './logger';
import { seedDemoData } from './demoSegmentData';

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
  private seedingInProgress: boolean = false;
  
  constructor() {
    this.cacheManager = new SegmentCacheManager();
    this.segmentStore = new SegmentStore();
  }
  
  /**
   * Check if database is empty and auto-seeding should occur
   * 
   * Probes DynamoDB with tier1/kirana to determine if any segment data exists
   * Returns true only if database is completely empty
   * Returns false on errors to prevent seeding during error conditions
   * 
   * @returns true if database is empty and should be seeded, false otherwise
   */
  private async shouldAutoSeed(): Promise<boolean> {
    try {
      // Probe with tier1/kirana (most common segment)
      const probe = await this.segmentStore.getSegmentData('tier1', 'kirana');
      return probe === null; // Seed only if database is completely empty
    } catch (error) {
      logger.error('Error checking if auto-seed needed', { error });
      return false; // Don't seed on errors
    }
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
   * - Auto-seeds benchmark data if database is empty
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
    
    // Try DynamoDB (server-side always online, client-side checks navigator.onLine)
    // On server: typeof window === 'undefined' → always try DynamoDB
    // On client: check navigator.onLine
    const isServer = typeof window === 'undefined';
    const isOnline = isServer || (typeof navigator !== 'undefined' && navigator.onLine);
    
    logger.debug('Online check', { 
      isOnline,
      isServer,
      navigatorType: typeof navigator,
      navigatorOnLine: typeof navigator !== 'undefined' ? navigator.onLine : 'N/A',
      windowType: typeof window
    });
    
    if (isOnline) {
      try {
        let segmentData = await this.segmentStore.getSegmentData(cityTier, businessType);
        
        // If not found, check if database is empty and seed if needed
        if (!segmentData) {
          const shouldSeed = await this.shouldAutoSeed();
          
          if (shouldSeed && !this.seedingInProgress) {
            // Set guard to prevent concurrent seeding
            this.seedingInProgress = true;
            
            try {
              logger.info('No benchmark data found, auto-seeding all 20 segment combinations...');
              await seedDemoData();
              logger.info('Auto-seeding completed successfully');
              
              // Retry after seeding
              segmentData = await this.segmentStore.getSegmentData(cityTier, businessType);
            } catch (seedError) {
              logger.error('Auto-seeding failed', { error: seedError });
            } finally {
              // Clear guard after seeding attempt
              this.seedingInProgress = false;
            }
          } else if (this.seedingInProgress) {
            logger.debug('Seeding already in progress, skipping duplicate seed attempt');
          }
        }
        
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
