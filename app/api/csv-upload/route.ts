// CSV Upload API Endpoint
// Parses CSV files and stores inferred transactions

import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/parsers/csv-parser';
import { isDuplicate } from '@/lib/duplicate-detector';
import { savePendingTransaction } from '@/lib/pending-transaction-store';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000;

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          code: 'CSV_NO_FILE',
          message: 'No file provided'
        },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        {
          success: false,
          code: 'CSV_INVALID_TYPE',
          message: 'Invalid file type. Please upload a CSV file.'
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          code: 'CSV_TOO_LARGE',
          message: 'CSV file too large. Maximum size is 5MB.'
        },
        { status: 400 }
      );
    }

    // Read file content
    const csvContent = await file.text();

    // Parse CSV
    const parseResult = parseCSV(csvContent);

    // Validate row count
    if (parseResult.summary.totalRows > MAX_ROWS) {
      return NextResponse.json(
        {
          success: false,
          code: 'CSV_TOO_MANY_ROWS',
          message: 'CSV file has too many rows. Maximum is 1000 rows.'
        },
        { status: 400 }
      );
    }

    // Check for no valid data
    if (parseResult.transactions.length === 0) {
      if (parseResult.summary.errors.some(e => e.includes('must contain'))) {
        return NextResponse.json(
          {
            success: false,
            code: 'CSV_INVALID_HEADERS',
            message: 'CSV file must contain "date", "amount", and "type" columns.'
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: 'CSV_NO_DATA',
          message: 'No valid transactions found in CSV file.'
        },
        { status: 400 }
      );
    }

    // Check for duplicates and save non-duplicate transactions
    let savedCount = 0;
    let duplicateCount = 0;

    for (const transaction of parseResult.transactions) {
      // Check if duplicate
      if (isDuplicate(transaction)) {
        duplicateCount++;
        continue;
      }

      // Save to pending store
      const saved = savePendingTransaction(transaction);
      if (saved) {
        savedCount++;
      }
    }

    logger.info('CSV upload processed', {
      filename: file.name,
      totalRows: parseResult.summary.totalRows,
      validRows: parseResult.summary.validRows,
      savedCount,
      duplicateCount
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: parseResult.summary.totalRows,
        validTransactions: parseResult.summary.validRows,
        duplicatesSkipped: duplicateCount,
        invalidRows: parseResult.summary.invalidRows,
        saved: savedCount
      },
      errors: parseResult.summary.errors
    });
  } catch (error) {
    logger.error('CSV upload error', { error });

    return NextResponse.json(
      {
        success: false,
        code: 'CSV_PARSE_ERROR',
        message: 'Failed to parse CSV file. Please check file format.'
      },
      { status: 500 }
    );
  }
}
