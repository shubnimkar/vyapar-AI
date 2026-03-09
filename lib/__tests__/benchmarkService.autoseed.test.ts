/**
 * Unit tests for BenchmarkService auto-seeding functionality
 * 
 * Tests the shouldAutoSeed() helper and auto-seeding logic in getSegmentData()
 */

import { BenchmarkService } from '../benchmarkService';
import { SegmentStore } from '../segmentStore';
import { seedDemoData } from '../demoSegmentData';
import { SegmentCacheManager } from '../segmentCacheManager';

// Mock dependencies
jest.mock('../segmentStore');
jest.mock('../demoSegmentData');
jest.mock('../segmentCacheManager');
jest.mock('../logger');

describe('BenchmarkService - Auto-Seeding', () => {
  let benchmarkService: BenchmarkService;
  let mockGetSegmentData: jest.Mock;
  let mockSaveToCache: jest.Mock;
  let mockGetFromCache: jest.Mock;
  let mockIsCacheStale: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock navigator.onLine to simulate online environment
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true
    });
    
    // Setup mocks for SegmentStore
    mockGetSegmentData = jest.fn();
    (SegmentStore as jest.Mock).mockImplementation(() => ({
      getSegmentData: mockGetSegmentData,
      saveSegmentData: jest.fn()
    }));
    
    // Setup mocks for SegmentCacheManager
    mockGetFromCache = jest.fn().mockReturnValue(null);
    mockIsCacheStale = jest.fn().mockReturnValue(true);
    mockSaveToCache = jest.fn();
    (SegmentCacheManager as jest.Mock).mockImplementation(() => ({
      getFromCache: mockGetFromCache,
      isCacheStale: mockIsCacheStale,
      saveToCache: mockSaveToCache
    }));
    
    // Create service instance
    benchmarkService = new BenchmarkService();
  });

  describe('shouldAutoSeed', () => {
    it('should return true when database is empty (probe returns null)', async () => {
      // Setup: probe returns null (database is empty)
      mockGetSegmentData.mockResolvedValue(null);
      
      // Execute: call shouldAutoSeed (private method, test via getSegmentData)
      const result = await (benchmarkService as any).shouldAutoSeed();
      
      // Assert
      expect(result).toBe(true);
      expect(mockGetSegmentData).toHaveBeenCalledWith('tier1', 'kirana');
    });

    it('should return false when database has data (probe returns data)', async () => {
      // Setup: probe returns data (database is not empty)
      const mockData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 65,
        medianMargin: 0.20,
        sampleSize: 250,
        lastUpdated: '2024-01-15T00:00:00Z'
      };
      mockGetSegmentData.mockResolvedValue(mockData);
      
      // Execute
      const result = await (benchmarkService as any).shouldAutoSeed();
      
      // Assert
      expect(result).toBe(false);
      expect(mockGetSegmentData).toHaveBeenCalledWith('tier1', 'kirana');
    });

    it('should return false on error (prevent seeding during error conditions)', async () => {
      // Setup: probe throws error
      mockGetSegmentData.mockRejectedValue(new Error('DynamoDB error'));
      
      // Execute
      const result = await (benchmarkService as any).shouldAutoSeed();
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getSegmentData - auto-seeding', () => {
    it('should be online in test environment', () => {
      // Verify that isOnline logic works in test environment
      const isOnline = typeof navigator === 'undefined' || navigator.onLine;
      expect(isOnline).toBe(true);
    });
    
    it('should automatically seed when database is empty', async () => {
      // Setup: First call returns null, probe returns null, after seeding returns data
      const mockData = {
        segmentKey: 'SEGMENT#tier2#salon',
        medianHealthScore: 60,
        medianMargin: 0.25,
        sampleSize: 200,
        lastUpdated: '2024-01-15T00:00:00Z'
      };
      
      mockGetSegmentData
        .mockResolvedValueOnce(null) // First call for tier2/salon
        .mockResolvedValueOnce(null) // Probe for tier1/kirana (shouldAutoSeed)
        .mockResolvedValueOnce(mockData); // Retry after seeding
      
      (seedDemoData as jest.Mock).mockResolvedValue(undefined);
      
      // Execute
      const result = await benchmarkService.getSegmentData('tier2', 'salon');
      
      // Assert
      expect(result).toEqual(mockData);
      expect(seedDemoData).toHaveBeenCalledTimes(1);
      expect(mockGetSegmentData).toHaveBeenCalledTimes(3);
    });

    it('should NOT seed when data already exists', async () => {
      // Setup: First call returns data
      const mockData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 300,
        lastUpdated: '2024-01-15T00:00:00Z'
      };
      
      mockGetSegmentData.mockResolvedValue(mockData);
      
      // Execute
      const result = await benchmarkService.getSegmentData('tier1', 'kirana');
      
      // Assert
      expect(result).toEqual(mockData);
      expect(seedDemoData).not.toHaveBeenCalled();
      expect(mockGetSegmentData).toHaveBeenCalledTimes(1);
    });

    it('should NOT seed when probe indicates data exists', async () => {
      // Setup: First call returns null, but probe returns data (database not empty)
      const probeData = {
        segmentKey: 'SEGMENT#tier1#kirana',
        medianHealthScore: 70,
        medianMargin: 0.20,
        sampleSize: 300,
        lastUpdated: '2024-01-15T00:00:00Z'
      };
      
      mockGetSegmentData
        .mockResolvedValueOnce(null) // First call for tier3/pharmacy
        .mockResolvedValueOnce(probeData); // Probe for tier1/kirana (shouldAutoSeed)
      
      // Execute
      const result = await benchmarkService.getSegmentData('tier3', 'pharmacy');
      
      // Assert
      expect(result).toBeNull();
      expect(seedDemoData).not.toHaveBeenCalled();
      expect(mockGetSegmentData).toHaveBeenCalledTimes(2);
    });

    it('should prevent concurrent seeding operations', async () => {
      // Setup: Multiple concurrent calls with empty database
      mockGetSegmentData.mockResolvedValue(null); // Always return null
      
      (seedDemoData as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Execute: Make two concurrent calls
      const promise1 = benchmarkService.getSegmentData('tier1', 'kirana');
      const promise2 = benchmarkService.getSegmentData('tier2', 'salon');
      
      await Promise.all([promise1, promise2]);
      
      // Assert: seedDemoData should only be called once
      expect(seedDemoData).toHaveBeenCalledTimes(1);
    });

    it('should handle seeding errors gracefully', async () => {
      // Setup: Seeding fails
      mockGetSegmentData
        .mockResolvedValueOnce(null) // First call
        .mockResolvedValueOnce(null); // Probe (shouldAutoSeed)
      
      (seedDemoData as jest.Mock).mockRejectedValue(new Error('Seeding failed'));
      
      // Execute
      const result = await benchmarkService.getSegmentData('tier1', 'kirana');
      
      // Assert: Should return null gracefully
      expect(result).toBeNull();
      expect(seedDemoData).toHaveBeenCalledTimes(1);
    });
  });
});
