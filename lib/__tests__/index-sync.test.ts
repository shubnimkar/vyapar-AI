// Unit tests for index-sync localStorage functions

import {
  saveIndexToLocalStorage,
  getLatestIndexFromLocalStorage,
  getHistoricalIndicesFromLocalStorage,
  getLocalIndices,
  clearLocalData,
} from '../index-sync';
import type { IndexData } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('index-sync localStorage functions', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('saveIndexToLocalStorage', () => {
    it('should save index data to localStorage', () => {
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

      saveIndexToLocalStorage(indexData);

      const stored = getLocalIndices();
      expect(stored).toHaveLength(1);
      expect(stored[0].userId).toBe('user123');
      expect(stored[0].date).toBe(today);
      expect(stored[0].stressIndex?.score).toBe(45);
      expect(stored[0].syncStatus).toBe('pending');
    });

    it('should update existing entry for same date and user', () => {
      const today = new Date().toISOString().split('T')[0];
      const indexData1: IndexData = {
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

      const laterTime = new Date(Date.now() + 3600000).toISOString();
      const indexData2: IndexData = {
        ...indexData1,
        stressIndex: {
          ...indexData1.stressIndex!,
          score: 50,
        },
        createdAt: laterTime,
      };

      saveIndexToLocalStorage(indexData1);
      saveIndexToLocalStorage(indexData2);

      const stored = getLocalIndices();
      expect(stored).toHaveLength(1);
      expect(stored[0].stressIndex?.score).toBe(50);
      expect(stored[0].createdAt).toBe(laterTime);
    });

    it('should prune entries older than 90 days', () => {
      const today = new Date();
      const day91Ago = new Date(today);
      day91Ago.setDate(day91Ago.getDate() - 91);
      const day89Ago = new Date(today);
      day89Ago.setDate(day89Ago.getDate() - 89);

      const oldIndexData: IndexData = {
        userId: 'user123',
        date: day91Ago.toISOString().split('T')[0],
        stressIndex: {
          score: 30,
          breakdown: {
            creditRatioScore: 10,
            cashBufferScore: 10,
            expenseVolatilityScore: 10,
          },
          calculatedAt: day91Ago.toISOString(),
          inputParameters: {
            creditRatio: 0.2,
            cashBuffer: 1.5,
            expenseVolatility: 0.2,
          },
        },
        affordabilityIndex: null,
        dataPoints: 30,
        calculationPeriod: {
          startDate: day91Ago.toISOString().split('T')[0],
          endDate: day91Ago.toISOString().split('T')[0],
        },
        createdAt: day91Ago.toISOString(),
      };

      const recentIndexData: IndexData = {
        userId: 'user123',
        date: day89Ago.toISOString().split('T')[0],
        stressIndex: {
          score: 45,
          breakdown: {
            creditRatioScore: 20,
            cashBufferScore: 15,
            expenseVolatilityScore: 10,
          },
          calculatedAt: day89Ago.toISOString(),
          inputParameters: {
            creditRatio: 0.35,
            cashBuffer: 1.2,
            expenseVolatility: 0.25,
          },
        },
        affordabilityIndex: null,
        dataPoints: 30,
        calculationPeriod: {
          startDate: day89Ago.toISOString().split('T')[0],
          endDate: day89Ago.toISOString().split('T')[0],
        },
        createdAt: day89Ago.toISOString(),
      };

      saveIndexToLocalStorage(oldIndexData);
      saveIndexToLocalStorage(recentIndexData);

      const stored = getLocalIndices();
      expect(stored).toHaveLength(1);
      expect(stored[0].date).toBe(day89Ago.toISOString().split('T')[0]);
    });
  });

  describe('getLatestIndexFromLocalStorage', () => {
    it('should return the latest index for a user', () => {
      const today = new Date();
      const day5Ago = new Date(today);
      day5Ago.setDate(day5Ago.getDate() - 5);
      
      const indexData1: IndexData = {
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
      };

      const indexData2: IndexData = {
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
      };

      saveIndexToLocalStorage(indexData1);
      saveIndexToLocalStorage(indexData2);

      const latest = getLatestIndexFromLocalStorage('user123');
      expect(latest).not.toBeNull();
      expect(latest?.date).toBe(today.toISOString().split('T')[0]);
      expect(latest?.stressIndex?.score).toBe(45);
    });

    it('should return null if no indices exist for user', () => {
      const latest = getLatestIndexFromLocalStorage('nonexistent');
      expect(latest).toBeNull();
    });

    it('should not include syncStatus in returned data', () => {
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

      saveIndexToLocalStorage(indexData);

      const latest = getLatestIndexFromLocalStorage('user123');
      expect(latest).not.toBeNull();
      expect(latest).not.toHaveProperty('syncStatus');
      expect(latest).not.toHaveProperty('lastSyncAttempt');
    });
  });

  describe('getHistoricalIndicesFromLocalStorage', () => {
    it('should return indices within date range', () => {
      const today = new Date();
      const day10Ago = new Date(today);
      day10Ago.setDate(day10Ago.getDate() - 10);
      const day5Ago = new Date(today);
      day5Ago.setDate(day5Ago.getDate() - 5);
      const day20Ago = new Date(today);
      day20Ago.setDate(day20Ago.getDate() - 20);
      
      const indexData1: IndexData = {
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
      };

      const indexData2: IndexData = {
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
      };

      const indexData3: IndexData = {
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
      };

      saveIndexToLocalStorage(indexData1);
      saveIndexToLocalStorage(indexData2);
      saveIndexToLocalStorage(indexData3);

      const historical = getHistoricalIndicesFromLocalStorage(
        'user123', 
        day10Ago.toISOString().split('T')[0], 
        day5Ago.toISOString().split('T')[0]
      );
      expect(historical).toHaveLength(2);
      expect(historical[0].date).toBe(day5Ago.toISOString().split('T')[0]);
      expect(historical[1].date).toBe(day10Ago.toISOString().split('T')[0]);
    });

    it('should return empty array if no indices in range', () => {
      const today = new Date();
      const day5Ago = new Date(today);
      day5Ago.setDate(day5Ago.getDate() - 5);
      const day30Ago = new Date(today);
      day30Ago.setDate(day30Ago.getDate() - 30);
      const day60Ago = new Date(today);
      day60Ago.setDate(day60Ago.getDate() - 60);
      
      const indexData: IndexData = {
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
      };

      saveIndexToLocalStorage(indexData);

      const historical = getHistoricalIndicesFromLocalStorage(
        'user123', 
        day60Ago.toISOString().split('T')[0], 
        day30Ago.toISOString().split('T')[0]
      );
      expect(historical).toHaveLength(0);
    });

    it('should filter by userId', () => {
      const today = new Date().toISOString().split('T')[0];
      const day30Ago = new Date();
      day30Ago.setDate(day30Ago.getDate() - 30);
      
      const indexData1: IndexData = {
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

      const indexData2: IndexData = {
        userId: 'user456',
        date: today,
        stressIndex: {
          score: 30,
          breakdown: {
            creditRatioScore: 10,
            cashBufferScore: 10,
            expenseVolatilityScore: 10,
          },
          calculatedAt: new Date().toISOString(),
          inputParameters: {
            creditRatio: 0.2,
            cashBuffer: 1.5,
            expenseVolatility: 0.2,
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

      saveIndexToLocalStorage(indexData1);
      saveIndexToLocalStorage(indexData2);

      const historical = getHistoricalIndicesFromLocalStorage(
        'user123', 
        day30Ago.toISOString().split('T')[0], 
        today
      );
      expect(historical).toHaveLength(1);
      expect(historical[0].userId).toBe('user123');
    });

    it('should not include syncStatus in returned data', () => {
      const today = new Date().toISOString().split('T')[0];
      const day30Ago = new Date();
      day30Ago.setDate(day30Ago.getDate() - 30);
      
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

      saveIndexToLocalStorage(indexData);

      const historical = getHistoricalIndicesFromLocalStorage(
        'user123', 
        day30Ago.toISOString().split('T')[0], 
        today
      );
      expect(historical).toHaveLength(1);
      expect(historical[0]).not.toHaveProperty('syncStatus');
      expect(historical[0]).not.toHaveProperty('lastSyncAttempt');
    });
  });

  describe('clearLocalData', () => {
    it('should clear all index data from localStorage', () => {
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

      saveIndexToLocalStorage(indexData);
      expect(getLocalIndices()).toHaveLength(1);

      clearLocalData();
      expect(getLocalIndices()).toHaveLength(0);
    });
  });
});
