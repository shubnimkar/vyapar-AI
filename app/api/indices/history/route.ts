import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalIndicesFromDynamoDB } from '@/lib/index-sync';
import { logAndReturnError, ErrorCode, createErrorResponse } from '@/lib/error-utils';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !startDate || !endDate) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }

    const data = await getHistoricalIndicesFromDynamoDB(userId, startDate, endDate);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to get indices history', { error, path: '/api/indices/history' });
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/indices/history', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}
