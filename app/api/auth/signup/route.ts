// Signup API Endpoint
// Creates new user account with profile

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { UserService, ProfileService, type UserRecord, type UserProfile } from '@/lib/dynamodb-client';
import { PasswordHasher } from '@/lib/password-hasher';
import { UsernameValidator } from '@/lib/username-validator';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';

interface SignupRequest {
  username: string;
  password: string;
  shopName: string;
  ownerName: string;
  businessType: 'retail' | 'wholesale' | 'services' | 'manufacturing' | 'restaurant' | 'other';
  city: string;
  phoneNumber?: string;
  language: 'en' | 'hi' | 'mr';
}

export async function POST(request: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limiting check
    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'signup');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.SIGNUP);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many signup attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    const body: SignupRequest = await request.json();
    const { username, password, shopName, ownerName, businessType, city, phoneNumber, language } = body;

    // Validate required fields
    if (!username || !password || !shopName || !ownerName || !businessType || !city || !language) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'All required fields must be provided',
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedUsername = InputSanitizer.sanitizeUsername(username);
    const sanitizedShopName = InputSanitizer.sanitizeText(shopName);
    const sanitizedOwnerName = InputSanitizer.sanitizeText(ownerName);
    const sanitizedCity = InputSanitizer.sanitizeText(city);
    const sanitizedPhone = phoneNumber ? InputSanitizer.sanitizePhoneNumber(phoneNumber) : undefined;

    // Check for SQL injection attempts
    if (InputSanitizer.detectSqlKeywords(username) || 
        InputSanitizer.detectSqlKeywords(shopName) ||
        InputSanitizer.detectSqlKeywords(ownerName)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid input detected',
          code: 'INVALID_INPUT'
        },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameValidation = UsernameValidator.validateFormat(sanitizedUsername);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: usernameValidation.error || 'Invalid username format',
          code: 'INVALID_USERNAME',
          field: 'username'
        },
        { status: 400 }
      );
    }

    // Check username availability
    const usernameExists = await UserService.usernameExists(sanitizedUsername);
    if (usernameExists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username already taken',
          code: 'USERNAME_TAKEN',
          field: 'username'
        },
        { status: 409 }
      );
    }

    // Validate password strength
    const passwordValidation = PasswordHasher.validateStrength(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password does not meet requirements',
          code: 'WEAK_PASSWORD',
          field: 'password',
          details: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (sanitizedShopName.length < 1 || sanitizedShopName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Shop name must be 1-100 characters', field: 'shopName' },
        { status: 400 }
      );
    }
    if (sanitizedOwnerName.length < 1 || sanitizedOwnerName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Owner name must be 1-100 characters', field: 'ownerName' },
        { status: 400 }
      );
    }
    if (sanitizedCity.length < 1 || sanitizedCity.length > 100) {
      return NextResponse.json(
        { success: false, error: 'City must be 1-100 characters', field: 'city' },
        { status: 400 }
      );
    }

    // Hash password
    const hashResult = await PasswordHasher.hash(password);
    if (!hashResult.success || !hashResult.hash) {
      console.error('[Signup] Password hashing failed:', hashResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to process request',
          code: 'SERVER_ERROR'
        },
        { status: 500 }
      );
    }

    // Generate unique userId
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Create USER record
    const userRecord: UserRecord = {
      userId,
      username: sanitizedUsername,
      passwordHash: hashResult.hash,
      createdAt: now,
      updatedAt: now,
      loginCount: 0,
    };

    // Create PROFILE record
    const profileRecord: UserProfile = {
      userId,
      shopName: sanitizedShopName,
      userName: sanitizedOwnerName,
      businessType,
      city: sanitizedCity,
      phoneNumber: sanitizedPhone,
      language,
      createdAt: now,
      updatedAt: now,
    };

    // Save to DynamoDB (atomic operation)
    try {
      await UserService.createUser(userRecord);
      await ProfileService.saveProfile(profileRecord);
      
      console.log('[Signup] User created successfully:', userId);
      
      return NextResponse.json(
        { 
          success: true, 
          userId,
          username: sanitizedUsername
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[Signup] DynamoDB error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create account',
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Signup] Unexpected error:', error);
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
