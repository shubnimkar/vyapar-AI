// Profile Deletion API with DynamoDB
// Handles account deletion requests

import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/dynamodb-client';
import { APIResponse, DeletionInfo } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json<APIResponse<null>>(
        {
          success: false,
          error: 'User ID is required',
        },
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

      return NextResponse.json<APIResponse<DeletionInfo>>(
        {
          success: true,
          data: deletionInfo,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[Profile Delete] DynamoDB error:', error);
      return NextResponse.json<APIResponse<null>>(
        {
          success: false,
          error: 'Failed to delete profile',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Profile Delete] Unexpected error:', error);
    return NextResponse.json<APIResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
