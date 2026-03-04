/**
 * Integration tests for upload endpoint validation
 * 
 * Property 9: Body Size Validation
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 * 
 * Tests body size validation for upload endpoints:
 * - /api/receipt-ocr (10MB limit)
 * - /api/voice-entry (10MB limit)
 */

import { NextRequest } from 'next/server';
import { POST as receiptOcrPost } from '@/app/api/receipt-ocr/route';
import { POST as voiceEntryPost } from '@/app/api/voice-entry/route';
import { BODY_SIZE_LIMITS } from '@/lib/error-utils';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      Body: {
        transformToString: jest.fn().mockResolvedValue(JSON.stringify({
          extractedData: {
            type: 'expense',
            amount: 100,
            category: 'test',
          }
        }))
      }
    }),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

// Mock aws-config
jest.mock('@/lib/aws-config', () => ({
  s3Client: {
    send: jest.fn().mockResolvedValue({
      Body: {
        transformToString: jest.fn().mockResolvedValue(JSON.stringify({
          extractedData: {
            type: 'expense',
            amount: 100,
            category: 'test',
          }
        }))
      }
    }),
  },
  S3_BUCKETS: {
    VOICE: 'test-voice-bucket',
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Upload Endpoint Body Size Validation', () => {
  describe('Property 9: Body Size Validation - Receipt OCR', () => {
    describe('BODY_TOO_LARGE response for oversized uploads', () => {
      test('should return BODY_TOO_LARGE for request exceeding 10MB', async () => {
        // Create a large payload (11MB)
        const largeData = 'x'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([largeData], { type: 'image/jpeg' });
        formData.append('file', blob, 'large-receipt.jpg');

        const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
          method: 'POST',
          body: formData,
        });

        const response = await receiptOcrPost(request);
        const data = await response.json();

        // Verify response status and error code
        expect(response.status).toBe(413);
        expect(data.success).toBe(false);
        expect(data.code).toBe('BODY_TOO_LARGE');
        expect(data.message).toBeDefined();
      });

      test('should return BODY_TOO_LARGE for request at exactly 10MB + 1 byte', async () => {
        // Create payload at exactly the limit + 1 byte
        const largeData = 'x'.repeat(BODY_SIZE_LIMITS.UPLOAD + 1);
        const formData = new FormData();
        const blob = new Blob([largeData], { type: 'image/png' });
        formData.append('file', blob, 'exact-limit-receipt.png');

        const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
          method: 'POST',
          body: formData,
        });

        const response = await receiptOcrPost(request);
        const data = await response.json();

        expect(response.status).toBe(413);
        expect(data.code).toBe('BODY_TOO_LARGE');
      });
    });

    describe('Successful processing for valid sizes', () => {
      test('should accept request under 10MB', async () => {
        // Create a small valid payload (1MB)
        const validData = 'x'.repeat(1 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([validData], { type: 'image/jpeg' });
        formData.append('file', blob, 'valid-receipt.jpg');

        const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
          method: 'POST',
          body: formData,
        });

        const response = await receiptOcrPost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      });

      test('should accept small request (100KB)', async () => {
        // Create a small payload
        const smallData = 'x'.repeat(100 * 1024);
        const formData = new FormData();
        const blob = new Blob([smallData], { type: 'image/jpeg' });
        formData.append('file', blob, 'small-receipt.jpg');

        const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
          method: 'POST',
          body: formData,
        });

        const response = await receiptOcrPost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      });
    });

    describe('Error response format validation', () => {
      test('should return standardized error format for oversized request', async () => {
        const largeData = 'x'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([largeData], { type: 'image/jpeg' });
        formData.append('file', blob, 'large.jpg');

        const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
          method: 'POST',
          body: formData,
        });

        const response = await receiptOcrPost(request);
        const data = await response.json();

        // Verify standardized error format
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(typeof data.code).toBe('string');
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      });

      test('should not include stack trace in error response', async () => {
        const largeData = 'x'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([largeData], { type: 'image/jpeg' });
        formData.append('file', blob, 'large.jpg');

        const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
          method: 'POST',
          body: formData,
        });

        const response = await receiptOcrPost(request);
        const data = await response.json();
        const responseText = JSON.stringify(data);

        // Verify no stack trace information
        expect(responseText).not.toContain('at ');
        expect(responseText).not.toMatch(/\.ts:/);
        expect(responseText).not.toMatch(/\.js:/);
        expect(data).not.toHaveProperty('stack');
      });
    });
  });

  describe('Property 9: Body Size Validation - Voice Entry', () => {
    describe('BODY_TOO_LARGE response for oversized uploads', () => {
      test('should return BODY_TOO_LARGE for audio file exceeding 10MB', async () => {
        // Create a large audio payload (11MB)
        const largeAudioData = 'x'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([largeAudioData], { type: 'audio/webm' });
        formData.append('audio', blob, 'large-voice.webm');

        const request = new NextRequest('http://localhost:3000/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const response = await voiceEntryPost(request);
        const data = await response.json();

        // Verify response status and error code
        expect(response.status).toBe(413);
        expect(data.success).toBe(false);
        expect(data.code).toBe('BODY_TOO_LARGE');
        expect(data.message).toBeDefined();
      });

      test('should return BODY_TOO_LARGE for audio at exactly 10MB + 1 byte', async () => {
        // Create payload at exactly the limit + 1 byte
        const largeAudioData = 'x'.repeat(BODY_SIZE_LIMITS.UPLOAD + 1);
        const formData = new FormData();
        const blob = new Blob([largeAudioData], { type: 'audio/mp3' });
        formData.append('audio', blob, 'exact-limit-voice.mp3');

        const request = new NextRequest('http://localhost:3000/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const response = await voiceEntryPost(request);
        const data = await response.json();

        expect(response.status).toBe(413);
        expect(data.code).toBe('BODY_TOO_LARGE');
      });
    });

    describe('Successful processing for valid sizes', () => {
      test('should accept audio file under 10MB', async () => {
        // Create a small valid audio payload (500KB to avoid timeout)
        const validAudioData = 'x'.repeat(500 * 1024);
        const formData = new FormData();
        const blob = new Blob([validAudioData], { type: 'audio/webm' });
        formData.append('audio', blob, 'valid-voice.webm');

        const request = new NextRequest('http://localhost:3000/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const response = await voiceEntryPost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      }, 10000); // 10 second timeout for S3 polling

      test('should accept small audio file (100KB)', async () => {
        // Create a small audio payload
        const smallAudioData = 'x'.repeat(100 * 1024);
        const formData = new FormData();
        const blob = new Blob([smallAudioData], { type: 'audio/webm' });
        formData.append('audio', blob, 'small-voice.webm');

        const request = new NextRequest('http://localhost:3000/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const response = await voiceEntryPost(request);
        const data = await response.json();

        // Should not return BODY_TOO_LARGE error
        expect(response.status).not.toBe(413);
        expect(data.code).not.toBe('BODY_TOO_LARGE');
      }, 10000); // 10 second timeout for S3 polling
    });

    describe('Error response format validation', () => {
      test('should return standardized error format for oversized audio', async () => {
        const largeAudioData = 'x'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([largeAudioData], { type: 'audio/webm' });
        formData.append('audio', blob, 'large.webm');

        const request = new NextRequest('http://localhost:3000/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const response = await voiceEntryPost(request);
        const data = await response.json();

        // Verify standardized error format
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('code');
        expect(data).toHaveProperty('message');
        expect(typeof data.code).toBe('string');
        expect(typeof data.message).toBe('string');
        expect(data.message.length).toBeGreaterThan(0);
      });

      test('should not include stack trace in error response', async () => {
        const largeAudioData = 'x'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        const blob = new Blob([largeAudioData], { type: 'audio/webm' });
        formData.append('audio', blob, 'large.webm');

        const request = new NextRequest('http://localhost:3000/api/voice-entry', {
          method: 'POST',
          body: formData,
        });

        const response = await voiceEntryPost(request);
        const data = await response.json();
        const responseText = JSON.stringify(data);

        // Verify no stack trace information
        expect(responseText).not.toContain('at ');
        expect(responseText).not.toMatch(/\.ts:/);
        expect(responseText).not.toMatch(/\.js:/);
        expect(data).not.toHaveProperty('stack');
      });
    });
  });

  describe('Cross-Endpoint Consistency', () => {
    test('both endpoints should use same 10MB limit', () => {
      // Verify both endpoints use the same UPLOAD limit
      expect(BODY_SIZE_LIMITS.UPLOAD).toBe(10 * 1024 * 1024);
    });

    test('both endpoints should return same error code for oversized requests', async () => {
      const largeData = 'x'.repeat(11 * 1024 * 1024);
      
      // Test receipt-ocr
      const receiptFormData = new FormData();
      const receiptBlob = new Blob([largeData], { type: 'image/jpeg' });
      receiptFormData.append('file', receiptBlob, 'large.jpg');
      const receiptRequest = new NextRequest('http://localhost:3000/api/receipt-ocr', {
        method: 'POST',
        body: receiptFormData,
      });
      const receiptResponse = await receiptOcrPost(receiptRequest);
      const receiptData = await receiptResponse.json();

      // Test voice-entry
      const voiceFormData = new FormData();
      const voiceBlob = new Blob([largeData], { type: 'audio/webm' });
      voiceFormData.append('audio', voiceBlob, 'large.webm');
      const voiceRequest = new NextRequest('http://localhost:3000/api/voice-entry', {
        method: 'POST',
        body: voiceFormData,
      });
      const voiceResponse = await voiceEntryPost(voiceRequest);
      const voiceData = await voiceResponse.json();

      // Both should return same error code
      expect(receiptData.code).toBe(voiceData.code);
      expect(receiptData.code).toBe('BODY_TOO_LARGE');
    });

    test('both endpoints should return same HTTP status for oversized requests', async () => {
      const largeData = 'x'.repeat(11 * 1024 * 1024);
      
      // Test receipt-ocr
      const receiptFormData = new FormData();
      const receiptBlob = new Blob([largeData], { type: 'image/jpeg' });
      receiptFormData.append('file', receiptBlob, 'large.jpg');
      const receiptRequest = new NextRequest('http://localhost:3000/api/receipt-ocr', {
        method: 'POST',
        body: receiptFormData,
      });
      const receiptResponse = await receiptOcrPost(receiptRequest);

      // Test voice-entry
      const voiceFormData = new FormData();
      const voiceBlob = new Blob([largeData], { type: 'audio/webm' });
      voiceFormData.append('audio', voiceBlob, 'large.webm');
      const voiceRequest = new NextRequest('http://localhost:3000/api/voice-entry', {
        method: 'POST',
        body: voiceFormData,
      });
      const voiceResponse = await voiceEntryPost(voiceRequest);

      // Both should return 413 status
      expect(receiptResponse.status).toBe(413);
      expect(voiceResponse.status).toBe(413);
    });
  });

  describe('Boundary Testing', () => {
    test('should handle empty file upload', async () => {
      const formData = new FormData();
      const blob = new Blob([''], { type: 'image/jpeg' });
      formData.append('file', blob, 'empty.jpg');

      const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
        method: 'POST',
        body: formData,
      });

      const response = await receiptOcrPost(request);
      const data = await response.json();

      // Should not fail on body size validation
      expect(data.code).not.toBe('BODY_TOO_LARGE');
    });

    test('should handle 1 byte file upload', async () => {
      const formData = new FormData();
      const blob = new Blob(['x'], { type: 'image/jpeg' });
      formData.append('file', blob, 'tiny.jpg');

      const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
        method: 'POST',
        body: formData,
      });

      const response = await receiptOcrPost(request);
      const data = await response.json();

      // Should not fail on body size validation
      expect(data.code).not.toBe('BODY_TOO_LARGE');
    });

    test('should handle file at 5MB (middle of valid range)', async () => {
      const mediumData = 'x'.repeat(5 * 1024 * 1024);
      const formData = new FormData();
      const blob = new Blob([mediumData], { type: 'image/jpeg' });
      formData.append('file', blob, 'medium.jpg');

      const request = new NextRequest('http://localhost:3000/api/receipt-ocr', {
        method: 'POST',
        body: formData,
      });

      const response = await receiptOcrPost(request);
      const data = await response.json();

      // Should not fail on body size validation
      expect(data.code).not.toBe('BODY_TOO_LARGE');
    });
  });
});
