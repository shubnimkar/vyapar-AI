// Benchmark API Endpoint
// GET: Fetch user's segment benchmark comparison
// Follows requirements 8.1-8.8 from segment-benchmark spec

import { NextRequest, NextResponse } from 'next/server';
import { BenchmarkService } from '@/lib/benchmarkService';
import { DailyEntryService, ProfileService } from '@/lib/dynamodb-client';
import { calculateHealthScore, calculateCreditSummary } from '@/lib/calculations';
import { UserMetrics } from '@/lib/types';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';

/**
 * GET - Retrieve user's benchmark comparison
 * 
 * Workflow:
 * 1. Authenticate user (via userId query param)
 * 2. Get user profile and validate completeness
 * 3. Calculate user metrics from latest daily entry
 * 4. Get benchmark comparison from service
 * 5. Return structured JSON response
 * 
 * Error scenarios:
 * - 401: User not authenticated
 * - 400: Profile incomplete or no daily entries
 * - 404: Segment data unavailable
 * - 500: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Benchmark GET request received', { path: '/api/benchmark' });
    
    // 1. Authenticate user
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      logger.warn('Benchmark GET missing userId', { path: '/api/benchmark' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 401 }
      );
    }
    
    try {
      // 2. Get user profile
      const profile = await ProfileService.getProfile(userId);
      
      if (!profile) {
        logger.warn('Profile not found', { userId, path: '/api/benchmark' });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'errors.profileNotFound'),
          { status: 404 }
        );
      }
      
      // 3. Check profile completeness
      if (!profile.city_tier || !profile.business_type) {
        logger.debug('Profile incomplete for benchmark', { 
          userId, 
          city_tier: profile.city_tier, 
          business_type: profile.business_type 
        });
        return NextResponse.json(
          createErrorResponse(ErrorCode.INVALID_INPUT, 'benchmark.profileIncomplete'),
          { status: 400 }
        );
      }
      
      // 4. Calculate user metrics from latest daily entry
      const dailyEntries = await DailyEntryService.getEntries(userId);
      
      if (dailyEntries.length === 0) {
        logger.debug('No daily entries found for benchmark', { userId });
        return NextResponse.json(
          createErrorResponse(ErrorCode.INVALID_INPUT, 'benchmark.noDailyEntries'),
          { status: 400 }
        );
      }
      
      // Get latest entry (entries are sorted by date descending)
      const latestEntry = dailyEntries[0];
      
      // Get credit entries for health score calculation
      const { CreditEntryService } = await import('@/lib/dynamodb-client');
      const creditEntries = await CreditEntryService.getEntries(userId);
      const creditSummary = calculateCreditSummary(creditEntries);
      
      // Calculate health score
      const healthScoreResult = calculateHealthScore(
        latestEntry.profitMargin,
        latestEntry.expenseRatio,
        latestEntry.cashInHand,
        creditSummary
      );
      
      const userMetrics: UserMetrics = {
        healthScore: healthScoreResult.score,
        profitMargin: latestEntry.profitMargin
      };
      
      // 5. Get benchmark comparison
      const benchmarkService = new BenchmarkService();
      const comparison = await benchmarkService.getBenchmarkComparison(
        profile,
        userMetrics
      );
      
      if (!comparison) {
        logger.debug('Segment data unavailable', { 
          userId, 
          city_tier: profile.city_tier, 
          business_type: profile.business_type 
        });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'benchmark.segmentUnavailable'),
          { status: 404 }
        );
      }
      
      // 6. Return comparison with cache headers
      logger.info('Benchmark comparison retrieved successfully', { 
        userId,
        healthCategory: comparison.healthScoreComparison.category,
        marginCategory: comparison.marginComparison.category
      });
      
      return NextResponse.json(
        {
          success: true,
          data: comparison
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=3600' // 1 hour cache
          }
        }
      );
      
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/benchmark', operation: 'getBenchmark', userId }
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
        { path: '/api/benchmark', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}
