// Periodic cleanup scheduler for expired sessions

import { cleanupExpiredSessions } from './session-store';
import { logger } from './logger';

// Cleanup interval: 30 minutes
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Start the periodic cleanup scheduler
 */
export function startCleanupScheduler(): void {
  if (cleanupTimer) {
    return; // Already running
  }
  
  // Run cleanup immediately
  cleanupExpiredSessions();
  
  // Schedule periodic cleanup
  cleanupTimer = setInterval(() => {
    const deletedCount = cleanupExpiredSessions();
    if (deletedCount > 0) {
      logger.info('Removed expired sessions', { count: deletedCount });
    }
  }, CLEANUP_INTERVAL_MS);
  
  logger.info('Session cleanup scheduler started');
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('Session cleanup scheduler stopped');
  }
}

// Auto-start cleanup in production
if (process.env.NODE_ENV === 'production') {
  startCleanupScheduler();
}
