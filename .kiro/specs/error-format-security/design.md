# Design Document: Error Format & Security

## Overview

The Error Format & Security feature establishes a comprehensive error handling and security infrastructure for Vyapar AI. This feature provides standardized error responses, structured logging, security headers, and request validation to protect the application and ensure a reliable user experience across all API endpoints.

### Key Design Principles

1. **Consistency**: All API errors follow the same response format
2. **Security-First**: No sensitive information exposed to clients
3. **Observability**: Structured logging for debugging and monitoring
4. **Multi-Language**: Error messages localized to user's preferred language
5. **Defense in Depth**: Multiple layers of security (headers, validation, logging)

### Feature Scope

**Error Handling**:
- Standardized error response format
- Predefined error code catalog
- Multi-language error messages
- Stack trace security (server-side only)

**Logging**:
- Centralized logger utility
- Structured log format
- Log level hierarchy
- Production-safe logging (no console.log)

**Security**:
- Security headers middleware
- Request body size limits
- Content Security Policy
- Protection against common web vulnerabilities


## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Middleware                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Security Headers Middleware                         │  │
│  │  - Content-Security-Policy                           │  │
│  │  - X-Frame-Options                                   │  │
│  │  - X-Content-Type-Options                            │  │
│  │  - Referrer-Policy                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Route Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Request Validation                                  │  │
│  │  - Body size check                                   │  │
│  │  - Input validation                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Business Logic                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Error Handling                                      │  │
│  │  - createErrorResponse()                             │  │
│  │  - logAndReturnError()                               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│  Logger Service      │      │  Error Utility Functions     │
│  - debug()           │      │  - createErrorResponse()     │
│  - info()            │      │  - logAndReturnError()       │
│  - warn()            │      │  - validateBodySize()        │
│  - error()           │      │  - getErrorMessage()         │
└──────────────────────┘      └──────────────────────────────┘
```

### Data Flow

**Normal Request Flow**:
```
Request → Middleware (add security headers) → Route Handler → Response
```

**Error Flow**:
```
Request → Middleware → Route Handler → Error Occurs
    ↓
Logger.error(full error with stack trace)
    ↓
createErrorResponse(code, message_key, language)
    ↓
Response (sanitized error, no stack trace)
```


## Components and Interfaces

### Core Error Handling

#### Error Response Creator

**Location**: `/lib/error-utils.ts`

```typescript
/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}

/**
 * Error code catalog
 */
export enum ErrorCode {
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BODY_TOO_LARGE = 'BODY_TOO_LARGE',
  BEDROCK_ERROR = 'BEDROCK_ERROR',
  DYNAMODB_ERROR = 'DYNAMODB_ERROR'
}

/**
 * Create standardized error response
 * 
 * @param code - Error code from ErrorCode enum
 * @param messageKey - Translation key for error message
 * @param language - User's preferred language
 * @returns Standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  messageKey: string,
  language: Language = 'en'
): ErrorResponse {
  return {
    success: false,
    code,
    message: getErrorMessage(messageKey, language)
  };
}

/**
 * Log error server-side and return client-safe response
 * 
 * @param error - Error object with stack trace
 * @param code - Error code
 * @param messageKey - Translation key
 * @param language - User's language
 * @param context - Additional context for logging
 * @returns Error response for client
 */
export function logAndReturnError(
  error: Error,
  code: ErrorCode,
  messageKey: string,
  language: Language = 'en',
  context?: Record<string, any>
): ErrorResponse {
  // Log full error server-side
  logger.error('API Error', {
    code,
    message: error.message,
    stack: error.stack,
    ...context
  });
  
  // Return sanitized error to client
  return createErrorResponse(code, messageKey, language);
}
```

#### Body Size Validator

```typescript
/**
 * Body size limits by endpoint type
 */
export const BODY_SIZE_LIMITS = {
  UPLOAD: 10 * 1024 * 1024,  // 10MB for uploads
  AI: 1 * 1024 * 1024,        // 1MB for AI endpoints
  DEFAULT: 1 * 1024 * 1024    // 1MB default
};

/**
 * Validate request body size
 * 
 * @param body - Request body (string or Buffer)
 * @param limit - Size limit in bytes
 * @returns Validation result
 */
export function validateBodySize(
  body: string | Buffer,
  limit: number
): { valid: boolean; size: number } {
  const size = Buffer.byteLength(body);
  
  return {
    valid: size <= limit,
    size
  };
}

/**
 * Middleware-style body size validator
 * 
 * @param req - Next.js request
 * @param limit - Size limit in bytes
 * @returns Error response if too large, null if valid
 */
export async function checkBodySize(
  req: Request,
  limit: number
): Promise<ErrorResponse | null> {
  try {
    const body = await req.text();
    const validation = validateBodySize(body, limit);
    
    if (!validation.valid) {
      logger.warn('Request body too large', {
        size: validation.size,
        limit,
        path: new URL(req.url).pathname
      });
      
      return createErrorResponse(
        ErrorCode.BODY_TOO_LARGE,
        'errors.bodyTooLarge',
        'en' // Will be replaced with user's language in route
      );
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to check body size', { error });
    return null; // Allow request to proceed
  }
}
```


### Logging System

#### Logger Service

**Location**: `/lib/logger.ts`

```typescript
/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
}

/**
 * Centralized logger service
 */
class Logger {
  private config: LoggerConfig;
  
  constructor() {
    // Production: info level, no debug logs
    // Development: debug level, all logs
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.config = {
      minLevel: isProduction ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: !isProduction
    };
  }
  
  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.config.minLevel);
    const currentIndex = levels.indexOf(level);
    
    return currentIndex >= minIndex;
  }
  
  /**
   * Format log entry
   */
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };
  }
  
  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    if (this.config.enableConsole) {
      // Development: use console for readability
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      console.log(`[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`);
    } else {
      // Production: structured JSON for log aggregation
      console.log(JSON.stringify(entry));
    }
  }
  
  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog(LogLevel.DEBUG, message, context));
    }
  }
  
  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog(LogLevel.INFO, message, context));
    }
  }
  
  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog(LogLevel.WARN, message, context));
    }
  }
  
  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog(LogLevel.ERROR, message, context));
    }
  }
}

// Export singleton instance
export const logger = new Logger();
```


### Security Middleware

#### Security Headers Middleware

**Location**: `middleware.ts` (project root)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers middleware
 * 
 * Adds security headers to all responses
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://bedrock-runtime.*.amazonaws.com"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Apply middleware to all routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```


### Translation Integration

#### Error Message Translations

**Location**: `/lib/translations.ts` (additions)

```typescript
// Error message translations
export const errorTranslations = {
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
  'errors.notFound': {
    en: 'Resource not found.',
    hi: 'संसाधन नहीं मिला।',
    mr: 'संसाधन सापडले नाही.'
  },
  'errors.serverError': {
    en: 'Server error. Please try again later.',
    hi: 'सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।',
    mr: 'सर्व्हर त्रुटी. कृपया नंतर पुन्हा प्रयत्न करा.'
  },
  'errors.rateLimitExceeded': {
    en: 'Too many requests. Please wait and try again.',
    hi: 'बहुत अधिक अनुरोध। कृपया प्रतीक्षा करें और पुनः प्रयास करें।',
    mr: 'खूप विनंत्या. कृपया प्रतीक्षा करा आणि पुन्हा प्रयत्न करा.'
  },
  'errors.bodyTooLarge': {
    en: 'Request too large. Please reduce file size.',
    hi: 'अनुरोध बहुत बड़ा है। कृपया फ़ाइल का आकार कम करें।',
    mr: 'विनंती खूप मोठी आहे. कृपया फाइल आकार कमी करा.'
  },
  'errors.bedrockError': {
    en: 'AI service error. Please try again.',
    hi: 'AI सेवा त्रुटि। कृपया पुनः प्रयास करें।',
    mr: 'AI सेवा त्रुटी. कृपया पुन्हा प्रयत्न करा.'
  },
  'errors.dynamodbError': {
    en: 'Database error. Please try again.',
    hi: 'डेटाबेस त्रुटि। कृपया पुनः प्रयास करें।',
    mr: 'डेटाबेस त्रुटी. कृपया पुन्हा प्रयत्न करा.'
  }
};

/**
 * Get error message in specified language
 */
export function getErrorMessage(key: string, language: Language): string {
  const translations = errorTranslations[key];
  
  if (!translations) {
    return 'An error occurred';
  }
  
  return translations[language] || translations.en;
}
```


## API Route Integration

### Example: Upload Endpoint with Body Size Validation

**Location**: `/app/api/receipt-ocr/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { 
  checkBodySize, 
  logAndReturnError, 
  ErrorCode, 
  BODY_SIZE_LIMITS 
} from '@/lib/error-utils';

export async function POST(req: NextRequest) {
  try {
    logger.info('Receipt OCR request received', {
      path: '/api/receipt-ocr'
    });
    
    // Validate body size (10MB limit for uploads)
    const bodySizeError = await checkBodySize(req, BODY_SIZE_LIMITS.UPLOAD);
    if (bodySizeError) {
      return NextResponse.json(bodySizeError, { status: 413 });
    }
    
    // Parse request
    const body = await req.json();
    
    // Validate required fields
    if (!body.image) {
      logger.warn('Missing image in receipt OCR request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }
    
    // Process receipt...
    // (business logic)
    
    logger.info('Receipt OCR completed successfully');
    return NextResponse.json({ success: true, data: result });
    
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/receipt-ocr' }
      ),
      { status: 500 }
    );
  }
}
```

### Example: AI Endpoint with Body Size Validation

**Location**: `/app/api/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { 
  checkBodySize, 
  logAndReturnError, 
  ErrorCode, 
  BODY_SIZE_LIMITS 
} from '@/lib/error-utils';

export async function POST(req: NextRequest) {
  try {
    logger.info('Analysis request received', {
      path: '/api/analyze'
    });
    
    // Validate body size (1MB limit for AI endpoints)
    const bodySizeError = await checkBodySize(req, BODY_SIZE_LIMITS.AI);
    if (bodySizeError) {
      return NextResponse.json(bodySizeError, { status: 413 });
    }
    
    // Parse request
    const body = await req.json();
    
    // Validate required fields
    if (!body.entries || !Array.isArray(body.entries)) {
      logger.warn('Invalid entries in analysis request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }
    
    // Call Bedrock...
    try {
      const analysis = await analyzeWithBedrock(body.entries);
      logger.info('Analysis completed successfully');
      return NextResponse.json({ success: true, data: analysis });
    } catch (bedrockError) {
      return NextResponse.json(
        logAndReturnError(
          bedrockError as Error,
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          'en',
          { path: '/api/analyze' }
        ),
        { status: 503 }
      );
    }
    
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/analyze' }
      ),
      { status: 500 }
    );
  }
}
```


## Error Handling Patterns

### Pattern 1: Input Validation Errors

```typescript
// Validate required fields
if (!body.field) {
  logger.warn('Missing required field', { field: 'field', path: req.url });
  return NextResponse.json(
    createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
    { status: 400 }
  );
}
```

### Pattern 2: Authentication Errors

```typescript
// Check authentication
const session = await getSession(req);
if (!session) {
  logger.warn('Unauthenticated request', { path: req.url });
  return NextResponse.json(
    createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
    { status: 401 }
  );
}
```

### Pattern 3: External Service Errors

```typescript
try {
  const result = await externalService.call();
} catch (error) {
  return NextResponse.json(
    logAndReturnError(
      error as Error,
      ErrorCode.BEDROCK_ERROR, // or DYNAMODB_ERROR
      'errors.bedrockError',
      'en',
      { service: 'bedrock', operation: 'analyze' }
    ),
    { status: 503 }
  );
}
```

### Pattern 4: Generic Server Errors

```typescript
try {
  // Business logic
} catch (error) {
  return NextResponse.json(
    logAndReturnError(
      error as Error,
      ErrorCode.SERVER_ERROR,
      'errors.serverError',
      'en',
      { path: req.url }
    ),
    { status: 500 }
  );
}
```


## Console.log Elimination Strategy

### Step 1: Audit Existing Code

```bash
# Find all console.log usage
grep -r "console\.log" --include="*.ts" --include="*.tsx" app/ lib/ components/

# Find all console.warn usage
grep -r "console\.warn" --include="*.ts" --include="*.tsx" app/ lib/ components/

# Find all console.error usage
grep -r "console\.error" --include="*.ts" --include="*.tsx" app/ lib/ components/
```

### Step 2: Replace with Logger

**Before**:
```typescript
console.log('User logged in:', userId);
console.warn('Cache miss for key:', key);
console.error('Failed to save entry:', error);
```

**After**:
```typescript
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId });
logger.warn('Cache miss', { key });
logger.error('Failed to save entry', { error: error.message, stack: error.stack });
```

### Step 3: ESLint Rule (Optional)

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "no-console": ["error", { "allow": [] }]
  }
}
```


## Testing Strategy

### Unit Tests

**Logger Tests** (`/lib/__tests__/logger.test.ts`):
```typescript
import { logger, LogLevel } from '@/lib/logger';

describe('Logger', () => {
  test('should not output debug logs in production', () => {
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'log');
    
    logger.debug('test message');
    
    expect(consoleSpy).not.toHaveBeenCalled();
  });
  
  test('should output error logs in production', () => {
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'log');
    
    logger.error('test error');
    
    expect(consoleSpy).toHaveBeenCalled();
  });
});
```

**Error Utils Tests** (`/lib/__tests__/error-utils.test.ts`):
```typescript
import { createErrorResponse, validateBodySize, ErrorCode } from '@/lib/error-utils';

describe('Error Utils', () => {
  test('createErrorResponse returns correct format', () => {
    const response = createErrorResponse(
      ErrorCode.INVALID_INPUT,
      'errors.invalidInput',
      'en'
    );
    
    expect(response).toEqual({
      success: false,
      code: 'INVALID_INPUT',
      message: expect.any(String)
    });
  });
  
  test('validateBodySize rejects oversized bodies', () => {
    const largeBody = 'x'.repeat(2 * 1024 * 1024); // 2MB
    const result = validateBodySize(largeBody, 1 * 1024 * 1024); // 1MB limit
    
    expect(result.valid).toBe(false);
    expect(result.size).toBeGreaterThan(1 * 1024 * 1024);
  });
});
```

### Integration Tests

**API Error Handling** (`/app/api/__tests__/error-handling.test.ts`):
```typescript
import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';

describe('API Error Handling', () => {
  test('returns BODY_TOO_LARGE for oversized requests', async () => {
    const largeBody = JSON.stringify({ data: 'x'.repeat(2 * 1024 * 1024) });
    const req = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      body: largeBody
    });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(response.status).toBe(413);
    expect(data.code).toBe('BODY_TOO_LARGE');
  });
  
  test('returns standardized error format', async () => {
    const req = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' })
    });
    
    const response = await POST(req);
    const data = await response.json();
    
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('code');
    expect(data).toHaveProperty('message');
    expect(data).not.toHaveProperty('stack');
  });
});
```


## Deployment Checklist

### Pre-Deployment

- [ ] All console.log replaced with logger calls
- [ ] Security headers middleware deployed
- [ ] Body size limits configured for all endpoints
- [ ] Error translations complete for all languages
- [ ] ESLint no-console rule enabled
- [ ] Unit tests passing
- [ ] Integration tests passing

### Post-Deployment

- [ ] Verify security headers in production (use securityheaders.com)
- [ ] Test error responses in production
- [ ] Verify no stack traces exposed to clients
- [ ] Check structured logs in CloudWatch/logging service
- [ ] Test body size limits with large payloads
- [ ] Verify multi-language error messages


## Correctness Properties

### Property 1: Error Response Structure Invariant

*For any* error response returned by any API route, the response must have exactly three fields: `success` (false), `code` (non-empty string), and `message` (non-empty string).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Stack Trace Exclusion

*For any* error response, the response body must not contain stack trace information (no "at " followed by file paths, no ".ts:" or ".js:" patterns).

**Validates: Requirements 1.4, 10.2, 10.3, 10.4**

### Property 3: Server-Side Error Logging

*For any* error that occurs in an API route, the full error details including stack trace must be logged server-side using the logger.

**Validates: Requirements 1.5, 10.1**

### Property 4: Error Code Catalog Completeness

*For any* error code in the ErrorCode enum, there must be a corresponding translation key in all supported languages (en, hi, mr).

**Validates: Requirements 2.1-2.8, 3.1-3.5**

### Property 5: Logger Level Hierarchy

*For any* log level L, when the logger minimum level is set to L, only messages with level >= L are output.

**Validates: Requirements 4.1-4.5, 4.6**

### Property 6: Production Debug Suppression

*When* NODE_ENV is "production", debug level messages must not be output by the logger.

**Validates: Requirements 4.6, 5.1-5.4**

### Property 7: Structured Log Format

*For any* log entry output by the logger, it must include timestamp (ISO 8601), level, message, and optional context fields.

**Validates: Requirements 4.5, 12.1-12.5**

### Property 8: Security Headers Presence

*For any* HTTP response from the application, it must include Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.

**Validates: Requirements 6.1-6.4, 11.1-11.5**

### Property 9: Body Size Validation

*For any* upload endpoint request with body size > 10MB, the response must have code BODY_TOO_LARGE. *For any* AI endpoint request with body size > 1MB, the response must have code BODY_TOO_LARGE.

**Validates: Requirements 7.1-7.4, 8.1-8.5**

### Property 10: Translation Fallback

*For any* error message request with an unsupported language, the English translation must be returned.

**Validates: Requirements 3.5**

### Property 11: Console.log Absence in Production

*When* NODE_ENV is "production", no console.log, console.warn, or console.error statements execute in the application code.

**Validates: Requirements 5.1-5.4**

### Property 12: Error Utility Function Consistency

*For any* two calls to createErrorResponse with the same code, messageKey, and language, the responses must be identical.

**Validates: Requirements 9.1-9.5**
