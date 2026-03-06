/**
 * Integration tests for Receipt Status API endpoint
 * Tests polling for OCR results, status handling, and duplicate detection
 */

import { GET } from '@/app/api/receipt-status/route';
import { NextRequest } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { ErrorCode } from '@/lib/error-utils';

// Mock S3 client
const s3Mock = mockClient(S3Client);

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Receipt Status API Integration Tests', () => {
  beforeEach(() => {
    s3Mock.reset();
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    s3Mock.reset();
  });

  describe('GET /api/receipt-status', () => {
    it('should return 400 if filename is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/receipt-status');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe(ErrorCode.INVALID_INPUT);
    });

    it('should return processing status when result not yet available', async () => {
      // Mock S3 to return NoSuchKey error (file not found)
      s3Mock.on(GetObjectCommand).rejects({
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('processing');
      expect(data.message).toBe('Receipt is being processed');
    });

    it('should return completed status with extracted data', async () => {
      const mockOCRResult = {
        success: true,
        filename: 'receipt-123.jpg',
        extractedData: {
          date: '2024-01-15',
          amount: 2464.0,
          vendor: 'Reliance Fresh',
          items: ['Rice', 'Dal', 'Oil'],
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 1500,
        method: 'bedrock-vision',
      };

      // Mock S3 to return OCR result
      const stream = Readable.from([Buffer.from(JSON.stringify(mockOCRResult))]);
      s3Mock.on(GetObjectCommand).resolves({
        Body: stream as any,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.extractedData).toEqual(mockOCRResult.extractedData);
      expect(data.inferredTransaction).toBeDefined();
      expect(data.inferredTransaction.id).toMatch(/^txn_/);
      expect(data.inferredTransaction.amount).toBe(2464.0);
      expect(data.inferredTransaction.vendor_name).toBe('Reliance Fresh');
      expect(data.inferredTransaction.type).toBe('expense');
      expect(data.inferredTransaction.source).toBe('receipt');
    });

    it('should return failed status when OCR processing failed', async () => {
      const mockOCRResult = {
        success: false,
        filename: 'receipt-123.jpg',
        error: 'OCR processing failed',
      };

      const stream = Readable.from([Buffer.from(JSON.stringify(mockOCRResult))]);
      s3Mock.on(GetObjectCommand).resolves({
        Body: stream as any,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.code).toBe(ErrorCode.OCR_SERVICE_ERROR);
    });

    it('should return OCR_NO_DATA error when extracted data is missing', async () => {
      const mockOCRResult = {
        success: true,
        filename: 'receipt-123.jpg',
        extractedData: {
          date: '',
          amount: 0,
          vendor: '',
          items: [],
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 1500,
        method: 'bedrock-vision',
      };

      const stream = Readable.from([Buffer.from(JSON.stringify(mockOCRResult))]);
      s3Mock.on(GetObjectCommand).resolves({
        Body: stream as any,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.code).toBe(ErrorCode.OCR_NO_DATA);
    });

    it('should return OCR_TIMEOUT error on timeout', async () => {
      s3Mock.on(GetObjectCommand).rejects({
        name: 'TimeoutError',
        $metadata: { httpStatusCode: 504 },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.code).toBe(ErrorCode.OCR_TIMEOUT);
      expect(data.error).toContain('took too long');
    });

    it('should parse OCR result and infer category from vendor', async () => {
      s3Mock.on(GetObjectCommand).rejects({
        name: 'ServiceUnavailable',
        message: 'S3 service unavailable',
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.code).toBe(ErrorCode.OCR_SERVICE_ERROR);
      expect(data.error).toContain('temporarily unavailable');
    });

    it('should parse OCR result and infer category from vendor', async () => {
      const mockOCRResult = {
        success: true,
        filename: 'receipt-pharmacy.jpg',
        extractedData: {
          date: '2024-01-15',
          amount: 350.0,
          vendor: 'Apollo Pharmacy',
          items: ['Medicine A', 'Medicine B'],
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 1500,
        method: 'bedrock-vision',
      };

      const stream = Readable.from([Buffer.from(JSON.stringify(mockOCRResult))]);
      s3Mock.on(GetObjectCommand).resolves({
        Body: stream as any,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-pharmacy.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.inferredTransaction.category).toBe('medical');
      expect(data.inferredTransaction.vendor_name).toBe('Apollo Pharmacy');
    });

    it('should handle malformed JSON in S3 response', async () => {
      const stream = Readable.from([Buffer.from('invalid json {{{')]);
      s3Mock.on(GetObjectCommand).resolves({
        Body: stream as any,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-123.jpg'
      );
      const response = await GET(request);
      const data = await response.json();

      // Malformed JSON is caught in the S3 error handler and treated as a service error
      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.code).toBe(ErrorCode.OCR_SERVICE_ERROR);
    });

    it('should generate deterministic transaction IDs', async () => {
      const mockOCRResult = {
        success: true,
        filename: 'receipt-deterministic.jpg',
        extractedData: {
          date: '2024-01-15',
          amount: 1000.0,
          vendor: 'Test Vendor',
          items: ['Item 1'],
        },
        processedAt: '2024-01-15T10:30:00.000Z',
        processingTimeMs: 1500,
        method: 'bedrock-vision',
      };

      // First request
      const stream1 = Readable.from([Buffer.from(JSON.stringify(mockOCRResult))]);
      s3Mock.on(GetObjectCommand).resolvesOnce({
        Body: stream1 as any,
      });

      const request1 = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-deterministic.jpg'
      );
      const response1 = await GET(request1);
      const data1 = await response1.json();

      // Second request with same data - reset mock
      s3Mock.reset();
      const stream2 = Readable.from([Buffer.from(JSON.stringify(mockOCRResult))]);
      s3Mock.on(GetObjectCommand).resolvesOnce({
        Body: stream2 as any,
      });

      const request2 = new NextRequest(
        'http://localhost:3000/api/receipt-status?filename=receipt-deterministic.jpg'
      );
      const response2 = await GET(request2);
      const data2 = await response2.json();

      // IDs should be identical for same data
      expect(data1.inferredTransaction.id).toBe(data2.inferredTransaction.id);
    });
  });
});
