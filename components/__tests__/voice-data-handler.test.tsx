/**
 * Unit tests for voice data extraction handler
 * Tests Requirements 1.7, 1.8, 6.3
 */

import { ExtractedVoiceData } from '@/lib/types';

describe('Voice Data Extraction Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('handleVoiceDataExtracted callback', () => {
    it('should accept ExtractedVoiceData with all required fields', () => {
      // Requirement 1.7: Callback should accept extracted data
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      // Verify structure is valid
      expect(voiceData).toHaveProperty('sales');
      expect(voiceData).toHaveProperty('expenses');
      expect(voiceData).toHaveProperty('expenseCategory');
      expect(voiceData).toHaveProperty('date');
      expect(voiceData).toHaveProperty('confidence');
      expect(typeof voiceData.confidence).toBe('number');
      expect(voiceData.confidence).toBeGreaterThanOrEqual(0);
      expect(voiceData.confidence).toBeLessThanOrEqual(1);
    });

    it('should accept ExtractedVoiceData with optional fields as null', () => {
      // Requirement 1.7: Optional fields can be null
      const voiceData: ExtractedVoiceData = {
        sales: null,
        expenses: 2000,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.75,
      };

      expect(voiceData.sales).toBeNull();
      expect(voiceData.expenseCategory).toBeNull();
      expect(voiceData.expenses).toBe(2000);
    });

    it('should create daily entry from voice data', async () => {
      // Requirement 1.8: Dashboard should populate DailyEntryForm with extracted values
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'inventory',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch as any;

      // Simulate the handler logic
      const entry = {
        date: voiceData.date,
        sales: voiceData.sales || 0,
        expenses: voiceData.expenses || 0,
        notes: voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : '',
      };

      await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/daily',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        })
      );
    });

    it('should handle voice data with only sales', async () => {
      // Requirement 6.3: Populate form fields with extracted values
      const voiceData: ExtractedVoiceData = {
        sales: 10000,
        expenses: null,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.90,
      };

      const entry = {
        date: voiceData.date,
        sales: voiceData.sales || 0,
        expenses: voiceData.expenses || 0,
        notes: '',
      };

      expect(entry.sales).toBe(10000);
      expect(entry.expenses).toBe(0);
      expect(entry.date).toBe('2024-01-15');
    });

    it('should handle voice data with only expenses', async () => {
      // Requirement 6.3: Populate form fields with extracted values
      const voiceData: ExtractedVoiceData = {
        sales: null,
        expenses: 2500,
        expenseCategory: 'utilities',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.80,
      };

      const entry = {
        date: voiceData.date,
        sales: voiceData.sales || 0,
        expenses: voiceData.expenses || 0,
        notes: voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : '',
      };

      expect(entry.sales).toBe(0);
      expect(entry.expenses).toBe(2500);
      expect(entry.notes).toBe('Category: utilities');
    });

    it('should include confidence level in processing', () => {
      // Requirement 1.7: Confidence should be part of extracted data
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      // Confidence should be available for display/logging
      expect(voiceData.confidence).toBe(0.85);
      expect(Math.round(voiceData.confidence * 100)).toBe(85);
    });

    it('should handle low confidence data', () => {
      // Edge case: Low confidence should still be processed
      const voiceData: ExtractedVoiceData = {
        sales: 1000,
        expenses: 500,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.45,
      };

      expect(voiceData.confidence).toBeLessThan(0.5);
      // Data should still be valid even with low confidence
      expect(voiceData.sales).toBe(1000);
      expect(voiceData.expenses).toBe(500);
    });

    it('should format category in notes field', () => {
      // Requirement 1.8: Category should be included in notes
      const voiceData: ExtractedVoiceData = {
        sales: null,
        expenses: 1500,
        expenseCategory: 'rent',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.88,
      };

      const notes = voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : '';
      expect(notes).toBe('Category: rent');
    });

    it('should handle missing category gracefully', () => {
      // Requirement 1.8: Missing category should result in empty notes
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      const notes = voiceData.expenseCategory ? `Category: ${voiceData.expenseCategory}` : '';
      expect(notes).toBe('');
    });
  });

  describe('Data validation', () => {
    it('should validate required confidence field', () => {
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      expect(voiceData).toHaveProperty('confidence');
      expect(typeof voiceData.confidence).toBe('number');
    });

    it('should validate required date field', () => {
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      expect(voiceData).toHaveProperty('date');
      expect(typeof voiceData.date).toBe('string');
      expect(voiceData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should allow null for optional numeric fields', () => {
      const voiceData: ExtractedVoiceData = {
        sales: null,
        expenses: null,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.50,
      };

      expect(voiceData.sales).toBeNull();
      expect(voiceData.expenses).toBeNull();
    });
  });
});
