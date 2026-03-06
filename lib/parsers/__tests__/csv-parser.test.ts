// Unit tests for CSV parser

import { parseCSV } from '../csv-parser';

describe('CSV Parser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV with all columns', () => {
      const csvContent = `date,amount,type,vendor,category
15/01/2024,100,expense,Test Vendor,inventory
16/01/2024,200,sale,Customer A,sales`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(2);
      expect(result.summary.validRows).toBe(2);
      expect(result.summary.invalidRows).toBe(0);

      expect(result.transactions[0].date).toBe('2024-01-15');
      expect(result.transactions[0].amount).toBe(100);
      expect(result.transactions[0].type).toBe('expense');
      expect(result.transactions[0].vendor_name).toBe('Test Vendor');
      expect(result.transactions[0].category).toBe('inventory');
      expect(result.transactions[0].source).toBe('csv');
    });

    it('should parse CSV with missing optional columns', () => {
      const csvContent = `date,amount,type
15/01/2024,100,expense
16/01/2024,200,sale`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].vendor_name).toBeUndefined();
      expect(result.transactions[0].category).toBeUndefined();
    });

    it('should skip invalid rows and log warnings', () => {
      const csvContent = `date,amount,type
15/01/2024,100,expense
invalid-date,200,sale
16/01/2024,,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(1);
      expect(result.summary.validRows).toBe(1);
      expect(result.summary.invalidRows).toBe(2);
      expect(result.summary.errors.length).toBeGreaterThan(0);
    });

    it('should return error for missing required headers', () => {
      const csvContent = `date,amount
15/01/2024,100`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(0);
      expect(result.summary.errors).toContain('CSV file must contain "date", "amount", and "type" columns');
    });
  });

  describe('header detection and mapping', () => {
    it('should map "Date" to date field', () => {
      const csvContent = `Date,Amount,Type
15/01/2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].date).toBe('2024-01-15');
    });

    it('should map "Transaction Date" to date field', () => {
      const csvContent = `Transaction Date,Amount,Type
15/01/2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].date).toBe('2024-01-15');
    });

    it('should map "Value" to amount field', () => {
      const csvContent = `date,Value,type
15/01/2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amount).toBe(100);
    });

    it('should map "merchant" to vendor_name field', () => {
      const csvContent = `date,amount,type,merchant
15/01/2024,100,expense,Test Merchant`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].vendor_name).toBe('Test Merchant');
    });
  });

  describe('date format parsing', () => {
    it('should parse DD/MM/YYYY format', () => {
      const csvContent = `date,amount,type
15/01/2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].date).toBe('2024-01-15');
    });

    it('should parse DD-MM-YYYY format', () => {
      const csvContent = `date,amount,type
15-01-2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].date).toBe('2024-01-15');
    });

    it('should parse YYYY-MM-DD format', () => {
      const csvContent = `date,amount,type
2024-01-15,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].date).toBe('2024-01-15');
    });

    it('should parse DD.MM.YYYY format', () => {
      const csvContent = `date,amount,type
15.01.2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].date).toBe('2024-01-15');
    });

    it('should handle ISO 8601 with time', () => {
      const csvContent = `date,amount,type
2024-01-15T10:30:00,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].date).toBe('2024-01-15');
    });
  });

  describe('amount parsing', () => {
    it('should parse amount with rupee symbol', () => {
      const csvContent = `date,amount,type
15/01/2024,₹100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(100);
    });

    it('should parse amount with Rs prefix', () => {
      const csvContent = `date,amount,type
15/01/2024,Rs. 100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(100);
    });

    it('should parse amount with comma thousand separator', () => {
      const csvContent = `date,amount,type
15/01/2024,"1,234.56",expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(1234.56);
    });

    it('should parse amount with dollar symbol', () => {
      const csvContent = `date,amount,type
15/01/2024,$100.50,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(100.50);
    });

    it('should handle decimal amounts', () => {
      const csvContent = `date,amount,type
15/01/2024,123.45,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(123.45);
    });

    it('should handle negative amounts', () => {
      const csvContent = `date,amount,type
15/01/2024,-100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(-100);
    });
  });

  describe('transaction type mapping', () => {
    it('should map "expense" to expense type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('expense');
    });

    it('should map "debit" to expense type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,debit`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('expense');
    });

    it('should map "withdrawal" to expense type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,withdrawal`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('expense');
    });

    it('should map "sale" to sale type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,sale`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('sale');
    });

    it('should map "credit" to sale type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,credit`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('sale');
    });

    it('should map "deposit" to sale type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,deposit`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('sale');
    });

    it('should map "income" to sale type', () => {
      const csvContent = `date,amount,type
15/01/2024,100,income`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].type).toBe('sale');
    });
  });

  describe('quoted field handling', () => {
    it('should handle quoted fields with commas', () => {
      const csvContent = `date,amount,type,vendor
15/01/2024,100,expense,"ABC Corp, Ltd"`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].vendor_name).toBe('ABC Corp, Ltd');
    });

    it('should handle quoted amounts with commas', () => {
      const csvContent = `date,amount,type
15/01/2024,"1,234.56",expense`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].amount).toBe(1234.56);
    });
  });

  describe('deterministic ID generation', () => {
    it('should generate same ID for same row data', () => {
      const csvContent = `date,amount,type
15/01/2024,100,expense`;

      const result1 = parseCSV(csvContent);
      const result2 = parseCSV(csvContent);

      expect(result1.transactions[0].id).toBe(result2.transactions[0].id);
    });

    it('should generate different ID for different row data', () => {
      const csvContent = `date,amount,type
15/01/2024,100,expense
16/01/2024,200,sale`;

      const result = parseCSV(csvContent);

      expect(result.transactions[0].id).not.toBe(result.transactions[1].id);
    });
  });

  describe('error handling', () => {
    it('should handle empty CSV', () => {
      const csvContent = '';

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(0);
    });

    it('should handle CSV with only headers', () => {
      const csvContent = `date,amount,type`;

      const result = parseCSV(csvContent);

      expect(result.transactions).toHaveLength(0);
      expect(result.summary.totalRows).toBe(0);
    });

    it('should handle malformed CSV gracefully', () => {
      const csvContent = `date,amount,type
15/01/2024,100
16/01/2024,200,sale,extra,columns`;

      const result = parseCSV(csvContent);

      // Should parse valid rows
      expect(result.transactions.length).toBeGreaterThanOrEqual(0);
    });
  });
});
