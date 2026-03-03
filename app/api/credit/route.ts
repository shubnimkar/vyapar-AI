// Credit Entry API Route
// Handles CRUD operations for credit tracking (Udhaar)
// Supports hybrid sync: localStorage + DynamoDB

import { NextRequest, NextResponse } from 'next/server';
import { CreditEntryService } from '@/lib/dynamodb-client';
import { calculateCreditSummary } from '@/lib/calculations';

/**
 * GET - Retrieve credit entries
 * Query params: userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    // Get entries from DynamoDB
    const entries = await CreditEntryService.getEntries(userId);
    
    // Calculate summary
    const summary = calculateCreditSummary(entries);

    return NextResponse.json({
      success: true,
      data: entries,
      summary,
      count: entries.length,
    });
  } catch (error) {
    console.error('[Credit Entry GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve credit entries',
    }, { status: 500 });
  }
}

/**
 * POST - Create new credit entry (instant sync to DynamoDB)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      id,
      customerName, 
      amount, 
      dueDate,
      isPaid,
      createdAt,
      paidAt,
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required',
      }, { status: 400 });
    }

    if (!customerName || !amount || !dueDate) {
      return NextResponse.json({
        success: false,
        error: 'Customer name, amount, and due date are required',
      }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be a positive number',
      }, { status: 400 });
    }

    // Create entry
    const entry = {
      userId,
      id: id || `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerName,
      amount: parseFloat(amount.toString()),
      dueDate,
      isPaid: Boolean(isPaid),
      createdAt: createdAt || new Date().toISOString(),
      paidAt: paidAt || undefined,
    };

    // Instant sync to DynamoDB (user is connected)
    await CreditEntryService.saveEntry(entry);
    console.log('[Credit Entry POST] Instantly synced to DynamoDB:', entry.id);

    return NextResponse.json({
      success: true,
      data: entry,
      synced: true, // Indicate that entry is already synced to cloud
    });
  } catch (error) {
    console.error('[Credit Entry POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create credit entry',
    }, { status: 500 });
  }
}

/**
 * PUT - Update existing credit entry (instant sync to DynamoDB)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId,
      id,
      customerName,
      amount,
      dueDate,
      isPaid,
      paidAt,
    } = body;

    // Validate required fields
    if (!userId || !id) {
      return NextResponse.json({
        success: false,
        error: 'User ID and entry ID are required',
      }, { status: 400 });
    }

    // Get existing entry
    const existing = await CreditEntryService.getEntry(userId, id);
    if (!existing) {
      return NextResponse.json({
        success: false,
        error: 'Credit entry not found',
      }, { status: 404 });
    }

    // Create updated entry
    const updated = {
      ...existing,
      customerName: customerName ?? existing.customerName,
      amount: amount ?? existing.amount,
      dueDate: dueDate ?? existing.dueDate,
      isPaid: isPaid ?? existing.isPaid,
      paidAt: paidAt ?? existing.paidAt,
    };

    // Instant sync to DynamoDB (user is connected)
    await CreditEntryService.saveEntry(updated);
    console.log('[Credit Entry PUT] Instantly synced to DynamoDB:', updated.id);

    return NextResponse.json({
      success: true,
      data: updated,
      synced: true, // Indicate that entry is already synced to cloud
    });
  } catch (error) {
    console.error('[Credit Entry PUT] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update credit entry',
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete credit entry (instant sync to DynamoDB)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    if (!userId || !id) {
      return NextResponse.json({
        success: false,
        error: 'User ID and entry ID are required',
      }, { status: 400 });
    }

    // Instant delete from DynamoDB (user is connected)
    await CreditEntryService.deleteEntry(userId, id);
    console.log('[Credit Entry DELETE] Instantly deleted from DynamoDB:', id);

    return NextResponse.json({
      success: true,
      message: 'Credit entry deleted successfully',
      synced: true, // Indicate that deletion is already synced to cloud
    });
  } catch (error) {
    console.error('[Credit Entry DELETE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete credit entry',
    }, { status: 500 });
  }
}
