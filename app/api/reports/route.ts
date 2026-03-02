// Reports API with DynamoDB
// Handles report generation and retrieval

import { NextRequest, NextResponse } from 'next/server';
import { logError, logInfo } from '@/lib/aws-config';
import { DynamoDBService } from '@/lib/dynamodb-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    logInfo('reports-get', `Fetching reports for user ${userId}`);

    // Query reports from DynamoDB
    const reports = await DynamoDBService.queryByPK(
      `USER#${userId}`,
      'REPORT#'
    );

    // Sort by date descending (most recent first)
    const sortedReports = reports
      .map(item => ({
        reportId: item.reportId,
        reportType: item.reportType,
        date: item.date,
        reportData: item.reportData,
        createdAt: item.createdAt,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      success: true,
      data: sortedReports,
    });
  } catch (error) {
    logError('reports-get', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, automationEnabled } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    logInfo('reports-post', `Updating automation preferences for user ${userId}`);

    // Update user preferences in DynamoDB
    await DynamoDBService.putItem({
      PK: `USER#${userId}`,
      SK: 'PREFERENCES',
      entityType: 'PREFERENCES',
      userId,
      automationEnabled: automationEnabled ?? false,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        automationEnabled: automationEnabled ?? false,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logError('reports-post', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
