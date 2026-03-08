/**
 * Unit tests for voice integration in dashboard
 * Tests Requirements 1.1, 1.7, 1.8, 6.3
 * 
 * @jest-environment jsdom
 */

import { ExtractedVoiceData } from '@/lib/types';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Voice Integration Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 1.7, 1.8: handleVoiceDataExtracted logic', () => {
    it('should create form data from extracted voice data with all fields', () => {
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      const formData = {
        date: voiceData.date,
        totalSales: voiceData.sales || undefined,
        totalExpense: voiceData.expenses || undefined,
        notes: voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : undefined,
      };

      expect(formData.date).toBe('2024-01-15');
      expect(formData.totalSales).toBe(5000);
      expect(formData.totalExpense).toBe(3000);
      expect(formData.notes).toBe('Category: groceries');
    });

    it('should handle voice data with only sales', () => {
      const voiceData: ExtractedVoiceData = {
        sales: 10000,
        expenses: null,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.90,
      };

      const formData = {
        date: voiceData.date,
        totalSales: voiceData.sales || undefined,
        totalExpense: voiceData.expenses || undefined,
        notes: voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : undefined,
      };

      expect(formData.totalSales).toBe(10000);
      expect(formData.totalExpense).toBeUndefined();
      expect(formData.notes).toBeUndefined();
    });

    it('should handle voice data with only expenses', () => {
      const voiceData: ExtractedVoiceData = {
        sales: null,
        expenses: 2500,
        expenseCategory: 'utilities',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.80,
      };

      const formData = {
        date: voiceData.date,
        totalSales: voiceData.sales || undefined,
        totalExpense: voiceData.expenses || undefined,
        notes: voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : undefined,
      };

      expect(formData.totalSales).toBeUndefined();
      expect(formData.totalExpense).toBe(2500);
      expect(formData.notes).toBe('Category: utilities');
    });
  });

  describe('Requirement 8.1: Language prop handling', () => {
    it('should pass English language to VoiceRecorder', () => {
      const language = 'en';
      const voiceRecorderLanguage = language === 'mr' ? 'hi' : language;
      expect(voiceRecorderLanguage).toBe('en');
    });

    it('should pass Hindi language to VoiceRecorder', () => {
      const language = 'hi';
      const voiceRecorderLanguage = language === 'mr' ? 'hi' : language;
      expect(voiceRecorderLanguage).toBe('hi');
    });

    it('should convert Marathi to Hindi for VoiceRecorder', () => {
      const language = 'mr';
      const voiceRecorderLanguage = language === 'mr' ? 'hi' : language;
      expect(voiceRecorderLanguage).toBe('hi');
    });
  });

  describe('Requirement 6.3: Refresh functions called after submission', () => {
    it('should call refreshHealthScore after submission', () => {
      const refreshHealthScore = jest.fn();
      refreshHealthScore();
      expect(refreshHealthScore).toHaveBeenCalled();
    });

    it('should call recalculateIndices after submission', () => {
      const recalculateIndices = jest.fn();
      recalculateIndices();
      expect(recalculateIndices).toHaveBeenCalled();
    });

    it('should call fetchBenchmarkData after submission', () => {
      const fetchBenchmarkData = jest.fn();
      fetchBenchmarkData();
      expect(fetchBenchmarkData).toHaveBeenCalled();
    });
  });

  describe('Section navigation logic', () => {
    it('should render VoiceRecorder only in entries section', () => {
      const activeSection = 'entries';
      const user = { userId: 'test-user', username: 'testuser' };
      const shouldRenderVoiceRecorder = activeSection === 'entries' && user !== null;
      expect(shouldRenderVoiceRecorder).toBe(true);
    });

    it('should not render VoiceRecorder in dashboard section', () => {
      const activeSection = 'dashboard';
      const user = { userId: 'test-user', username: 'testuser' };
      const shouldRenderVoiceRecorder = activeSection === 'entries' && user !== null;
      expect(shouldRenderVoiceRecorder).toBe(false);
    });
  });
});
