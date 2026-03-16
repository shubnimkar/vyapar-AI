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
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Check if this is a session initialization request (JSON body)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.init === true) {
        // Check if they're trying to restore a session
        if (body.restoreSessionId) {
          const existingSession = await getSession(body.restoreSessionId);
          if (existingSession) {
            logger.info('Restored existing session', { 
              path: '/api/upload',
              sessionId: body.restoreSessionId 
            });
            return NextResponse.json({
              success: true,
              sessionId: body.restoreSessionId,
              dataSources: {
                salesData: Boolean(existingSession.salesData),
                expensesData: Boolean(existingSession.expensesData),
                inventoryData: Boolean(existingSession.inventoryData),
              },
              conversationHistory: existingSession.conversationHistory.map((message) => ({
                role: message.role,
                content: message.content,
                sourcesUsed: message.sourcesUsed,
                contentByLanguage: message.contentByLanguage,
              })),
            });
          }
          // Session doesn't exist, create new one
          logger.info('Session not found, creating new one', { 
            path: '/api/upload',
            requestedSessionId: body.restoreSessionId 
          });
        }
        
        // Initialize new session
        const session = await createSession();
        return NextResponse.json({
          success: true,
          sessionId: session.sessionId,
          dataSources: {
            salesData: false,
            expensesData: false,
            inventoryData: false,
          },
          conversationHistory: [],
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
    const rows = parseResult.data as Record<string, unknown>[];
    
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
      rows: rows as Record<string, string | number>[],
    };
    
    // Get or create session
    let session = sessionId ? await getSession(sessionId) : null;
    if (!session) {
      session = await createSession();
    }
    
    // Store data in session based on file type
    const updates: Record<string, ParsedCSV> = {};
    if (fileType === 'sales') {
      updates.salesData = parsedCSV;
    } else if (fileType === 'expenses') {
      updates.expensesData = parsedCSV;
    } else if (fileType === 'inventory') {
      updates.inventoryData = parsedCSV;
    }
    
    await updateSession(session.sessionId, updates);
    
    // Create preview (first 5 rows)
    const previewRows = rows.slice(0, 5);
    
    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      dataSources: {
        salesData: Boolean(fileType === 'sales' || session.salesData),
        expensesData: Boolean(fileType === 'expenses' || session.expensesData),
        inventoryData: Boolean(fileType === 'inventory' || session.inventoryData),
      },
      preview: {
        headers,
        rows: previewRows,
        totalRows: rows.length,
      },
    });
    
  } catch (error) {
    logger.error('Upload error', { 
      path: '/api/upload',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process file. Please try again.',
      },
      { status: 500 }
    );
  }
}
