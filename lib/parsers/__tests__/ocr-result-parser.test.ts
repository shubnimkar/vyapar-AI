// Unit tests for OCR result parser

import { parseOCRResult, OCRLambdaResult } from '../ocr-result-parser';

describe('OCR Result Parser', () => {
  const mockFileHash = 'abc123def456';

  describe('parseOCRResult', () => {
    it('should parse valid OCR result to InferredTransaction', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 2464.00,
          vendor: 'Reliance Fresh',
          items: ['Rice', 'Dal', 'Oil']
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);

      expect(transaction.id).toMatch(/^txn_[a-f0-9]{16}$/);
      expect(transaction.date).toBe('2024-01-15');
      expect(transaction.type).toBe('expense');
      expect(transaction.vendor_name).toBe('Reliance Fresh');
      expect(transaction.amount).toBe(2464.00);
      expect(transaction.source).toBe('receipt');
      expect(transaction.created_at).toBeDefined();
      expect(transaction.raw_data).toEqual(ocrResult.extractedData);
    });

    it('should default to "Unknown Vendor" when vendor is missing', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: '',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.vendor_name).toBe('Unknown Vendor');
    });

    it('should default type to "expense" for receipts', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Test Vendor',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.type).toBe('expense');
    });
  });

  describe('date format handling', () => {
    it('should parse DD/MM/YYYY format', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Test',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.date).toBe('2024-01-15');
    });

    it('should parse DD-MM-YYYY format', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15-01-2024',
          amount: 100,
          vendor: 'Test',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.date).toBe('2024-01-15');
    });

    it('should parse YYYY-MM-DD format', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '2024-01-15',
          amount: 100,
          vendor: 'Test',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.date).toBe('2024-01-15');
    });

    it('should fallback to today for invalid date', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: 'invalid-date',
          amount: 100,
          vendor: 'Test',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      const today = new Date().toISOString().split('T')[0];
      expect(transaction.date).toBe(today);
    });
  });

  describe('amount extraction', () => {
    it('should extract amount correctly', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 1234.56,
          vendor: 'Test',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.amount).toBe(1234.56);
    });
  });

  describe('vendor name extraction', () => {
    it('should extract vendor name', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Apollo Pharmacy',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.vendor_name).toBe('Apollo Pharmacy');
    });
  });

  describe('category inference', () => {
    it('should infer "medical" category for pharmacy', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Apollo Pharmacy',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.category).toBe('medical');
    });

    it('should infer "food" category for restaurant', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Taj Restaurant',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.category).toBe('food');
    });

    it('should infer "inventory" category for wholesale', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Metro Wholesale',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.category).toBe('inventory');
    });

    it('should return undefined for unknown vendor type', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Unknown Shop',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction = parseOCRResult(ocrResult, mockFileHash);
      expect(transaction.category).toBeUndefined();
    });
  });

  describe('deterministic ID generation', () => {
    it('should generate same ID for same data', () => {
      const ocrResult: OCRLambdaResult = {
        success: true,
        filename: 'receipt.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Test Vendor',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction1 = parseOCRResult(ocrResult, mockFileHash);
      const transaction2 = parseOCRResult(ocrResult, mockFileHash);

      expect(transaction1.id).toBe(transaction2.id);
    });

    it('should generate different ID for different data', () => {
      const ocrResult1: OCRLambdaResult = {
        success: true,
        filename: 'receipt1.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 100,
          vendor: 'Test Vendor',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const ocrResult2: OCRLambdaResult = {
        success: true,
        filename: 'receipt2.jpg',
        extractedData: {
          date: '15/01/2024',
          amount: 200,
          vendor: 'Test Vendor',
          items: []
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 5000,
        method: 'bedrock-vision'
      };

      const transaction1 = parseOCRResult(ocrResult1, 'hash1');
      const transaction2 = parseOCRResult(ocrResult2, 'hash2');

      expect(transaction1.id).not.toBe(transaction2.id);
    });
  });
});
