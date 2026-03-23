// Manual Report Generation API
// Allows users to generate daily, weekly, and monthly reports on-demand

import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBService } from '@/lib/dynamodb-client';
import { calculateExpenseRatio, calculateProfitMargin } from '@/lib/calculations';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';
import { DailyEntry, DailyReport, Language } from '@/lib/types';
import { generateWithModelChain } from '@/lib/ai/bedrock-model-chain';
import { getModelChain } from '@/lib/ai/model-routing';
// report-localization not needed at generation time — content stored flat

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

type ReportType = 'daily' | 'weekly' | 'monthly';

type ReportInsights = {
  summary: string;
  wins: string[];
  risks: string[];
  nextSteps: string[];
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPeriodLabel(reportType: ReportType, periodStart: string, periodEnd: string): string {
  if (reportType === 'daily' || periodStart === periodEnd) {
    return periodEnd;
  }

  return `${periodStart} to ${periodEnd}`;
}

function toCalendarDateString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPeriodRange(reportType: ReportType, now = new Date()): { reportDate: string; periodStart: string; periodEnd: string; previousStart: string; previousEnd: string } {
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);

  const end = new Date(current);
  const start = new Date(current);
  const previousEnd = new Date(current);
  const previousStart = new Date(current);

  if (reportType === 'weekly') {
    start.setDate(end.getDate() - 6);
    previousEnd.setDate(start.getDate() - 1);
    previousStart.setDate(previousEnd.getDate() - 6);
  } else if (reportType === 'monthly') {
    start.setDate(end.getDate() - 29);
    previousEnd.setDate(start.getDate() - 1);
    previousStart.setDate(previousEnd.getDate() - 29);
  } else {
    previousEnd.setDate(end.getDate() - 1);
    previousStart.setDate(end.getDate() - 1);
  }

  return {
    reportDate: toCalendarDateString(end),
    periodStart: toCalendarDateString(start),
    periodEnd: toCalendarDateString(end),
    previousStart: toCalendarDateString(previousStart),
    previousEnd: toCalendarDateString(previousEnd),
  };
}

function inRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function parseReportInsights(rawInsights: string, fallbackSummary: string): ReportInsights {
  if (!rawInsights) {
    return {
      summary: fallbackSummary,
      wins: [],
      risks: [],
      nextSteps: [],
    };
  }

  try {
    const jsonMatch = rawInsights.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ReportInsights>;
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallbackSummary,
      wins: Array.isArray(parsed.wins) ? parsed.wins.filter(Boolean).slice(0, 3) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.filter(Boolean).slice(0, 3) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter(Boolean).slice(0, 3) : [],
    };
  } catch (error) {
    logger.warn('Failed to parse report insights JSON', { error, rawInsights });
    return {
      summary: fallbackSummary,
      wins: [],
      risks: [],
      nextSteps: [],
    };
  }
}

function buildFallbackSummary(totalSales: number, totalExpenses: number, netProfit: number, reportType: ReportType): string {
  const periodName = reportType === 'daily' ? 'day' : reportType === 'weekly' ? 'week' : 'month';
  if (netProfit >= 0) {
    return `This ${periodName} closed with sales of ${formatCurrency(totalSales)}, expenses of ${formatCurrency(totalExpenses)}, and a net profit of ${formatCurrency(netProfit)}.`;
  }

  return `This ${periodName} closed with sales of ${formatCurrency(totalSales)}, expenses of ${formatCurrency(totalExpenses)}, and a net loss of ${formatCurrency(Math.abs(netProfit))}.`;
}

async function generateInsightsWithBedrock(
  language: Language,
  reportType: ReportType,
  periodLabel: string,
  metrics: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    averageDailySales: number;
    averageDailyExpenses: number;
    averageDailyProfit: number;
    profitMargin: number;
    expenseRatio: number;
    entryCount: number;
    bestDay: DailyReport['bestDay'];
    worstDay: DailyReport['worstDay'];
    closingCash: number | null;
    comparison: DailyReport['comparison'];
  }
): Promise<ReportInsights> {
  const languageInstruction =
    language === 'hi'
      ? 'उत्तर केवल हिंदी में दें।'
      : language === 'mr'
        ? 'उत्तर फक्त मराठीत द्या.'
        : 'Respond only in English.';

  const prompt = `You are generating a ${reportType} business report for a small shop owner in India.
${languageInstruction}

Period: ${periodLabel}
Sales: ${metrics.totalSales}
Expenses: ${metrics.totalExpenses}
Net profit: ${metrics.netProfit}
Average daily sales: ${metrics.averageDailySales}
Average daily expenses: ${metrics.averageDailyExpenses}
Average daily profit: ${metrics.averageDailyProfit}
Profit margin percent: ${(metrics.profitMargin * 100).toFixed(1)}
Expense ratio percent: ${(metrics.expenseRatio * 100).toFixed(1)}
Entry count: ${metrics.entryCount}
Closing cash: ${metrics.closingCash ?? 'not available'}
Best day: ${metrics.bestDay ? `${metrics.bestDay.date} sales ${metrics.bestDay.sales} profit ${metrics.bestDay.profit}` : 'not available'}
Worst day: ${metrics.worstDay ? `${metrics.worstDay.date} sales ${metrics.worstDay.sales} profit ${metrics.worstDay.profit}` : 'not available'}
Comparison: ${metrics.comparison ? `sales ${metrics.comparison.salesChangePct.toFixed(1)}%, expenses ${metrics.comparison.expenseChangePct.toFixed(1)}%, profit ${metrics.comparison.profitChangePct.toFixed(1)}% versus ${metrics.comparison.previousLabel}` : 'not available'}

Return ONLY valid JSON in this shape:
{
  "summary": "2-3 sentence overview",
  "wins": ["short bullet", "short bullet"],
  "risks": ["short bullet", "short bullet"],
  "nextSteps": ["short action", "short action"]
}`;

  const response = await generateWithModelChain({
    client: bedrockClient,
    modelIds: getModelChain('report'),
    prompt,
    options: { language },
    metadata: {
      endpoint: '/api/reports/generate',
      feature: 'report',
    },
    maxTokens: 500,
  });

  if (!response.success || !response.content) {
    logger.warn('Report insight generation failed, using deterministic fallback', {
      reportType,
      periodLabel,
      error: response.error,
      modelId: response.modelId,
    });
    return parseReportInsights('', buildFallbackSummary(metrics.totalSales, metrics.totalExpenses, metrics.netProfit, reportType));
  }

  return parseReportInsights(
    response.content,
    buildFallbackSummary(metrics.totalSales, metrics.totalExpenses, metrics.netProfit, reportType)
  );
}

function createStructuredReport(
  userId: string,
  reportType: ReportType,
  periodStart: string,
  periodEnd: string,
  reportDate: string,
  entries: DailyEntry[],
  previousEntries: DailyEntry[],
  insights: ReportInsights
): DailyReport {
  const totalSales = entries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0);
  const totalExpenses = entries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0);
  const netProfit = totalSales - totalExpenses;
  const entryCount = entries.length;
  const averageDailySales = entryCount > 0 ? totalSales / entryCount : 0;
  const averageDailyExpenses = entryCount > 0 ? totalExpenses / entryCount : 0;
  const averageDailyProfit = entryCount > 0 ? netProfit / entryCount : 0;
  const expenseRatio = calculateExpenseRatio(totalExpenses, totalSales);
  const profitMargin = calculateProfitMargin(netProfit, totalSales);
  const closingCash = [...entries].sort((a, b) => b.date.localeCompare(a.date)).find((entry) => typeof entry.cashInHand === 'number')?.cashInHand ?? null;

  const profitByDay = entries.map((entry) => ({
    date: entry.date,
    sales: entry.totalSales,
    profit: entry.totalSales - entry.totalExpense,
  }));

  const bestDay = profitByDay.length > 0
    ? [...profitByDay].sort((a, b) => b.profit - a.profit || b.sales - a.sales)[0]
    : null;

  const worstDay = profitByDay.length > 0
    ? [...profitByDay].sort((a, b) => a.profit - b.profit || a.sales - b.sales)[0]
    : null;

  const previousSales = previousEntries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0);
  const previousExpenses = previousEntries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0);
  const previousProfit = previousSales - previousExpenses;
  const comparePct = (current: number, previous: number) => {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const comparison =
    previousEntries.length > 0
      ? {
          previousLabel: reportType === 'daily' ? 'previous day' : reportType === 'weekly' ? 'previous 7 days' : 'previous 30 days',
          salesChangePct: comparePct(totalSales, previousSales),
          expenseChangePct: comparePct(totalExpenses, previousExpenses),
          profitChangePct: comparePct(netProfit, previousProfit),
        }
      : null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    userId,
    reportType,
    date: reportDate,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    entryCount,
    totalSales,
    totalExpenses,
    netProfit,
    averageDailySales,
    averageDailyExpenses,
    averageDailyProfit,
    closingCash,
    profitMargin,
    expenseRatio,
    bestDay,
    worstDay,
    comparison,
    summary: insights.summary,
    wins: insights.wins,
    risks: insights.risks,
    nextSteps: insights.nextSteps,
    topExpenseCategories: [],
    insights: insights.summary,
  };
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Manual report generation request received', { path: '/api/reports/generate' });

    const body = await request.json();
    const { userId, language = 'en', reportType = 'daily', dailyEntries = [] } = body as {
      userId?: string;
      language?: Language;
      reportType?: ReportType;
      dailyEntries?: DailyEntry[];
    };

    if (!userId) {
      logger.warn('Report generation missing userId', { path: '/api/reports/generate' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    const normalizedType: ReportType = reportType === 'weekly' || reportType === 'monthly' ? reportType : 'daily';

    try {
      logger.info('Generating report for user', { userId, reportType: normalizedType });

      const allEntries = dailyEntries.length > 0
        ? dailyEntries
        : (await DynamoDBService.queryByPK(`USER#${userId}`, 'ENTRY#')) as DailyEntry[];
      const { reportDate, periodStart, periodEnd, previousStart, previousEnd } = getPeriodRange(normalizedType);

      if (allEntries.length === 0) {
        logger.warn(
          normalizedType === 'daily' ? 'No data for user today' : 'No entries available for reports',
          normalizedType === 'daily' ? { userId, date: reportDate } : { userId, reportType: normalizedType }
        );
        return NextResponse.json(
          createErrorResponse(ErrorCode.INVALID_INPUT, 'No daily entries found'),
          { status: 400 }
        );
      }

      const currentEntries = allEntries
        .filter((entry) => inRange(entry.date, periodStart, periodEnd))
        .sort((a, b) => a.date.localeCompare(b.date));
      const previousEntries = allEntries
        .filter((entry) => inRange(entry.date, previousStart, previousEnd))
        .sort((a, b) => a.date.localeCompare(b.date));

      if (currentEntries.length === 0) {
        logger.warn(
          normalizedType === 'daily' ? 'No data for user today' : 'No entries available for reports',
          normalizedType === 'daily' ? { userId, date: reportDate } : { userId, reportType: normalizedType }
        );
        return NextResponse.json(
          createErrorResponse(ErrorCode.INVALID_INPUT, 'No daily entries found'),
          { status: 400 }
        );
      }

      const provisionalReport = createStructuredReport(
        userId,
        normalizedType,
        periodStart,
        periodEnd,
        reportDate,
        currentEntries,
        previousEntries,
        {
          summary: buildFallbackSummary(
            currentEntries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0),
            currentEntries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0),
            currentEntries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0) -
              currentEntries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0),
            normalizedType
          ),
          wins: [],
          risks: [],
          nextSteps: [],
        }
      );

      let insights: ReportInsights = {
        summary: provisionalReport.summary || '',
        wins: [],
        risks: [],
        nextSteps: [],
      };

      try {
        insights = await generateInsightsWithBedrock(
          language,
          normalizedType,
          formatPeriodLabel(normalizedType, periodStart, periodEnd),
          {
            totalSales: provisionalReport.totalSales,
            totalExpenses: provisionalReport.totalExpenses,
            netProfit: provisionalReport.netProfit,
            averageDailySales: provisionalReport.averageDailySales || 0,
            averageDailyExpenses: provisionalReport.averageDailyExpenses || 0,
            averageDailyProfit: provisionalReport.averageDailyProfit || 0,
            profitMargin: provisionalReport.profitMargin || 0,
            expenseRatio: provisionalReport.expenseRatio || 0,
            entryCount: provisionalReport.entryCount || 0,
            bestDay: provisionalReport.bestDay,
            worstDay: provisionalReport.worstDay,
            closingCash: provisionalReport.closingCash ?? null,
            comparison: provisionalReport.comparison,
          }
        );
      } catch (insightError) {
        logger.warn('Bedrock insights generation failed, using deterministic fallback', { userId, insightError });
      }

      const report = createStructuredReport(
        userId,
        normalizedType,
        periodStart,
        periodEnd,
        reportDate,
        currentEntries,
        previousEntries,
        insights
      );

      const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      await DynamoDBService.putItem({
        PK: `USER#${userId}`,
        SK: `REPORT#${normalizedType}#${reportDate}`,
        entityType: 'REPORT',
        userId,
        reportId: report.id,
        reportType: normalizedType,
        date: reportDate,
        reportData: {
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          entryCount: report.entryCount,
          totalSales: report.totalSales,
          totalExpenses: report.totalExpenses,
          netProfit: report.netProfit,
          averageDailySales: report.averageDailySales,
          averageDailyExpenses: report.averageDailyExpenses,
          averageDailyProfit: report.averageDailyProfit,
          closingCash: report.closingCash,
          profitMargin: report.profitMargin,
          expenseRatio: report.expenseRatio,
          bestDay: report.bestDay,
          worstDay: report.worstDay,
          comparison: report.comparison,
          summary: report.summary,
          wins: report.wins,
          risks: report.risks,
          nextSteps: report.nextSteps,
          topExpenseCategories: report.topExpenseCategories,
          insights: report.insights,
          generatedLanguage: language,
        },
        createdAt: report.generatedAt,
        ttl,
      });

      logger.info('Report generated successfully', { userId, reportId: report.id, reportType: normalizedType });
      return NextResponse.json({
        success: true,
        data: {
          ...report,
          reportId: report.id,
          reportData: report,
        },
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          language,
          { path: '/api/reports/generate', operation: 'generateReport', userId }
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
        { path: '/api/reports/generate', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
