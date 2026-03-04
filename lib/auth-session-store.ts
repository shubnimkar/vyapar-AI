// Authentication Session Store
// Manages session persistence in localStorage for phone auth

import type { AuthSession } from './supabase-auth';
import { logger } from './logger';

// ============================================
// LocalStorage Keys
// ============================================

const STORAGE_KEYS = {
  AUTH_SESSION: 'vyapar-auth-session',
  REMEMBER_DEVICE: 'vyapar-auth-remember',
  MIGRATION_STATUS: 'vyapar-auth-migrated',
  DEVICE_ID: 'vyapar-device-id',
} as const;

// ============================================
// Session Duration Constants
// ============================================

const SESSION_DURATION = {
  DEFAULT: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REMEMBER: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes in milliseconds
} as const;

// ============================================
// Type Definitions
// ============================================

export interface StoredSession extends AuthSession {
  rememberDevice: boolean;
  deviceId: string;
  storedAt: number; // Unix timestamp when stored
}

export interface MigrationStatus {
  completed: boolean;
  timestamp: number;
  dailyEntriesMigrated: number;
  creditEntriesMigrated: number;
}

// ============================================
// Device ID Management
// ============================================

/**
 * Get or generate device ID
 * Used for device-based data isolation before auth
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
      logger.debug('Generated new device ID', { deviceId });
    }
    
    return deviceId;
  } catch (error) {
    logger.error('Failed to get device ID', { error });
    return `device_${Date.now()}_fallback`;
  }
}

// ============================================
// Session Persistence
// ============================================

/**
 * Save session to localStorage
 */
export function saveSession(session: AuthSession, rememberDevice: boolean = false): void {
  if (typeof window === 'undefined') return;
  
  try {
    const deviceId = getDeviceId();
    
    const storedSession: StoredSession = {
      ...session,
      rememberDevice,
      deviceId,
      storedAt: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(storedSession));
    localStorage.setItem(STORAGE_KEYS.REMEMBER_DEVICE, rememberDevice.toString());
    
    logger.info('Session saved', {
      userId: session.user.id,
      rememberDevice,
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    });
  } catch (error) {
    logger.error('Failed to save session', { error });
  }
}

/**
 * Load session from localStorage
 */
export function loadSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!stored) return null;
    
    const session: StoredSession = JSON.parse(stored);
    
    logger.debug('Session loaded', {
      userId: session.user.id,
      rememberDevice: session.rememberDevice,
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
    });
    
    return session;
  } catch (error) {
    logger.error('Failed to load session', { error });
    return null;
  }
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_DEVICE);
    logger.info('Session cleared');
  } catch (error) {
    logger.error('Failed to clear session', { error });
  }
}

// ============================================
// Remember Device Preference
// ============================================

/**
 * Set remember device preference
 */
export function setRememberDevice(remember: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_DEVICE, remember.toString());
    logger.debug('Remember device set', { remember });
  } catch (error) {
    logger.error('Failed to set remember device', { error });
  }
}

/**
 * Get remember device preference
 */
export function shouldRememberDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.REMEMBER_DEVICE);
    return stored === 'true';
  } catch (error) {
    logger.error('Failed to get remember device', { error });
    return false;
  }
}

// ============================================
// Session Validation
// ============================================

/**
 * Check if session is valid (not expired)
 */
export function isSessionValid(session: StoredSession | null): boolean {
  if (!session) return false;
  
  const now = Date.now() / 1000; // Convert to seconds
  
  // Check if session has expired
  if (session.expiresAt <= now) {
    logger.info('Session expired', {
      expiresAt: new Date(session.expiresAt * 1000).toISOString(),
      now: new Date(now * 1000).toISOString(),
    });
    return false;
  }
  
  return true;
}

/**
 * Get session expiry time in milliseconds
 */
export function getSessionExpiry(session: StoredSession): number {
  return session.expiresAt * 1000; // Convert to milliseconds
}

/**
 * Check if session should be refreshed
 * Returns true if session expires within 5 minutes
 */
export function shouldRefresh(session: StoredSession | null): boolean {
  if (!session) return false;
  
  const now = Date.now();
  const expiryTime = session.expiresAt * 1000; // Convert to milliseconds
  const timeUntilExpiry = expiryTime - now;
  
  // Refresh if expiring within 5 minutes
  const shouldRefresh = timeUntilExpiry <= SESSION_DURATION.REFRESH_THRESHOLD;
  
  if (shouldRefresh) {
    logger.info('Session should be refreshed', {
      timeUntilExpiry: Math.floor(timeUntilExpiry / 1000 / 60), // minutes
      threshold: Math.floor(SESSION_DURATION.REFRESH_THRESHOLD / 1000 / 60), // minutes
    });
  }
  
  return shouldRefresh;
}

/**
 * Calculate session duration based on remember device preference
 */
export function getSessionDuration(rememberDevice: boolean): number {
  return rememberDevice ? SESSION_DURATION.REMEMBER : SESSION_DURATION.DEFAULT;
}

// ============================================
// Migration Status Management
// ============================================

/**
 * Check if data migration has been completed
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MIGRATION_STATUS);
    if (!stored) return false;
    
    const status: MigrationStatus = JSON.parse(stored);
    return status.completed;
  } catch (error) {
    logger.error('Failed to check migration status', { error });
    return false;
  }
}

/**
 * Get migration status
 */
export function getMigrationStatus(): MigrationStatus | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MIGRATION_STATUS);
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    logger.error('Failed to get migration status', { error });
    return null;
  }
}

/**
 * Mark migration as completed
 */
export function markMigrationCompleted(
  dailyEntriesMigrated: number,
  creditEntriesMigrated: number
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const status: MigrationStatus = {
      completed: true,
      timestamp: Date.now(),
      dailyEntriesMigrated,
      creditEntriesMigrated,
    };
    
    localStorage.setItem(STORAGE_KEYS.MIGRATION_STATUS, JSON.stringify(status));
    
    logger.info('Migration marked as completed', { status });
  } catch (error) {
    logger.error('Failed to mark migration completed', { error });
  }
}

/**
 * Reset migration status (for testing)
 */
export function resetMigrationStatus(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEYS.MIGRATION_STATUS);
    logger.info('Migration status reset');
  } catch (error) {
    logger.error('Failed to reset migration status', { error });
  }
}

// ============================================
// Export all functions
// ============================================

export const AuthSessionStore = {
  // Device ID
  getDeviceId,
  
  // Session persistence
  saveSession,
  loadSession,
  clearSession,
  
  // Remember device
  setRememberDevice,
  shouldRememberDevice,
  
  // Session validation
  isSessionValid,
  getSessionExpiry,
  shouldRefresh,
  getSessionDuration,
  
  // Migration status
  isMigrationCompleted,
  getMigrationStatus,
  markMigrationCompleted,
  resetMigrationStatus,
};
