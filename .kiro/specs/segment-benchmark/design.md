# Design Document: Segment Benchmark

## Overview

The Segment Benchmark feature enables shop owners to compare their financial performance metrics (health score and profit margin) against similar businesses in their segment. A segment is defined by city tier and business type. This feature follows the Hybrid Intelligence Principle: all comparison logic is deterministic and offline-capable, while AI provides persona-aware explanations of the comparison results.

### Key Design Principles

1. **Deterministic Core**: All comparison calculations are pure TypeScript functions with no AI involvement
2. **Offline-First**: Comparison works entirely from cached segment data when offline
3. **Social Proof**: Provides motivation through peer comparison to drive daily engagement
4. **Multi-Language**: Full support for English, Hindi, and Marathi
5. **Transparent**: Shows sample size and data freshness for user confidence

### Feature Scope

**Segment Definition**: Businesses are grouped by:
- City Tier: tier1 (metros), tier2 (mid-size cities), tier3 (small towns)
- Business Type: kirana, salon, pharmacy, restaurant, other

**Comparison Metrics**:
- Health Score (0-100)
- Profit Margin (decimal, e.g., 0.25 = 25%)

**Comparison Output**:
- Percentile rank (0-100, where 50 = median)
- Category: above_average (>60), at_average (40-60), below_average (<40)
- Visual indicators (colors, icons)

### Architecture Position

```
┌─────────────────────────────────────────────────────────────┐
│                        Dashboard UI                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Benchmark Display Component                         │  │
│  │  - Health Score Comparison                           │  │
│  │  - Profit Margin Comparison                          │  │
│  │  - Visual Indicators                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Benchmark Service Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  getUserSegment()                                    │  │
│  │  getSegmentData()                                    │  │
│  │  compareWithSegment()                                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│  Comparison Engine   │      │  Segment Data Manager        │
│  (Pure Functions)    │      │  - Cache Manager             │
│                      │      │  - DynamoDB Client           │
│  - calculatePercent  │      │  - Sync Service              │
│    ile()             │      │                              │
│  - categorizePerform │      │                              │
│    ance()            │      │                              │
│  - formatSegmentKey  │      │                              │
│    ()                │      │                              │
└──────────────────────┘      └──────────┬───────────────────┘
                                         │
                        ┌────────────────┴────────────────┐
                        ▼                                 ▼
                ┌───────────────┐              ┌────────────────┐
                │  localStorage │              │   DynamoDB     │
                │  (Offline)    │◄────────────►│   (Online)     │
                └───────────────┘     Sync     └────────────────┘
```


## Architecture

### System Components

The segment benchmark feature consists of four main layers:

1. **Deterministic Core Layer** (`/lib/finance/`):
   - Pure comparison functions
   - Percentile calculation
   - Category assignment
   - Segment key formatting

2. **Data Management Layer** (`/lib/`):
   - Segment data cache (localStorage)
   - DynamoDB segment store
   - Sync manager for online/offline coordination

3. **Service Layer** (`/lib/`):
   - User segment determination
   - Segment data retrieval
   - Comparison orchestration

4. **UI Layer** (`/components/`):
   - Benchmark display component
   - Visual indicators
   - Localized labels

### Data Flow

```
User Profile (city_tier, business_type)
    ↓
Determine Segment Key
    ↓
Retrieve Segment Data (cache-first, then DynamoDB)
    ↓
Calculate User Metrics (health score, margin)
    ↓
Compare with Segment Medians (pure function)
    ↓
Display Results (with visual indicators)
    ↓
Optional: AI Explanation (persona-aware)
```


## Components and Interfaces

### Core Calculation Functions

#### Segment Key Formatter

**Location**: `/lib/finance/segmentKeyFormatter.ts`

```typescript
/**
 * Valid city tier values
 */
export type CityTier = 'tier1' | 'tier2' | 'tier3';

/**
 * Valid business type values
 */
export type BusinessType = 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other';

/**
 * Format segment key from city tier and business type
 * 
 * Pure function - deterministic output
 * 
 * @param cityTier - City tier classification
 * @param businessType - Business category
 * @returns Formatted segment key
 */
export function formatSegmentKey(
  cityTier: CityTier,
  businessType: BusinessType
): string {
  return `SEGMENT#${cityTier}#${businessType}`;
}

/**
 * Parse segment key into components
 * 
 * @param segmentKey - Formatted segment key
 * @returns Parsed components or null if invalid
 */
export function parseSegmentKey(
  segmentKey: string
): { cityTier: CityTier; businessType: BusinessType } | null {
  const parts = segmentKey.split('#');
  
  if (parts.length !== 3 || parts[0] !== 'SEGMENT') {
    return null;
  }
  
  const cityTier = parts[1] as CityTier;
  const businessType = parts[2] as BusinessType;
  
  if (!isValidCityTier(cityTier) || !isValidBusinessType(businessType)) {
    return null;
  }
  
  return { cityTier, businessType };
}

/**
 * Validate city tier value
 */
export function isValidCityTier(value: string): value is CityTier {
  return ['tier1', 'tier2', 'tier3'].includes(value);
}

/**
 * Validate business type value
 */
export function isValidBusinessType(value: string): value is BusinessType {
  return ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'].includes(value);
}
```

#### Percentile Calculator

**Location**: `/lib/finance/calculatePercentile.ts`

```typescript
/**
 * Calculate percentile rank of user score relative to segment median
 * 
 * Pure function - no side effects, deterministic output
 * 
 * Uses simplified percentile calculation:
 * - If user_score > median: percentile = 50 + ((user_score - median) / (100 - median)) * 50
 * - If user_score < median: percentile = (user_score / median) * 50
 * - If user_score == median: percentile = 50
 * 
 * @param userScore - User's metric value (0-100 for health score, 0-1 for margin)
 * @param segmentMedian - Segment's median value
 * @returns Percentile rank (0-100)
 */
export function calculatePercentile(
  userScore: number,
  segmentMedian: number
): number {
  // Handle edge cases
  if (isNaN(userScore) || isNaN(segmentMedian)) {
    return 50; // Default to median if invalid input
  }
  
  if (segmentMedian === 0) {
    return userScore > 0 ? 100 : 50;
  }
  
  // Equal to median
  if (userScore === segmentMedian) {
    return 50;
  }
  
  // Above median
  if (userScore > segmentMedian) {
    const maxValue = 100; // Assuming health score scale
    const range = maxValue - segmentMedian;
    if (range === 0) return 100;
    
    const percentile = 50 + ((userScore - segmentMedian) / range) * 50;
    return Math.min(100, Math.max(50, percentile));
  }
  
  // Below median
  const percentile = (userScore / segmentMedian) * 50;
  return Math.max(0, Math.min(50, percentile));
}
```

#### Performance Categorizer

**Location**: `/lib/finance/categorizePerformance.ts`

```typescript
/**
 * Performance category classification
 */
export type ComparisonCategory = 'above_average' | 'at_average' | 'below_average';

/**
 * Categorize performance based on percentile rank
 * 
 * Pure function - deterministic output
 * 
 * Categories:
 * - above_average: percentile > 60
 * - at_average: percentile 40-60 (inclusive)
 * - below_average: percentile < 40
 * 
 * @param percentile - Percentile rank (0-100)
 * @returns Performance category
 */
export function categorizePerformance(percentile: number): ComparisonCategory {
  if (percentile > 60) {
    return 'above_average';
  }
  
  if (percentile >= 40) {
    return 'at_average';
  }
  
  return 'below_average';
}

/**
 * Get visual indicator configuration for category
 */
export interface VisualIndicator {
  color: 'green' | 'yellow' | 'red';
  icon: string;
  bgColor: string;
  borderColor: string;
}

export function getVisualIndicator(category: ComparisonCategory): VisualIndicator {
  const indicators: Record<ComparisonCategory, VisualIndicator> = {
    above_average: {
      color: 'green',
      icon: '📈',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    at_average: {
      color: 'yellow',
      icon: '➡️',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500'
    },
    below_average: {
      color: 'red',
      icon: '📉',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500'
    }
  };
  
  return indicators[category];
}
```

#### Comparison Engine

**Location**: `/lib/finance/compareWithSegment.ts`

```typescript
/**
 * User metrics for comparison
 */
export interface UserMetrics {
  healthScore: number;    // 0-100
  profitMargin: number;   // 0-1 (e.g., 0.25 = 25%)
}

/**
 * Segment aggregate statistics
 */
export interface SegmentData {
  segmentKey: string;
  medianHealthScore: number;  // 0-100
  medianMargin: number;        // 0-1
  sampleSize: number;
  lastUpdated: string;         // ISO timestamp
}

/**
 * Comparison result for a single metric
 */
export interface MetricComparison {
  userValue: number;
  segmentMedian: number;
  percentile: number;
  category: ComparisonCategory;
}

/**
 * Complete benchmark comparison result
 */
export interface BenchmarkComparison {
  healthScoreComparison: MetricComparison;
  marginComparison: MetricComparison;
  segmentInfo: {
    segmentKey: string;
    sampleSize: number;
    lastUpdated: string;
  };
  calculatedAt: string;
}

/**
 * Compare user metrics with segment data
 * 
 * Pure function - no side effects, deterministic output
 * 
 * @param userMetrics - User's health score and profit margin
 * @param segmentData - Segment aggregate statistics
 * @returns Complete benchmark comparison
 */
export function compareWithSegment(
  userMetrics: UserMetrics,
  segmentData: SegmentData
): BenchmarkComparison {
  // Calculate health score comparison
  const healthPercentile = calculatePercentile(
    userMetrics.healthScore,
    segmentData.medianHealthScore
  );
  const healthCategory = categorizePerformance(healthPercentile);
  
  // Calculate margin comparison (scale margin to 0-100 for percentile calculation)
  const marginPercentile = calculatePercentile(
    userMetrics.profitMargin * 100,
    segmentData.medianMargin * 100
  );
  const marginCategory = categorizePerformance(marginPercentile);
  
  return {
    healthScoreComparison: {
      userValue: userMetrics.healthScore,
      segmentMedian: segmentData.medianHealthScore,
      percentile: healthPercentile,
      category: healthCategory
    },
    marginComparison: {
      userValue: userMetrics.profitMargin,
      segmentMedian: segmentData.medianMargin,
      percentile: marginPercentile,
      category: marginCategory
    },
    segmentInfo: {
      segmentKey: segmentData.segmentKey,
      sampleSize: segmentData.sampleSize,
      lastUpdated: segmentData.lastUpdated
    },
    calculatedAt: new Date().toISOString()
  };
}
```


### Data Management Components

#### Segment Cache Manager

**Location**: `/lib/segmentCacheManager.ts`

```typescript
/**
 * Cached segment data with metadata
 */
export interface CachedSegmentData extends SegmentData {
  cachedAt: string;  // ISO timestamp
}

/**
 * Manage segment data caching in localStorage
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
   */
  saveToCache(segmentData: SegmentData): void {
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
      console.error('Failed to save segment data to cache:', error);
    }
  }
  
  /**
   * Get segment data from cache
   */
  getFromCache(cityTier: CityTier, businessType: BusinessType): CachedSegmentData | null {
    try {
      const cacheKey = this.getCacheKey(cityTier, businessType);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }
      
      return JSON.parse(cached) as CachedSegmentData;
    } catch (error) {
      console.error('Failed to get segment data from cache:', error);
      return null;
    }
  }
  
  /**
   * Check if cached data is stale (older than 7 days)
   */
  isCacheStale(cachedData: CachedSegmentData): boolean {
    const cachedDate = new Date(cachedData.cachedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff > this.CACHE_DURATION_DAYS;
  }
  
  /**
   * Clear all segment cache
   */
  clearCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear segment cache:', error);
    }
  }
}
```


#### DynamoDB Segment Store

**Location**: `/lib/segmentStore.ts`

```typescript
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

/**
 * DynamoDB client for segment data operations
 */
export class SegmentStore {
  private client: DynamoDBClient;
  private tableName: string;
  
  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai-data';
  }
  
  /**
   * Get segment data from DynamoDB
   */
  async getSegmentData(
    cityTier: CityTier,
    businessType: BusinessType
  ): Promise<SegmentData | null> {
    try {
      const segmentKey = formatSegmentKey(cityTier, businessType);
      
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          PK: segmentKey,
          SK: 'METADATA'
        })
      });
      
      const response = await this.client.send(command);
      
      if (!response.Item) {
        return null;
      }
      
      const item = unmarshall(response.Item);
      
      return {
        segmentKey: item.PK,
        medianHealthScore: item.medianHealthScore,
        medianMargin: item.medianMargin,
        sampleSize: item.sampleSize,
        lastUpdated: item.lastUpdated
      };
    } catch (error) {
      console.error('Failed to get segment data from DynamoDB:', error);
      return null;
    }
  }
  
  /**
   * Save segment data to DynamoDB
   */
  async saveSegmentData(segmentData: SegmentData): Promise<boolean> {
    try {
      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: marshall({
          PK: segmentData.segmentKey,
          SK: 'METADATA',
          entityType: 'SEGMENT',
          medianHealthScore: segmentData.medianHealthScore,
          medianMargin: segmentData.medianMargin,
          sampleSize: segmentData.sampleSize,
          lastUpdated: segmentData.lastUpdated,
          updatedAt: new Date().toISOString()
        })
      });
      
      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('Failed to save segment data to DynamoDB:', error);
      return false;
    }
  }
}
```


### Service Layer Components

#### Benchmark Service

**Location**: `/lib/benchmarkService.ts`

```typescript
/**
 * Orchestrate benchmark comparison workflow
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
   */
  getUserSegment(userProfile: UserProfile): { cityTier: CityTier; businessType: BusinessType } | null {
    // Validate profile completeness
    if (!userProfile.city_tier || !userProfile.business_type) {
      return null;
    }
    
    // Validate values
    if (!isValidCityTier(userProfile.city_tier) || !isValidBusinessType(userProfile.business_type)) {
      return null;
    }
    
    return {
      cityTier: userProfile.city_tier as CityTier,
      businessType: userProfile.business_type as BusinessType
    };
  }
  
  /**
   * Get segment data (cache-first, then DynamoDB)
   */
  async getSegmentData(
    cityTier: CityTier,
    businessType: BusinessType
  ): Promise<SegmentData | null> {
    // Try cache first
    const cached = this.cacheManager.getFromCache(cityTier, businessType);
    
    if (cached && !this.cacheManager.isCacheStale(cached)) {
      return cached;
    }
    
    // Try DynamoDB if online
    if (navigator.onLine) {
      try {
        const segmentData = await this.segmentStore.getSegmentData(cityTier, businessType);
        
        if (segmentData) {
          // Update cache
          this.cacheManager.saveToCache(segmentData);
          return segmentData;
        }
      } catch (error) {
        console.error('Failed to fetch segment data from DynamoDB:', error);
      }
    }
    
    // Return stale cache if available
    if (cached) {
      return cached;
    }
    
    return null;
  }
  
  /**
   * Get benchmark comparison for user
   */
  async getBenchmarkComparison(
    userProfile: UserProfile,
    userMetrics: UserMetrics
  ): Promise<BenchmarkComparison | null> {
    // Get user's segment
    const segment = this.getUserSegment(userProfile);
    
    if (!segment) {
      return null;
    }
    
    // Get segment data
    const segmentData = await this.getSegmentData(segment.cityTier, segment.businessType);
    
    if (!segmentData) {
      return null;
    }
    
    // Compare with segment
    return compareWithSegment(userMetrics, segmentData);
  }
}
```


### Demo Data

#### Demo Segment Data Generator

**Location**: `/lib/demoSegmentData.ts`

```typescript
/**
 * Generate realistic demo segment data for all combinations
 */
export function generateDemoSegmentData(): SegmentData[] {
  const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
  const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
  
  const demoData: SegmentData[] = [];
  
  // Health score ranges by tier (metros have higher scores)
  const healthScoreRanges: Record<CityTier, [number, number]> = {
    tier1: [60, 80],
    tier2: [50, 70],
    tier3: [40, 60]
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
    tier3: [50, 150]
  };
  
  for (const tier of cityTiers) {
    for (const type of businessTypes) {
      const segmentKey = formatSegmentKey(tier, type);
      
      // Generate realistic values within ranges
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
 */
export async function seedDemoData(): Promise<void> {
  const segmentStore = new SegmentStore();
  const demoData = generateDemoSegmentData();
  
  console.log(`Seeding ${demoData.length} demo segment records...`);
  
  for (const segment of demoData) {
    const success = await segmentStore.saveSegmentData(segment);
    if (success) {
      console.log(`✓ Seeded ${segment.segmentKey}`);
    } else {
      console.error(`✗ Failed to seed ${segment.segmentKey}`);
    }
  }
  
  console.log('Demo data seeding complete');
}

/**
 * Load demo data to cache (for offline demo)
 */
export function loadDemoDataToCache(): void {
  const cacheManager = new SegmentCacheManager();
  const demoData = generateDemoSegmentData();
  
  demoData.forEach(segment => {
    cacheManager.saveToCache(segment);
  });
  
  console.log(`Loaded ${demoData.length} demo segments to cache`);
}
```


## Data Models

### TypeScript Interfaces

**Location**: `/lib/types.ts` (additions)

```typescript
// ============================================
// Segment Benchmark Types
// ============================================

/**
 * City tier classification
 */
export type CityTier = 'tier1' | 'tier2' | 'tier3';

/**
 * Business type classification
 */
export type BusinessType = 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other';

/**
 * Performance comparison category
 */
export type ComparisonCategory = 'above_average' | 'at_average' | 'below_average';

/**
 * Segment aggregate statistics
 */
export interface SegmentData {
  segmentKey: string;           // Format: SEGMENT#{tier}#{type}
  medianHealthScore: number;    // 0-100
  medianMargin: number;         // 0-1 (e.g., 0.25 = 25%)
  sampleSize: number;           // Number of businesses in segment
  lastUpdated: string;          // ISO timestamp
}

/**
 * Cached segment data with cache metadata
 */
export interface CachedSegmentData extends SegmentData {
  cachedAt: string;             // ISO timestamp
}

/**
 * User metrics for comparison
 */
export interface UserMetrics {
  healthScore: number;          // 0-100
  profitMargin: number;         // 0-1
}

/**
 * Comparison result for a single metric
 */
export interface MetricComparison {
  userValue: number;
  segmentMedian: number;
  percentile: number;           // 0-100
  category: ComparisonCategory;
}

/**
 * Complete benchmark comparison result
 */
export interface BenchmarkComparison {
  healthScoreComparison: MetricComparison;
  marginComparison: MetricComparison;
  segmentInfo: {
    segmentKey: string;
    sampleSize: number;
    lastUpdated: string;
  };
  calculatedAt: string;
}

/**
 * Visual indicator configuration
 */
export interface VisualIndicator {
  color: 'green' | 'yellow' | 'red';
  icon: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Extended user profile with segment fields
 */
export interface UserProfile {
  // ... existing fields ...
  city_tier?: CityTier;
  business_type?: BusinessType;
}
```


### DynamoDB Schema

**Table Name**: `vyapar-ai-data` (single-table design)

#### Segment Statistics Items

```typescript
// Partition Key: PK = SEGMENT#{city_tier}#{business_type}
// Sort Key: SK = METADATA

{
  PK: "SEGMENT#tier1#kirana",
  SK: "METADATA",
  
  // Entity metadata
  entityType: "SEGMENT",
  
  // Segment statistics
  medianHealthScore: 70,
  medianMargin: 0.20,
  sampleSize: 350,
  
  // Timestamps
  lastUpdated: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z"
}
```

#### Query Patterns

```typescript
// Get segment data
PK = SEGMENT#{city_tier}#{business_type}
SK = METADATA

// Example: Get tier1 kirana segment
PK = SEGMENT#tier1#kirana
SK = METADATA
```


### localStorage Schema

**Key Pattern**: `vyapar_segment_{city_tier}_{business_type}`

**Data Structure**:

```typescript
// Example: vyapar_segment_tier1_kirana
{
  segmentKey: "SEGMENT#tier1#kirana",
  medianHealthScore: 70,
  medianMargin: 0.20,
  sampleSize: 350,
  lastUpdated: "2024-01-15T10:00:00Z",
  cachedAt: "2024-01-15T10:30:00Z"
}
```

**Storage Management**:
- Each segment cached independently
- Cache duration: 7 days
- Stale data still usable if offline
- Cache cleared on user logout


## UI Components

### Benchmark Display Component

**Location**: `/components/BenchmarkDisplay.tsx`

```typescript
import { useTranslation } from '@/lib/translations';
import { getVisualIndicator } from '@/lib/finance/categorizePerformance';

interface BenchmarkDisplayProps {
  comparison: BenchmarkComparison | null;
  language: Language;
  isLoading: boolean;
  error?: string;
}

export function BenchmarkDisplay({ 
  comparison, 
  language, 
  isLoading, 
  error 
}: BenchmarkDisplayProps) {
  const { t } = useTranslation(language);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <p className="text-sm text-yellow-700">{error}</p>
      </div>
    );
  }
  
  // No data state
  if (!comparison) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-700">
          {t('benchmark.noData')}
        </p>
      </div>
    );
  }
  
  const healthIndicator = getVisualIndicator(comparison.healthScoreComparison.category);
  const marginIndicator = getVisualIndicator(comparison.marginComparison.category);
  
  // Show limited data warning
  const showLimitedDataWarning = comparison.segmentInfo.sampleSize < 10;
  
  // Check if cache is stale (older than 7 days)
  const lastUpdated = new Date(comparison.segmentInfo.lastUpdated);
  const daysSinceUpdate = Math.floor(
    (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStale = daysSinceUpdate > 7;
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">
        {t('benchmark.title')}
      </h3>
      
      {/* Limited data warning */}
      {showLimitedDataWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
          <p className="text-sm text-yellow-700">
            ⚠️ {t('benchmark.limitedData')}
          </p>
        </div>
      )}
      
      {/* Stale data indicator */}
      {isStale && (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-3 mb-4">
          <p className="text-sm text-gray-600">
            🕐 {t('benchmark.staleData', { days: daysSinceUpdate })}
          </p>
        </div>
      )}
      
      {/* Health Score Comparison */}
      <div className={`${healthIndicator.bgColor} ${healthIndicator.borderColor} border-l-4 p-4 rounded mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('benchmark.healthScore')}
          </span>
          <span className="text-2xl">{healthIndicator.icon}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.yourBusiness')}</p>
            <p className="text-2xl font-bold">
              {comparison.healthScoreComparison.userValue}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.segmentAverage')}</p>
            <p className="text-2xl font-bold">
              {comparison.healthScoreComparison.segmentMedian}
            </p>
          </div>
        </div>
        
        <p className="text-sm mt-2 font-medium">
          {t(`benchmark.category.${comparison.healthScoreComparison.category}`)}
        </p>
      </div>
      
      {/* Profit Margin Comparison */}
      <div className={`${marginIndicator.bgColor} ${marginIndicator.borderColor} border-l-4 p-4 rounded mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('benchmark.profitMargin')}
          </span>
          <span className="text-2xl">{marginIndicator.icon}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.yourBusiness')}</p>
            <p className="text-2xl font-bold">
              {(comparison.marginComparison.userValue * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.segmentAverage')}</p>
            <p className="text-2xl font-bold">
              {(comparison.marginComparison.segmentMedian * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        
        <p className="text-sm mt-2 font-medium">
          {t(`benchmark.category.${comparison.marginComparison.category}`)}
        </p>
      </div>
      
      {/* Sample Size Info */}
      <p className="text-xs text-gray-500 text-center">
        {t('benchmark.sampleSize', { count: comparison.segmentInfo.sampleSize })}
      </p>
    </div>
  );
}
```


### API Endpoint

**Location**: `/app/api/benchmark/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-manager';
import { BenchmarkService } from '@/lib/benchmarkService';
import { calculateHealthScore } from '@/lib/calculations';
import { loadDailyEntriesFromLocalStorage, loadCreditEntriesFromLocalStorage } from '@/lib/daily-entry-sync';

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getSession(request);
    
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 2. Get user profile
    const userProfile = await getUserProfile(session.userId);
    
    if (!userProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }
    
    // 3. Check profile completeness
    if (!userProfile.city_tier || !userProfile.business_type) {
      return NextResponse.json(
        { success: false, error: 'Profile incomplete' },
        { status: 400 }
      );
    }
    
    // 4. Calculate user metrics
    const dailyEntries = await loadDailyEntriesFromLocalStorage(session.userId);
    const creditEntries = await loadCreditEntriesFromLocalStorage(session.userId);
    
    if (dailyEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No daily entries found' },
        { status: 400 }
      );
    }
    
    const latestEntry = dailyEntries[0];
    const creditSummary = calculateCreditSummary(creditEntries);
    const healthScoreResult = calculateHealthScore(
      latestEntry.profitMargin,
      latestEntry.expenseRatio,
      latestEntry.cashInHand,
      creditSummary
    );
    
    const userMetrics: UserMetrics = {
      healthScore: healthScoreResult.score,
      profitMargin: latestEntry.profitMargin
    };
    
    // 5. Get benchmark comparison
    const benchmarkService = new BenchmarkService();
    const comparison = await benchmarkService.getBenchmarkComparison(
      userProfile,
      userMetrics
    );
    
    if (!comparison) {
      return NextResponse.json(
        { success: false, error: 'Segment data unavailable' },
        { status: 404 }
      );
    }
    
    // 6. Return comparison
    return NextResponse.json(
      {
        success: true,
        data: comparison
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=3600' // 1 hour cache
        }
      }
    );
    
  } catch (error) {
    console.error('Benchmark API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```


## Translation Keys

**Location**: `/lib/translations.ts` (additions)

```typescript
// Benchmark translations
'benchmark.title': {
  en: 'How You Compare',
  hi: 'आप कैसे तुलना करते हैं',
  mr: 'तुमची तुलना कशी आहे'
},
'benchmark.healthScore': {
  en: 'Health Score',
  hi: 'स्वास्थ्य स्कोर',
  mr: 'आरोग्य स्कोअर'
},
'benchmark.profitMargin': {
  en: 'Profit Margin',
  hi: 'लाभ मार्जिन',
  mr: 'नफा मार्जिन'
},
'benchmark.yourBusiness': {
  en: 'Your Business',
  hi: 'आपका व्यापार',
  mr: 'तुमचा व्यवसाय'
},
'benchmark.segmentAverage': {
  en: 'Similar Businesses',
  hi: 'समान व्यापार',
  mr: 'समान व्यवसाय'
},
'benchmark.category.above_average': {
  en: 'Above Average',
  hi: 'औसत से ऊपर',
  mr: 'सरासरीपेक्षा जास्त'
},
'benchmark.category.at_average': {
  en: 'At Average',
  hi: 'औसत पर',
  mr: 'सरासरी'
},
'benchmark.category.below_average': {
  en: 'Below Average',
  hi: 'औसत से नीचे',
  mr: 'सरासरीपेक्षा कमी'
},
'benchmark.sampleSize': {
  en: 'Based on {count} businesses',
  hi: '{count} व्यापारों के आधार पर',
  mr: '{count} व्यवसायांवर आधारित'
},
'benchmark.limitedData': {
  en: 'Limited data - comparison may not be representative',
  hi: 'सीमित डेटा - तुलना प्रतिनिधि नहीं हो सकती',
  mr: 'मर्यादित डेटा - तुलना प्रतिनिधी नसू शकते'
},
'benchmark.staleData': {
  en: 'Data is {days} days old',
  hi: 'डेटा {days} दिन पुराना है',
  mr: 'डेटा {days} दिवस जुना आहे'
},
'benchmark.noData': {
  en: 'No comparison data available. Complete your profile to see benchmarks.',
  hi: 'कोई तुलना डेटा उपलब्ध नहीं है। बेंचमार्क देखने के लिए अपनी प्रोफ़ाइल पूरी करें।',
  mr: 'तुलना डेटा उपलब्ध नाही. बेंचमार्क पाहण्यासाठी तुमची प्रोफाइल पूर्ण करा.'
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before defining properties, I analyzed all testable acceptance criteria for redundancy:

**Redundancy Analysis**:
- Properties 1.3, 1.4, 1.5 (individual field validations) can be combined into a single comprehensive segment data validation property
- Properties 1.6, 1.7 (enum validations) can be combined with 1.2 (key formatting) into a single segment key validation property
- Properties 2.7, 2.8, 2.9 (category thresholds) can be combined into a single category assignment property
- Properties 4.1, 4.2, 4.5 (display field presence) can be combined into a single UI completeness property
- Properties 4.3, 4.7, 10.1, 10.2, 10.3 (translation completeness) can be combined into a single translation coverage property
- Properties 5.2, 5.3, 5.4 (demo data ranges) can be combined into a single demo data validity property

**Consolidated Properties**:
After reflection, the following properties provide unique validation value without redundancy.

### Segment Key and Validation Properties

### Property 1: Segment Key Format Validity

*For any* valid city_tier and business_type, the formatted segment key must match the pattern `SEGMENT#(tier1|tier2|tier3)#(kirana|salon|pharmacy|restaurant|other)`.

**Validates: Requirements 1.2, 1.6, 1.7**

### Property 2: Segment Data Invariants

*For any* segment record, it must satisfy all invariants: median_health_score in [0, 100], median_margin is a valid number (not NaN/Infinity), sample_size > 0, and last_updated is a valid ISO timestamp.

**Validates: Requirements 1.3, 1.4, 1.5, 1.8**

### Property 3: Segment Key Round-Trip

*For any* valid city_tier and business_type, formatting then parsing the segment key must return the original values.

**Validates: Requirements 1.2**

### Comparison Engine Properties

### Property 4: Percentile Range Constraint

*For any* valid user_score and segment_median, the calculated percentile must be between 0 and 100 inclusive.

**Validates: Requirements 2.5, 2.6**

### Property 5: Percentile Median Relationship

*For any* user_score and segment_median where both are valid numbers:
- If user_score > segment_median, then percentile > 50
- If user_score < segment_median, then percentile < 50
- If user_score == segment_median, then percentile == 50

**Validates: Requirements 2.5, 2.6 (from Property 2.3, 2.4, 2.5 in requirements)**


### Property 6: Category Assignment Correctness

*For any* percentile value:
- percentile > 60 must map to 'above_average'
- percentile in [40, 60] must map to 'at_average'
- percentile < 40 must map to 'below_average'

**Validates: Requirements 2.7, 2.8, 2.9**

### Property 7: Comparison Engine Idempotence

*For any* valid user_metrics and segment_data, calling compareWithSegment() multiple times with the same inputs must produce identical results (same percentiles, same categories).

**Validates: Requirements 2.4**

### Property 8: Comparison Completeness

*For any* valid user_metrics and segment_data, the comparison result must include both health_score_comparison and margin_comparison with all required fields (userValue, segmentMedian, percentile, category).

**Validates: Requirements 2.5, 2.6**

### Cache and Storage Properties

### Property 9: Cache Round-Trip Persistence

*For any* valid segment_data, saving it to cache and then retrieving it must return equivalent data (all fields match).

**Validates: Requirements 3.2**

### Property 10: Cache Key Format Validity

*For any* valid city_tier and business_type, the cache key must match the format `vyapar_segment_{city_tier}_{business_type}`.

**Validates: Requirements 3.4**

### Property 11: Cache Timestamp Presence

*For any* cached segment data, it must include a valid cached_at ISO timestamp.

**Validates: Requirements 3.5**

### Property 12: Staleness Detection Accuracy

*For any* cached segment data with cached_at timestamp older than 7 days from current date, isCacheStale() must return true.

**Validates: Requirements 3.6**

### UI Display Properties

### Property 13: Display Data Completeness

*For any* valid benchmark comparison, the rendered display must include user's health score, segment median health score, user's profit margin, segment median margin, and sample_size.

**Validates: Requirements 4.1, 4.2, 4.5**

### Property 14: Visual Indicator Mapping

*For any* comparison_category, getVisualIndicator() must return a valid VisualIndicator with color, icon, bgColor, and borderColor fields.

**Validates: Requirements 4.4**

### Property 15: Limited Data Warning Display

*For any* benchmark comparison where sample_size < 10, the display must show the "Limited data" warning message.

**Validates: Requirements 4.6**

### Property 16: Translation Coverage Completeness

*For any* required translation key (category labels, field labels, messages) and any supported language (en, hi, mr), the translation function must return a non-empty string.

**Validates: Requirements 4.3, 4.7, 10.1, 10.2, 10.3**

### Property 17: Translation Language Fallback

*For any* invalid or unsupported language code, the translation function must return the English translation.

**Validates: Requirements 10.5**

### Demo Data Properties

### Property 18: Demo Data Coverage Completeness

*For all* 15 segment combinations (3 city_tiers × 5 business_types), demo data must exist.

**Validates: Requirements 5.1**

### Property 19: Demo Data Validity

*For any* demo segment record, it must satisfy: median_health_score in [40, 80], median_margin in [0.05, 0.30], and sample_size in [50, 500].

**Validates: Requirements 5.2, 5.3, 5.4**

### Integration Properties

### Property 20: User Segment Derivation

*For any* user profile with valid city_tier and business_type, getUserSegment() must return a segment object with matching values.

**Validates: Requirements 7.1**

### Property 21: Segment Data Retrieval Consistency

*For any* segment key, if segment data is retrieved, its segmentKey field must match the requested key.

**Validates: Requirements 7.2**

### Property 22: Profile Validation

*For any* city_tier or business_type value not in the valid enum sets, the validation function must reject it.

**Validates: Requirements 7.5, 7.6**

### API Properties

### Property 23: API Response Structure Completeness

*For any* successful API response (status 200), it must include all required fields: user_health_score, segment_median_health_score, health_percentile, user_margin, segment_median_margin, margin_percentile, comparison_category, sample_size.

**Validates: Requirements 8.3**

### Property 24: AI Explanation Metric Preservation

*For any* comparison result passed to AI_Explanation_Service, the AI must not modify or recalculate the numeric values (percentiles, scores, margins).

**Validates: Requirements 6.2**

### Property 25: Prompt Context Inclusion

*For any* AI explanation prompt, it must include the user's city_tier and business_type in the context.

**Validates: Requirements 6.9**


## Error Handling

### Input Validation

**Segment Key Validation**:

```typescript
function validateSegmentKey(segmentKey: string): ValidationResult {
  const parsed = parseSegmentKey(segmentKey);
  
  if (!parsed) {
    return {
      valid: false,
      error: 'Invalid segment key format'
    };
  }
  
  return { valid: true };
}
```

**User Profile Validation**:

```typescript
function validateUserProfile(profile: UserProfile): ValidationResult {
  const errors: string[] = [];
  
  if (!profile.city_tier) {
    errors.push('city_tier is required');
  } else if (!isValidCityTier(profile.city_tier)) {
    errors.push('city_tier must be one of: tier1, tier2, tier3');
  }
  
  if (!profile.business_type) {
    errors.push('business_type is required');
  } else if (!isValidBusinessType(profile.business_type)) {
    errors.push('business_type must be one of: kirana, salon, pharmacy, restaurant, other');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```


**Segment Data Validation**:

```typescript
function validateSegmentData(data: SegmentData): ValidationResult {
  const errors: string[] = [];
  
  // Validate segment key format
  if (!parseSegmentKey(data.segmentKey)) {
    errors.push('Invalid segment key format');
  }
  
  // Validate median health score
  if (typeof data.medianHealthScore !== 'number' || 
      isNaN(data.medianHealthScore) ||
      data.medianHealthScore < 0 || 
      data.medianHealthScore > 100) {
    errors.push('medianHealthScore must be a number between 0 and 100');
  }
  
  // Validate median margin
  if (typeof data.medianMargin !== 'number' || 
      isNaN(data.medianMargin) ||
      !isFinite(data.medianMargin)) {
    errors.push('medianMargin must be a valid number');
  }
  
  // Validate sample size
  if (typeof data.sampleSize !== 'number' || 
      data.sampleSize <= 0 ||
      !Number.isInteger(data.sampleSize)) {
    errors.push('sampleSize must be a positive integer');
  }
  
  // Validate timestamp
  if (!data.lastUpdated || isNaN(Date.parse(data.lastUpdated))) {
    errors.push('lastUpdated must be a valid ISO timestamp');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Error Scenarios and Handling

1. **Profile Incomplete**
   - **Scenario**: User profile missing city_tier or business_type
   - **Handling**: Return null from getUserSegment(), display "Complete your profile" message
   - **User Impact**: Benchmark not shown, clear call-to-action to complete profile

2. **Segment Data Not Found**
   - **Scenario**: No segment data in cache or DynamoDB for user's segment
   - **Handling**: Return null from getSegmentData(), display "No comparison data available"
   - **User Impact**: Benchmark not shown, but user can still use other features

3. **Network Failure**
   - **Scenario**: DynamoDB request fails due to network issues
   - **Handling**: Fall back to cached data (even if stale), log error
   - **User Impact**: May see stale data indicator, but comparison still works offline

4. **Invalid Segment Data**
   - **Scenario**: Retrieved segment data fails validation
   - **Handling**: Log error, return null, don't cache invalid data
   - **User Impact**: Benchmark not shown, error logged for investigation

5. **Cache Storage Full**
   - **Scenario**: localStorage quota exceeded when saving segment data
   - **Handling**: Catch QuotaExceededError, log warning, continue without caching
   - **User Impact**: Will need to fetch from DynamoDB on next load

6. **Calculation Errors**
   - **Scenario**: NaN or Infinity in percentile calculation
   - **Handling**: Return default percentile of 50, log warning
   - **User Impact**: Shows "at average" category as safe fallback

### Error Response Format

All API errors follow the standard format:

```typescript
{
  success: false,
  code: 'ERROR_CODE',
  message: 'User-friendly localized message'
}
```

**Error Codes**:
- `UNAUTHORIZED`: User not authenticated (401)
- `PROFILE_INCOMPLETE`: Missing city_tier or business_type (400)
- `PROFILE_NOT_FOUND`: User profile doesn't exist (404)
- `SEGMENT_NOT_FOUND`: No segment data available (404)
- `NO_DAILY_ENTRIES`: User has no daily entries for metrics (400)
- `INTERNAL_ERROR`: Unexpected server error (500)


## Testing Strategy

### Dual Testing Approach

The segment benchmark feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Together, they provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: fast-check (TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property reference
- Tag format: `Feature: segment-benchmark, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import fc from 'fast-check';

describe('Feature: segment-benchmark, Property 5: Percentile Median Relationship', () => {
  it('should calculate percentile > 50 when user_score > median', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (userScore, median) => {
          fc.pre(userScore > median); // Precondition
          
          const percentile = calculatePercentile(userScore, median);
          
          return percentile > 50;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should calculate percentile < 50 when user_score < median', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (userScore, median) => {
          fc.pre(userScore < median); // Precondition
          
          const percentile = calculatePercentile(userScore, median);
          
          return percentile < 50;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should calculate percentile == 50 when user_score == median', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (score) => {
          const percentile = calculatePercentile(score, score);
          
          return percentile === 50;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage

**Core Functions** (`/lib/finance/`):
- `formatSegmentKey()`: Test all valid combinations, invalid inputs
- `parseSegmentKey()`: Test valid keys, invalid formats, edge cases
- `calculatePercentile()`: Test median relationships, edge cases (0, 100, equal values)
- `categorizePerformance()`: Test boundary values (39, 40, 60, 61)
- `compareWithSegment()`: Test complete comparison flow with various inputs

**Data Management** (`/lib/`):
- `SegmentCacheManager.saveToCache()`: Test successful save, quota exceeded
- `SegmentCacheManager.getFromCache()`: Test cache hit, cache miss, corrupted data
- `SegmentCacheManager.isCacheStale()`: Test fresh data, stale data, boundary (exactly 7 days)
- `SegmentStore.getSegmentData()`: Test successful retrieval, not found, network error
- `SegmentStore.saveSegmentData()`: Test successful save, DynamoDB error

**Service Layer** (`/lib/`):
- `BenchmarkService.getUserSegment()`: Test valid profile, incomplete profile, invalid values
- `BenchmarkService.getSegmentData()`: Test cache hit, cache miss, offline fallback
- `BenchmarkService.getBenchmarkComparison()`: Test complete flow, error scenarios

**Demo Data**:
- `generateDemoSegmentData()`: Test coverage of all 15 combinations, value ranges
- `seedDemoData()`: Test seeding process (mock DynamoDB)
- `loadDemoDataToCache()`: Test cache loading

### Integration Tests

**API Endpoint** (`/app/api/benchmark/route.ts`):
- Authenticated request with complete profile → returns comparison
- Unauthenticated request → returns 401
- Incomplete profile → returns 400
- No daily entries → returns 400
- Segment not found → returns 404

**UI Component** (`/components/BenchmarkDisplay.tsx`):
- Renders comparison with valid data
- Shows loading state
- Shows error message
- Shows "no data" message
- Shows limited data warning when sample_size < 10
- Shows stale data indicator when cache > 7 days old
- Displays correct visual indicators for each category

### Test File Organization

```
lib/finance/__tests__/
  ├── segmentKeyFormatter.test.ts
  ├── segmentKeyFormatter.property.test.ts
  ├── calculatePercentile.test.ts
  ├── calculatePercentile.property.test.ts
  ├── categorizePerformance.test.ts
  ├── categorizePerformance.property.test.ts
  └── compareWithSegment.property.test.ts

lib/__tests__/
  ├── segmentCacheManager.test.ts
  ├── segmentStore.test.ts
  ├── benchmarkService.test.ts
  └── demoSegmentData.test.ts

app/api/benchmark/__tests__/
  └── route.test.ts

components/__tests__/
  └── BenchmarkDisplay.test.tsx
```


## Implementation Guidance

### Development Phases

**Phase 1: Core Calculation Functions** (Day 1)
1. Implement `formatSegmentKey()` and `parseSegmentKey()`
2. Implement `calculatePercentile()`
3. Implement `categorizePerformance()` and `getVisualIndicator()`
4. Implement `compareWithSegment()`
5. Write unit tests and property tests for all functions

**Phase 2: Data Management** (Day 2)
1. Implement `SegmentCacheManager`
2. Implement `SegmentStore` with DynamoDB client
3. Implement demo data generator
4. Write unit tests for cache and store
5. Create seed script for demo data

**Phase 3: Service Layer** (Day 3)
1. Implement `BenchmarkService`
2. Add segment fields to UserProfile type
3. Write integration tests for service
4. Test offline/online scenarios

**Phase 4: API and UI** (Day 4)
1. Implement `/api/benchmark` endpoint
2. Implement `BenchmarkDisplay` component
3. Add translation keys
4. Write API and component tests
5. Test complete user flow

**Phase 5: Integration and Demo** (Day 5)
1. Integrate benchmark display into dashboard
2. Seed demo data to DynamoDB
3. Load demo data to cache for offline demo
4. Test complete flow: profile → daily entry → benchmark display
5. Rehearse demo scenario

### Performance Considerations

**Calculation Performance**:
- All comparison functions are pure and synchronous
- Target: < 10ms for complete comparison
- No network calls in calculation path

**Cache Performance**:
- localStorage reads are synchronous and fast
- Cache all 15 segments on first load (< 5KB total)
- No cache invalidation needed (7-day TTL)

**API Performance**:
- Cache API responses for 1 hour (HTTP Cache-Control header)
- DynamoDB single-item read: < 10ms
- Total API response time: < 100ms

### Security Considerations

**Data Privacy**:
- Segment data is aggregate statistics (no individual business data)
- User's own metrics never shared with other users
- Comparison happens client-side (no data sent to comparison service)

**Authentication**:
- All API endpoints require valid session
- User can only access their own comparison
- No cross-user data leakage

**Input Validation**:
- Validate all user inputs (city_tier, business_type)
- Validate segment data before caching
- Sanitize all error messages (no stack traces)

### Monitoring and Observability

**Metrics to Track**:
- Benchmark API request count and latency
- Cache hit/miss ratio
- Segment data staleness distribution
- Error rates by error code
- Demo data usage vs. production data

**Logging**:
- Log all segment data fetches (cache vs. DynamoDB)
- Log validation failures
- Log cache storage errors
- Use structured logging with context

**Alerts**:
- Alert if segment data fetch failure rate > 5%
- Alert if cache storage failure rate > 1%
- Alert if API error rate > 2%


## AI Explanation Layer Integration

### Prompt Builder for Benchmark Explanations

**Location**: `/lib/ai/benchmarkPromptBuilder.ts`

```typescript
/**
 * Build AI prompt for benchmark explanation
 */
export function buildBenchmarkExplanationPrompt(
  comparison: BenchmarkComparison,
  userProfile: UserProfile
): string {
  const { cityTier, businessType } = parseSegmentKey(comparison.segmentInfo.segmentKey)!;
  
  const healthCategory = comparison.healthScoreComparison.category;
  const marginCategory = comparison.marginComparison.category;
  
  const explanationMode = userProfile.explanation_mode || 'simple';
  
  const prompt = `
You are a financial advisor for small businesses in India.

Business Context:
- Business Type: ${businessType}
- City Tier: ${cityTier}
- Explanation Mode: ${explanationMode}

Benchmark Comparison:
- User Health Score: ${comparison.healthScoreComparison.userValue}
- Segment Median Health Score: ${comparison.healthScoreComparison.segmentMedian}
- Health Score Category: ${healthCategory}

- User Profit Margin: ${(comparison.marginComparison.userValue * 100).toFixed(1)}%
- Segment Median Margin: ${(comparison.marginComparison.segmentMedian * 100).toFixed(1)}%
- Margin Category: ${marginCategory}

Based on ${comparison.segmentInfo.sampleSize} similar businesses.

Task: Explain what this comparison means for the user's business.

${explanationMode === 'simple' 
  ? 'Provide 2-3 simple bullet points. Use simple language, no jargon.'
  : 'Provide 5-7 detailed bullet points. Explain concepts like health score and profit margin.'}

${healthCategory === 'below_average' || marginCategory === 'below_average'
  ? 'Include 2-3 actionable suggestions for improvement.'
  : healthCategory === 'above_average' && marginCategory === 'above_average'
  ? 'Provide encouragement and tips for sustaining performance.'
  : 'Suggest optimization opportunities.'}

Respond in ${userProfile.language === 'hi' ? 'Hindi' : userProfile.language === 'mr' ? 'Marathi' : 'English'}.
`;
  
  return prompt;
}
```

### AI Service Integration

The AI explanation is optional and never blocks the benchmark display:

```typescript
async function getBenchmarkWithExplanation(
  comparison: BenchmarkComparison,
  userProfile: UserProfile
): Promise<{ comparison: BenchmarkComparison; explanation?: string }> {
  // Always return comparison immediately
  const result = { comparison };
  
  // Try to get AI explanation (non-blocking)
  try {
    if (navigator.onLine) {
      const prompt = buildBenchmarkExplanationPrompt(comparison, userProfile);
      const explanation = await callBedrockAPI(prompt);
      result.explanation = explanation;
    }
  } catch (error) {
    console.error('Failed to get AI explanation:', error);
    // Continue without explanation
  }
  
  return result;
}
```

**Key Principles**:
- AI never recalculates metrics (receives pre-calculated values)
- AI explanation is optional enhancement
- Comparison works fully offline without AI
- AI adapts to persona (business_type) and explanation_mode


## Summary

The Segment Benchmark feature provides social proof and motivation through peer comparison while strictly following the Hybrid Intelligence Principle. All comparison logic is deterministic, offline-capable, and fully testable. The feature integrates seamlessly with the existing Vyapar AI architecture and enhances the daily habit loop by showing users how they compare to similar businesses.

**Key Achievements**:
- Pure TypeScript comparison engine (no AI in calculations)
- Offline-first with localStorage caching
- Multi-language support (English, Hindi, Marathi)
- Comprehensive property-based testing
- Demo data for hackathon presentation
- Optional AI explanation layer (persona-aware)
- DynamoDB single-table design compliance
- Sub-100ms API response time
