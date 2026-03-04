// Check Username Availability API Endpoint
// Validates username format and checks availability

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/dynamodb-client';
import { UsernameValidator } from '@/lib/username-validator';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limiting check
    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'check-username');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.CHECK_USERNAME);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { 
          available: false,
          valid: false,
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    // Get username from query params
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { 
          available: false,
          valid: false,
          error: 'Username parameter is required'
        },
        { status: 400 }
      );
    }

    // Sanitize username
    const sanitizedUsername = InputSanitizer.sanitizeUsername(username);

    // Validate format
    const validation = UsernameValidator.validateFormat(sanitizedUsername);
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          available: false,
          valid: false,
          error: validation.error
        },
        { status: 200 }
      );
    }

    // Check availability
    const startTime = Date.now();
    const exists = await UserService.usernameExists(sanitizedUsername);
    const duration = Date.now() - startTime;

    // Log if query takes too long
    if (duration > 500) {
      logger.warn('Slow username availability query', { 
        path: '/api/auth/check-username',
        username: sanitizedUsername, 
        duration 
      });
    }

    return NextResponse.json(
      { 
        available: !exists,
        valid: true
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error('Username check unexpected error', { 
      path: '/api/auth/check-username',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        available: false,
        valid: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
