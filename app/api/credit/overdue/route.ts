/**
 * GET /api/credit/overdue
 * 
 * Retrieve overdue credits for a user, filtered by threshold and sorted by urgency.
 * 
 * Query Parameters:
 * - userId: string (required) - User ID to fetch credits for
 * - threshold: number (optional) - Minimum days overdue (default: 3)
 * 
 * Response:
 * - success: boolean
 * - data: { credits: OverdueCredit[], summary: FollowUpSummary }
 * - error: string (if error occurred)
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.3, 10.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOverdueCredits } from '@/lib/credit-manager';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { logger } from '@/lib/logger';
import { ErrorCode, logAndReturnError, createErrorResponse } from '@/lib/error-utils';
import type { CreditEntry, OverdueCredit, FollowUpSummary } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const thresholdParam = searchParams.get('threshold');
    
    // Validate required parameters
    if (!userId) {
      logger.warn('Missing userId parameter', { path: '/api/credit/overdue' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }
    
    // Parse threshold (default: 3 days)
    const threshold = thresholdParam ? parseInt(thresholdParam, 10) : 3;
    if (isNaN(threshold) || threshold < 0) {
      logger.warn('Invalid threshold parameter', { threshold: thresholdParam });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }
    
    logger.info('Fetching overdue credits', { userId, threshold });
    
    // Fetch all credit entries from DynamoDB
    const dynamodb = new DynamoDBClient({
      region: process.env.DYNAMODB_REGION || process.env.AWS_S3_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
      },
    });
    const tableName = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai-data';
    
    const queryCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `USER#${userId}` },
        ':sk': { S: 'CREDIT#' }
      }
    });
    
    const result = await dynamodb.send(queryCommand);
    
    // Parse DynamoDB items to CreditEntry objects
    const credits: CreditEntry[] = (result.Items || []).map((item: Record<string, any>) => {
      const unmarshalled = unmarshall(item);
      return {
        id: unmarshalled.id,
        userId: unmarshalled.userId,
        customerName: unmarshalled.customerName,
        phoneNumber: unmarshalled.phoneNumber,
        amount: unmarshalled.amount,
        dateGiven: unmarshalled.dateGiven,
        dueDate: unmarshalled.dueDate,
        isPaid: unmarshalled.isPaid,
        paidDate: unmarshalled.paidDate,
        lastReminderAt: unmarshalled.lastReminderAt,
        createdAt: unmarshalled.createdAt,
        updatedAt: unmarshalled.updatedAt
      };
    });
    
    logger.info('Fetched credits from DynamoDB', { 
      userId, 
      totalCredits: credits.length 
    });
    
    // Use Credit Manager to calculate overdue status and sort
    const overdueCredits = getOverdueCredits(credits, threshold);
    
    // Calculate summary
    const summary: FollowUpSummary = {
      totalOverdue: overdueCredits.length,
      totalAmount: overdueCredits.reduce((sum, credit) => sum + credit.amount, 0),
      oldestOverdue: overdueCredits.length > 0 
        ? Math.max(...overdueCredits.map(c => c.daysOverdue))
        : 0
    };
    
    logger.info('Calculated overdue credits', {
      userId,
      overdueCount: overdueCredits.length,
      totalAmount: summary.totalAmount,
      oldestOverdue: summary.oldestOverdue
    });
    
    return NextResponse.json({
      success: true,
      data: {
        credits: overdueCredits,
        summary
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.DYNAMODB_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/credit/overdue' }
      ),
      { status: 500 }
    );
  }
}
