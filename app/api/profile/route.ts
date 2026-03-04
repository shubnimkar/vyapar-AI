// Profile API Endpoint with DynamoDB
// GET: Fetch user profile
// PUT: Update user profile

import { NextRequest, NextResponse } from 'next/server';
import { ProfileService, type UserProfile as DynamoProfile } from '@/lib/dynamodb-client';
import { APIResponse, UserProfile, ValidationError } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

export async function GET(request: NextRequest) {
  try {
    logger.info('Profile GET request received', { path: '/api/profile' });
    
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      logger.warn('Profile GET request missing userId', { path: '/api/profile' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }

    try {
      // Fetch user profile from DynamoDB
      const profile = await ProfileService.getProfile(userId);

      if (!profile) {
        // Return demo profile for demo users
        if (userId.startsWith('demo-user-')) {
          logger.debug('Returning demo profile', { userId });
          const demoProfile: UserProfile = {
            id: userId,
            phoneNumber: userId.replace('demo-user-', '+91'),
            shopName: 'राम किराना स्टोर',
            userName: 'राम शर्मा',
            language: 'hi',
            businessType: 'retail',
            city: 'Mumbai',
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
            isActive: true,
            subscriptionTier: 'free',
            preferences: {
              dataRetentionDays: 90,
              autoArchive: true,
              notificationsEnabled: true,
              currency: 'INR',
            },
          };
          
          return NextResponse.json<APIResponse<UserProfile>>(
            {
              success: true,
              data: demoProfile,
            },
            { status: 200 }
          );
        }
        
        logger.warn('Profile not found', { userId, path: '/api/profile' });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound'),
          { status: 404 }
        );
      }

      // Convert DynamoDB profile to API profile format
      const apiProfile: UserProfile = {
        id: profile.userId,
        phoneNumber: profile.phoneNumber || '',
        shopName: profile.shopName,
        userName: profile.userName,
        language: profile.language as 'en' | 'hi' | 'mr',
        businessType: profile.businessType,
        city: profile.city,
        createdAt: profile.createdAt,
        lastActiveAt: profile.updatedAt,
        isActive: true,
        subscriptionTier: 'free',
        preferences: {
          dataRetentionDays: 90,
          autoArchive: true,
          notificationsEnabled: true,
          currency: 'INR',
        },
      };

      logger.info('Profile retrieved successfully', { userId });
      return NextResponse.json<APIResponse<UserProfile>>(
        {
          success: true,
          data: apiProfile,
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
          { path: '/api/profile', operation: 'getProfile', userId }
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
        { path: '/api/profile', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    logger.info('Profile PUT request received', { path: '/api/profile' });
    
    const body = await request.json();
    const { userId, shopName, userName, language, businessType, city, phoneNumber, preferences } = body;

    if (!userId) {
      logger.warn('Profile PUT request missing userId', { path: '/api/profile' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }

    // Validate input data
    const errors: ValidationError[] = [];

    if (language && !['en', 'hi', 'mr'].includes(language)) {
      errors.push({
        field: 'language',
        message: 'Invalid language (must be en, hi, or mr)',
        code: 'invalid',
      });
    }

    // Validate phone number if provided
    if (phoneNumber) {
      const cleaned = phoneNumber.replace(/[\s-]/g, '');
      const isValid = /^(\+91)?[6-9]\d{9}$/.test(cleaned);
      if (!isValid) {
        errors.push({
          field: 'phoneNumber',
          message: 'Invalid phone number format',
          code: 'invalid',
        });
      }
    }

    if (preferences?.dataRetentionDays) {
      const days = preferences.dataRetentionDays;
      if (days < 30 || days > 365) {
        errors.push({
          field: 'preferences.dataRetentionDays',
          message: 'Retention days must be between 30 and 365',
          code: 'out_of_range',
        });
      }
    }

    if (errors.length > 0) {
      logger.warn('Profile PUT validation failed', { errors, userId });
      return NextResponse.json<APIResponse<null>>(
        {
          success: false,
          error: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    try {
      // Get existing profile or create new one
      const existingProfile = await ProfileService.getProfile(userId);
      
      const dynamoProfile: DynamoProfile = {
        userId,
        shopName: shopName?.trim() || existingProfile?.shopName || '',
        userName: userName?.trim() || existingProfile?.userName || '',
        language: language || existingProfile?.language || 'en',
        businessType: businessType?.trim() || existingProfile?.businessType,
        city: city?.trim() || existingProfile?.city,
        phoneNumber: phoneNumber?.trim() || existingProfile?.phoneNumber, // Allow phone number updates
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save profile to DynamoDB
      await ProfileService.saveProfile(dynamoProfile);

      // Convert to API format for response
      const apiProfile: UserProfile = {
        id: userId,
        phoneNumber: dynamoProfile.phoneNumber || existingProfile?.phoneNumber || '',
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
          dataRetentionDays: preferences?.dataRetentionDays || 90,
          autoArchive: preferences?.autoArchive !== undefined ? preferences.autoArchive : true,
          notificationsEnabled: preferences?.notificationsEnabled !== undefined ? preferences.notificationsEnabled : true,
          currency: preferences?.currency || 'INR',
        },
      };

      logger.info('Profile updated successfully', { userId });
      return NextResponse.json<APIResponse<UserProfile>>(
        {
          success: true,
          data: apiProfile,
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
          { path: '/api/profile', operation: 'saveProfile', userId }
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
        { path: '/api/profile', method: 'PUT' }
      ),
      { status: 500 }
    );
  }
}
