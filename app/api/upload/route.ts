// API route for CSV file upload and validation

import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import {
  createSession,
  getSession,
  updateSession,
} from '@/lib/session-store';
import {
  validateCSVHeaders,
  validateCSVData,
  getValidationErrorMessage,
} from '@/lib/csv-validation';
import { FileType, Language, ParsedCSV } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Check if this is a session initialization request (JSON body)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.init === true) {
        // Check if they're trying to restore a session
        if (body.restoreSessionId) {
          const existingSession = getSession(body.restoreSessionId);
          if (existingSession) {
            console.log('[Upload API] Restored existing session:', body.restoreSessionId);
            return NextResponse.json({
              success: true,
              sessionId: body.restoreSessionId,
            });
          }
          // Session doesn't exist, create new one
          console.log('[Upload API] Session not found, creating new one');
        }
        
        // Initialize new session
        const session = createSession();
        return NextResponse.json({
          success: true,
          sessionId: session.sessionId,
        });
      }
    }
    
    // Otherwise, handle file upload (FormData)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as FileType;
    const sessionId = formData.get('sessionId') as string | null;
    const language = (formData.get('language') as Language) || 'en';
    
    // Validate inputs
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: getValidationErrorMessage('invalid_format', language),
        },
        { status: 400 }
      );
    }
    
    if (!fileType || !['sales', 'expenses', 'inventory'].includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type',
        },
        { status: 400 }
      );
    }
    
    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV using PapaParse
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: getValidationErrorMessage('parse_failed', language),
        },
        { status: 400 }
      );
    }
    
    // Extract headers and rows
    const headers = parseResult.meta.fields || [];
    const rows = parseResult.data as Record<string, any>[];
    
    // Validate CSV structure
    const headerValidation = validateCSVHeaders(headers, fileType);
    if (!headerValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: getValidationErrorMessage(
            headerValidation.errorCode!,
            language,
            headerValidation.missingColumns?.join(', ')
          ),
        },
        { status: 400 }
      );
    }
    
    const dataValidation = validateCSVData(rows);
    if (!dataValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: getValidationErrorMessage(dataValidation.errorCode!, language),
        },
        { status: 400 }
      );
    }
    
    // Create parsed CSV object
    const parsedCSV: ParsedCSV = {
      headers,
      rows,
    };
    
    // Get or create session
    let session = sessionId ? getSession(sessionId) : null;
    if (!session) {
      session = createSession();
    }
    
    // Store data in session based on file type
    const updates: any = {};
    if (fileType === 'sales') {
      updates.salesData = parsedCSV;
    } else if (fileType === 'expenses') {
      updates.expensesData = parsedCSV;
    } else if (fileType === 'inventory') {
      updates.inventoryData = parsedCSV;
    }
    
    const updatedSession = updateSession(session.sessionId, updates);
    
    // Create preview (first 5 rows)
    const previewRows = rows.slice(0, 5);
    
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      preview: {
        headers,
        rows: previewRows,
        totalRows: rows.length,
      },
    });
    
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process file. Please try again.',
      },
      { status: 500 }
    );
  }
}
