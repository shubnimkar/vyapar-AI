// Reports API with DynamoDB
// Handles report generation and retrieval

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/dynamodb-client';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';
import { Language } from '@/lib/types';
import { getOriginalReportContent, translateReportContent } from '@/lib/report-localization';

export async function GET(request: NextRequest) {
  try {
    logger.info('Reports GET request received', { path: '/api/reports' });
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const language = (searchParams.get('language') || 'en') as Language;

    if (!userId) {
      logger.warn('Reports GET missing userId', { path: '/api/reports' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      logger.info('Fetching reports for user', { userId });

      const [reports, preferences] = await Promise.all([
        DynamoDBService.queryByPK(
        `USER#${userId}`,
        'REPORT#'
        ),
        DynamoDBService.getItem(`USER#${userId}`, 'PREFERENCES'),
      ]);

      const localizedReports = await Promise.all(reports.map(async (item) => {
        const reportData = (item.reportData || {}) as Record<string, unknown>;
        const reportType = (item.reportType || 'daily') as 'daily' | 'weekly' | 'monthly';
        const periodStart = typeof reportData.periodStart === 'string' ? reportData.periodStart : item.date;
        const periodEnd = typeof reportData.periodEnd === 'string' ? reportData.periodEnd : item.date;
        const generatedLanguage = (reportData.generatedLanguage as Language | undefined) || 'en';
        const periodLabel = periodStart && periodEnd && periodStart !== periodEnd
          ? `${periodStart} to ${periodEnd}`
          : periodEnd || item.date;

        const original = getOriginalReportContent(reportData);

        // Use cached translation if available, only call AI when needed
        const translationCacheKey = `localizedContent_${language}`;
        const cachedTranslation = reportData[translationCacheKey] as Record<string, unknown> | undefined;
        let localizedContent;
        if (cachedTranslation && language !== generatedLanguage) {
          localizedContent = cachedTranslation;
        } else {
          localizedContent = await translateReportContent({
            reportType,
            periodLabel,
            generatedLanguage,
            targetLanguage: language,
            original,
          });
          // Persist the translation so future GETs skip AI
          if (language !== generatedLanguage && item.reportId) {
            DynamoDBService.putItem({
              ...item,
              reportData: { ...reportData, [translationCacheKey]: localizedContent },
            }).catch(() => { /* best-effort cache write */ });
          }
        }

        return {
          id: item.reportId,
          userId: item.userId,
          reportType,
          date: item.date,
          periodStart,
          periodEnd,
          generatedAt: item.createdAt,
          entryCount: reportData.entryCount || 0,
          totalSales: reportData.totalSales || 0,
          totalExpenses: reportData.totalExpenses || 0,
          netProfit: reportData.netProfit || 0,
          averageDailySales: reportData.averageDailySales || 0,
          averageDailyExpenses: reportData.averageDailyExpenses || 0,
          averageDailyProfit: reportData.averageDailyProfit || 0,
          closingCash: reportData.closingCash ?? null,
          profitMargin: reportData.profitMargin || 0,
          expenseRatio: reportData.expenseRatio || 0,
          bestDay: reportData.bestDay || null,
          worstDay: reportData.worstDay || null,
          comparison: reportData.comparison || null,
          generatedLanguage: reportData.generatedLanguage || 'en',
          summary: localizedContent?.summary || '',
          wins: localizedContent?.wins || [],
          risks: localizedContent?.risks || [],
          nextSteps: localizedContent?.nextSteps || [],
          topExpenseCategories: reportData.topExpenseCategories || [],
          insights: localizedContent?.insights || '',
        };
      }));

      const sortedReports = localizedReports
        .sort((a, b) => {
          const aDate = a.periodEnd || a.date;
          const bDate = b.periodEnd || b.date;
          return bDate.localeCompare(aDate);
        });

      logger.info('Reports retrieved successfully', { userId, count: sortedReports.length });
      return NextResponse.json({
        success: true,
        data: sortedReports,
        automationEnabled: Boolean(preferences?.automationEnabled),
        reportTime: typeof preferences?.reportTime === 'string' ? preferences.reportTime : '20:00',
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/reports', operation: 'queryReports', userId }
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
        { path: '/api/reports', method: 'GET' }
      ),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Reports POST request received', { path: '/api/reports' });
    
    const body = await request.json();
    const { userId, automationEnabled, reportTime } = body;

    if (!userId) {
      logger.warn('Reports POST missing userId', { path: '/api/reports' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      logger.info('Updating automation preferences for user', { userId, automationEnabled });

      // Update user preferences in DynamoDB
      await DynamoDBService.putItem({
        PK: `USER#${userId}`,
        SK: 'PREFERENCES',
        entityType: 'PREFERENCES',
        userId,
        automationEnabled: automationEnabled ?? false,
        reportTime: typeof reportTime === 'string' ? reportTime : '20:00',
        updatedAt: new Date().toISOString(),
      });

      logger.info('Automation preferences updated successfully', { userId });
      return NextResponse.json({
        success: true,
        data: {
          userId,
          automationEnabled: automationEnabled ?? false,
          reportTime: typeof reportTime === 'string' ? reportTime : '20:00',
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.DYNAMODB_ERROR,
          'errors.dynamodbError',
          'en',
          { path: '/api/reports', operation: 'updatePreferences', userId }
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
        { path: '/api/reports', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
