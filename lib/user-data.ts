import { DynamoDBService, ProfileService, DailyEntryService, CreditEntryService, UserService } from './dynamodb-client';
import { getHistoricalIndicesFromDynamoDB } from './index-sync';
import type { DailyReport, UserPreferences } from './types';

export interface CompleteUserData {
  userId: string;
  authUser: Awaited<ReturnType<typeof UserService.getUserById>>;
  profile: Awaited<ReturnType<typeof ProfileService.getProfile>>;
  dailyEntries: Awaited<ReturnType<typeof DailyEntryService.getEntries>>;
  creditEntries: Awaited<ReturnType<typeof CreditEntryService.getEntries>>;
  indices: Awaited<ReturnType<typeof getHistoricalIndicesFromDynamoDB>>;
  reports: DailyReport[];
  preferences: UserPreferences | null;
}

function normalizeReportItem(item: Record<string, any>): DailyReport {
  const reportData = (item.reportData || {}) as Record<string, any>;

  return {
    id: item.reportId as string,
    userId: item.userId as string,
    reportType: (item.reportType || 'daily') as 'daily' | 'weekly' | 'monthly',
    date: item.date as string,
    periodStart: (reportData.periodStart as string | undefined) || item.date,
    periodEnd: (reportData.periodEnd as string | undefined) || item.date,
    generatedAt: item.createdAt as string,
    entryCount: (reportData.entryCount as number | undefined) || 0,
    totalSales: (reportData.totalSales as number | undefined) || 0,
    totalExpenses: (reportData.totalExpenses as number | undefined) || 0,
    netProfit: (reportData.netProfit as number | undefined) || 0,
    averageDailySales: reportData.averageDailySales as number | undefined,
    averageDailyExpenses: reportData.averageDailyExpenses as number | undefined,
    averageDailyProfit: reportData.averageDailyProfit as number | undefined,
    closingCash: (reportData.closingCash as number | null | undefined) ?? null,
    profitMargin: reportData.profitMargin as number | undefined,
    expenseRatio: reportData.expenseRatio as number | undefined,
    bestDay: (reportData.bestDay as DailyReport['bestDay']) || null,
    worstDay: (reportData.worstDay as DailyReport['worstDay']) || null,
    comparison: (reportData.comparison as DailyReport['comparison']) || null,
    summary: (reportData.summary as string | undefined) || '',
    wins: (reportData.wins as string[] | undefined) || [],
    risks: (reportData.risks as string[] | undefined) || [],
    nextSteps: (reportData.nextSteps as string[] | undefined) || [],
    generatedLanguage: (reportData.generatedLanguage as DailyReport['generatedLanguage']) || 'en',
    topExpenseCategories: (reportData.topExpenseCategories as DailyReport['topExpenseCategories']) || [],
    insights: (reportData.insights as string | undefined) || '',
  };
}

export async function getCompleteUserData(userId: string): Promise<CompleteUserData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);

  const [authUser, profile, dailyEntries, creditEntries, indices, reportsRaw, preferencesRaw] = await Promise.all([
    UserService.getUserById(userId),
    ProfileService.getProfile(userId),
    DailyEntryService.getEntries(userId),
    CreditEntryService.getEntries(userId),
    getHistoricalIndicesFromDynamoDB(
      userId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ),
    DynamoDBService.queryByPK(`USER#${userId}`, 'REPORT#'),
    DynamoDBService.getItem(`USER#${userId}`, 'PREFERENCES'),
  ]);

  const reports = reportsRaw
    .map(normalizeReportItem)
    .sort((a, b) => (b.periodEnd || b.date).localeCompare(a.periodEnd || a.date));

  const preferences = preferencesRaw
    ? {
        userId,
        automationEnabled: Boolean(preferencesRaw.automationEnabled),
        reportTime: typeof preferencesRaw.reportTime === 'string' ? preferencesRaw.reportTime : '20:00',
        language: ((preferencesRaw.language as UserPreferences['language']) || 'en'),
        updatedAt: (preferencesRaw.updatedAt as string) || new Date().toISOString(),
      }
    : null;

  return {
    userId,
    authUser,
    profile,
    dailyEntries,
    creditEntries,
    indices,
    reports,
    preferences,
  };
}
