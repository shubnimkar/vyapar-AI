/**
 * Tests for CSV Demo Data
 * 
 * Validates that the demo CSV files are:
 * - Properly formatted
 * - Contain realistic data
 * - Will produce meaningful insights
 */

import { describe, it, expect } from '@jest/globals';
import { parseCSV } from '../../lib/parsers/csv-parser';
import fs from 'fs';
import path from 'path';

describe('CSV Demo Data Validation', () => {
  const demoDataPath = path.join(process.cwd(), 'public', 'demo-data');

  describe('sample-sales.csv', () => {
    let salesData: string;
    let parseResult: ReturnType<typeof parseCSV>;

    beforeAll(() => {
      salesData = fs.readFileSync(
        path.join(demoDataPath, 'sample-sales.csv'),
        'utf-8'
      );
      parseResult = parseCSV(salesData);
    });

    it('should parse without errors', () => {
      expect(parseResult.summary.errors.length).toBe(0);
    });

    it('should have 180 transactions (90 days × 2 per day)', () => {
      expect(parseResult.transactions.length).toBe(180);
    });

    it('should have all transactions as type "sale"', () => {
      const allSales = parseResult.transactions.every(t => t.type === 'sale');
      expect(allSales).toBe(true);
    });

    it('should have realistic amounts (₹2,000 - ₹10,000)', () => {
      const amounts = parseResult.transactions.map(t => t.amount);
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      
      expect(min).toBeGreaterThanOrEqual(2000);
      expect(max).toBeLessThanOrEqual(10000);
    });

    it('should have average daily sales around ₹8,500', () => {
      const totalSales = parseResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      const avgDailySales = totalSales / 90;
      
      expect(avgDailySales).toBeGreaterThanOrEqual(7500);
      expect(avgDailySales).toBeLessThanOrEqual(9500);
    });

    it('should have dates in correct range (Jan 1 - Mar 9, 2024)', () => {
      const dates = parseResult.transactions.map(t => new Date(t.date));
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-03-09');
      
      dates.forEach(date => {
        expect(date.getTime()).toBeGreaterThanOrEqual(minDate.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(maxDate.getTime());
      });
    });

    it('should have vendor names populated', () => {
      const allHaveVendors = parseResult.transactions.every(t => 
        t.vendor_name && t.vendor_name.length > 0
      );
      expect(allHaveVendors).toBe(true);
    });

    it('should include regular customers', () => {
      const regularCustomers = [
        'Ramesh Stores',
        'Suresh Traders',
        'Mahesh Shop',
        'Lakshmi Store',
        'Ganesh Traders'
      ];
      
      const hasRegularCustomers = parseResult.transactions.some(t =>
        regularCustomers.includes(t.vendor_name || '')
      );
      
      expect(hasRegularCustomers).toBe(true);
    });

    it('should have walk-in customers', () => {
      const walkInCount = parseResult.transactions.filter(t =>
        t.vendor_name === 'Walk-in Customer'
      ).length;
      
      expect(walkInCount).toBeGreaterThan(0);
      expect(walkInCount).toBe(90); // One per day
    });
  });

  describe('sample-expenses.csv', () => {
    let expensesData: string;
    let parseResult: ReturnType<typeof parseCSV>;

    beforeAll(() => {
      expensesData = fs.readFileSync(
        path.join(demoDataPath, 'sample-expenses.csv'),
        'utf-8'
      );
      parseResult = parseCSV(expensesData);
    });

    it('should parse without errors', () => {
      expect(parseResult.summary.errors.length).toBe(0);
    });

    it('should have multiple expense transactions', () => {
      expect(parseResult.transactions.length).toBeGreaterThan(200);
    });

    it('should have all transactions as type "expense"', () => {
      const allExpenses = parseResult.transactions.every(t => t.type === 'expense');
      expect(allExpenses).toBe(true);
    });

    it('should include rent expenses (₹15,000)', () => {
      const rentExpenses = parseResult.transactions.filter(t =>
        t.category === 'Rent' && t.amount === 15000
      );
      
      expect(rentExpenses.length).toBe(3); // 3 months
    });

    it('should include utility expenses', () => {
      const utilities = parseResult.transactions.filter(t =>
        t.category === 'Utilities'
      );
      
      expect(utilities.length).toBeGreaterThan(0);
    });

    it('should include inventory purchases', () => {
      const inventory = parseResult.transactions.filter(t =>
        t.category === 'Inventory Purchase'
      );
      
      expect(inventory.length).toBeGreaterThan(100);
    });

    it('should include wages', () => {
      const wages = parseResult.transactions.filter(t =>
        t.category === 'Wages'
      );
      
      expect(wages.length).toBeGreaterThan(10); // Weekly wages
    });

    it('should have realistic expense amounts', () => {
      const amounts = parseResult.transactions.map(t => t.amount);
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      
      expect(min).toBeGreaterThanOrEqual(300);
      expect(max).toBeLessThanOrEqual(20000);
    });

    it('should have average daily expenses around ₹4,500', () => {
      const totalExpenses = parseResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      const avgDailyExpenses = totalExpenses / 90;
      
      expect(avgDailyExpenses).toBeGreaterThanOrEqual(3500);
      expect(avgDailyExpenses).toBeLessThanOrEqual(5500);
    });
  });

  describe('sample-inventory.csv', () => {
    let inventoryData: string;
    let parseResult: ReturnType<typeof parseCSV>;

    beforeAll(() => {
      inventoryData = fs.readFileSync(
        path.join(demoDataPath, 'sample-inventory.csv'),
        'utf-8'
      );
      parseResult = parseCSV(inventoryData);
    });

    it('should parse without errors', () => {
      expect(parseResult.summary.errors.length).toBe(0);
    });

    it('should have bulk purchase transactions', () => {
      expect(parseResult.transactions.length).toBeGreaterThan(50);
    });

    it('should have all transactions as type "expense"', () => {
      const allExpenses = parseResult.transactions.every(t => t.type === 'expense');
      expect(allExpenses).toBe(true);
    });

    it('should include staple items', () => {
      const staples = ['Rice', 'Wheat Flour', 'Sugar', 'Cooking Oil', 'Tea'];
      
      const hasStaples = parseResult.transactions.some(t =>
        staples.some(staple => t.category?.includes(staple))
      );
      
      expect(hasStaples).toBe(true);
    });

    it('should have bulk purchase amounts (₹600 - ₹2,000)', () => {
      const amounts = parseResult.transactions.map(t => t.amount);
      const min = Math.min(...amounts);
      const max = Math.max(...amounts);
      
      expect(min).toBeGreaterThanOrEqual(500);
      expect(max).toBeLessThanOrEqual(2000);
    });

    it('should have vendor as Wholesale Supplier', () => {
      const allWholesale = parseResult.transactions.every(t =>
        t.vendor_name === 'Wholesale Supplier'
      );
      
      expect(allWholesale).toBe(true);
    });
  });

  describe('Combined Data Analysis', () => {
    let salesData: string;
    let expensesData: string;
    let salesResult: ReturnType<typeof parseCSV>;
    let expensesResult: ReturnType<typeof parseCSV>;

    beforeAll(() => {
      salesData = fs.readFileSync(
        path.join(demoDataPath, 'sample-sales.csv'),
        'utf-8'
      );
      expensesData = fs.readFileSync(
        path.join(demoDataPath, 'sample-expenses.csv'),
        'utf-8'
      );
      salesResult = parseCSV(salesData);
      expensesResult = parseCSV(expensesData);
    });

    it('should show positive profit margin', () => {
      const totalSales = salesResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expensesResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      const profitMargin = (totalSales - totalExpenses) / totalSales;
      
      expect(profitMargin).toBeGreaterThan(0.4); // > 40%
      expect(profitMargin).toBeLessThan(0.6); // < 60%
    });

    it('should have total 90-day profit around ₹360,000', () => {
      const totalSales = salesResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = expensesResult.transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalProfit = totalSales - totalExpenses;
      
      expect(totalProfit).toBeGreaterThanOrEqual(300000);
      expect(totalProfit).toBeLessThanOrEqual(420000);
    });

    it('should have consistent date coverage', () => {
      const salesDates = new Set(salesResult.transactions.map(t => t.date));
      const expensesDates = new Set(expensesResult.transactions.map(t => t.date));
      
      // Should have 90 unique dates in sales
      expect(salesDates.size).toBe(90);
      
      // Expenses should cover most days (not all due to periodic nature)
      expect(expensesDates.size).toBeGreaterThan(60);
    });

    it('should demonstrate realistic business patterns', () => {
      // Sales should be higher than expenses on most days
      const dailySales = new Map<string, number>();
      const dailyExpenses = new Map<string, number>();
      
      salesResult.transactions.forEach(t => {
        dailySales.set(t.date, (dailySales.get(t.date) || 0) + t.amount);
      });
      
      expensesResult.transactions.forEach(t => {
        dailyExpenses.set(t.date, (dailyExpenses.get(t.date) || 0) + t.amount);
      });
      
      let profitableDays = 0;
      dailySales.forEach((sales, date) => {
        const expenses = dailyExpenses.get(date) || 0;
        if (sales > expenses) {
          profitableDays++;
        }
      });
      
      // Most days should be profitable
      expect(profitableDays).toBeGreaterThan(60);
    });
  });

  describe('Data Quality Checks', () => {
    it('should have no duplicate transaction IDs across all files', () => {
      const salesData = fs.readFileSync(
        path.join(demoDataPath, 'sample-sales.csv'),
        'utf-8'
      );
      const expensesData = fs.readFileSync(
        path.join(demoDataPath, 'sample-expenses.csv'),
        'utf-8'
      );
      const inventoryData = fs.readFileSync(
        path.join(demoDataPath, 'sample-inventory.csv'),
        'utf-8'
      );
      
      const salesResult = parseCSV(salesData);
      const expensesResult = parseCSV(expensesData);
      const inventoryResult = parseCSV(inventoryData);
      
      const allIds = [
        ...salesResult.transactions.map(t => t.id),
        ...expensesResult.transactions.map(t => t.id),
        ...inventoryResult.transactions.map(t => t.id)
      ];
      
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should have proper CSV formatting', () => {
      const files = ['sample-sales.csv', 'sample-expenses.csv', 'sample-inventory.csv'];
      
      files.forEach(filename => {
        const content = fs.readFileSync(
          path.join(demoDataPath, filename),
          'utf-8'
        );
        
        const lines = content.trim().split('\n');
        
        // Should have header
        expect(lines[0]).toContain('date');
        expect(lines[0]).toContain('type');
        expect(lines[0]).toContain('amount');
        
        // All lines should have same number of columns
        const headerCols = lines[0].split(',').length;
        lines.slice(1).forEach(line => {
          expect(line.split(',').length).toBe(headerCols);
        });
      });
    });
  });
});
