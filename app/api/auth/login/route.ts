// Login API Endpoint
// Authenticates existing users

import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/dynamodb-client';
import { PasswordHasher } from '@/lib/password-hasher';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';

interface LoginRequest {
  username: string;
  password: string;
  rememberDevice?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limiting check
    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'login');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.LOGIN);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      
      // Log failed attempt
      console.warn('[Login] Rate limit exceeded:', { ip, timestamp: new Date().toISOString() });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
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
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username and password are required',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Sanitize username
    const sanitizedUsername = InputSanitizer.sanitizeUsername(username);

    // Get user from database
    const user = await UserService.getUserByUsername(sanitizedUsername);
    
    if (!user) {
      // Log failed attempt
      console.warn('[Login] User not found:', { username: sanitizedUsername, ip, timestamp: new Date().toISOString() });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Verify password
    const verifyResult = await PasswordHasher.verify(password, user.passwordHash);
    
    if (!verifyResult.success || !verifyResult.match) {
      // Log failed attempt
      console.warn('[Login] Invalid password:', { 
        username: sanitizedUsername, 
        userId: user.userId,
        ip, 
        timestamp: new Date().toISOString() 
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401 }
      );
    }

    // Update login statistics
    try {
      await UserService.updateLoginStats(user.userId, sanitizedUsername);
    } catch (error) {
      console.error('[Login] Failed to update login stats:', error);
      // Don't fail login if stats update fails
    }

    console.log('[Login] Successful login:', { 
      username: sanitizedUsername, 
      userId: user.userId,
      timestamp: new Date().toISOString() 
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
    console.error('[Login] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
