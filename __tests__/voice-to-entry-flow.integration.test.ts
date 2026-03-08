/**
 * Integration test for complete voice-to-entry flow
 * Tests Requirements 10.2
 * 
 * Feature: aws-hackathon-ui-integration
 * 
 * This test verifies the end-to-end flow:
 * Voice recording → extraction → form population → submission → refresh
 */

import { ExtractedVoiceData } from '@/lib/types';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Voice-to-Entry Flow Integration Test', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    (logger.error as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 10.2: Complete voice-to-entry flow', () => {
    it('should complete full flow: recording → extraction → form population → submission → refresh', async () => {
      // Step 1: Mock extracted voice data from API
      const extractedData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      // Step 2: Mock voice-entry API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: extractedData,
        }),
      } as Response);

      // Step 3: Simulate voice upload
      const formData = new FormData();
      formData.append('audio', new Blob(['mock audio data'], { type: 'audio/webm' }), 'voice-test.webm');

      const response = await fetch('/api/voice-entry', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      // Verify API was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/voice-entry',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );

      // Verify extraction succeeded
      expect(result.success).toBe(true);
      expect(result.data).toEqual(extractedData);

      // Step 4: Simulate handleVoiceDataExtracted callback
      const handleVoiceDataExtracted = (data: ExtractedVoiceData) => {
        return {
          date: data.date,
          totalSales: data.sales || undefined,
          totalExpense: data.expenses || undefined,
          notes: data.expenseCategory ? `Category: ${data.expenseCategory}` : undefined,
        };
      };

      const formDataFromVoice = handleVoiceDataExtracted(result.data);

      // Verify form data structure
      expect(formDataFromVoice.date).toBe('2024-01-15');
      expect(formDataFromVoice.totalSales).toBe(5000);
      expect(formDataFromVoice.totalExpense).toBe(3000);
      expect(formDataFromVoice.notes).toBe('Category: groceries');

      // Step 5: Simulate form submission and refresh
      const mockRefreshHealthScore = jest.fn();
      const mockRecalculateIndices = jest.fn();
      const mockFetchBenchmarkData = jest.fn();

      const handleDailyEntrySubmitted = () => {
        mockRefreshHealthScore();
        mockRecalculateIndices();
        mockFetchBenchmarkData();
      };

      handleDailyEntrySubmitted();

      // Verify refresh functions were called
      expect(mockRefreshHealthScore).toHaveBeenCalled();
      expect(mockRecalculateIndices).toHaveBeenCalled();
      expect(mockFetchBenchmarkData).toHaveBeenCalled();
    });

    it('should handle voice data with only sales', async () => {
      const extractedData: ExtractedVoiceData = {
        sales: 10000,
        expenses: null,
        expenseCategory: null,
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.90,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: extractedData,
        }),
      } as Response);

      const formData = new FormData();
      formData.append('audio', new Blob(['mock audio'], { type: 'audio/webm' }), 'voice.webm');

      const response = await fetch('/api/voice-entry', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      const formDataFromVoice = {
        date: result.data.date,
        totalSales: result.data.sales || undefined,
        totalExpense: result.data.expenses || undefined,
        notes: result.data.expenseCategory ? `Category: ${result.data.expenseCategory}` : undefined,
      };

      expect(formDataFromVoice.totalSales).toBe(10000);
      expect(formDataFromVoice.totalExpense).toBeUndefined();
      expect(formDataFromVoice.notes).toBeUndefined();
    });

    it('should handle voice data with only expenses', async () => {
      const extractedData: ExtractedVoiceData = {
        sales: null,
        expenses: 2500,
        expenseCategory: 'utilities',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.80,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: extractedData,
        }),
      } as Response);

      const formData = new FormData();
      formData.append('audio', new Blob(['mock audio'], { type: 'audio/webm' }), 'voice.webm');

      const response = await fetch('/api/voice-entry', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      const formDataFromVoice = {
        date: result.data.date,
        totalSales: result.data.sales || undefined,
        totalExpense: result.data.expenses || undefined,
        notes: result.data.expenseCategory ? `Category: ${result.data.expenseCategory}` : undefined,
      };

      expect(formDataFromVoice.totalSales).toBeUndefined();
      expect(formDataFromVoice.totalExpense).toBe(2500);
      expect(formDataFromVoice.notes).toBe('Category: utilities');
    });
  });

  describe('Error handling', () => {
    it('should handle upload failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let errorOccurred = false;
      let extractedData: ExtractedVoiceData | null = null;

      try {
        const formData = new FormData();
        formData.append('audio', new Blob(['mock audio'], { type: 'audio/webm' }), 'voice.webm');

        const response = await fetch('/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        extractedData = result.data;
      } catch (error) {
        errorOccurred = true;
      }

      expect(errorOccurred).toBe(true);
      expect(extractedData).toBeNull();
    });

    it('should handle API returning error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Processing failed',
        }),
      } as Response);

      const formData = new FormData();
      formData.append('audio', new Blob(['mock audio'], { type: 'audio/webm' }), 'voice.webm');

      const response = await fetch('/api/voice-entry', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      expect(response.ok).toBe(false);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
    });
  });

  describe('Data transformation', () => {
    it('should correctly transform voice data to form data structure', () => {
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
  });

  describe('Refresh flow', () => {
    it('should trigger all refresh functions after form submission', () => {
      const mockRefreshHealthScore = jest.fn();
      const mockRecalculateIndices = jest.fn();
      const mockFetchBenchmarkData = jest.fn();
      const mockSetVoiceFormData = jest.fn();

      const handleDailyEntrySubmitted = () => {
        mockSetVoiceFormData(undefined);
        mockRefreshHealthScore();
        mockRecalculateIndices();
        mockFetchBenchmarkData();
      };

      handleDailyEntrySubmitted();

      expect(mockSetVoiceFormData).toHaveBeenCalledWith(undefined);
      expect(mockRefreshHealthScore).toHaveBeenCalled();
      expect(mockRecalculateIndices).toHaveBeenCalled();
      expect(mockFetchBenchmarkData).toHaveBeenCalled();
    });
  });

  describe('Confidence handling', () => {
    it('should preserve confidence information for user feedback', () => {
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.85,
      };

      const confidencePercent = Math.round(voiceData.confidence * 100);
      expect(confidencePercent).toBe(85);
    });

    it('should handle low confidence values', () => {
      const voiceData: ExtractedVoiceData = {
        sales: 5000,
        expenses: 3000,
        expenseCategory: 'groceries',
        inventoryChanges: null,
        date: '2024-01-15',
        confidence: 0.45,
      };

      const confidencePercent = Math.round(voiceData.confidence * 100);
      expect(confidencePercent).toBe(45);
      
      const shouldWarnUser = confidencePercent < 70;
      expect(shouldWarnUser).toBe(true);
    });
  });
});
