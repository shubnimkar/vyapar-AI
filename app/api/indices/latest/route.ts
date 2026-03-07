/**
 * Get Latest Indices API Route
 * 
 * Retrieves the most recent stress and affordability indices for a user.
 * Uses IndexSyncManager for offline-first retrieval.
 * 
 * GET /api/indices/latest?userId=xxx
 * 
 * Response: { success: boolean, data?: IndexData, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { indexSyncManager } from '@/lib/index-sync';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

/**
 * GET - Retrieve latest indices for a user
 * 
 * Query parameters:
 * - userId: string (required) - User ID to retrieve indices for
 * 
 * Response:
 * - success: boolean - Whether retrieval succeeded
 * - data: IndexData - Latest index data with stress and affordability indices
 * - error: string - Error message if retrieval failed
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Get latest indices GET request received', { path: '/api/indices/latest' });
    
    // Extract userId from query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Validate required fields
    if (!userId) {
      logger.warn('Get latest indices GET missing userId', { path: '/api/indices/latest' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired', 'en'),
        { status: 400 }
      );
    }

    try {
      // ============================================
      // Retrieve latest index via sync manager
      // ============================================
      logger.debug('Retrieving latest index', { userId });
      
      const indexData = await indexSyncManager.getLatestIndex(userId);

      // Check if index data was found
      if (!indexData) {
        logger.info('No index data found for user', { userId });
        return NextResponse.json(
          createErrorResponse(
            ErrorCode.NOT_FOUND,
            'errors.notFound',
            'en'
          ),
          { status: 404 }
        );
      }

      logger.info('Latest index retrieved successfully', { 
        userId, 
        date: indexData.date,
        hasStressIndex: indexData.stressIndex !== null,
        hasAffordabilityIndex: indexData.affordabilityIndex !== null
      });

      // ============================================
      // Return success response
      // ============================================
      return NextResponse.json({
        success: true,
        data: indexData,
      });

    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en',
          { path: '/api/indices/latest', operation: 'getLatestIndex', userId }
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
        { path: '/api/indices/latest', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}
