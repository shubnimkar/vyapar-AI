// Reports API with DynamoDB
// Handles report generation and retrieval

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/dynamodb-client';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

export async function GET(request: NextRequest) {
  try {
    logger.info('Reports GET request received', { path: '/api/reports' });
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      logger.warn('Reports GET missing userId', { path: '/api/reports' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      logger.info('Fetching reports for user', { userId });

      // Query reports from DynamoDB
      const reports = await DynamoDBService.queryByPK(
        `USER#${userId}`,
        'REPORT#'
      );

      // Sort by date descending (most recent first) and flatten structure
      const sortedReports = reports
        .map(item => ({
          id: item.reportId,
          userId: item.userId,
          date: item.date,
          generatedAt: item.createdAt,
          totalSales: item.reportData?.totalSales || 0,
          totalExpenses: item.reportData?.totalExpenses || 0,
          netProfit: item.reportData?.netProfit || 0,
          topExpenseCategories: item.reportData?.topExpenseCategories || [],
          insights: item.reportData?.insights || '',
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      logger.info('Reports retrieved successfully', { userId, count: sortedReports.length });
      return NextResponse.json({
        success: true,
        data: sortedReports,
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/reports', operation: 'queryReports', userId }
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
        { path: '/api/reports', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Reports POST request received', { path: '/api/reports' });
    
    const body = await request.json();
    const { userId, automationEnabled } = body;

    if (!userId) {
      logger.warn('Reports POST missing userId', { path: '/api/reports' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      logger.info('Updating automation preferences for user', { userId, automationEnabled });

      // Update user preferences in DynamoDB
      await DynamoDBService.putItem({
        PK: `USER#${userId}`,
        SK: 'PREFERENCES',
        entityType: 'PREFERENCES',
        userId,
        automationEnabled: automationEnabled ?? false,
        updatedAt: new Date().toISOString(),
      });

      logger.info('Automation preferences updated successfully', { userId });
      return NextResponse.json({
        success: true,
        data: {
          userId,
          automationEnabled: automationEnabled ?? false,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/reports', operation: 'updatePreferences', userId }
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
        { path: '/api/reports', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
