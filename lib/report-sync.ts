import type { DailyReport, Language, ReportsListResponse, UserPreferences } from './types';
import { logger } from './logger';

const reportsKey = (userId: string, language: Language) => `vyapar-reports-${userId}-${language}`;
const preferencesKey = (userId: string) => `vyapar-report-preferences-${userId}`;
const inFlightPulls = new Map<string, Promise<ReportsListResponse | null>>();

function getPullKey(userId: string, language: Language): string {
  return `${userId}:${language}`;
}

export function getCachedReports(userId: string, language: Language): DailyReport[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(reportsKey(userId, language));
    if (!stored) return [];
    return JSON.parse(stored) as DailyReport[];
  } catch (error) {
    logger.warn('Failed to read cached reports', { error, userId, language });
    return [];
  }
}

export function cacheReports(userId: string, language: Language, reports: DailyReport[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(reportsKey(userId, language), JSON.stringify(reports));
  } catch (error) {
    logger.warn('Failed to cache reports', { error, userId, language });
  }
}

export function getCachedReportPreferences(userId: string): UserPreferences | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(preferencesKey(userId));
    if (!stored) return null;
    return JSON.parse(stored) as UserPreferences;
  } catch (error) {
    logger.warn('Failed to read cached report preferences', { error, userId });
    return null;
  }
}

export function cacheReportPreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(preferencesKey(preferences.userId), JSON.stringify(preferences));
  } catch (error) {
    logger.warn('Failed to cache report preferences', { error, userId: preferences.userId });
  }
}

export async function pullReportsFromCloud(userId: string, language: Language): Promise<ReportsListResponse | null> {
  const pullKey = getPullKey(userId, language);
  const existingPull = inFlightPulls.get(pullKey);

  if (existingPull) {
    return existingPull;
  }

  const pullPromise = (async () => {
  try {
    const response = await fetch(`/api/reports?userId=${encodeURIComponent(userId)}&language=${encodeURIComponent(language)}`);
    const result = await response.json() as ReportsListResponse;

    if (!response.ok || !result.success) {
      return null;
    }

    const reports = result.data || [];
    cacheReports(userId, language, reports);
    cacheReportPreferences({
      userId,
      automationEnabled: Boolean(result.automationEnabled),
      reportTime: result.reportTime || '20:00',
      language,
      updatedAt: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    logger.warn('Failed to pull reports from cloud', { error, userId, language });
    return null;
  } finally {
    inFlightPulls.delete(pullKey);
  }
  })();

  inFlightPulls.set(pullKey, pullPromise);
  return pullPromise;
}

export async function getReportsLocalFirst(userId: string, language: Language): Promise<ReportsListResponse> {
  const cachedReports = getCachedReports(userId, language);
  const cachedPreferences = getCachedReportPreferences(userId);

  if (cachedReports.length > 0 || cachedPreferences) {
    // Return cache immediately — caller is responsible for triggering a refresh if needed
    return {
      success: true,
      data: cachedReports,
      automationEnabled: cachedPreferences?.automationEnabled || false,
      reportTime: cachedPreferences?.reportTime || '20:00',
    };
  }

  const pulled = await pullReportsFromCloud(userId, language);
  return pulled || {
    success: false,
    error: 'Failed to load reports.',
    data: [],
    automationEnabled: false,
    reportTime: '20:00',
  };
}

export async function fullSync(userId: string, language: Language = 'en'): Promise<{ pulled: number }> {
  const result = await pullReportsFromCloud(userId, language);
  return { pulled: result?.data?.length || 0 };
}
