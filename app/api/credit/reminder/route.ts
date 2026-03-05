/**
 * PUT /api/credit/reminder
 * 
 * Record that a WhatsApp reminder was sent for a credit entry.
 * Updates the lastReminderAt timestamp in localStorage and marks for DynamoDB sync.
 * 
 * Request Body:
 * - userId: string (required) - User ID
 * - creditId: string (required) - Credit entry ID
 * - reminderAt: string (required) - ISO timestamp when reminder was sent
 * 
 * Response:
 * - success: boolean
 * - data: { creditId: string, lastReminderAt: string }
 * - error: string (if error occurred)
 * 
 * Requirements: 4.1, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { recordReminder } from '@/lib/reminder-tracker';
import { logger } from '@/lib/logger';
import { ErrorCode, logAndReturnError, createErrorResponse, checkBodySize, BODY_SIZE_LIMITS } from '@/lib/error-utils';

interface ReminderRequest {
  userId: string;
  creditId: string;
  reminderAt: string;
}

export async function PUT(req: NextRequest) {
  try {
    // Check body size (1MB limit for API endpoints)
    const bodyCheck = await checkBodySize(req, BODY_SIZE_LIMITS.DEFAULT);
    if ('error' in bodyCheck) {
      return NextResponse.json(bodyCheck.error, { status: 413 });
    }
    
    // Parse request body
    let body: ReminderRequest;
    try {
      body = JSON.parse(bodyCheck.bodyText);
    } catch (error) {
      logger.warn('Invalid JSON in request body', { path: '/api/credit/reminder' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }
    
    // Validate required fields
    const { userId, creditId, reminderAt } = body;
    
    if (!userId || !creditId || !reminderAt) {
      logger.warn('Missing required fields', { 
        userId: !!userId, 
        creditId: !!creditId, 
        reminderAt: !!reminderAt 
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }
    
    // Validate reminderAt is a valid ISO date string
    const reminderDate = new Date(reminderAt);
    if (isNaN(reminderDate.getTime())) {
      logger.warn('Invalid reminderAt date format', { reminderAt });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }
    
    logger.info('Recording reminder', { userId, creditId, reminderAt });
    
    // Use Reminder Tracker to update credit entry
    // This updates localStorage immediately and marks for DynamoDB sync
    await recordReminder(creditId, userId);
    
    logger.info('Reminder recorded successfully', { userId, creditId });
    
    return NextResponse.json({
      success: true,
      data: {
        creditId,
        lastReminderAt: reminderAt
      }
    });
    
  } catch (error) {
    // Check if error is "Credit entry not found"
    const errorMessage = (error as Error).message;
    if (errorMessage && errorMessage.includes('not found')) {
      logger.warn('Credit entry not found', { error: errorMessage });
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound', 'en'),
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/credit/reminder' }
      ),
      { status: 500 }
    );
  }
}
