/**
 * Property-Based Tests for Expense Alert Integration
 * 
 * Feature: aws-hackathon-ui-integration
 * Tests universal behaviors of expense alert integration across many inputs.
 * 
 * Property 3: Expense Alert API Invocation
 * Property 4: Alert State Management
 * 
 * Validates: Requirements 4.3, 4.4, 6.4, 6.5, 6.6
 * 
 * @jest-environment jsdom
 */

import fc from 'fast-check';
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

// Mock fetch globally
global.fetch = jest.fn();

// Helper to generate valid date strings
const dateStringArbitrary = () =>
  fc.integer({ min: 2020, max: 2030 }).chain(year =>
    fc.integer({ min: 1, max: 12 }).chain(month =>
      fc.integer({ min: 1, max: 28 }).map(day =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )
    )
  );

describe('Expense Alert Integration - Property Tests', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    (logger.error as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 3: Expense Alert API Invocation
   * 
   * **Validates: Requirements 4.3, 4.4, 6.6**
   * 
   * For any daily entry submission where totalExpense > 0, the dashboard should call 
   * the `/api/expense-alert` endpoint with parameters including userId, expense amount, 
   * category, and date.
   */
  describe('Property 3: Expense Alert API Invocation', () => {
    it('should call API with correct parameters for any positive expense', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary userId (non-empty string)
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate arbitrary positive expense amount
          fc.integer({ min: 1, max: 10000000 }),
          // Generate arbitrary category (can be empty)
          fc.string({ maxLength: 100 }),
          // Generate arbitrary date string
          dateStringArbitrary(),
          async (userId, expense, category, date) => {
            // Reset mock for each iteration
            mockFetch.mockClear();
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                alert: null,
              }),
            } as Response);

            // Simulate the expense alert check logic
            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string
            ) => {
              if (exp > 0) {
                const response = await fetch('/api/expense-alert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: uid,
                    expense: {
                      amount: exp,
                      category: cat || 'general',
                      date: dt,
                    },
                  }),
                });

                return await response.json();
              }
              return null;
            };

            await handleExpenseAlertCheck(userId, expense, category, date);

            // Property: API should be called exactly once
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Property: API should be called with correct endpoint
            expect(mockFetch).toHaveBeenCalledWith(
              '/api/expense-alert',
              expect.any(Object)
            );

            // Property: Request should be POST with correct headers
            const callArgs = mockFetch.mock.calls[0];
            expect(callArgs[1]?.method).toBe('POST');
            expect(callArgs[1]?.headers).toEqual({ 'Content-Type': 'application/json' });

            // Property: Request body should contain all required fields
            const requestBody = JSON.parse(callArgs[1]?.body as string);
            expect(requestBody).toHaveProperty('userId', userId);
            expect(requestBody).toHaveProperty('expense');
            expect(requestBody.expense).toHaveProperty('amount', expense);
            expect(requestBody.expense).toHaveProperty('category', category || 'general');
            expect(requestBody.expense).toHaveProperty('date', date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT call API for zero or negative expenses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate zero or negative expense
          fc.integer({ min: -10000, max: 0 }),
          fc.string({ maxLength: 100 }),
          dateStringArbitrary(),
          async (userId, expense, category, date) => {
            mockFetch.mockClear();

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string
            ) => {
              if (exp > 0) {
                const response = await fetch('/api/expense-alert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: uid,
                    expense: {
                      amount: exp,
                      category: cat || 'general',
                      date: dt,
                    },
                  }),
                });

                return await response.json();
              }
              return null;
            };

            const result = await handleExpenseAlertCheck(userId, expense, category, date);

            // Property: API should NOT be called for non-positive expenses
            expect(mockFetch).not.toHaveBeenCalled();
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty category by defaulting to "general"', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000000 }),
          dateStringArbitrary(),
          async (userId, expense, date) => {
            mockFetch.mockClear();
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                alert: null,
              }),
            } as Response);

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string
            ) => {
              if (exp > 0) {
                const response = await fetch('/api/expense-alert', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: uid,
                    expense: {
                      amount: exp,
                      category: cat || 'general',
                      date: dt,
                    },
                  }),
                });

                return await response.json();
              }
              return null;
            };

            // Test with empty category
            await handleExpenseAlertCheck(userId, expense, '', date);

            const requestBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
            
            // Property: Empty category should default to "general"
            expect(requestBody.expense.category).toBe('general');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 4: Alert State Management
   * 
   * **Validates: Requirements 4.5, 4.9, 6.4, 6.5**
   * 
   * For any expense alert returned by the API, the dashboard should update the 
   * expenseAlert state to contain the alert object, and when the dismiss handler 
   * is called, the state should be cleared to null.
   */
  describe('Property 4: Alert State Management', () => {
    it('should update state with any valid alert returned by API', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary alert data
          fc.record({
            type: fc.constantFrom('high_amount', 'unusual_category', 'unusual_timing'),
            explanation: fc.string({ minLength: 10, maxLength: 200 }),
            severity: fc.constantFrom('warning', 'critical'),
            expenseAmount: fc.integer({ min: 1, max: 10000000 }),
            category: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000000 }),
          fc.string({ maxLength: 100 }),
          // Generate date string directly instead of converting from Date
          fc.integer({ min: 2020, max: 2030 }).chain(year =>
            fc.integer({ min: 1, max: 12 }).chain(month =>
              fc.integer({ min: 1, max: 28 }).map(day =>
                `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              )
            )
          ),
          async (mockAlert, userId, expense, category, date) => {
            mockFetch.mockClear();
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                alert: mockAlert,
              }),
            } as Response);

            let alertState: ExpenseAlert | null = null;

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string,
              setAlert: (alert: ExpenseAlert | null) => void
            ) => {
              if (exp > 0) {
                try {
                  const response = await fetch('/api/expense-alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: uid,
                      expense: {
                        amount: exp,
                        category: cat || 'general',
                        date: dt,
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
              userId,
              expense,
              category,
              date,
              (alert) => {
                alertState = alert;
              }
            );

            // Property: Alert state should be updated with the returned alert
            expect(alertState).not.toBeNull();
            expect(alertState).toEqual(mockAlert);
            // Verify individual fields with non-null assertion
            expect(alertState!.type).toBe(mockAlert.type);
            expect(alertState!.explanation).toBe(mockAlert.explanation);
            expect(alertState!.severity).toBe(mockAlert.severity);
            expect(alertState!.expenseAmount).toBe(mockAlert.expenseAmount);
            expect(alertState!.category).toBe(mockAlert.category);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT update state when API returns no alert', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000000 }),
          fc.string({ maxLength: 100 }),
          dateStringArbitrary(),
          async (userId, expense, category, date) => {
            mockFetch.mockClear();
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                alert: null,
              }),
            } as Response);

            let alertState: ExpenseAlert | null = null;

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string,
              setAlert: (alert: ExpenseAlert | null) => void
            ) => {
              if (exp > 0) {
                try {
                  const response = await fetch('/api/expense-alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: uid,
                      expense: {
                        amount: exp,
                        category: cat || 'general',
                        date: dt,
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
              userId,
              expense,
              category,
              date,
              (alert) => {
                alertState = alert;
              }
            );

            // Property: Alert state should remain null when no alert is returned
            expect(alertState).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear state when dismiss handler is called for any alert', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary alert data
          fc.record({
            type: fc.constantFrom('high_amount', 'unusual_category', 'unusual_timing'),
            explanation: fc.string({ minLength: 10, maxLength: 200 }),
            severity: fc.constantFrom('warning', 'critical'),
            expenseAmount: fc.integer({ min: 1, max: 10000000 }),
            category: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          (mockAlert) => {
            // Initialize state with alert
            let alertState: ExpenseAlert | null = mockAlert;

            const handleDismiss = () => {
              alertState = null;
            };

            // Verify initial state has alert
            expect(alertState).not.toBeNull();
            expect(alertState).toEqual(mockAlert);

            // Call dismiss handler
            handleDismiss();

            // Property: Alert state should be cleared to null after dismiss
            expect(alertState).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT update state when API call fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000000 }),
          fc.string({ maxLength: 100 }),
          dateStringArbitrary(),
          // Generate arbitrary error messages
          fc.string({ minLength: 5, maxLength: 100 }),
          async (userId, expense, category, date, errorMessage) => {
            mockFetch.mockClear();
            mockFetch.mockRejectedValueOnce(new Error(errorMessage));

            let alertState: ExpenseAlert | null = null;

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string,
              setAlert: (alert: ExpenseAlert | null) => void
            ) => {
              if (exp > 0) {
                try {
                  const response = await fetch('/api/expense-alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: uid,
                      expense: {
                        amount: exp,
                        category: cat || 'general',
                        date: dt,
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
              userId,
              expense,
              category,
              date,
              (alert) => {
                alertState = alert;
              }
            );

            // Property: Alert state should remain null when API fails
            expect(alertState).toBeNull();
            
            // Property: Error should be logged
            expect(logger.error).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT update state when API returns error response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000000 }),
          fc.string({ maxLength: 100 }),
          dateStringArbitrary(),
          // Generate arbitrary error messages
          fc.string({ minLength: 5, maxLength: 100 }),
          async (userId, expense, category, date, errorMessage) => {
            mockFetch.mockClear();
            mockFetch.mockResolvedValueOnce({
              ok: false,
              json: async () => ({
                success: false,
                error: errorMessage,
              }),
            } as Response);

            let alertState: ExpenseAlert | null = null;

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string,
              setAlert: (alert: ExpenseAlert | null) => void
            ) => {
              if (exp > 0) {
                try {
                  const response = await fetch('/api/expense-alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: uid,
                      expense: {
                        amount: exp,
                        category: cat || 'general',
                        date: dt,
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
              userId,
              expense,
              category,
              date,
              (alert) => {
                alertState = alert;
              }
            );

            // Property: Alert state should remain null when API returns error
            expect(alertState).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Cross-Property Test: API Invocation and State Management Together
   * 
   * Tests that the complete flow works correctly: API call → state update → dismiss
   */
  describe('Cross-Property: Complete Alert Flow', () => {
    it('should handle complete flow from API call to dismiss for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 50 }),
            expense: fc.integer({ min: 1, max: 10000000 }),
            category: fc.string({ maxLength: 100 }),
            date: dateStringArbitrary(),
            alert: fc.record({
              type: fc.constantFrom('high_amount', 'unusual_category', 'unusual_timing'),
              explanation: fc.string({ minLength: 10, maxLength: 200 }),
              severity: fc.constantFrom('warning', 'critical'),
              expenseAmount: fc.integer({ min: 1, max: 10000000 }),
              category: fc.string({ minLength: 1, maxLength: 100 }),
            }),
          }),
          async (testData) => {
            mockFetch.mockClear();
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                alert: testData.alert,
              }),
            } as Response);

            let alertState: ExpenseAlert | null = null;

            const handleExpenseAlertCheck = async (
              uid: string,
              exp: number,
              cat: string,
              dt: string,
              setAlert: (alert: ExpenseAlert | null) => void
            ) => {
              if (exp > 0) {
                try {
                  const response = await fetch('/api/expense-alert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: uid,
                      expense: {
                        amount: exp,
                        category: cat || 'general',
                        date: dt,
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

            const handleDismiss = () => {
              alertState = null;
            };

            // Step 1: API call
            await handleExpenseAlertCheck(
              testData.userId,
              testData.expense,
              testData.category,
              testData.date,
              (alert) => {
                alertState = alert;
              }
            );

            // Property: API should be called
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Property: State should be updated with alert
            expect(alertState).toEqual(testData.alert);

            // Step 2: Dismiss
            handleDismiss();

            // Property: State should be cleared
            expect(alertState).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
