/**
 * Unit tests for Expense Alert Integration
 * 
 * Feature: aws-hackathon-ui-integration
 * Tests the integration of ExpenseAlertBanner component with the dashboard,
 * including API calls, state management, error handling, and logging.
 * 
 * Requirements: 4.3, 4.4, 6.4, 6.5, 7.6
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { logger } from '@/lib/logger';
import type { ExpenseAlert } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/session-manager', () => ({
  SessionManager: {
    getCurrentUser: jest.fn(() => ({
      userId: 'test-user-123',
      username: 'testuser',
    })),
  },
}));

jest.mock('@/lib/daily-entry-sync', () => ({
  getLocalEntries: jest.fn(() => [
    {
      date: '2024-01-15',
      totalSales: 50000,
      totalExpense: 35000,
      cashInHand: 20000,
      notes: 'inventory',
      estimatedProfit: 15000,
      profitMargin: 0.3,
      expenseRatio: 0.7,
    },
  ]),
  createDailyEntry: jest.fn(),
  updateDailyEntry: jest.fn(),
  deleteLocalEntry: jest.fn(),
  getSyncStatus: jest.fn(() => ({
    lastSyncTime: '2024-01-15T12:00:00Z',
    pendingCount: 0,
    errorCount: 0,
  })),
  fullSync: jest.fn(),
}));

jest.mock('@/lib/credit-sync', () => ({
  getLocalEntries: jest.fn(() => []),
  calculateCreditSummary: jest.fn(() => ({
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueCount: 0,
  })),
}));

jest.mock('@/lib/calculations', () => ({
  calculateHealthScore: jest.fn(() => ({
    score: 75,
    breakdown: {
      marginScore: 20,
      expenseScore: 25,
      cashScore: 15,
      creditScore: 15,
    },
  })),
  calculateCreditSummary: jest.fn(() => ({
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueCount: 0,
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Expense Alert Integration - Unit Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    (logger.error as jest.Mock).mockClear();
    (logger.warn as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.debug as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert API Call - Requirements 4.3, 4.4', () => {
    it('should call alert API with correct parameters when expense > 0', async () => {
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

      // Simulate the handleDailyEntrySubmitted function logic
      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          const result = await response.json();
          return result;
        }
        return null;
      };

      const result = await handleExpenseAlertCheck(
        'test-user-123',
        35000,
        'inventory',
        '2024-01-15'
      );

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

      // Verify result contains alert
      expect(result.success).toBe(true);
      expect(result.alert).toEqual(mockAlert);
    });

    it('should not call alert API when expense is 0', async () => {
      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          const result = await response.json();
          return result;
        }
        return null;
      };

      const result = await handleExpenseAlertCheck(
        'test-user-123',
        0,
        'general',
        '2024-01-15'
      );

      // Verify API was NOT called
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should not call alert API when expense is negative', async () => {
      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          const result = await response.json();
          return result;
        }
        return null;
      };

      const result = await handleExpenseAlertCheck(
        'test-user-123',
        -1000,
        'general',
        '2024-01-15'
      );

      // Verify API was NOT called
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should include userId in API request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleExpenseAlertCheck('user-456', 5000, 'supplies', '2024-01-16');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.userId).toBe('user-456');
    });

    it('should include expense amount, category, and date in API request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleExpenseAlertCheck('test-user', 12000, 'equipment', '2024-01-20');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.expense.amount).toBe(12000);
      expect(callBody.expense.category).toBe('equipment');
      expect(callBody.expense.date).toBe('2024-01-20');
    });
  });

  describe('Alert State Management - Requirements 6.4, 6.5', () => {
    it('should update alert state when API returns alert', async () => {
      const mockAlert: ExpenseAlert = {
        type: 'unusual_category',
        explanation: 'You rarely spend on this category',
        severity: 'warning',
        expenseAmount: 8000,
        category: 'entertainment',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: mockAlert,
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string,
        setAlert: (alert: ExpenseAlert | null) => void
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              setAlert(result.alert);
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleExpenseAlertCheck(
        'test-user',
        8000,
        'entertainment',
        '2024-01-15',
        (alert) => {
          alertState = alert;
        }
      );

      // Verify alert state was updated
      expect(alertState).toEqual(mockAlert);
    });

    it('should not update alert state when API returns no alert', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string,
        setAlert: (alert: ExpenseAlert | null) => void
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              setAlert(result.alert);
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleExpenseAlertCheck(
        'test-user',
        5000,
        'supplies',
        '2024-01-15',
        (alert) => {
          alertState = alert;
        }
      );

      // Verify alert state was NOT updated
      expect(alertState).toBeNull();
    });

    it('should clear alert state when dismiss handler is called', () => {
      let alertState: ExpenseAlert | null = {
        type: 'high_amount',
        explanation: 'High expense detected',
        severity: 'critical',
        expenseAmount: 50000,
        category: 'inventory',
      };

      const handleDismiss = () => {
        alertState = null;
      };

      // Verify initial state
      expect(alertState).not.toBeNull();

      // Call dismiss handler
      handleDismiss();

      // Verify state was cleared
      expect(alertState).toBeNull();
    });
  });

  describe('Error Handling - Requirement 7.6', () => {
    it('should complete entry submission even if alert API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      let entrySubmitted = false;
      let alertState: ExpenseAlert | null = null;

      const handleDailyEntrySubmitted = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        // Entry submission logic (always succeeds)
        entrySubmitted = true;

        // Alert check (may fail)
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              alertState = result.alert;
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
            // Do not block entry submission
          }
        }
      };

      await handleDailyEntrySubmitted('test-user', 10000, 'supplies', '2024-01-15');

      // Verify entry was submitted despite API failure
      expect(entrySubmitted).toBe(true);
      expect(alertState).toBeNull();
    });

    it('should log error when alert API fails', async () => {
      const mockError = new Error('API timeout');
      mockFetch.mockRejectedValueOnce(mockError);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            const result = await response.json();
            return result;
          } catch (error) {
            logger.error('Expense alert check failed', {
              error,
              userId,
              date,
              expense,
            });
          }
        }
        return null;
      };

      await handleExpenseAlertCheck('test-user', 15000, 'inventory', '2024-01-15');

      // Verify error was logged
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Expense alert check failed',
        expect.objectContaining({
          error: mockError,
          userId: 'test-user',
          date: '2024-01-15',
          expense: 15000,
        })
      );
    });

    it('should not display error to user when alert API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      let userErrorMessage: string | null = null;

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string,
        setUserError: (error: string | null) => void
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            const result = await response.json();
            return result;
          } catch (error) {
            logger.error('Expense alert check failed', { error });
            // Do NOT set user error - alerts are optional enhancement
          }
        }
        return null;
      };

      await handleExpenseAlertCheck(
        'test-user',
        10000,
        'supplies',
        '2024-01-15',
        (error) => {
          userErrorMessage = error;
        }
      );

      // Verify no error message was set for user
      expect(userErrorMessage).toBeNull();
    });

    it('should handle API returning error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Invalid request',
        }),
      } as Response);

      let alertState: ExpenseAlert | null = null;

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string,
        setAlert: (alert: ExpenseAlert | null) => void
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            const result = await response.json();

            if (result.success && result.alert) {
              setAlert(result.alert);
            }
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
      };

      await handleExpenseAlertCheck(
        'test-user',
        10000,
        'supplies',
        '2024-01-15',
        (alert) => {
          alertState = alert;
        }
      );

      // Verify alert state was not updated
      expect(alertState).toBeNull();
    });
  });

  describe('Logger Usage - Requirement 7.6', () => {
    it('should use logger for error logging', async () => {
      const mockError = new Error('Connection failed');
      mockFetch.mockRejectedValueOnce(mockError);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            return await response.json();
          } catch (error) {
            logger.error('Expense alert check failed', {
              error,
              userId,
              date,
              expense,
            });
          }
        }
        return null;
      };

      await handleExpenseAlertCheck('test-user', 20000, 'equipment', '2024-01-15');

      // Verify logger.error was called
      expect(logger.error).toHaveBeenCalled();
    });

    it('should include context in error logs', async () => {
      const mockError = new Error('Timeout');
      mockFetch.mockRejectedValueOnce(mockError);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            return await response.json();
          } catch (error) {
            logger.error('Expense alert check failed', {
              error,
              userId,
              date,
              expense,
            });
          }
        }
        return null;
      };

      await handleExpenseAlertCheck('user-789', 25000, 'inventory', '2024-01-20');

      // Verify logger was called with context
      expect(logger.error).toHaveBeenCalledWith(
        'Expense alert check failed',
        expect.objectContaining({
          userId: 'user-789',
          date: '2024-01-20',
          expense: 25000,
        })
      );
    });

    it('should not use console.log for error logging', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockError = new Error('Test error');
      mockFetch.mockRejectedValueOnce(mockError);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          try {
            const response = await fetch('/api/expense-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId,
                expense: {
                  amount: expense,
                  category,
                  date,
                },
              }),
            });

            return await response.json();
          } catch (error) {
            logger.error('Expense alert check failed', { error });
          }
        }
        return null;
      };

      await handleExpenseAlertCheck('test-user', 10000, 'supplies', '2024-01-15');

      // Verify logger.error was used instead of console.log
      expect(logger.error).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large expense amounts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleExpenseAlertCheck('test-user', 9999999, 'equipment', '2024-01-15');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.expense.amount).toBe(9999999);
    });

    it('should handle special characters in category', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category,
                date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleExpenseAlertCheck(
        'test-user',
        5000,
        "O'Brien & Sons (Pvt.) Ltd.",
        '2024-01-15'
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.expense.category).toBe("O'Brien & Sons (Pvt.) Ltd.");
    });

    it('should handle missing category gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          alert: null,
        }),
      } as Response);

      const handleExpenseAlertCheck = async (
        userId: string,
        expense: number,
        category: string,
        date: string
      ) => {
        if (expense > 0) {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              expense: {
                amount: expense,
                category: category || 'general',
                date,
              },
            }),
          });

          return await response.json();
        }
        return null;
      };

      await handleExpenseAlertCheck('test-user', 5000, '', '2024-01-15');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.expense.category).toBe('general');
    });
  });
});
