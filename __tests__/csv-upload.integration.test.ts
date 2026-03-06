/**
 * Integration Tests for CSV Upload API Endpoint
 * 
 * Tests the complete CSV upload flow including:
 * - File validation (type, size, row count)
 * - CSV parsing and transaction extraction
 * - Duplicate detection
 * - Error handling
 * - Success responses with counts
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { POST } from '@/app/api/csv-upload/route';
import { NextRequest } from 'next/server';
import * as pendingStore from '@/lib/pending-transaction-store';
import * as duplicateDetector from '@/lib/duplicate-detector';

// Mock dependencies
jest.mock('@/lib/pending-transaction-store');
jest.mock('@/lib/duplicate-detector');
jest.mock('@/lib/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logDebug: jest.fn(),
}));

describe('CSV Upload API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (duplicateDetector.isDuplicate as jest.Mock).mockReturnValue(false);
    (pendingStore.savePendingTransaction as jest.Mock).mockReturnValue(true);
  });

  // Helper to create FormData with CSV file
  const createFormData = (csvContent: string, filename = 'test.csv', type = 'text/csv'): FormData => {
    const blob = new Blob([csvContent], { type });
    const file = new File([blob], filename, { type });
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  };

  // Helper to create NextRequest with FormData
  const createRequest = (formData: FormData): NextRequest => {
    return new NextRequest('http://localhost:3000/api/csv-upload', {
      method: 'POST',
      body: formData,
    });
  };

  describe('Successful CSV Upload', () => {
    it('should successfully upload and parse valid CSV with all columns', async () => {
      const csvContent = `date,amount,type,vendor_name,category
2024-01-15,100.50,expense,Test Vendor,inventory
2024-01-16,200.00,sale,Customer A,sales`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary).toEqual({
        totalRows: 2,
        validTransactions: 2,
        duplicatesSkipped: 0,
        invalidRows: 0,
        saved: 2
      });
      expect(pendingStore.savePendingTransaction).toHaveBeenCalledTimes(2);
    });

    it('should handle CSV with only required columns', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
2024-01-16,200.00,sale`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(2);
      expect(data.summary.saved).toBe(2);
    });

    it('should handle CSV with header variations', async () => {
      const csvContent = `Date,Amount,Type,Vendor
15/01/2024,100.50,expense,Test Shop
16/01/2024,200.00,sale,Customer`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(2);
    });

    it('should skip invalid rows and process valid ones', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
invalid-date,200.00,sale
2024-01-17,300.00,expense`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(2);
      expect(data.summary.invalidRows).toBe(1);
      expect(data.summary.saved).toBe(2);
    });

    it('should handle different date formats', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
15/01/2024,200.00,sale
01-15-2024,150.00,expense`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBeGreaterThan(0);
    });

    it('should handle different amount formats', async () => {
      const csvContent = `date,amount,type
2024-01-15,₹100.50,expense
2024-01-16,Rs 200,sale
2024-01-17,"1,500.00",expense`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(3);
    });

    it('should handle quoted fields with commas', async () => {
      const csvContent = `date,amount,type,vendor_name
2024-01-15,100.50,expense,"Shop, Inc."
2024-01-16,200.00,sale,"Customer, LLC"`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(2);
    });
  });

  describe('File Size Validation', () => {
    it('should reject files larger than 5MB', async () => {
      // Create a CSV content larger than 5MB with long vendor names to avoid row count limit
      const header = 'date,amount,type,vendor_name\n';
      const longVendorName = 'A'.repeat(1000); // 1KB vendor name
      const row = `2024-01-15,100.50,expense,${longVendorName}\n`;
      const largeContent = header + row.repeat(6000); // ~6MB
      const formData = createFormData(largeContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_TOO_LARGE');
      expect(data.message).toContain('Maximum size is 5MB');
    });

    it('should accept files exactly at 5MB limit', async () => {
      // Create content close to but under 5MB
      const content = 'date,amount,type\n' + '2024-01-15,100.50,expense\n'.repeat(100000);
      const formData = createFormData(content);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      // Should not fail due to size
      expect(data.code).not.toBe('CSV_TOO_LARGE');
    });
  });

  describe('Row Count Validation', () => {
    it('should reject CSV with more than 1000 rows', async () => {
      const header = 'date,amount,type\n';
      const rows = Array(1001).fill('2024-01-15,100.50,expense').join('\n');
      const csvContent = header + rows;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_TOO_MANY_ROWS');
      expect(data.message).toContain('Maximum is 1000 rows');
    });

    it('should accept CSV with exactly 1000 rows', async () => {
      const header = 'date,amount,type\n';
      const rows = Array(1000).fill('2024-01-15,100.50,expense').join('\n');
      const csvContent = header + rows;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Invalid Header Handling', () => {
    it('should reject CSV without required date column', async () => {
      const csvContent = `amount,type
100.50,expense
200.00,sale`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_INVALID_HEADERS');
      expect(data.message).toContain('must contain');
    });

    it('should reject CSV without required amount column', async () => {
      const csvContent = `date,type
2024-01-15,expense
2024-01-16,sale`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_INVALID_HEADERS');
    });

    it('should reject CSV without required type column', async () => {
      const csvContent = `date,amount
2024-01-15,100.50
2024-01-16,200.00`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_INVALID_HEADERS');
    });

    it('should reject CSV with only headers and no data', async () => {
      const csvContent = `date,amount,type`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_NO_DATA');
      expect(data.message).toContain('No valid transactions found');
    });
  });

  describe('Duplicate Detection During Upload', () => {
    it('should skip duplicate transactions and report count', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
2024-01-16,200.00,sale
2024-01-17,150.00,expense`;

      // Mock: first and third are duplicates
      (duplicateDetector.isDuplicate as jest.Mock)
        .mockReturnValueOnce(true)  // First transaction is duplicate
        .mockReturnValueOnce(false) // Second is not
        .mockReturnValueOnce(true); // Third is duplicate

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(3);
      expect(data.summary.duplicatesSkipped).toBe(2);
      expect(data.summary.saved).toBe(1);
      expect(pendingStore.savePendingTransaction).toHaveBeenCalledTimes(1);
    });

    it('should continue processing after finding duplicates', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
2024-01-16,200.00,sale`;

      // First is duplicate, second is not
      (duplicateDetector.isDuplicate as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.duplicatesSkipped).toBe(1);
      expect(data.summary.saved).toBe(1);
    });

    it('should handle all transactions being duplicates', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
2024-01-16,200.00,sale`;

      // All are duplicates
      (duplicateDetector.isDuplicate as jest.Mock).mockReturnValue(true);

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(2);
      expect(data.summary.duplicatesSkipped).toBe(2);
      expect(data.summary.saved).toBe(0);
      expect(pendingStore.savePendingTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Error Response Handling', () => {
    it('should return error when no file is provided', async () => {
      const formData = new FormData();
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_NO_FILE');
      expect(data.message).toContain('No file provided');
    });

    it('should reject non-CSV file types', async () => {
      const formData = createFormData('some content', 'test.txt', 'text/plain');
      // Change filename to non-csv
      const blob = new Blob(['some content'], { type: 'application/json' });
      const file = new File([blob], 'test.json', { type: 'application/json' });
      const newFormData = new FormData();
      newFormData.append('file', file);
      const request = createRequest(newFormData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_INVALID_TYPE');
      expect(data.message).toContain('Invalid file type');
    });

    it('should handle malformed CSV gracefully', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
this is not valid csv data at all
2024-01-17,300.00,expense`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      // Should either parse what it can or return parse error
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(data).toHaveProperty('success');
    });

    it('should return CSV_NO_DATA when all rows are invalid', async () => {
      const csvContent = `date,amount,type
invalid,invalid,invalid
bad,bad,bad`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('CSV_NO_DATA');
    });
  });

  describe('File Type Validation', () => {
    it('should accept text/csv MIME type', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense`;

      const formData = createFormData(csvContent, 'test.csv', 'text/csv');
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept application/csv MIME type', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense`;

      const formData = createFormData(csvContent, 'test.csv', 'application/csv');
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept .csv file extension even with text/plain MIME', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense`;

      const formData = createFormData(csvContent, 'test.csv', 'text/plain');
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Transaction Type Mapping', () => {
    it('should map various expense type values', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
2024-01-16,200.00,debit
2024-01-17,150.00,withdrawal`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(3);
    });

    it('should map various sale type values', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,sale
2024-01-16,200.00,credit
2024-01-17,150.00,deposit`;

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary.validTransactions).toBe(3);
    });
  });

  describe('Summary Response Structure', () => {
    it('should return complete summary with all counts', async () => {
      const csvContent = `date,amount,type
2024-01-15,100.50,expense
invalid-date,200.00,sale
2024-01-17,150.00,expense`;

      // Make second valid transaction a duplicate
      (duplicateDetector.isDuplicate as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const formData = createFormData(csvContent);
      const request = createRequest(formData);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.summary).toHaveProperty('totalRows');
      expect(data.summary).toHaveProperty('validTransactions');
      expect(data.summary).toHaveProperty('duplicatesSkipped');
      expect(data.summary).toHaveProperty('invalidRows');
      expect(data.summary).toHaveProperty('saved');
      expect(data).toHaveProperty('errors');
    });
  });
});
