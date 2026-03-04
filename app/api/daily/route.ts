// Daily Entry API Route
// Handles CRUD operations for daily business entries
// Supports hybrid sync: localStorage + DynamoDB

import { NextRequest, NextResponse } from 'next/server';
import { DailyEntryService } from '@/lib/dynamodb-client';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

/**
 * GET - Retrieve daily entries
 * Query params: userId, startDate (optional), endDate (optional)
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Daily entry GET request received', { path: '/api/daily' });
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!userId) {
      logger.warn('Daily entry GET missing userId', { path: '/api/daily' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      // Get entries from DynamoDB
      const entries = await DailyEntryService.getEntries(userId, startDate, endDate);

      logger.info('Daily entries retrieved successfully', { userId, count: entries.length });
      return NextResponse.json({
        success: true,
        data: entries,
        count: entries.length,
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/daily', operation: 'getEntries', userId }
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
        { path: '/api/daily', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}

/**
 * POST - Create new daily entry (instant sync to DynamoDB)
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Daily entry POST request received', { path: '/api/daily' });
    
    const body = await request.json();
    const { 
      userId,
      entryId,
      date, 
      totalSales, 
      totalExpense, 
      cashInHand,
      notes,
      createdAt,
    } = body;

    // Validate required fields
    if (!userId) {
      logger.warn('Daily entry POST missing userId', { path: '/api/daily' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    if (typeof totalSales !== 'number' || typeof totalExpense !== 'number') {
      logger.warn('Daily entry POST invalid data types', { totalSales, totalExpense });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    if (totalSales < 0 || totalExpense < 0) {
      logger.warn('Daily entry POST negative values', { totalSales, totalExpense });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Calculate metrics
    const estimatedProfit = totalSales - totalExpense;
    const expenseRatio = totalSales > 0 ? totalExpense / totalSales : 0;
    const profitMargin = totalSales > 0 ? estimatedProfit / totalSales : 0;

    // Create entry
    const entry = {
      userId,
      entryId: entryId || uuidv4(),
      date: date || new Date().toISOString().split('T')[0],
      totalSales,
      totalExpense,
      cashInHand,
      notes,
      estimatedProfit,
      expenseRatio,
      profitMargin,
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Instant sync to DynamoDB (user is connected)
      await DailyEntryService.saveEntry(entry);
      logger.info('Daily entry created and synced', { userId, date: entry.date });

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
          { path: '/api/daily', operation: 'saveEntry', userId }
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
        { path: '/api/daily', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing daily entry (instant sync to DynamoDB)
 */
export async function PUT(request: NextRequest) {
  try {
    logger.info('Daily entry PUT request received', { path: '/api/daily' });
    
    const body = await request.json();
    const { 
      userId,
      date,
      totalSales, 
      totalExpense, 
      cashInHand,
      notes,
    } = body;

    // Validate required fields
    if (!userId || !date) {
      logger.warn('Daily entry PUT missing required fields', { userId, date });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    try {
      // Get existing entry
      const existing = await DailyEntryService.getEntry(userId, date);
      if (!existing) {
        logger.warn('Daily entry not found for update', { userId, date });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound'),
          { status: 404 }
        );
      }

      // Update fields
      const updatedTotalSales = totalSales ?? existing.totalSales;
      const updatedTotalExpense = totalExpense ?? existing.totalExpense;

      // Recalculate metrics
      const estimatedProfit = updatedTotalSales - updatedTotalExpense;
      const expenseRatio = updatedTotalSales > 0 ? updatedTotalExpense / updatedTotalSales : 0;
      const profitMargin = updatedTotalSales > 0 ? estimatedProfit / updatedTotalSales : 0;

      // Create updated entry
      const updated = {
        ...existing,
        totalSales: updatedTotalSales,
        totalExpense: updatedTotalExpense,
        cashInHand: cashInHand ?? existing.cashInHand,
        notes: notes ?? existing.notes,
        estimatedProfit,
        expenseRatio,
        profitMargin,
        updatedAt: new Date().toISOString(),
      };

      // Instant sync to DynamoDB (user is connected)
      await DailyEntryService.saveEntry(updated);
      logger.info('Daily entry updated and synced', { userId, date: updated.date });

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
          { path: '/api/daily', operation: 'updateEntry', userId, date }
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
        { path: '/api/daily', method: 'PUT' }
      ),
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete daily entry (instant sync to DynamoDB)
 */
export async function DELETE(request: NextRequest) {
  try {
    logger.info('Daily entry DELETE request received', { path: '/api/daily' });
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      logger.warn('Daily entry DELETE missing required params', { userId, date });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    try {
      // Instant delete from DynamoDB (user is connected)
      await DailyEntryService.deleteEntry(userId, date);
      logger.info('Daily entry deleted and synced', { userId, date });

      return NextResponse.json({
        success: true,
        message: 'Entry deleted successfully',
        synced: true, // Indicate that deletion is already synced to cloud
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/daily', operation: 'deleteEntry', userId, date }
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
        { path: '/api/daily', method: 'DELETE' }
      ),
      { status: 500 }
    );
  }
}
