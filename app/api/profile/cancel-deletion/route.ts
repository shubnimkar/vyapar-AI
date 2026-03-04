// Cancel Profile Deletion API with DynamoDB
// Cancels a pending account deletion request

import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/dynamodb-client';
import { APIResponse } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    logger.info('Cancel deletion request received', { path: '/api/profile/cancel-deletion' });
    
    const { userId } = await request.json();

    if (!userId) {
      logger.warn('Cancel deletion missing userId', { path: '/api/profile/cancel-deletion' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }

    try {
      // Check if profile exists
      const profile = await ProfileService.getProfile(userId);

      if (!profile) {
        logger.warn('Profile not found for cancel deletion', { userId });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound'),
          { status: 404 }
        );
      }

      // Profile exists, deletion cancelled (no special flag needed in DynamoDB)
      logger.info('Deletion cancelled successfully', { userId });
      return NextResponse.json<APIResponse<null>>(
        {
          success: true,
          data: null,
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
          { path: '/api/profile/cancel-deletion', operation: 'getProfile', userId }
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
        { path: '/api/profile/cancel-deletion', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
