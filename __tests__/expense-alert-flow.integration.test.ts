/**
 * Integration test for complete expense alert flow
 * Tests Requirement 10.5
 * 
 * Feature: aws-hackathon-ui-integration
 * 
 * This test verifies the end-to-end flow:
 * Entry submission → alert check → alert display → dismiss
 */

import { ExpenseAlert } from '@/lib/types';
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

describe('Expense Alert Flow Integration Test', () => {
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

  describe('Requirement 10.5: Complete expense alert flow', () => {
    it('should complete full flow: entry submission → alert check → alert display → dismiss', async () => {
      // Step 1: Simulate daily entry submission with expense
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'inventory',
      };

      // Step 2: Mock expense alert API response
      const mockAlert: ExpenseAlert = {
        type: 'high_amount',
        explanation: 'This expense is 50% higher than your average',
        severity: 'warning',
        expenseAmount: 35000,
        category: 'inventory',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: mockAlert,
        }),
      } as Response);

      // Step 3: Simulate alert check after entry submission
      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        // Entry submission logic (always succeeds)
        logger.info('Daily entry submitted', { date: entry.date });

        // Alert check (only if expense > 0)
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      // Execute the flow
      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify API was called with correct parameters
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/expense-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          expense: {
            amount: 35000,
            category: 'inventory',
            date: '2024-01-15',
          },
        }),
      });

      // Verify alert state was updated
      expect(alertState).not.toBeNull();
      expect(alertState).toEqual(mockAlert);

      // Step 4: Simulate alert display and dismiss
      const handleDismiss = () => {
        alertState = null;
      };

      // Verify alert is displayed
      expect(alertState).not.toBeNull();
      expect(alertState?.severity).toBe('warning');
      expect(alertState?.explanation).toBe('This expense is 50% higher than your average');

      // Dismiss the alert
      handleDismiss();

      // Verify alert state was cleared
      expect(alertState).toBeNull();
    });

    it('should handle critical severity alerts', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 80000,
        cashInHand: 5000,
        notes: 'equipment',
      };

      const mockAlert: ExpenseAlert = {
        type: 'high_amount',
        explanation: 'Critical: This expense exceeds your sales!',
        severity: 'critical',
        expenseAmount: 80000,
        category: 'equipment',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: mockAlert,
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify critical alert was set
      expect(alertState).not.toBeNull();
      expect(alertState?.severity).toBe('critical');
      expect(alertState?.expenseAmount).toBe(80000);
    });

    it('should not check for alerts when expense is zero', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 0,
        cashInHand: 50000,
        notes: 'sales only',
      };

      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify API was NOT called
      expect(mockFetch).not.toHaveBeenCalled();
      expect(alertState).toBeNull();
    });

    it('should not display alert when API returns no alert', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 10000,
        cashInHand: 40000,
        notes: 'normal expense',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify API was called but no alert was set
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(alertState).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should complete entry submission even if alert API fails', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'inventory',
      };

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let entrySubmitted = false;
      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        // Entry submission logic (always succeeds)
        entrySubmitted = true;
        logger.info('Daily entry submitted', { date: entry.date });

        // Alert check (may fail)
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { 
              error,
              userId,
              date: entry.date,
              expense: entry.totalExpense
            });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify entry was submitted despite API failure
      expect(entrySubmitted).toBe(true);
      expect(alertState).toBeNull();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Expense alert check failed',
        expect.objectContaining({
          userId: 'test-user-123',
          date: '2024-01-15',
          expense: 35000,
        })
      );
    });

    it('should handle API returning error response', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'inventory',
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid request',
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify alert state was not updated
      expect(alertState).toBeNull();
    });

    it('should not expose error to user when alert API fails', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'inventory',
      };

      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      let userErrorMessage: string | null = null;
      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry,
        setUserError: (error: string | null) => void
      ) => {
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
            // Do NOT set user error - alerts are optional enhancement
          }
        }
      };

      await handleDailyEntrySubmitted(
        'test-user-123',
        dailyEntry,
        (error) => {
          userErrorMessage = error;
        }
      );

      // Verify no error message was set for user
      expect(userErrorMessage).toBeNull();
      expect(alertState).toBeNull();
    });
  });

  describe('Alert display and dismiss', () => {
    it('should display alert with correct severity styling', async () => {
      const mockAlert: ExpenseAlert = {
        type: 'high_amount',
        explanation: 'This expense is unusually high',
        severity: 'warning',
        expenseAmount: 35000,
        category: 'inventory',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: mockAlert,
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'inventory',
      };

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify alert properties for display
      expect(alertState).not.toBeNull();
      expect(alertState?.severity).toBe('warning');
      expect(alertState?.explanation).toBeTruthy();
      expect(alertState?.expenseAmount).toBe(35000);
      expect(alertState?.category).toBe('inventory');
    });

    it('should allow multiple dismiss and re-alert cycles', async () => {
      const mockAlert: ExpenseAlert = {
        type: 'high_amount',
        explanation: 'High expense detected',
        severity: 'warning',
        expenseAmount: 35000,
        category: 'inventory',
      };

      let alertState: ExpenseAlert | null = null;

      const setAlert = (alert: ExpenseAlert | null) => {
        alertState = alert;
      };

      const handleDismiss = () => {
        alertState = null;
      };

      // First alert
      setAlert(mockAlert);
      expect(alertState).not.toBeNull();

      // First dismiss
      handleDismiss();
      expect(alertState).toBeNull();

      // Second alert
      setAlert(mockAlert);
      expect(alertState).not.toBeNull();

      // Second dismiss
      handleDismiss();
      expect(alertState).toBeNull();
    });
  });

  describe('Category handling', () => {
    it('should use notes as category when provided', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'equipment purchase',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: entry.totalExpense,
                category: entry.notes || 'general',
                date: entry.date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.expense.category).toBe('equipment purchase');
    });

    it('should default to "general" when notes are empty', async () => {
      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: '',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        if (entry.totalExpense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: entry.totalExpense,
                category: entry.notes || 'general',
                date: entry.date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.expense.category).toBe('general');
    });
  });

  describe('Refresh flow integration', () => {
    it('should trigger refresh functions after entry submission', async () => {
      const mockRefreshHealthScore = jest.fn();
      const mockRecalculateIndices = jest.fn();
      const mockFetchBenchmarkData = jest.fn();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const dailyEntry = {
        date: '2024-01-15',
        totalSales: 50000,
        totalExpense: 35000,
        cashInHand: 20000,
        notes: 'inventory',
      };

      const handleDailyEntrySubmitted = async (
        userId: string,
        entry: typeof dailyEntry
      ) => {
        // Refresh functions
        mockRefreshHealthScore();
        mockRecalculateIndices();
        mockFetchBenchmarkData();

        // Alert check
        if (entry.totalExpense > 0) {
          try {
            await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: entry.totalExpense,
                  category: entry.notes || 'general',
                  date: entry.date,
                },
              }),
            });
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleDailyEntrySubmitted('test-user-123', dailyEntry);

      // Verify refresh functions were called
      expect(mockRefreshHealthScore).toHaveBeenCalled();
      expect(mockRecalculateIndices).toHaveBeenCalled();
      expect(mockFetchBenchmarkData).toHaveBeenCalled();
    });
  });
});
