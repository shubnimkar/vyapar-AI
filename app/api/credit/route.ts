// Credit Entry API Route
// Handles CRUD operations for credit tracking (Udhaar)
// Supports hybrid sync: localStorage + DynamoDB

import { NextRequest, NextResponse } from 'next/server';
import { CreditEntryService } from '@/lib/dynamodb-client';
import { calculateCreditSummary } from '@/lib/calculations';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

/**
 * GET - Retrieve credit entries
 * Query params: userId
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Credit entry GET request received', { path: '/api/credit' });
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      logger.warn('Credit entry GET missing userId', { path: '/api/credit' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      // Get entries from DynamoDB
      const entries = await CreditEntryService.getEntries(userId);
      
      // Calculate summary
      const summary = calculateCreditSummary(entries);

      logger.info('Credit entries retrieved successfully', { userId, count: entries.length });
      return NextResponse.json({
        success: true,
        data: entries,
        summary,
        count: entries.length,
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/credit', operation: 'getEntries', userId }
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
        { path: '/api/credit', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}

/**
 * POST - Create new credit entry (instant sync to DynamoDB)
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Credit entry POST request received', { path: '/api/credit' });
    
    const body = await request.json();
    const { 
      userId,
      id,
      customerName, 
      amount, 
      dueDate,
      dateGiven,
      phoneNumber,
      isPaid,
      createdAt,
      paidDate,
      lastReminderAt,
      updatedAt,
    } = body;

    // Validate required fields
    if (!userId) {
      logger.warn('Credit entry POST missing userId', { path: '/api/credit' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    if (!customerName || !amount || !dueDate) {
      logger.warn('Credit entry POST missing required fields', { customerName, amount, dueDate });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      logger.warn('Credit entry POST invalid amount', { amount });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Create entry
    const entry = {
      userId,
      id: id || `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerName,
      phoneNumber: phoneNumber || undefined,
      amount: parseFloat(amount.toString()),
      dateGiven: dateGiven || new Date().toISOString().split('T')[0],
      dueDate,
      isPaid: Boolean(isPaid),
      paidDate: paidDate || undefined,
      lastReminderAt: lastReminderAt || undefined,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    };

    try {
      // Instant sync to DynamoDB (user is connected)
      await CreditEntryService.saveEntry(entry);
      logger.info('Credit entry created and synced', { userId, id: entry.id });

      return NextResponse.json({
        success: true,
        data: entry,
        synced: true, // Indicate that entry is already synced to cloud
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/credit', operation: 'saveEntry', userId }
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
        { path: '/api/credit', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing credit entry (instant sync to DynamoDB)
 */
export async function PUT(request: NextRequest) {
  try {
    logger.info('Credit entry PUT request received', { path: '/api/credit' });
    
    const body = await request.json();
    const { 
      userId,
      id,
      customerName,
      phoneNumber,
      amount,
      dueDate,
      dateGiven,
      isPaid,
      paidDate,
      lastReminderAt,
    } = body;

    // Validate required fields
    if (!userId || !id) {
      logger.warn('Credit entry PUT missing required fields', { userId, id });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    try {
      // Get existing entry
      const existing = await CreditEntryService.getEntry(userId, id);
      if (!existing) {
        logger.warn('Credit entry not found for update', { userId, id });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound'),
          { status: 404 }
        );
      }

      // Create updated entry
      const updated = {
        ...existing,
        customerName: customerName ?? existing.customerName,
        phoneNumber: phoneNumber ?? existing.phoneNumber,
        amount: amount ?? existing.amount,
        dateGiven: dateGiven ?? existing.dateGiven,
        dueDate: dueDate ?? existing.dueDate,
        isPaid: isPaid ?? existing.isPaid,
        paidDate: paidDate ?? existing.paidDate,
        lastReminderAt: lastReminderAt ?? existing.lastReminderAt,
        updatedAt: new Date().toISOString(),
      };

      // Instant sync to DynamoDB (user is connected)
      await CreditEntryService.saveEntry(updated);
      logger.info('Credit entry updated and synced', { userId, id: updated.id });

      return NextResponse.json({
        success: true,
        data: updated,
        synced: true, // Indicate that entry is already synced to cloud
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/credit', operation: 'updateEntry', userId, id }
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
        { path: '/api/credit', method: 'PUT' }
      ),
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete credit entry (instant sync to DynamoDB)
 */
export async function DELETE(request: NextRequest) {
  try {
    logger.info('Credit entry DELETE request received', { path: '/api/credit' });
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (!userId || !id) {
      logger.warn('Credit entry DELETE missing required params', { userId, id });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    try {
      // Instant delete from DynamoDB (user is connected)
      await CreditEntryService.deleteEntry(userId, id);
      logger.info('Credit entry deleted and synced', { userId, id });

      return NextResponse.json({
        success: true,
        message: 'Credit entry deleted successfully',
        synced: true, // Indicate that deletion is already synced to cloud
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/credit', operation: 'deleteEntry', userId, id }
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
        { path: '/api/credit', method: 'DELETE' }
      ),
      { status: 500 }
    );
  }
}
