// Login API Endpoint
// Authenticates existing users

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/dynamodb-client';
import { PasswordHasher } from '@/lib/password-hasher';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

interface LoginRequest {
  username: string;
  password: string;
  rememberDevice?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Login request received', { path: '/api/auth/login' });

    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limiting check
    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'login');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.LOGIN);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      
      logger.warn('Rate limit exceeded for login', { ip });
      
      return NextResponse.json(
        createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, 'errors.rateLimitExceeded'),
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    const body: LoginRequest = await request.json();
    const { username, password, rememberDevice = false } = body;

    // Validate required fields
    if (!username || !password) {
      logger.warn('Missing required fields in login request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Sanitize username
    const sanitizedUsername = InputSanitizer.sanitizeUsername(username);

    // Get user from database
    const user = await UserService.getUserByUsername(sanitizedUsername);
    
    if (!user) {
      logger.warn('User not found during login', { username: sanitizedUsername, ip });
      
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }

    // Verify password
    const verifyResult = await PasswordHasher.verify(password, user.passwordHash);
    
    if (!verifyResult.success || !verifyResult.match) {
      logger.warn('Invalid password during login', { 
        username: sanitizedUsername, 
        userId: user.userId,
        ip
      });
      
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }

    // Update login statistics
    try {
      await UserService.updateLoginStats(user.userId, sanitizedUsername);
    } catch (error) {
      logger.error('Failed to update login stats', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.userId 
      });
      // Don't fail login if stats update fails
    }

    logger.info('Successful login', { 
      username: sanitizedUsername, 
      userId: user.userId
    });

    // Return success with user data
    return NextResponse.json(
      { 
        success: true,
        user: {
          id: user.userId,
          username: user.username,
        },
        rememberDevice
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/auth/login' }
      ),
      { status: 500 }
    );
  }
}
