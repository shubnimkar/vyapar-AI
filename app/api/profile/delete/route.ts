// Profile Deletion API with DynamoDB
// Handles account deletion requests

import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/dynamodb-client';
import { APIResponse, DeletionInfo } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    logger.info('Profile deletion request received', { path: '/api/profile/delete' });
    
    const { userId } = await request.json();

    if (!userId) {
      logger.warn('Profile deletion missing userId', { path: '/api/profile/delete' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }

    try {
      // Delete profile from DynamoDB
      await ProfileService.deleteProfile(userId);

      const deletionInfo: DeletionInfo = {
        requestedAt: new Date().toISOString(),
        scheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        daysRemaining: 30,
      };

      logger.info('Profile deletion scheduled', { userId, scheduledAt: deletionInfo.scheduledAt });
      return NextResponse.json<APIResponse<DeletionInfo>>(
        {
          success: true,
          data: deletionInfo,
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
          { path: '/api/profile/delete', operation: 'deleteProfile', userId }
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
        { path: '/api/profile/delete', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
