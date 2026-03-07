import { GET } from '@/app/api/benchmark/route';
import { NextRequest } from 'next/server';
import { ProfileService, DailyEntryService, CreditEntryService } from '@/lib/dynamodb-client';
import { BenchmarkService } from '@/lib/benchmarkService';

// Mock dependencies
jest.mock('@/lib/dynamodb-client');
jest.mock('@/lib/benchmarkService');
jest.mock('@/lib/logger');

// Setup CreditEntryService mock
beforeAll(() => {
  (CreditEntryService.getEntries as jest.Mock) = jest.fn().mockResolvedValue([]);
});

describe('Benchmark API', () => {
  const mockUserId = 'test-user-123';
  const baseUrl = 'http://localhost:3000/api/benchmark';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /api/benchmark', () => {
    it('should return benchmark comparison for authenticated user with complete profile', async () => {
      const mockProfile = {
        userId: mockUserId,
        shopName: 'Test Shop',
        userName: 'Test User',
        language: 'en',
        city_tier: 'tier1',
        business_type: 'kirana',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
      
      const mockDailyEntry = {
        userId: mockUserId,
        date: '2024-01-15',
        totalSales: 10000,
        totalExpense: 7000,
        cashInHand: 5000,
        profitMargin: 0.30,
        expenseRatio: 0.70,
        estimatedProfit: 3000
      };
      
      const mockComparison = {
        healthScoreComparison: {
          userValue: 75,
          segmentMedian: 70,
          percentile: 60,
          category: 'above_average' as const
        },
        marginComparison: {
          userValue: 0.30,
          segmentMedian: 0.20,
          percentile: 75,
          category: 'above_average' as const
        },
        segmentInfo: {
          segmentKey: 'SEGMENT#tier1#kirana',
          sampleSize: 350,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        calculatedAt: '2024-01-15T12:00:00Z'
      };
      
      // Mock ProfileService
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      
      // Mock DailyEntryService
      (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
      
      // Mock CreditEntryService
      (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
      
      // Mock BenchmarkService
      const mockGetBenchmarkComparison = jest.fn().mockResolvedValue(mockComparison);
      (BenchmarkService as jest.Mock).mockImplementation(() => ({
        getBenchmarkComparison: mockGetBenchmarkComparison
      }));
      
      // Create request
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      // Call API
      const response = await GET(request);
      const data = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockComparison);
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
      
      // Verify service calls
      expect(ProfileService.getProfile).toHaveBeenCalledWith(mockUserId);
      expect(DailyEntryService.getEntries).toHaveBeenCalledWith(mockUserId);
    });
    
    it('should return 401 for unauthenticated request (missing userId)', async () => {
      const request = new NextRequest(baseUrl);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_REQUIRED');
    });
    
    it('should return 404 when profile not found', async () => {
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(null);
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_FOUND');
    });
    
    it('should return 400 for incomplete profile (missing city_tier)', async () => {
      const incompleteProfile = {
        userId: mockUserId,
        shopName: 'Test Shop',
        userName: 'Test User',
        language: 'en',
        business_type: 'kirana',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
      
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(incompleteProfile);
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });
    
    it('should return 400 for incomplete profile (missing business_type)', async () => {
      const incompleteProfile = {
        userId: mockUserId,
        shopName: 'Test Shop',
        userName: 'Test User',
        language: 'en',
        city_tier: 'tier1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
      
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(incompleteProfile);
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });
    
    it('should return 400 when no daily entries found', async () => {
      const mockProfile = {
        userId: mockUserId,
        shopName: 'Test Shop',
        userName: 'Test User',
        language: 'en',
        city_tier: 'tier1',
        business_type: 'kirana',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
      
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([]);
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_INPUT');
    });
    
    it('should return 404 when segment data not found', async () => {
      const mockProfile = {
        userId: mockUserId,
        shopName: 'Test Shop',
        userName: 'Test User',
        language: 'en',
        city_tier: 'tier1',
        business_type: 'kirana',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
      
      const mockDailyEntry = {
        userId: mockUserId,
        date: '2024-01-15',
        totalSales: 10000,
        totalExpense: 7000,
        cashInHand: 5000,
        profitMargin: 0.30,
        expenseRatio: 0.70,
        estimatedProfit: 3000
      };
      
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
      
      // Mock CreditEntryService
      (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
      
      // Mock BenchmarkService to return null (segment not found)
      const mockGetBenchmarkComparison = jest.fn().mockResolvedValue(null);
      (BenchmarkService as jest.Mock).mockImplementation(() => ({
        getBenchmarkComparison: mockGetBenchmarkComparison
      }));
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.code).toBe('NOT_FOUND');
    });
    
    it('should return 500 on DynamoDB error', async () => {
      (ProfileService.getProfile as jest.Mock).mockRejectedValue(new Error('DynamoDB error'));
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('DYNAMODB_ERROR');
    });
    
    it('should include all required fields in successful response', async () => {
      const mockProfile = {
        userId: mockUserId,
        shopName: 'Test Shop',
        userName: 'Test User',
        language: 'en',
        city_tier: 'tier2',
        business_type: 'salon',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z'
      };
      
      const mockDailyEntry = {
        userId: mockUserId,
        date: '2024-01-15',
        totalSales: 15000,
        totalExpense: 10000,
        cashInHand: 8000,
        profitMargin: 0.33,
        expenseRatio: 0.67,
        estimatedProfit: 5000
      };
      
      const mockComparison = {
        healthScoreComparison: {
          userValue: 80,
          segmentMedian: 60,
          percentile: 70,
          category: 'above_average' as const
        },
        marginComparison: {
          userValue: 0.33,
          segmentMedian: 0.25,
          percentile: 65,
          category: 'above_average' as const
        },
        segmentInfo: {
          segmentKey: 'SEGMENT#tier2#salon',
          sampleSize: 200,
          lastUpdated: '2024-01-15T10:00:00Z'
        },
        calculatedAt: '2024-01-15T12:00:00Z'
      };
      
      (ProfileService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
      (DailyEntryService.getEntries as jest.Mock).mockResolvedValue([mockDailyEntry]);
      
      // Mock CreditEntryService
      (CreditEntryService.getEntries as jest.Mock).mockResolvedValue([]);
      
      const mockGetBenchmarkComparison = jest.fn().mockResolvedValue(mockComparison);
      (BenchmarkService as jest.Mock).mockImplementation(() => ({
        getBenchmarkComparison: mockGetBenchmarkComparison
      }));
      
      const request = new NextRequest(`${baseUrl}?userId=${mockUserId}`);
      
      const response = await GET(request);
      const data = await response.json();
      
      // Verify all required fields are present (Property 23)
      expect(data.data).toHaveProperty('healthScoreComparison');
      expect(data.data.healthScoreComparison).toHaveProperty('userValue');
      expect(data.data.healthScoreComparison).toHaveProperty('segmentMedian');
      expect(data.data.healthScoreComparison).toHaveProperty('percentile');
      expect(data.data.healthScoreComparison).toHaveProperty('category');
      
      expect(data.data).toHaveProperty('marginComparison');
      expect(data.data.marginComparison).toHaveProperty('userValue');
      expect(data.data.marginComparison).toHaveProperty('segmentMedian');
      expect(data.data.marginComparison).toHaveProperty('percentile');
      expect(data.data.marginComparison).toHaveProperty('category');
      
      expect(data.data).toHaveProperty('segmentInfo');
      expect(data.data.segmentInfo).toHaveProperty('segmentKey');
      expect(data.data.segmentInfo).toHaveProperty('sampleSize');
      expect(data.data.segmentInfo).toHaveProperty('lastUpdated');
    });
  });
});
