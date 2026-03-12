// Signup API Endpoint
// Creates new user account with profile

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { UserService, ProfileService, EmailLookupService, type UserRecord, type UserProfile } from '@/lib/dynamodb-client';
import { PasswordHasher } from '@/lib/password-hasher';
import { UsernameValidator } from '@/lib/username-validator';
import { InputSanitizer } from '@/lib/input-sanitizer';
import { RateLimiter, RATE_LIMITS } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

interface SignupRequest {
  username: string;
  email: string;
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
    logger.info('Signup request received', { path: '/api/auth/signup' });

    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limiting check
    const rateLimitKey = RateLimiter.getRateLimitKey(ip, 'signup');
    const rateLimit = RateLimiter.check(rateLimitKey, RATE_LIMITS.SIGNUP);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      logger.warn('Rate limit exceeded for signup', { ip });
      return NextResponse.json(
        createErrorResponse(ErrorCode.RATE_LIMIT_EXCEEDED, 'errors.rateLimitExceeded'),
        { 
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        }
      );
    }

    const body: SignupRequest = await request.json();
    const { username, email, password, shopName, ownerName, businessType, city, phoneNumber, language } = body;

    // Validate required fields
    if (!username || !email || !password || !shopName || !ownerName || !businessType || !city || !language) {
      logger.warn('Missing required fields in signup request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.MISSING_REQUIRED_FIELDS, 'errors.missingRequiredFields'),
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedUsername = InputSanitizer.sanitizeUsername(username);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedShopName = InputSanitizer.sanitizeText(shopName);
    const sanitizedOwnerName = InputSanitizer.sanitizeText(ownerName);
    const sanitizedCity = InputSanitizer.sanitizeText(city);
    const sanitizedPhone = phoneNumber ? InputSanitizer.sanitizePhoneNumber(phoneNumber) : undefined;

    // Check for SQL injection attempts
    if (InputSanitizer.detectSqlKeywords(username) || 
        InputSanitizer.detectSqlKeywords(shopName) ||
        InputSanitizer.detectSqlKeywords(ownerName)) {
      logger.warn('SQL injection attempt detected in signup');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Validate email format
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail);
    if (!emailOk) {
      logger.warn('Invalid email format in signup', { email: sanitizedEmail });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Validate username format
    const usernameValidation = UsernameValidator.validateFormat(sanitizedUsername);
    if (!usernameValidation.valid) {
      logger.warn('Invalid username format in signup', { username: sanitizedUsername });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_USERNAME, 'errors.invalidUsername'),
        { status: 400 }
      );
    }

    // Check username availability
    const usernameExists = await UserService.usernameExists(sanitizedUsername);
    if (usernameExists) {
      logger.warn('Username already taken', { username: sanitizedUsername });
      return NextResponse.json(
        createErrorResponse(ErrorCode.USERNAME_TAKEN, 'errors.usernameTaken'),
        { status: 409 }
      );
    }

    // Check email availability
    const emailExists = await EmailLookupService.emailExists(sanitizedEmail);
    if (emailExists) {
      logger.warn('Email already in use', { email: sanitizedEmail });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 409 }
      );
    }

    // Validate password strength
    const passwordValidation = PasswordHasher.validateStrength(password);
    if (!passwordValidation.valid) {
      logger.warn('Weak password in signup');
      return NextResponse.json(
        createErrorResponse(ErrorCode.WEAK_PASSWORD, 'errors.weakPassword'),
        { status: 400 }
      );
    }

    // Validate field lengths
    if (sanitizedShopName.length < 1 || sanitizedShopName.length > 100) {
      logger.warn('Invalid shop name length');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_FIELD_LENGTH, 'errors.invalidFieldLength'),
        { status: 400 }
      );
    }
    if (sanitizedOwnerName.length < 1 || sanitizedOwnerName.length > 100) {
      logger.warn('Invalid owner name length');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_FIELD_LENGTH, 'errors.invalidFieldLength'),
        { status: 400 }
      );
    }
    if (sanitizedCity.length < 1 || sanitizedCity.length > 100) {
      logger.warn('Invalid city length');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_FIELD_LENGTH, 'errors.invalidFieldLength'),
        { status: 400 }
      );
    }

    // Hash password
    const hashResult = await PasswordHasher.hash(password);
    if (!hashResult.success || !hashResult.hash) {
      logger.error('Password hashing failed', { error: hashResult.error });
      return NextResponse.json(
        createErrorResponse(ErrorCode.SERVER_ERROR, 'errors.serverError'),
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
      email: sanitizedEmail,
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
      email: sanitizedEmail,
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
      await EmailLookupService.createMapping({ email: sanitizedEmail, userId, username: sanitizedUsername, createdAt: now });
      await ProfileService.saveProfile(profileRecord);
      
      logger.info('User created successfully', { userId });
      
      return NextResponse.json(
        { 
          success: true, 
          userId,
          username: sanitizedUsername
        },
        { status: 201 }
      );
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/auth/signup' }
        ),
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/auth/signup' }
      ),
      { status: 500 }
    );
  }
}
