// Session Manager Service
// Manages authenticated user sessions with localStorage

import { logger } from './logger';

export interface UserSession {
  userId: string;
  username: string;
  expiresAt: number;        // Unix timestamp in seconds
  rememberDevice: boolean;
}

// Storage key
const SESSION_KEY = 'vyapar-user-session';

// Session durations
const SESSION_DURATION = {
  DEFAULT: 7 * 24 * 60 * 60,      // 7 days in seconds
  REMEMBER: 30 * 24 * 60 * 60,    // 30 days in seconds
};

/**
 * Creates a new session
 */
export function createSession(
  userId: string,
  username: string,
  rememberDevice: boolean = false
): UserSession {
  const duration = rememberDevice ? SESSION_DURATION.REMEMBER : SESSION_DURATION.DEFAULT;
  const expiresAt = Math.floor(Date.now() / 1000) + duration;
  
  return {
    userId,
    username,
    expiresAt,
    rememberDevice,
  };
}

/**
 * Saves session to storage (localStorage or sessionStorage based on rememberDevice)
 */
export function saveSession(session: UserSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (session.rememberDevice) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.removeItem(SESSION_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem(SESSION_KEY);
    }
    logger.debug('[Session Manager] Session saved for user', { username: session.username, rememberDevice: session.rememberDevice });
  } catch (error) {
    logger.error('[Session Manager] Failed to save session', { error });
  }
}

/**
 * Loads session from storage (checks sessionStorage first, then localStorage)
 */
export function loadSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    
    const session: UserSession = JSON.parse(stored);
    return session;
  } catch (error) {
    logger.error('[Session Manager] Failed to load session', { error });
    return null;
  }
}

/**
 * Clears session from both storages
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    logger.debug('[Session Manager] Session cleared');
  } catch (error) {
    logger.error('[Session Manager] Failed to clear session', { error });
  }
}

/**
 * Checks if session is valid (not expired)
 */
export function isSessionValid(session: UserSession | null): boolean {
  if (!session) return false;
  
  const now = Math.floor(Date.now() / 1000);
  
  if (session.expiresAt <= now) {
    logger.debug('[Session Manager] Session expired');
    return false;
  }
  
  return true;
}

/**
 * Gets session duration based on remember device preference
 */
export function getSessionDuration(rememberDevice: boolean): number {
  return rememberDevice ? SESSION_DURATION.REMEMBER : SESSION_DURATION.DEFAULT;
}

/**
 * Gets current authenticated user
 */
export function getCurrentUser(): { userId: string; username: string } | null {
  const session = loadSession();
  
  if (!session || !isSessionValid(session)) {
    return null;
  }
  
  return {
    userId: session.userId,
    username: session.username,
  };
}

/**
 * Checks if user is authenticated
 */
export function isAuthenticated(): boolean {
  const session = loadSession();
  return isSessionValid(session);
}

/**
 * Session Manager class with all methods
 */
export class SessionManager {
  static createSession = createSession;
  static saveSession = saveSession;
  static loadSession = loadSession;
  static clearSession = clearSession;
  static isSessionValid = isSessionValid;
  static getSessionDuration = getSessionDuration;
  static getCurrentUser = getCurrentUser;
  static isAuthenticated = isAuthenticated;
}

export default SessionManager;
