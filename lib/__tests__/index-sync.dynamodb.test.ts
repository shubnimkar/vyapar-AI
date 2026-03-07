// Integration tests for index-sync DynamoDB functions

import {
  saveIndexToDynamoDB,
  getLatestIndexFromDynamoDB,
  getHistoricalIndicesFromDynamoDB,
} from '../index-sync';
import type { IndexData } from '../types';
import { DynamoDBService } from '../dynamodb-client';

// Mock DynamoDB client
jest.mock('../dynamodb-client', () => ({
  DynamoDBService: {
    putItem: jest.fn(),
    queryByPK: jest.fn(),
  },
}));

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('index-sync DynamoDB functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveIndexToDynamoDB', () => {
    it('should save index data to DynamoDB with correct keys', async () => {
      const today = new Date().toISOString().split('T')[0];
      const indexData: IndexData = {
        userId: 'user123',
        date: today,
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          calculatedAt: new Date().toISOString(),
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        affordabilityIndex: null,
        dataPoints: 30,
        calculationPeriod: {
          startDate: today,
          endDate: today,
        },
        createdAt: new Date().toISOString(),
      };

      await saveIndexToDynamoDB(indexData);

      expect(DynamoDBService.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: 'USER#user123',
          SK: `INDEX#${today}`,
          entityType: 'INDEX',
          userId: 'user123',
          date: today,
          stressIndex: indexData.stressIndex,
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: indexData.calculationPeriod,
          createdAt: indexData.createdAt,
          syncedAt: expect.any(String),
        })
      );
    });

    it('should save both stress and affordability indices', async () => {
      const today = new Date().toISOString().split('T')[0];
      const indexData: IndexData = {
        userId: 'user123',
        date: today,
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          calculatedAt: new Date().toISOString(),
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        affordabilityIndex: {
          score: 75,
          breakdown: {
            costToProfitRatio: 0.4,
            affordabilityCategory: 'Affordable',
          },
          calculatedAt: new Date().toISOString(),
          inputParameters: {
            plannedCost: 20000,
            avgMonthlyProfit: 50000,
          },
        },
        dataPoints: 30,
        calculationPeriod: {
          startDate: today,
          endDate: today,
        },
        createdAt: new Date().toISOString(),
      };

      await saveIndexToDynamoDB(indexData);

      expect(DynamoDBService.putItem).toHaveBeenCalledWith(
        expect.objectContaining({
          stressIndex: indexData.stressIndex,
          affordabilityIndex: indexData.affordabilityIndex,
        })
      );
    });

    it('should throw error if DynamoDB save fails', async () => {
      const today = new Date().toISOString().split('T')[0];
      const indexData: IndexData = {
        userId: 'user123',
        date: today,
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          calculatedAt: new Date().toISOString(),
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        affordabilityIndex: null,
        dataPoints: 30,
        calculationPeriod: {
          startDate: today,
          endDate: today,
        },
        createdAt: new Date().toISOString(),
      };

      (DynamoDBService.putItem as jest.Mock).mockRejectedValue(
        new Error('DynamoDB error')
      );

      await expect(saveIndexToDynamoDB(indexData)).rejects.toThrow(
        'Failed to save index to DynamoDB'
      );
    });
  });

  describe('getLatestIndexFromDynamoDB', () => {
    it('should return the latest index for a user', async () => {
      const today = new Date();
      const day5Ago = new Date(today);
      day5Ago.setDate(day5Ago.getDate() - 5);

      const mockItems = [
        {
          PK: 'USER#user123',
          SK: `INDEX#${day5Ago.toISOString().split('T')[0]}`,
          entityType: 'INDEX',
          userId: 'user123',
          date: day5Ago.toISOString().split('T')[0],
          stressIndex: {
            score: 40,
            breakdown: {
              creditRatioScore: 15,
              cashBufferScore: 15,
              expenseVolatilityScore: 10,
            },
            calculatedAt: day5Ago.toISOString(),
            inputParameters: {
              creditRatio: 0.3,
              cashBuffer: 1.3,
              expenseVolatility: 0.2,
            },
          },
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: {
            startDate: day5Ago.toISOString().split('T')[0],
            endDate: day5Ago.toISOString().split('T')[0],
          },
          createdAt: day5Ago.toISOString(),
          syncedAt: day5Ago.toISOString(),
        },
        {
          PK: 'USER#user123',
          SK: `INDEX#${today.toISOString().split('T')[0]}`,
          entityType: 'INDEX',
          userId: 'user123',
          date: today.toISOString().split('T')[0],
          stressIndex: {
            score: 45,
            breakdown: {
              creditRatioScore: 20,
              cashBufferScore: 15,
              expenseVolatilityScore: 10,
            },
            calculatedAt: today.toISOString(),
            inputParameters: {
              creditRatio: 0.35,
              cashBuffer: 1.2,
              expenseVolatility: 0.25,
            },
          },
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: {
            startDate: today.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
          },
          createdAt: today.toISOString(),
          syncedAt: today.toISOString(),
        },
      ];

      (DynamoDBService.queryByPK as jest.Mock).mockResolvedValue(mockItems);

      const result = await getLatestIndexFromDynamoDB('user123');

      expect(DynamoDBService.queryByPK).toHaveBeenCalledWith(
        'USER#user123',
        'INDEX#'
      );
      expect(result).not.toBeNull();
      expect(result?.date).toBe(today.toISOString().split('T')[0]);
      expect(result?.stressIndex?.score).toBe(45);
    });

    it('should return null if no indices exist for user', async () => {
      (DynamoDBService.queryByPK as jest.Mock).mockResolvedValue([]);

      const result = await getLatestIndexFromDynamoDB('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error if DynamoDB query fails', async () => {
      (DynamoDBService.queryByPK as jest.Mock).mockRejectedValue(
        new Error('DynamoDB error')
      );

      await expect(getLatestIndexFromDynamoDB('user123')).rejects.toThrow(
        'Failed to retrieve latest index from DynamoDB'
      );
    });
  });

  describe('getHistoricalIndicesFromDynamoDB', () => {
    it('should return indices within date range', async () => {
      const today = new Date();
      const day10Ago = new Date(today);
      day10Ago.setDate(day10Ago.getDate() - 10);
      const day5Ago = new Date(today);
      day5Ago.setDate(day5Ago.getDate() - 5);
      const day20Ago = new Date(today);
      day20Ago.setDate(day20Ago.getDate() - 20);

      const mockItems = [
        {
          userId: 'user123',
          date: day10Ago.toISOString().split('T')[0],
          stressIndex: {
            score: 40,
            breakdown: {
              creditRatioScore: 15,
              cashBufferScore: 15,
              expenseVolatilityScore: 10,
            },
            calculatedAt: day10Ago.toISOString(),
            inputParameters: {
              creditRatio: 0.3,
              cashBuffer: 1.3,
              expenseVolatility: 0.2,
            },
          },
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: {
            startDate: day10Ago.toISOString().split('T')[0],
            endDate: day10Ago.toISOString().split('T')[0],
          },
          createdAt: day10Ago.toISOString(),
          syncedAt: day10Ago.toISOString(),
        },
        {
          userId: 'user123',
          date: day5Ago.toISOString().split('T')[0],
          stressIndex: {
            score: 45,
            breakdown: {
              creditRatioScore: 20,
              cashBufferScore: 15,
              expenseVolatilityScore: 10,
            },
            calculatedAt: day5Ago.toISOString(),
            inputParameters: {
              creditRatio: 0.35,
              cashBuffer: 1.2,
              expenseVolatility: 0.25,
            },
          },
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: {
            startDate: day5Ago.toISOString().split('T')[0],
            endDate: day5Ago.toISOString().split('T')[0],
          },
          createdAt: day5Ago.toISOString(),
          syncedAt: day5Ago.toISOString(),
        },
        {
          userId: 'user123',
          date: day20Ago.toISOString().split('T')[0],
          stressIndex: {
            score: 50,
            breakdown: {
              creditRatioScore: 25,
              cashBufferScore: 15,
              expenseVolatilityScore: 10,
            },
            calculatedAt: day20Ago.toISOString(),
            inputParameters: {
              creditRatio: 0.4,
              cashBuffer: 1.1,
              expenseVolatility: 0.25,
            },
          },
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: {
            startDate: day20Ago.toISOString().split('T')[0],
            endDate: day20Ago.toISOString().split('T')[0],
          },
          createdAt: day20Ago.toISOString(),
          syncedAt: day20Ago.toISOString(),
        },
      ];

      (DynamoDBService.queryByPK as jest.Mock).mockResolvedValue(mockItems);

      const result = await getHistoricalIndicesFromDynamoDB(
        'user123',
        day10Ago.toISOString().split('T')[0],
        day5Ago.toISOString().split('T')[0]
      );

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe(day5Ago.toISOString().split('T')[0]);
      expect(result[1].date).toBe(day10Ago.toISOString().split('T')[0]);
    });

    it('should return empty array if no indices in range', async () => {
      const today = new Date();
      const day5Ago = new Date(today);
      day5Ago.setDate(day5Ago.getDate() - 5);
      const day30Ago = new Date(today);
      day30Ago.setDate(day30Ago.getDate() - 30);
      const day60Ago = new Date(today);
      day60Ago.setDate(day60Ago.getDate() - 60);

      const mockItems = [
        {
          userId: 'user123',
          date: day5Ago.toISOString().split('T')[0],
          stressIndex: {
            score: 45,
            breakdown: {
              creditRatioScore: 20,
              cashBufferScore: 15,
              expenseVolatilityScore: 10,
            },
            calculatedAt: day5Ago.toISOString(),
            inputParameters: {
              creditRatio: 0.35,
              cashBuffer: 1.2,
              expenseVolatility: 0.25,
            },
          },
          affordabilityIndex: null,
          dataPoints: 30,
          calculationPeriod: {
            startDate: day5Ago.toISOString().split('T')[0],
            endDate: day5Ago.toISOString().split('T')[0],
          },
          createdAt: day5Ago.toISOString(),
          syncedAt: day5Ago.toISOString(),
        },
      ];

      (DynamoDBService.queryByPK as jest.Mock).mockResolvedValue(mockItems);

      const result = await getHistoricalIndicesFromDynamoDB(
        'user123',
        day60Ago.toISOString().split('T')[0],
        day30Ago.toISOString().split('T')[0]
      );

      expect(result).toHaveLength(0);
    });

    it('should return empty array if no data exists', async () => {
      (DynamoDBService.queryByPK as jest.Mock).mockResolvedValue([]);

      const today = new Date();
      const day30Ago = new Date(today);
      day30Ago.setDate(day30Ago.getDate() - 30);

      const result = await getHistoricalIndicesFromDynamoDB(
        'user123',
        day30Ago.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      expect(result).toHaveLength(0);
    });

    it('should throw error if DynamoDB query fails', async () => {
      (DynamoDBService.queryByPK as jest.Mock).mockRejectedValue(
        new Error('DynamoDB error')
      );

      const today = new Date();
      const day30Ago = new Date(today);
      day30Ago.setDate(day30Ago.getDate() - 30);

      await expect(
        getHistoricalIndicesFromDynamoDB(
          'user123',
          day30Ago.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        )
      ).rejects.toThrow('Failed to retrieve historical indices from DynamoDB');
    });
  });
});
