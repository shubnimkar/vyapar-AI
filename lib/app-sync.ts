import { fullSync as dailyFullSync } from './daily-entry-sync';
import { fullSync as creditFullSync } from './credit-sync';
import { fullSync as profileFullSync } from './profile-sync';
import { pullIndicesFromCloud } from './index-sync';
import { logger } from './logger';
import { fullSync as reportFullSync } from './report-sync';
import type { Language } from './types';

export interface AppSyncResult {
  profile: { pulled: number };
  daily: { pulled: number; pushed: number; failed: number };
  credit: { pulled: number; pushed: number; failed: number };
  indices: { pulled: number };
  reports: { pulled: number };
}

export async function fullAppSync(userId: string, language: Language = 'en'): Promise<AppSyncResult> {
  const [profile, daily, credit, indices, reports] = await Promise.all([
    profileFullSync(userId).catch((error) => {
      logger.warn('Profile sync failed', { error, userId });
      return { pulled: 0 };
    }),
    dailyFullSync(userId).catch((error) => {
      logger.warn('Daily sync failed', { error, userId });
      return { pulled: 0, pushed: 0, failed: 1 };
    }),
    creditFullSync(userId).catch((error) => {
      logger.warn('Credit sync failed', { error, userId });
      return { pulled: 0, pushed: 0, failed: 1 };
    }),
    pullIndicesFromCloud(userId)
      .then((items) => ({ pulled: items.length }))
      .catch((error) => {
        logger.warn('Indices sync failed', { error, userId });
        return { pulled: 0 };
      }),
    reportFullSync(userId, language).catch((error) => {
      logger.warn('Reports sync failed', { error, userId, language });
      return { pulled: 0 };
    }),
  ]);

  return { profile, daily, credit, indices, reports };
}
