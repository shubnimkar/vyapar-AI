import { BenchmarkService } from '../benchmarkService';
import { SegmentCacheManager } from '../segmentCacheManager';
import { SegmentStore } from '../segmentStore';
import { UserProfile, SegmentData, UserMetrics } from '../types';

// Mock dependencies
jest.mock('../segmentCacheManager');
jest.mock('../segmentStore');
jest.mock('../logger');

// Helper to create minimal test profile
function createTestProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-id',
    phoneNumber: '+1234567890',
    shopName: 'Test Shop',
    userName: 'testuser',
    language: 'en',
    business_type: 'kirana',
    city_tier: 'tier1',
    explanation_mode: 'simple',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isActive: true,
    subscriptionTier: 'free',
    preferences: {
      dataRetentionDays: 90,
      autoArchive: false,
      notificationsEnabled: true,
      currency: 'INR'
    },
    ...overrides
  };
}

describe('BenchmarkService', () => {
  let service: BenchmarkService;
  let mockCacheManager: jest.Mocked<SegmentCacheManager>;
  let mockSegmentStore: jest.Mocked<SegmentStore>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create service instance
    service = new BenchmarkService();
    
    // Get mocked instances
    mockCacheManager = (service as any).cacheManager;
    mockSegmentStore = (service as any).segmentStore;
  });
  
  describe('getUserSegment', () => {
    it('should return segment for valid profile', () => {
      const profile = createTestProfile({
        city_tier: 'tier1',
        business_type: 'kirana'
      });
      
      const result = service.getUserSegment(profile);
      
      expect(result).toEqual({
        cityTier: 'tier1',
        businessType: 'kirana'
      });
    });
    
    it('should return null for incomplete profile (missing city_tier)', () => {
      const profile = createTestProfile({
        city_tier: undefined,
        business_type: 'kirana'
      });
      
      const result = service.getUserSegment(profile);
      
      expect(result).toBeNull();
    });
    
    it('should return null for incomplete profile (missing business_type)', () => {
      const profile = createTestProfile({
        city_tier: 'tier1',
        business_type: undefined as any
      });
      
      const result = service.getUserSegment(profile);
      
      expect(result).toBeNull();
    });
    
    it('should return null for invalid city_tier', () => {
      const profile = createTestProfile({
        city_tier: 'invalid' as any,
        business_type: 'kirana'
      });
      
      const result = service.getUserSegment(profile);
      
      expect(result).toBeNull();
    });
    
    it('should return null for invalid business_type', () => {
      const profile = createTestProfile({
        city_tier: 'tier1',
        business_type: 'invalid' as any
      });
      
      const result = service.getUserSegment(profile);
      
      expect(result).toBeNull();
    });
  });
  
  describe('getSegmentData', () => {
    const mockSegmentData: SegmentData = {
      segmentKey: 'SEGMENT#tier1#kirana',
      medianHealthScore: 70,
      medianMargin: 0.20,
      sampleSize: 350,
      lastUpdated: '2024-01-15T10:00:00Z'
    };
    
    it('should return fresh cache data when available', async () => {
      mockCacheManager.getFromCache.mockReturnValue({
        ...mockSegmentData,
        cachedAt: new Date().toISOString()
      });
      mockCacheManager.isCacheStale.mockReturnValue(false);
      
      const result = await service.getSegmentData('tier1', 'kirana');
      
      expect(result).toEqual(expect.objectContaining(mockSegmentData));
      expect(mockCacheManager.getFromCache).toHaveBeenCalledWith('tier1', 'kirana');
      expect(mockSegmentStore.getSegmentData).not.toHaveBeenCalled();
    });
    
    it('should fetch from DynamoDB when cache is stale and online', async () => {
      const staleCache = {
        ...mockSegmentData,
        cachedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() // 8 days ago
      };
      
      mockCacheManager.getFromCache.mockReturnValue(staleCache);
      mockCacheManager.isCacheStale.mockReturnValue(true);
      mockSegmentStore.getSegmentData.mockResolvedValue(mockSegmentData);
      
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      const result = await service.getSegmentData('tier1', 'kirana');
      
      expect(result).toEqual(mockSegmentData);
      expect(mockSegmentStore.getSegmentData).toHaveBeenCalledWith('tier1', 'kirana');
      expect(mockCacheManager.saveToCache).toHaveBeenCalledWith(mockSegmentData);
    });
    
    it('should fetch from DynamoDB when cache miss and online', async () => {
      mockCacheManager.getFromCache.mockReturnValue(null);
      mockSegmentStore.getSegmentData.mockResolvedValue(mockSegmentData);
      
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      const result = await service.getSegmentData('tier1', 'kirana');
      
      expect(result).toEqual(mockSegmentData);
      expect(mockSegmentStore.getSegmentData).toHaveBeenCalledWith('tier1', 'kirana');
      expect(mockCacheManager.saveToCache).toHaveBeenCalledWith(mockSegmentData);
    });
    
    it('should return stale cache when offline', async () => {
      const staleCache = {
        ...mockSegmentData,
        cachedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      mockCacheManager.getFromCache.mockReturnValue(staleCache);
      mockCacheManager.isCacheStale.mockReturnValue(true);
      
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      const result = await service.getSegmentData('tier1', 'kirana');
      
      expect(result).toEqual(staleCache);
      expect(mockSegmentStore.getSegmentData).not.toHaveBeenCalled();
    });
    
    it('should return null when no cache and DynamoDB returns null', async () => {
      mockCacheManager.getFromCache.mockReturnValue(null);
      mockSegmentStore.getSegmentData.mockResolvedValue(null);
      
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      const result = await service.getSegmentData('tier1', 'kirana');
      
      expect(result).toBeNull();
    });
    
    it('should handle DynamoDB errors gracefully and return stale cache', async () => {
      const staleCache = {
        ...mockSegmentData,
        cachedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      mockCacheManager.getFromCache.mockReturnValue(staleCache);
      mockCacheManager.isCacheStale.mockReturnValue(true);
      mockSegmentStore.getSegmentData.mockRejectedValue(new Error('DynamoDB error'));
      
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      const result = await service.getSegmentData('tier1', 'kirana');
      
      expect(result).toEqual(staleCache);
    });
  });
  
  describe('getBenchmarkComparison', () => {
    const mockProfile = createTestProfile({
      city_tier: 'tier1',
      business_type: 'kirana'
    });
    
    const mockUserMetrics: UserMetrics = {
      healthScore: 75,
      profitMargin: 0.22
    };
    
    const mockSegmentData: SegmentData = {
      segmentKey: 'SEGMENT#tier1#kirana',
      medianHealthScore: 70,
      medianMargin: 0.20,
      sampleSize: 350,
      lastUpdated: '2024-01-15T10:00:00Z'
    };
    
    it('should return complete benchmark comparison for valid inputs', async () => {
      mockCacheManager.getFromCache.mockReturnValue({
        ...mockSegmentData,
        cachedAt: new Date().toISOString()
      });
      mockCacheManager.isCacheStale.mockReturnValue(false);
      
      const result = await service.getBenchmarkComparison(mockProfile, mockUserMetrics);
      
      expect(result).not.toBeNull();
      expect(result?.healthScoreComparison).toBeDefined();
      expect(result?.marginComparison).toBeDefined();
      expect(result?.segmentInfo).toBeDefined();
      expect(result?.healthScoreComparison.userValue).toBe(75);
      expect(result?.healthScoreComparison.segmentMedian).toBe(70);
      expect(result?.marginComparison.userValue).toBe(0.22);
      expect(result?.marginComparison.segmentMedian).toBe(0.20);
    });
    
    it('should return null for incomplete profile', async () => {
      const incompleteProfile = createTestProfile({
        city_tier: undefined,
        business_type: undefined as any
      });
      
      const result = await service.getBenchmarkComparison(incompleteProfile, mockUserMetrics);
      
      expect(result).toBeNull();
    });
    
    it('should return null when segment data is unavailable', async () => {
      mockCacheManager.getFromCache.mockReturnValue(null);
      mockSegmentStore.getSegmentData.mockResolvedValue(null);
      
      // Mock navigator.onLine
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      const result = await service.getBenchmarkComparison(mockProfile, mockUserMetrics);
      
      expect(result).toBeNull();
    });
    
    it('should work with different city tiers and business types', async () => {
      const tier2SalonProfile = createTestProfile({
        city_tier: 'tier2',
        business_type: 'salon'
      });
      
      const tier2SalonData: SegmentData = {
        segmentKey: 'SEGMENT#tier2#salon',
        medianHealthScore: 60,
        medianMargin: 0.25,
        sampleSize: 200,
        lastUpdated: '2024-01-15T10:00:00Z'
      };
      
      mockCacheManager.getFromCache.mockReturnValue({
        ...tier2SalonData,
        cachedAt: new Date().toISOString()
      });
      mockCacheManager.isCacheStale.mockReturnValue(false);
      
      const result = await service.getBenchmarkComparison(tier2SalonProfile, mockUserMetrics);
      
      expect(result).not.toBeNull();
      expect(result?.segmentInfo.segmentKey).toBe('SEGMENT#tier2#salon');
      expect(result?.healthScoreComparison.segmentMedian).toBe(60);
      expect(result?.marginComparison.segmentMedian).toBe(0.25);
    });
  });
});
