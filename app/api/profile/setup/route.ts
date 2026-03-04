// Profile Setup API Endpoint with DynamoDB
// Creates or updates user profile after authentication

import { NextRequest, NextResponse } from 'next/server';
import { ProfileService, type UserProfile as DynamoProfile } from '@/lib/dynamodb-client';
import { APIResponse, UserProfile, ValidationError } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    logger.info('Profile setup request received', { path: '/api/profile/setup' });
    
    const body = await request.json();
    const { shopName, userName, language, businessType, city, userId, phoneNumber } = body;

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

    try {
      const now = new Date().toISOString();

      // Create DynamoDB profile
      const dynamoProfile: DynamoProfile = {
        userId,
        shopName: shopName.trim(),
        userName: userName.trim(),
        language,
        businessType: businessType?.trim(),
        city: city?.trim(),
        phoneNumber: phoneNumber?.trim(),
        createdAt: now,
        updatedAt: now,
      };

      // Save to DynamoDB
      await ProfileService.saveProfile(dynamoProfile);

      // Transform to API UserProfile format
      const profile: UserProfile = {
        id: userId,
        phoneNumber: phoneNumber || '',
        deviceId: undefined,
        shopName: dynamoProfile.shopName,
        userName: dynamoProfile.userName,
        language: dynamoProfile.language as 'en' | 'hi' | 'mr',
        businessType: dynamoProfile.businessType,
        city: dynamoProfile.city,
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
