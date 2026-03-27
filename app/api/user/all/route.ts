import { NextRequest, NextResponse } from 'next/server';
import { getCompleteUserData } from '@/lib/user-data';
import { createErrorResponse, ErrorCode, logAndReturnError } from '@/lib/error-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired', 'en'),
        { status: 400 }
      );
    }

    const data = await getCompleteUserData(userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/user/all', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}
