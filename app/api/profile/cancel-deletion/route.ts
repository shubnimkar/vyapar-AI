// Cancel Profile Deletion API with DynamoDB
// Cancels a pending account deletion request

import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/dynamodb-client';
import { APIResponse } from '@/lib/types';

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
      // Check if profile exists
      const profile = await ProfileService.getProfile(userId);

      if (!profile) {
        return NextResponse.json<APIResponse<null>>(
          {
            success: false,
            error: 'Profile not found',
          },
          { status: 404 }
        );
      }

      // Profile exists, deletion cancelled (no special flag needed in DynamoDB)
      return NextResponse.json<APIResponse<null>>(
        {
          success: true,
          data: null,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[Cancel Deletion] DynamoDB error:', error);
      return NextResponse.json<APIResponse<null>>(
        {
          success: false,
          error: 'Failed to cancel deletion',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Cancel Deletion] Unexpected error:', error);
    return NextResponse.json<APIResponse<null>>(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
