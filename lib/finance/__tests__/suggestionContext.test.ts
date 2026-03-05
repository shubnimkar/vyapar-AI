/**
 * Unit tests for suggestion context builder
 */

import { buildSuggestionContext, isValidDailyEntry } from '../suggestionContext';
import { DailyEntry, CreditEntry } from '../../types';

describe('buildSuggestionContext', () => {
  const createEntry = (date: string, sales: number, expenses: number, margin: number, cash?: number): DailyEntry => ({
    date,
    totalSales: sales,
    totalExpense: expenses,
    cashInHand: cash,
    estimatedProfit: sales - expenses,
    expenseRatio: expenses / sales,
    profitMargin: margin
  });

  const createCredit = (amount: number, dueDate: string, isPaid: boolean): CreditEntry => ({
    id: `credit-${Math.random()}`,
    customerName: 'Test Customer',
    amount,
    dueDate,
    isPaid,
    createdAt: '2024-01-01'
  });

  it('should calculate average margin from last 30 days with sufficient data', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    // Create 30 days of historical data with 0.35 margin
    const historicalEntries: DailyEntry[] = [];
    for (let i = 1; i <= 30; i++) {
      const date = `2024-01-${String(i).padStart(2, '0')}`;
      historicalEntries.push(createEntry(date, 10000, 6500, 0.35));
    }
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    expect(context.avg_margin_last_30_days).toBeCloseTo(0.35, 2);
  });

  it('should return null for average margin with insufficient data (< 7 days)', () => {
    const currentEntry = createEntry('2024-01-10', 10000, 7000, 0.3);
    
    // Only 5 days of historical data
    const historicalEntries: DailyEntry[] = [];
    for (let i = 1; i <= 5; i++) {
      const date = `2024-01-0${i}`;
      historicalEntries.push(createEntry(date, 10000, 6500, 0.35));
    }
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    expect(context.avg_margin_last_30_days).toBeNull();
  });

  it('should return null for average margin with no historical data', () => {
    const currentEntry = createEntry('2024-01-01', 10000, 7000, 0.3);
    
    const context = buildSuggestionContext(currentEntry, [], [], 'en');
    
    expect(context.avg_margin_last_30_days).toBeNull();
  });

  it('should calculate cash buffer days correctly', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3, 21000); // 21000 cash
    
    // Create 30 days with 1000 daily expenses
    const historicalEntries: DailyEntry[] = [];
    for (let i = 1; i <= 30; i++) {
      const date = `2024-01-${String(i).padStart(2, '0')}`;
      historicalEntries.push(createEntry(date, 10000, 1000, 0.9));
    }
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    // 21000 cash / 1000 avg daily expenses = 21 days
    expect(context.cash_buffer_days).toBeCloseTo(21, 1);
  });

  it('should return null for cash buffer when cashInHand is undefined', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3); // No cash
    
    const historicalEntries: DailyEntry[] = [];
    for (let i = 1; i <= 30; i++) {
      const date = `2024-01-${String(i).padStart(2, '0')}`;
      historicalEntries.push(createEntry(date, 10000, 1000, 0.9));
    }
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    expect(context.cash_buffer_days).toBeNull();
  });

  it('should return null for cash buffer with insufficient historical data', () => {
    const currentEntry = createEntry('2024-01-10', 10000, 7000, 0.3, 21000);
    
    // Only 5 days of data
    const historicalEntries: DailyEntry[] = [];
    for (let i = 1; i <= 5; i++) {
      const date = `2024-01-0${i}`;
      historicalEntries.push(createEntry(date, 10000, 1000, 0.9));
    }
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    expect(context.cash_buffer_days).toBeNull();
  });

  it('should calculate total outstanding credit from unpaid entries', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    const creditEntries = [
      createCredit(1000, '2024-02-01', false), // Unpaid
      createCredit(2000, '2024-02-05', false), // Unpaid
      createCredit(500, '2024-01-15', true),   // Paid
      createCredit(1500, '2024-02-10', false)  // Unpaid
    ];
    
    const context = buildSuggestionContext(currentEntry, [], creditEntries, 'en');
    
    // 1000 + 2000 + 1500 = 4500
    expect(context.total_credit_outstanding).toBe(4500);
  });

  it('should return 0 for credit outstanding when all credits are paid', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    const creditEntries = [
      createCredit(1000, '2024-02-01', true),
      createCredit(2000, '2024-02-05', true)
    ];
    
    const context = buildSuggestionContext(currentEntry, [], creditEntries, 'en');
    
    expect(context.total_credit_outstanding).toBe(0);
  });

  it('should return 0 for credit outstanding when no credits exist', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    const context = buildSuggestionContext(currentEntry, [], [], 'en');
    
    expect(context.total_credit_outstanding).toBe(0);
  });

  it('should include current entry metrics in context', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    const context = buildSuggestionContext(currentEntry, [], [], 'en');
    
    expect(context.total_sales).toBe(10000);
    expect(context.total_expenses).toBe(7000);
    expect(context.current_margin).toBe(0.3);
    expect(context.date).toBe('2024-01-31');
  });

  it('should calculate health score using existing function', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 6000, 0.4, 5000);
    
    const context = buildSuggestionContext(currentEntry, [], [], 'en');
    
    // Health score should be calculated (exact value depends on calculateHealthScore logic)
    expect(context.health_score).toBeGreaterThanOrEqual(0);
    expect(context.health_score).toBeLessThanOrEqual(100);
  });

  it('should use specified language', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    const contextEn = buildSuggestionContext(currentEntry, [], [], 'en');
    const contextHi = buildSuggestionContext(currentEntry, [], [], 'hi');
    const contextMr = buildSuggestionContext(currentEntry, [], [], 'mr');
    
    expect(contextEn.language).toBe('en');
    expect(contextHi.language).toBe('hi');
    expect(contextMr.language).toBe('mr');
  });

  it('should exclude current entry from historical calculations', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3);
    
    // Include current entry in historical array (should be filtered out)
    const historicalEntries: DailyEntry[] = [
      currentEntry, // Should be excluded
      ...Array.from({ length: 30 }, (_, i) => {
        const date = `2024-01-${String(i + 1).padStart(2, '0')}`;
        return createEntry(date, 10000, 6500, 0.35);
      })
    ];
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    // Should still calculate average from 30 days (excluding current)
    expect(context.avg_margin_last_30_days).toBeCloseTo(0.35, 2);
  });

  it('should handle zero average daily expenses gracefully', () => {
    const currentEntry = createEntry('2024-01-31', 10000, 7000, 0.3, 5000);
    
    // Create entries with zero expenses
    const historicalEntries: DailyEntry[] = [];
    for (let i = 1; i <= 30; i++) {
      const date = `2024-01-${String(i).padStart(2, '0')}`;
      historicalEntries.push(createEntry(date, 10000, 0, 1.0));
    }
    
    const context = buildSuggestionContext(currentEntry, historicalEntries, [], 'en');
    
    // Should return null when avg expenses is 0
    expect(context.cash_buffer_days).toBeNull();
  });
});

describe('isValidDailyEntry', () => {
  it('should return true for valid entry', () => {
    const entry: DailyEntry = {
      date: '2024-01-31',
      totalSales: 10000,
      totalExpense: 7000,
      estimatedProfit: 3000,
      expenseRatio: 0.7,
      profitMargin: 0.3
    };
    
    expect(isValidDailyEntry(entry)).toBe(true);
  });

  it('should return false for entry with empty date', () => {
    const entry: DailyEntry = {
      date: '',
      totalSales: 10000,
      totalExpense: 7000,
      estimatedProfit: 3000,
      expenseRatio: 0.7,
      profitMargin: 0.3
    };
    
    expect(isValidDailyEntry(entry)).toBe(false);
  });

  it('should return false for entry with NaN values', () => {
    const entry: DailyEntry = {
      date: '2024-01-31',
      totalSales: NaN,
      totalExpense: 7000,
      estimatedProfit: 3000,
      expenseRatio: 0.7,
      profitMargin: 0.3
    };
    
    expect(isValidDailyEntry(entry)).toBe(false);
  });

  it('should return true even if cashInHand is undefined', () => {
    const entry: DailyEntry = {
      date: '2024-01-31',
      totalSales: 10000,
      totalExpense: 7000,
      cashInHand: undefined,
      estimatedProfit: 3000,
      expenseRatio: 0.7,
      profitMargin: 0.3
    };
    
    expect(isValidDailyEntry(entry)).toBe(true);
  });
});
