/**
 * Unit Tests for Error Utilities
 * 
 * Tests the error handling utilities including:
 * - createErrorResponse function
 * - logAndReturnError function
 * - validateBodySize function
 * - checkBodySize function
 * - Error code uniqueness
 * - Translation fallback behavior
 * 
 * Validates Requirements: 1.1, 1.2, 1.3
 * Property 1: Error Response Structure Invariant
 */

import {
  createErrorResponse,
  logAndReturnError,
  validateBodySize,
  checkBodySize,
  ErrorCode,
  BODY_SIZE_LIMITS,
  ErrorResponse
} from '../error-utils';
import { logger } from '../logger';
import { Language } from '../types';

// Mock the logger to prevent actual logging during tests
jest.mock('../logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock translations
jest.mock('../translations', () => ({
  getErrorMessage: jest.fn((key: string, lang: string) => {
    const messages: Record<string, Record<string, string>> = {
      'errors.authRequired': {
        en: 'Authentication required. Please log in.',
        hi: 'प्रमाणीकरण आवश्यक है। कृपया लॉग इन करें।',
        mr: 'प्रमाणीकरण आवश्यक आहे. कृपया लॉग इन करा.'
      },
      'errors.invalidInput': {
        en: 'Invalid input. Please check your data.',
        hi: 'अमान्य इनपुट। कृपया अपना डेटा जांचें।',
        mr: 'अवैध इनपुट. कृपया तुमचा डेटा तपासा.'
      },
      'errors.bodyTooLarge': {
        en: 'Request too large. Please reduce file size.',
        hi: 'अनुरोध बहुत बड़ा है। कृपया फ़ाइल का आकार कम करें।',
        mr: 'विनंती खूप मोठी आहे. कृपया फाइल आकार कमी करा.'
      }
    };
    
    // Fallback to English if language not found
    return messages[key]?.[lang] || messages[key]?.['en'] || 'An error occurred';
  })
}));

describe('Error Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createErrorResponse', () => {
    describe('Property 1: Error Response Structure Invariant', () => {
      test('should return response with exactly three fields: success, code, message', () => {
        const response = createErrorResponse(
          ErrorCode.INVALID_INPUT,
          'errors.invalidInput',
          'en'
        );

        // Check that response has exactly 3 fields
        const keys = Object.keys(response);
        expect(keys).toHaveLength(3);
        expect(keys).toContain('success');
        expect(keys).toContain('code');
        expect(keys).toContain('message');
      });

      test('should always set success to false', () => {
        const response = createErrorResponse(
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en'
        );

        expect(response.success).toBe(false);
      });

      test('should include non-empty code field', () => {
        const response = createErrorResponse(
          ErrorCode.AUTH_REQUIRED,
          'errors.authRequired',
          'en'
        );

        expect(response.code).toBeDefined();
        expect(typeof response.code).toBe('string');
        expect(response.code.length).toBeGreaterThan(0);
      });

      test('should include non-empty message field', () => {
        const response = createErrorResponse(
          ErrorCode.NOT_FOUND,
          'errors.notFound',
          'en'
        );

        expect(response.message).toBeDefined();
        expect(typeof response.message).toBe('string');
        expect(response.message.length).toBeGreaterThan(0);
      });

      test('should return correct format for all error codes', () => {
        const errorCodes = [
          ErrorCode.AUTH_REQUIRED,
          ErrorCode.INVALID_INPUT,
          ErrorCode.NOT_FOUND,
          ErrorCode.SERVER_ERROR,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          ErrorCode.BODY_TOO_LARGE,
          ErrorCode.BEDROCK_ERROR,
          ErrorCode.DYNAMODB_ERROR
        ];

        errorCodes.forEach(code => {
          const response = createErrorResponse(code, 'errors.invalidInput', 'en');
          
          expect(response).toHaveProperty('success', false);
          expect(response).toHaveProperty('code');
          expect(response).toHaveProperty('message');
          expect(typeof response.code).toBe('string');
          expect(typeof response.message).toBe('string');
        });
      });
    });

    describe('Multi-language support', () => {
      test('should return English message when language is "en"', () => {
        const response = createErrorResponse(
          ErrorCode.AUTH_REQUIRED,
          'errors.authRequired',
          'en'
        );

        expect(response.message).toBe('Authentication required. Please log in.');
      });

      test('should return Hindi message when language is "hi"', () => {
        const response = createErrorResponse(
          ErrorCode.AUTH_REQUIRED,
          'errors.authRequired',
          'hi'
        );

        expect(response.message).toBe('प्रमाणीकरण आवश्यक है। कृपया लॉग इन करें।');
      });

      test('should return Marathi message when language is "mr"', () => {
        const response = createErrorResponse(
          ErrorCode.AUTH_REQUIRED,
          'errors.authRequired',
          'mr'
        );

        expect(response.message).toBe('प्रमाणीकरण आवश्यक आहे. कृपया लॉग इन करा.');
      });

      test('should default to English when language not specified', () => {
        const response = createErrorResponse(
          ErrorCode.INVALID_INPUT,
          'errors.invalidInput'
        );

        expect(response.message).toBe('Invalid input. Please check your data.');
      });

      test('should fallback to English for unsupported language', () => {
        const response = createErrorResponse(
          ErrorCode.INVALID_INPUT,
          'errors.invalidInput',
          'fr' as Language
        );

        // Should fallback to English
        expect(response.message).toBe('Invalid input. Please check your data.');
      });
    });

    describe('Error code mapping', () => {
      test('should correctly map error code to response', () => {
        const response = createErrorResponse(
          ErrorCode.BODY_TOO_LARGE,
          'errors.bodyTooLarge',
          'en'
        );

        expect(response.code).toBe('BODY_TOO_LARGE');
      });

      test('should preserve error code exactly as provided', () => {
        const testCases = [
          { code: ErrorCode.AUTH_REQUIRED, expected: 'AUTH_REQUIRED' },
          { code: ErrorCode.INVALID_INPUT, expected: 'INVALID_INPUT' },
          { code: ErrorCode.NOT_FOUND, expected: 'NOT_FOUND' },
          { code: ErrorCode.SERVER_ERROR, expected: 'SERVER_ERROR' }
        ];

        testCases.forEach(({ code, expected }) => {
          const response = createErrorResponse(code, 'errors.invalidInput', 'en');
          expect(response.code).toBe(expected);
        });
      });
    });
  });

  describe('logAndReturnError', () => {
    describe('Stack trace exclusion', () => {
      test('should NOT include stack trace in returned response', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Object.<anonymous> (/path/to/file.ts:10:15)';

        const response = logAndReturnError(
          error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en'
        );

        // Response should not contain stack trace patterns
        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('at ');
        expect(responseStr).not.toContain('.ts:');
        expect(responseStr).not.toContain('.js:');
        expect(responseStr).not.toContain('Error:');
        expect(responseStr).not.toContain('/path/to/');
      });

      test('should NOT include file paths in response', () => {
        const error = new Error('Database connection failed');
        error.stack = 'Error: Database connection failed\n    at connect (/app/lib/db.ts:25:10)';

        const response = logAndReturnError(
          error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en'
        );

        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('/app/lib/db.ts');
        expect(responseStr).not.toContain('db.ts');
      });

      test('should NOT include function names from stack trace in response', () => {
        const error = new Error('Function failed');
        error.stack = 'Error: Function failed\n    at processRequest (/app/api/route.ts:50:20)';

        const response = logAndReturnError(
          error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en'
        );

        const responseStr = JSON.stringify(response);
        expect(responseStr).not.toContain('processRequest');
        expect(responseStr).not.toContain('route.ts');
      });

      test('should return only sanitized error response', () => {
        const error = new Error('Internal error with sensitive data');
        error.stack = 'Error: Internal error\n    at secretFunction (/app/secret.ts:100:5)';

        const response = logAndReturnError(
          error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en'
        );

        // Should only have the three standard fields
        expect(Object.keys(response)).toHaveLength(3);
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('code', 'SERVER_ERROR');
        expect(response).toHaveProperty('message');
        expect(response.message).not.toContain('sensitive data');
      });
    });

    describe('Server-side logging', () => {
      test('should log full error details including stack trace', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at test.ts:10:15';

        logAndReturnError(
          error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en'
        );

        expect(logger.error).toHaveBeenCalledWith('API Error', {
          code: 'SERVER_ERROR',
          errorName: 'Error',
          errorMessage: 'Test error',
          stack: 'Error: Test error\n    at test.ts:10:15'
        });
      });

      test('should include additional context in logs', () => {
        const error = new Error('Request failed');
        const context = {
          path: '/api/analyze',
          userId: 'user123',
          requestId: 'req456'
        };

        logAndReturnError(
          error,
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          'en',
          context
        );

        expect(logger.error).toHaveBeenCalledWith('API Error', {
          code: 'BEDROCK_ERROR',
          errorName: 'Error',
          errorMessage: 'Request failed',
          stack: error.stack,
          path: '/api/analyze',
          userId: 'user123',
          requestId: 'req456'
        });
      });

      test('should log error name and message separately', () => {
        const error = new TypeError('Invalid type provided');

        logAndReturnError(
          error,
          ErrorCode.INVALID_INPUT,
          'errors.invalidInput',
          'en'
        );

        expect(logger.error).toHaveBeenCalledWith('API Error', expect.objectContaining({
          errorName: 'TypeError',
          errorMessage: 'Invalid type provided'
        }));
      });
    });

    describe('Response format', () => {
      test('should return standardized error response format', () => {
        const error = new Error('Test');

        const response = logAndReturnError(
          error,
          ErrorCode.NOT_FOUND,
          'errors.notFound',
          'en'
        );

        expect(response).toEqual({
          success: false,
          code: 'NOT_FOUND',
          message: expect.any(String)
        });
      });

      test('should respect language parameter', () => {
        const error = new Error('Test');

        const responseEn = logAndReturnError(
          error,
          ErrorCode.INVALID_INPUT,
          'errors.invalidInput',
          'en'
        );

        const responseHi = logAndReturnError(
          error,
          ErrorCode.INVALID_INPUT,
          'errors.invalidInput',
          'hi'
        );

        expect(responseEn.message).toBe('Invalid input. Please check your data.');
        expect(responseHi.message).toBe('अमान्य इनपुट। कृपया अपना डेटा जांचें।');
      });
    });
  });

  describe('validateBodySize', () => {
    describe('Size validation', () => {
      test('should accept body within size limit', () => {
        const body = 'x'.repeat(500); // 500 bytes
        const limit = 1024; // 1KB

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(true);
        expect(result.size).toBe(500);
      });

      test('should reject body exceeding size limit', () => {
        const body = 'x'.repeat(2000); // 2000 bytes
        const limit = 1024; // 1KB

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(false);
        expect(result.size).toBe(2000);
      });

      test('should accept body exactly at size limit', () => {
        const body = 'x'.repeat(1024); // Exactly 1KB
        const limit = 1024;

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(true);
        expect(result.size).toBe(1024);
      });

      test('should reject body one byte over limit', () => {
        const body = 'x'.repeat(1025); // 1 byte over 1KB
        const limit = 1024;

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(false);
        expect(result.size).toBe(1025);
      });
    });

    describe('Different body types', () => {
      test('should handle string body', () => {
        const body = 'test string';
        const limit = 100;

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(true);
        expect(result.size).toBe(Buffer.byteLength(body));
      });

      test('should handle Buffer body', () => {
        const body = Buffer.from('test buffer');
        const limit = 100;

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(true);
        expect(result.size).toBe(body.length);
      });

      test('should handle empty body', () => {
        const body = '';
        const limit = 100;

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(true);
        expect(result.size).toBe(0);
      });

      test('should handle multi-byte characters correctly', () => {
        const body = '你好世界'; // Chinese characters (3 bytes each in UTF-8)
        const limit = 100;

        const result = validateBodySize(body, limit);

        expect(result.valid).toBe(true);
        // Each Chinese character is 3 bytes in UTF-8
        expect(result.size).toBe(12); // 4 characters * 3 bytes
      });
    });

    describe('Various size limits', () => {
      test('should validate against 10MB upload limit', () => {
        const smallBody = 'x'.repeat(5 * 1024 * 1024); // 5MB
        const largeBody = 'x'.repeat(15 * 1024 * 1024); // 15MB

        const smallResult = validateBodySize(smallBody, BODY_SIZE_LIMITS.UPLOAD);
        const largeResult = validateBodySize(largeBody, BODY_SIZE_LIMITS.UPLOAD);

        expect(smallResult.valid).toBe(true);
        expect(largeResult.valid).toBe(false);
      });

      test('should validate against 1MB AI limit', () => {
        const smallBody = 'x'.repeat(500 * 1024); // 500KB
        const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB

        const smallResult = validateBodySize(smallBody, BODY_SIZE_LIMITS.AI);
        const largeResult = validateBodySize(largeBody, BODY_SIZE_LIMITS.AI);

        expect(smallResult.valid).toBe(true);
        expect(largeResult.valid).toBe(false);
      });
    });

    describe('Return value structure', () => {
      test('should always return object with valid and size properties', () => {
        const body = 'test';
        const limit = 100;

        const result = validateBodySize(body, limit);

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('size');
        expect(typeof result.valid).toBe('boolean');
        expect(typeof result.size).toBe('number');
      });

      test('should return accurate size in bytes', () => {
        const testCases = [
          { body: '', expectedSize: 0 },
          { body: 'a', expectedSize: 1 },
          { body: 'hello', expectedSize: 5 },
          { body: 'x'.repeat(1000), expectedSize: 1000 }
        ];

        testCases.forEach(({ body, expectedSize }) => {
          const result = validateBodySize(body, 10000);
          expect(result.size).toBe(expectedSize);
        });
      });
    });
  });

  describe('checkBodySize', () => {
    describe('Request validation', () => {
      test('should return bodyText for valid body size', async () => {
        const body = JSON.stringify({ data: 'test' });
        const req = new Request('http://localhost/api/test', {
          method: 'POST',
          body
        });

        const result = await checkBodySize(req, BODY_SIZE_LIMITS.AI);

        expect(result).toHaveProperty('bodyText');
        expect('error' in result).toBe(false);
        if ('bodyText' in result) {
          expect(result.bodyText).toBe(body);
        }
      });

      test('should return error response for oversized body', async () => {
        const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
        const req = new Request('http://localhost/api/test', {
          method: 'POST',
          body: largeBody
        });

        const result = await checkBodySize(req, BODY_SIZE_LIMITS.AI);

        expect(result).toHaveProperty('error');
        if ('error' in result) {
          expect(result.error).toHaveProperty('success', false);
          expect(result.error).toHaveProperty('code', 'BODY_TOO_LARGE');
          expect(result.error).toHaveProperty('message');
        }
      });

      test('should log warning for oversized requests', async () => {
        const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
        const req = new Request('http://localhost/api/analyze', {
          method: 'POST',
          body: largeBody
        });

        await checkBodySize(req, BODY_SIZE_LIMITS.AI);

        expect(logger.warn).toHaveBeenCalledWith('Request body too large', {
          size: expect.any(Number),
          limit: BODY_SIZE_LIMITS.AI,
          path: '/api/analyze'
        });
      });

      test('should include request path in warning log', async () => {
        const largeBody = 'x'.repeat(15 * 1024 * 1024); // 15MB - exceeds 10MB upload limit
        const req = new Request('http://localhost/api/receipt-ocr', {
          method: 'POST',
          body: largeBody
        });

        await checkBodySize(req, BODY_SIZE_LIMITS.UPLOAD);

        expect(logger.warn).toHaveBeenCalledWith(
          'Request body too large',
          expect.objectContaining({
            path: '/api/receipt-ocr'
          })
        );
      });
    });

    describe('Error handling', () => {
      test('should return bodyText with empty object and log error if body reading fails', async () => {
        // Create a request that will fail when reading body
        const req = {
          text: jest.fn().mockRejectedValue(new Error('Read failed')),
          url: 'http://localhost/api/test'
        } as unknown as Request;

        const result = await checkBodySize(req, BODY_SIZE_LIMITS.AI);

        expect(result).toHaveProperty('bodyText', '{}');
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to check body size',
          expect.objectContaining({
            error: expect.any(Error)
          })
        );
      });
    });

    describe('Different size limits', () => {
      test('should enforce 10MB limit for upload endpoints', async () => {
        const body9MB = 'x'.repeat(9 * 1024 * 1024);
        const body11MB = 'x'.repeat(11 * 1024 * 1024);

        const req9MB = new Request('http://localhost/api/upload', {
          method: 'POST',
          body: body9MB
        });
        const req11MB = new Request('http://localhost/api/upload', {
          method: 'POST',
          body: body11MB
        });

        const result9MB = await checkBodySize(req9MB, BODY_SIZE_LIMITS.UPLOAD);
        const result11MB = await checkBodySize(req11MB, BODY_SIZE_LIMITS.UPLOAD);

        expect('bodyText' in result9MB).toBe(true);
        expect('error' in result11MB).toBe(true);
        if ('error' in result11MB) {
          expect(result11MB.error.code).toBe('BODY_TOO_LARGE');
        }
      });

      test('should enforce 1MB limit for AI endpoints', async () => {
        const body500KB = 'x'.repeat(500 * 1024);
        const body2MB = 'x'.repeat(2 * 1024 * 1024);

        const req500KB = new Request('http://localhost/api/analyze', {
          method: 'POST',
          body: body500KB
        });
        const req2MB = new Request('http://localhost/api/analyze', {
          method: 'POST',
          body: body2MB
        });

        const result500KB = await checkBodySize(req500KB, BODY_SIZE_LIMITS.AI);
        const result2MB = await checkBodySize(req2MB, BODY_SIZE_LIMITS.AI);

        expect('bodyText' in result500KB).toBe(true);
        expect('error' in result2MB).toBe(true);
        if ('error' in result2MB) {
          expect(result2MB.error.code).toBe('BODY_TOO_LARGE');
        }
      });
    });
  });

  describe('ErrorCode enum', () => {
    describe('Error code uniqueness', () => {
      test('should have unique values for all error codes', () => {
        const errorCodeValues = Object.values(ErrorCode);
        const uniqueValues = new Set(errorCodeValues);

        expect(uniqueValues.size).toBe(errorCodeValues.length);
      });

      test('should have all required error codes', () => {
        const requiredCodes = [
          'AUTH_REQUIRED',
          'INVALID_INPUT',
          'NOT_FOUND',
          'SERVER_ERROR',
          'RATE_LIMIT_EXCEEDED',
          'BODY_TOO_LARGE',
          'BEDROCK_ERROR',
          'DYNAMODB_ERROR'
        ];

        requiredCodes.forEach(code => {
          expect(Object.values(ErrorCode)).toContain(code);
        });
      });

      test('should have exactly 18 error codes', () => {
        const errorCodeCount = Object.keys(ErrorCode).length;
        expect(errorCodeCount).toBe(18);
      });

      test('each error code should map to itself', () => {
        expect(ErrorCode.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
        expect(ErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
        expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
        expect(ErrorCode.SERVER_ERROR).toBe('SERVER_ERROR');
        expect(ErrorCode.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
        expect(ErrorCode.BODY_TOO_LARGE).toBe('BODY_TOO_LARGE');
        expect(ErrorCode.BEDROCK_ERROR).toBe('BEDROCK_ERROR');
        expect(ErrorCode.DYNAMODB_ERROR).toBe('DYNAMODB_ERROR');
      });
    });
  });

  describe('BODY_SIZE_LIMITS constants', () => {
    test('should define correct upload limit (10MB)', () => {
      expect(BODY_SIZE_LIMITS.UPLOAD).toBe(10 * 1024 * 1024);
    });

    test('should define correct AI limit (1MB)', () => {
      expect(BODY_SIZE_LIMITS.AI).toBe(1 * 1024 * 1024);
    });

    test('should define correct default limit (1MB)', () => {
      expect(BODY_SIZE_LIMITS.DEFAULT).toBe(1 * 1024 * 1024);
    });

    test('upload limit should be larger than AI limit', () => {
      expect(BODY_SIZE_LIMITS.UPLOAD).toBeGreaterThan(BODY_SIZE_LIMITS.AI);
    });
  });

  describe('Translation fallback behavior', () => {
    test('should fallback to English when translation missing', () => {
      const response = createErrorResponse(
        ErrorCode.AUTH_REQUIRED,
        'errors.authRequired',
        'de' as Language // German not supported
      );

      // Should get English message as fallback
      expect(response.message).toBe('Authentication required. Please log in.');
    });

    test('should handle unknown error keys gracefully', () => {
      const response = createErrorResponse(
        ErrorCode.SERVER_ERROR,
        'errors.unknownKey',
        'en'
      );

      // Should get default error message
      expect(response.message).toBe('An error occurred');
    });
  });
});
