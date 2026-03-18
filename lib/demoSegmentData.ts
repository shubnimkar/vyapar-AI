import { SegmentData, CityTier, BusinessType } from './types';
import { formatSegmentKey } from './finance/segmentKeyFormatter';
import { SegmentStore } from './segmentStore';
import { SegmentCacheManager } from './segmentCacheManager';
import { logger } from './logger';

/**
 * Generate realistic demo segment data for all combinations
 * 
 * Creates data for all 20 segment combinations (4 tiers × 5 business types)
 * with realistic ranges based on city tier and business type
 * 
 * Follows requirements 5.1-5.4 from segment-benchmark spec
 */
export function generateDemoSegmentData(): SegmentData[] {
  const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3', 'rural'];
  const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
  
  const demoData: SegmentData[] = [];
  
  // Health score ranges by tier (metros have higher scores)
  const healthScoreRanges: Record<CityTier, [number, number]> = {
    tier1: [60, 80],
    tier2: [50, 70],
    tier3: [40, 60],
    rural: [35, 55]
  };
  
  // Margin ranges by business type
  const marginRanges: Record<BusinessType, [number, number]> = {
    kirana: [0.15, 0.25],
    salon: [0.20, 0.30],
    pharmacy: [0.10, 0.20],
    restaurant: [0.05, 0.15],
    other: [0.10, 0.25]
  };
  
  // Sample size ranges by tier
  const sampleSizeRanges: Record<CityTier, [number, number]> = {
    tier1: [200, 500],
    tier2: [100, 300],
    tier3: [50, 150],
    rural: [30, 100]
  };
  
  for (const tier of cityTiers) {
    for (const type of businessTypes) {
      const segmentKey = formatSegmentKey(tier, type);
      
      // Generate realistic values within ranges (use midpoint for consistency)
      const [minHealth, maxHealth] = healthScoreRanges[tier];
      const medianHealthScore = Math.floor(minHealth + (maxHealth - minHealth) * 0.5);
      
      const [minMargin, maxMargin] = marginRanges[type];
      const medianMargin = Number((minMargin + (maxMargin - minMargin) * 0.5).toFixed(3));
      
      const [minSample, maxSample] = sampleSizeRanges[tier];
      const sampleSize = Math.floor(minSample + (maxSample - minSample) * 0.6);
      
      demoData.push({
        segmentKey,
        medianHealthScore,
        medianMargin,
        sampleSize,
        lastUpdated: new Date().toISOString()
      });
    }
  }
  
  return demoData;
}

/**
 * Seed demo data to DynamoDB (for development/demo)
 * 
 * Saves all 20 segment combinations to DynamoDB
 * Logs progress and errors for visibility
 */
export async function seedDemoData(): Promise<void> {
  const segmentStore = new SegmentStore();
  const demoData = generateDemoSegmentData();
  
  logger.info(`Seeding ${demoData.length} demo segment records...`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const segment of demoData) {
    const success = await segmentStore.saveSegmentData(segment);
    if (success) {
      logger.debug(`✓ Seeded ${segment.segmentKey}`);
      successCount++;
    } else {
      logger.error(`✗ Failed to seed ${segment.segmentKey}`);
      failureCount++;
    }
  }
  
  logger.info(`Demo data seeding complete: ${successCount} succeeded, ${failureCount} failed`);
}

/**
 * Load demo data to cache (for offline demo)
 * 
 * Loads all demo segments to localStorage cache
 * Enables offline benchmark comparison during demos
 */
export function loadDemoDataToCache(): void {
  const cacheManager = new SegmentCacheManager();
  const demoData = generateDemoSegmentData();
  
  demoData.forEach(segment => {
    cacheManager.saveToCache(segment);
  });
  
  logger.info(`Loaded ${demoData.length} demo segments to cache`);
}
