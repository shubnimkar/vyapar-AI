// In-memory session store for Vyapar AI
// Daily entries and credit tracking persist in localStorage for user convenience
// CSV data and AI conversations remain session-only for privacy

import { SessionData, DailyEntry, CreditEntry } from './types';
import { randomBytes } from 'crypto';
import { logger } from './logger';

// Use global to persist across hot reloads in development
const globalForSession = global as typeof globalThis & {
  sessionStore?: Map<string, SessionData>;
};

// Global in-memory store that survives hot reloads
const sessionStore = globalForSession.sessionStore ?? new Map<string, SessionData>();

if (process.env.NODE_ENV !== 'production') {
  globalForSession.sessionStore = sessionStore;
}

// LocalStorage keys for persistent data
const STORAGE_KEYS = {
  DAILY_ENTRIES: 'vyapar-daily-entries',
  CREDIT_ENTRIES: 'vyapar-credit-entries',
};

/**
 * Load daily entries from localStorage (browser-side only)
 */
export function loadDailyEntriesFromStorage(): DailyEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES);
    if (!stored) return [];
    
    const entries = JSON.parse(stored);
    logger.debug('[Storage] Loaded daily entries', { count: entries.length });
    return entries;
  } catch (error) {
    logger.error('[Storage] Failed to load daily entries', { error });
    return [];
  }
}

/**
 * Save daily entries to localStorage (browser-side only)
 */
export function saveDailyEntriesToStorage(entries: DailyEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(entries));
    logger.debug('[Storage] Saved daily entries', { count: entries.length });
  } catch (error) {
    logger.error('[Storage] Failed to save daily entries', { error });
  }
}

/**
 * Load credit entries from localStorage (browser-side only)
 */
export function loadCreditEntriesFromStorage(): CreditEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CREDIT_ENTRIES);
    if (!stored) return [];
    
    const entries = JSON.parse(stored);
    logger.debug('[Storage] Loaded credit entries', { count: entries.length });
    return entries;
  } catch (error) {
    logger.error('[Storage] Failed to load credit entries', { error });
    return [];
  }
}

/**
 * Save credit entries to localStorage (browser-side only)
 */
export function saveCreditEntriesToStorage(entries: CreditEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.CREDIT_ENTRIES, JSON.stringify(entries));
    logger.debug('[Storage] Saved credit entries', { count: entries.length });
  } catch (error) {
    logger.error('[Storage] Failed to save credit entries', { error });
  }
}

// Session expiry time: 2 hours
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000;

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create a new session with persistent data loaded from localStorage
 */
export function createSession(): SessionData {
  const sessionId = generateSessionId();
  const now = new Date();
  
  // Load persistent data from localStorage (browser-side only)
  const dailyEntries = loadDailyEntriesFromStorage();
  const creditEntries = loadCreditEntriesFromStorage();
  
  const session: SessionData = {
    sessionId,
    createdAt: now,
    lastAccessedAt: now,
    dailyEntries,        // Load from localStorage
    creditEntries,       // Load from localStorage
    conversationHistory: [],
  };
  
  sessionStore.set(sessionId, session);
  logger.debug('[Session Store] Created session', { sessionId, totalSessions: sessionStore.size });
  logger.debug('[Session Store] Loaded from storage', { dailyCount: dailyEntries.length, creditCount: creditEntries.length });
  return session;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): SessionData | undefined {
  const session = sessionStore.get(sessionId);
  
  if (session) {
    // Update last accessed time
    session.lastAccessedAt = new Date();
  } else {
    logger.debug('[Session Store] Session not found', { sessionId, availableSessions: Array.from(sessionStore.keys()) });
  }
  
  return session;
}

/**
 * Update session data
 */
export function updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | undefined {
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return undefined;
  }
  
  const updatedSession = {
    ...session,
    ...updates,
    sessionId, // Ensure sessionId cannot be changed
    lastAccessedAt: new Date(),
  };
  
  sessionStore.set(sessionId, updatedSession);
  return updatedSession;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  return sessionStore.delete(sessionId);
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let deletedCount = 0;
  
  const sessionsToDelete: string[] = [];
  
  sessionStore.forEach((session, sessionId) => {
    const timeSinceLastAccess = now - session.lastAccessedAt.getTime();
    
    if (timeSinceLastAccess > SESSION_EXPIRY_MS) {
      sessionsToDelete.push(sessionId);
    }
  });
  
  sessionsToDelete.forEach(sessionId => {
    sessionStore.delete(sessionId);
    deletedCount++;
  });
  
  return deletedCount;
}

/**
 * Get total number of active sessions
 */
export function getActiveSessionCount(): number {
  return sessionStore.size;
}
