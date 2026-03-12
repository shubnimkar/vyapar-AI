// Profile Setup API Endpoint with DynamoDB
// Creates or updates user profile after authentication

import { NextRequest, NextResponse } from 'next/server';
import { EmailLookupService, ProfileService, UserService, type UserProfile as DynamoProfile } from '@/lib/dynamodb-client';
import { APIResponse, UserProfile, ValidationError, BusinessType, CityTier } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    logger.info('Profile setup request received', { path: '/api/profile/setup' });
    
    const body = await request.json();
    const { shopName, userName, email, username, language, businessType, city, userId, phoneNumber, business_type, city_tier, explanation_mode } = body;

    // Validate required fields
    const errors: ValidationError[] = [];

    if (!shopName || shopName.trim() === '') {
      errors.push({
        field: 'shopName',
        message: 'Shop name is required',
        code: 'required',
      });
    }

    if (!userName || userName.trim() === '') {
      errors.push({
        field: 'userName',
        message: 'User name is required',
        code: 'required',
      });
    }

    if (!language || !['en', 'hi', 'mr'].includes(language)) {
      errors.push({
        field: 'language',
        message: 'Valid language is required (en, hi, or mr)',
        code: 'invalid',
      });
    }

    if (!userId) {
      logger.warn('Profile setup missing userId', { path: '/api/profile/setup' });
      errors.push({
        field: 'auth',
        message: 'User authentication required',
        code: 'unauthorized',
      });
    }

    // Validate persona fields
    if (!business_type) {
      errors.push({
        field: 'business_type',
        message: 'Business type is required',
        code: 'required',
      });
    } else if (!ProfileService.validateBusinessType(business_type)) {
      errors.push({
        field: 'business_type',
        message: 'Must be one of: kirana, salon, pharmacy, restaurant, other',
        code: 'invalid_enum',
      });
    }

    if (!explanation_mode) {
      errors.push({
        field: 'explanation_mode',
        message: 'Explanation mode is required',
        code: 'required',
      });
    } else if (!ProfileService.validateExplanationMode(explanation_mode)) {
      errors.push({
        field: 'explanation_mode',
        message: 'Must be one of: simple, detailed',
        code: 'invalid_enum',
      });
    }

    // city_tier is optional, but validate if provided
    if (city_tier !== undefined && city_tier !== null) {
      const validTiers = ['tier1', 'tier2', 'tier3'];
      if (!validTiers.includes(city_tier)) {
        errors.push({
          field: 'city_tier',
          message: 'Must be one of: tier1, tier2, tier3, or null',
          code: 'invalid_enum',
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Profile setup validation failed', { errors });
      return NextResponse.json<APIResponse<null>>(
        {
          success: false,
          error: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    // Validate phone number if provided
    if (phoneNumber) {
      const cleaned = phoneNumber.replace(/[\s-]/g, '');
      const isValid = /^(\+91)?[6-9]\d{9}$/.test(cleaned);
      if (!isValid) {
        logger.warn('Invalid phone number format', { phoneNumber });
        errors.push({
          field: 'phoneNumber',
          message: 'Invalid phone number format. Must be a valid Indian mobile number.',
          code: 'invalid',
        });
        return NextResponse.json<APIResponse<null>>(
          {
            success: false,
            error: 'Validation failed',
            errors,
          },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (normalizedEmail) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
      if (!ok) {
        errors.push({ field: 'email', message: 'Invalid email format', code: 'invalid' });
        return NextResponse.json<APIResponse<null>>(
          { success: false, error: 'Validation failed', errors },
          { status: 400 }
        );
      }
      const existing = await EmailLookupService.getByEmail(normalizedEmail);
      if (existing && existing.userId !== userId) {
        errors.push({ field: 'email', message: 'Email already in use', code: 'duplicate' });
        return NextResponse.json<APIResponse<null>>(
          { success: false, error: 'Validation failed', errors },
          { status: 409 }
        );
      }
    }

    try {
      const now = new Date().toISOString();

      // Create DynamoDB profile
      const dynamoProfile: DynamoProfile = {
        userId,
        shopName: shopName.trim(),
        userName: userName.trim(),
        email: normalizedEmail || undefined,
        language,
        businessType: businessType?.trim(),
        city: city?.trim(),
        phoneNumber: phoneNumber?.trim(),
        business_type,
        city_tier: city_tier || null,
        explanation_mode,
        createdAt: now,
        updatedAt: now,
      };

      // Save to DynamoDB
      await ProfileService.saveProfile(dynamoProfile);

      // Keep auth/email lookup in sync when username is provided (edit-mode flow)
      if (normalizedEmail && typeof username === 'string' && username.trim()) {
        const normalizedUsername = username.trim();
        await UserService.updateEmail(normalizedUsername, normalizedEmail);
        await EmailLookupService.createMapping({ email: normalizedEmail, userId, username: normalizedUsername });
      }

      // Transform to API UserProfile format
      const profile: UserProfile = {
        id: userId,
        phoneNumber: phoneNumber || '',
        email: dynamoProfile.email,
        deviceId: undefined,
        shopName: dynamoProfile.shopName,
        userName: dynamoProfile.userName,
        language: dynamoProfile.language as 'en' | 'hi' | 'mr',
        businessType: dynamoProfile.businessType,
        city: dynamoProfile.city,
        business_type: (dynamoProfile.business_type || 'other') as BusinessType,
        city_tier: dynamoProfile.city_tier as CityTier | undefined,
        explanation_mode: (dynamoProfile.explanation_mode || 'simple') as 'simple' | 'detailed',
        createdAt: dynamoProfile.createdAt,
        lastActiveAt: dynamoProfile.updatedAt,
        isActive: true,
        subscriptionTier: 'free',
        preferences: {
          dataRetentionDays: 90,
          autoArchive: true,
          notificationsEnabled: true,
          currency: 'INR',
        },
        deletionRequestedAt: undefined,
        deletionScheduledAt: undefined,
      };

      logger.info('Profile setup completed successfully', { userId });
      return NextResponse.json<APIResponse<UserProfile>>(
        {
          success: true,
          data: profile,
        },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/profile/setup', operation: 'saveProfile', userId }
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
        { path: '/api/profile/setup', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
