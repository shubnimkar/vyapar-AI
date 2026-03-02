// Daily Entry API Route
// Handles CRUD operations for daily business entries
// Supports hybrid sync: localStorage + DynamoDB

import { NextRequest, NextResponse } from 'next/server';
import { DailyEntryService } from '@/lib/dynamodb-client';
import { SessionManager } from '@/lib/session-manager';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET - Retrieve daily entries
 * Query params: userId, startDate (optional), endDate (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    // Get entries from DynamoDB
    const entries = await DailyEntryService.getEntries(userId, startDate, endDate);

    return NextResponse.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('[Daily Entry GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve entries',
    }, { status: 500 });
  }
}

/**
 * POST - Create new daily entry (instant sync to DynamoDB)
 */
export async function POST(request: NextRequest) {
  try {
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
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    if (typeof totalSales !== 'number' || typeof totalExpense !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Sales and expenses must be numbers',
      }, { status: 400 });
    }

    if (totalSales < 0 || totalExpense < 0) {
      return NextResponse.json({
        success: false,
        error: 'Sales and expenses cannot be negative',
      }, { status: 400 });
    }

    // Calculate metrics
    const estimatedProfit = totalSales - totalExpense;
    const expenseRatio = totalSales > 0 ? totalExpense / totalSales : 0;
    const profitMargin = totalSales > 0 ? estimatedProfit / totalSales : 0;

    // Create entry
    const entry = {
      userId,
      entryId: uuidv4(),
      date: date || new Date().toISOString().split('T')[0],
      totalSales,
      totalExpense,
      cashInHand,
      notes,
      estimatedProfit,
      expenseRatio,
      profitMargin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Instant sync to DynamoDB (user is connected)
    await DailyEntryService.saveEntry(entry);
    console.log('[Daily Entry POST] Instantly synced to DynamoDB:', entry.date);

    return NextResponse.json({
      success: true,
      data: entry,
      synced: true, // Indicate that entry is already synced to cloud
    });
  } catch (error) {
    console.error('[Daily Entry POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create entry',
    }, { status: 500 });
  }
}

/**
 * PUT - Update existing daily entry (instant sync to DynamoDB)
 */
export async function PUT(request: NextRequest) {
  try {
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
      return NextResponse.json({
        success: false,
        error: 'User ID and date are required',
      }, { status: 400 });
    }

    // Get existing entry
    const existing = await DailyEntryService.getEntry(userId, date);
    if (!existing) {
      return NextResponse.json({
        success: false,
        error: 'Entry not found',
      }, { status: 404 });
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
    console.log('[Daily Entry PUT] Instantly synced to DynamoDB:', updated.date);

    return NextResponse.json({
      success: true,
      data: updated,
      synced: true, // Indicate that entry is already synced to cloud
    });
  } catch (error) {
    console.error('[Daily Entry PUT] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update entry',
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete daily entry (instant sync to DynamoDB)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId || !date) {
      return NextResponse.json({
        success: false,
        error: 'User ID and date are required',
      }, { status: 400 });
    }

    // Instant delete from DynamoDB (user is connected)
    await DailyEntryService.deleteEntry(userId, date);
    console.log('[Daily Entry DELETE] Instantly deleted from DynamoDB:', date);

    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully',
      synced: true, // Indicate that deletion is already synced to cloud
    });
  } catch (error) {
    console.error('[Daily Entry DELETE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete entry',
    }, { status: 500 });
  }
}
