/**
 * Calculate Indices API Route
 * 
 * Calculates Stress Index and optionally Affordability Index for a user.
 * Follows the Hybrid Intelligence Principle: deterministic calculations only.
 * 
 * POST /api/indices/calculate
 * Body: { userId: string, plannedCost?: number, language?: Language }
 * 
 * Response: { success: boolean, data?: IndexData, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { DailyEntryService, CreditEntryService } from '@/lib/dynamodb-client';
import { aggregateStressInputs } from '@/lib/finance/aggregateStressInputs';
import { aggregateAffordabilityInputs } from '@/lib/finance/aggregateAffordabilityInputs';
import { calculateStressIndex } from '@/lib/finance/calculateStressIndex';
import { calculateAffordabilityIndex } from '@/lib/finance/calculateAffordabilityIndex';
import { indexSyncManager } from '@/lib/index-sync';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';
import type { IndexData, Language } from '@/lib/types';

/**
 * POST - Calculate stress and affordability indices
 * 
 * Request body:
 * - userId: string (required) - User ID to calculate indices for
 * - plannedCost: number (optional) - Planned expense amount for affordability calculation
 * - language: Language (optional) - User's preferred language for error messages
 * 
 * Response:
 * - success: boolean - Whether calculation succeeded
 * - data: IndexData - Calculated indices with metadata
 * - error: string - Error message if calculation failed
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Calculate indices POST request received', { path: '/api/indices/calculate' });
    
    const body = await request.json();
    const { userId, plannedCost, language = 'en' } = body;

    // Validate required fields
    if (!userId) {
      logger.warn('Calculate indices POST missing userId', { path: '/api/indices/calculate' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired', language),
        { status: 400 }
      );
    }

    // Validate plannedCost if provided
    if (plannedCost !== undefined && (typeof plannedCost !== 'number' || plannedCost < 0)) {
      logger.warn('Calculate indices POST invalid plannedCost', { plannedCost });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }

    try {
      // ============================================
      // Load historical data from DynamoDB
      // ============================================
      logger.debug('Loading historical data', { userId });
      
      const dailyEntries = await DailyEntryService.getEntries(userId);
      const creditEntries = await CreditEntryService.getEntries(userId);

      logger.debug('Historical data loaded', { 
        userId, 
        dailyEntriesCount: dailyEntries.length,
        creditEntriesCount: creditEntries.length
      });

      // ============================================
      // Aggregate stress index inputs
      // ============================================
      const stressInputs = aggregateStressInputs({
        dailyEntries,
        creditEntries
      });

      // Check if sufficient data for calculation
      if (!stressInputs) {
        logger.info('Insufficient data for index calculation', { 
          userId, 
          dailyEntriesCount: dailyEntries.length 
        });
        return NextResponse.json(
          createErrorResponse(
            ErrorCode.INVALID_INPUT,
            'errors.insufficientData',
            language
          ),
          { status: 400 }
        );
      }

      // ============================================
      // Calculate stress index
      // ============================================
      logger.debug('Calculating stress index', { userId, stressInputs });
      
      const stressIndex = calculateStressIndex(
        stressInputs.creditRatio,
        stressInputs.cashBuffer,
        stressInputs.expenseVolatility
      );

      logger.info('Stress index calculated', { 
        userId, 
        score: stressIndex.score 
      });

      // ============================================
      // Calculate affordability index (if plannedCost provided)
      // ============================================
      let affordabilityIndex = null;

      if (plannedCost !== undefined && plannedCost > 0) {
        logger.debug('Calculating affordability index', { userId, plannedCost });
        
        const affordabilityInputs = aggregateAffordabilityInputs(dailyEntries);

        if (!affordabilityInputs) {
          logger.warn('Insufficient data for affordability calculation', { 
            userId, 
            dailyEntriesCount: dailyEntries.length 
          });
          // Continue with stress index only
        } else {
          affordabilityIndex = calculateAffordabilityIndex(
            plannedCost,
            affordabilityInputs.avgMonthlyProfit
          );

          logger.info('Affordability index calculated', { 
            userId, 
            score: affordabilityIndex.score,
            category: affordabilityIndex.breakdown.affordabilityCategory
          });
        }
      }

      // ============================================
      // Create IndexData object
      // ============================================
      const indexData: IndexData = {
        userId,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        stressIndex,
        affordabilityIndex,
        dataPoints: stressInputs.dataPoints,
        calculationPeriod: stressInputs.calculationPeriod,
        createdAt: new Date().toISOString(),
      };

      // ============================================
      // Save via sync manager (handles online/offline)
      // ============================================
      logger.debug('Saving index data', { userId, date: indexData.date });
      
      await indexSyncManager.saveIndex(indexData);

      logger.info('Index data saved successfully', { 
        userId, 
        date: indexData.date,
        hasAffordabilityIndex: affordabilityIndex !== null
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
          language,
          { path: '/api/indices/calculate', operation: 'calculateIndices', userId }
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
        { path: '/api/indices/calculate', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
