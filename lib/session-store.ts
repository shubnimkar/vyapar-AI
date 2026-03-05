// In-memory session store for Vyapar AI
// Daily entries and credit tracking persist in localStorage for user convenience
// CSV data and AI conversations remain session-only for privacy

import { SessionData, DailyEntry, CreditEntry } from './types';
import { randomBytes } from 'crypto';
import { logger } from './logger';
import { DynamoDBService } from './dynamodb-client';

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

// ============================================
// Internal Helper Functions for DynamoDB
// ============================================

/**
 * Generate expires_at timestamp (2 hours from now)
 * Used by sessionToDynamoItem()
 */
function generateExpiresAt(): string {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
  return expiresAt.toISOString();
}

/**
 * Calculate TTL timestamp (Unix seconds) for 2-hour expiration
 * @param fromDate - The date to calculate TTL from
 * @returns Unix timestamp in seconds for DynamoDB TTL
 */
function calculateTTL(fromDate: Date): number {
  const ttlDate = new Date(fromDate.getTime() + SESSION_EXPIRY_MS);
  return Math.floor(ttlDate.getTime() / 1000);
}

/**
 * Check if session has expired based on expires_at timestamp
 * @param expiresAt - ISO 8601 timestamp string
 * @returns true if current time > expires_at
 */
function isSessionExpired(expiresAt: string): boolean {
  const expiresAtDate = new Date(expiresAt);
  const now = new Date();
  return now > expiresAtDate;
}

/**
 * Convert SessionData to DynamoDB item format
 * @param session - SessionData object to convert
 * @returns DynamoDB item with PK, SK, entityType, TTL, and all session fields
 */
function sessionToDynamoItem(session: SessionData): Record<string, unknown> {
  const expiresAt = generateExpiresAt();
  const ttl = calculateTTL(session.createdAt);
  
  return {
    PK: `SESSION#${session.sessionId}`,
    SK: 'METADATA',
    entityType: 'SESSION',
    sessionId: session.sessionId,
    createdAt: session.createdAt.toISOString(),
    lastAccessedAt: session.lastAccessedAt.toISOString(),
    expires_at: expiresAt,
    dailyEntries: session.dailyEntries,
    creditEntries: session.creditEntries,
    salesData: session.salesData,
    expensesData: session.expensesData,
    inventoryData: session.inventoryData,
    conversationHistory: session.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    })),
    ttl,
  };
}

/**
 * Convert DynamoDB item to SessionData format
 * @param item - DynamoDB item to convert
 * @returns SessionData object with Date objects and proper types
 */
function dynamoItemToSession(item: Record<string, unknown>): SessionData {
  return {
    sessionId: item.sessionId as string,
    createdAt: new Date(item.createdAt as string),
    lastAccessedAt: new Date(item.lastAccessedAt as string),
    dailyEntries: (item.dailyEntries as DailyEntry[]) || [],
    creditEntries: (item.creditEntries as CreditEntry[]) || [],
    salesData: item.salesData as any | undefined,
    expensesData: item.expensesData as any | undefined,
    inventoryData: item.inventoryData as any | undefined,
    conversationHistory: ((item.conversationHistory as any[]) || []).map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    })),
  };
}

/**
 * Create a new session with persistent data loaded from localStorage
 */
export async function createSession(): Promise<SessionData> {
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
  
  // Convert to DynamoDB item and persist
  const dynamoItem = sessionToDynamoItem(session);
  
  try {
    await DynamoDBService.putItem(dynamoItem);
    logger.info('[Session Store] Created session', { sessionId });
    logger.debug('[Session Store] Loaded from storage', { dailyCount: dailyEntries.length, creditCount: creditEntries.length });
  } catch (error) {
    // Handle credential errors gracefully (degraded mode for local development)
    logger.warn('[Session Store] Failed to persist session to DynamoDB, operating in degraded mode', { sessionId, error });
  }
  
  return session;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<SessionData | undefined> {
  // Validate sessionId is non-empty
  if (!sessionId || sessionId.trim() === '') {
    logger.warn('[Session Store] Invalid sessionId provided to getSession');
    return undefined;
  }
  
  // Build PK and SK for DynamoDB query
  const PK = `SESSION#${sessionId}`;
  const SK = 'METADATA';
  
  try {
    // Call DynamoDBService.getItem(PK, SK)
    const item = await DynamoDBService.getItem(PK, SK);
    
    // If item is null, log and return undefined
    if (!item) {
      logger.debug('[Session Store] Session not found', { sessionId });
      return undefined;
    }
    
    // Check if session expired using isSessionExpired()
    if (isSessionExpired(item.expires_at as string)) {
      logger.debug('[Session Store] Session expired', { sessionId, expires_at: item.expires_at });
      return undefined;
    }
    
    // Convert DynamoDB item to SessionData using dynamoItemToSession()
    const session = dynamoItemToSession(item);
    
    // Update lastAccessedAt to current time
    const now = new Date();
    session.lastAccessedAt = now;
    
    // Call DynamoDBService.updateItem() to persist timestamp
    await DynamoDBService.updateItem(PK, SK, {
      lastAccessedAt: now.toISOString(),
    });
    
    logger.debug('[Session Store] Retrieved session', { sessionId });
    
    // Return SessionData
    return session;
  } catch (error) {
    // Handle credential errors gracefully (degraded mode for local development)
    logger.error('[Session Store] Failed to retrieve session from DynamoDB', { sessionId, error });
    return undefined;
  }
}

/**
 * Update session data
 */
export async function updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | undefined> {
  // Call getSession() to retrieve existing session
  const session = await getSession(sessionId);
  
  // If session not found or expired, return undefined
  if (!session) {
    return undefined;
  }
  
  // Merge updates into existing session (spread operator)
  // Preserve sessionId (cannot be changed)
  // Set lastAccessedAt to current time
  const updatedSession: SessionData = {
    ...session,
    ...updates,
    sessionId, // Ensure sessionId cannot be changed
    lastAccessedAt: new Date(),
  };
  
  // Convert updated SessionData to DynamoDB item
  const dynamoItem = sessionToDynamoItem(updatedSession);
  
  try {
    // Call DynamoDBService.putItem() for full replace
    await DynamoDBService.putItem(dynamoItem);
    logger.debug('[Session Store] Updated session', { sessionId });
    
    // Return updated SessionData
    return updatedSession;
  } catch (error) {
    // Handle DynamoDB operation failures
    logger.error('[Session Store] Failed to update session in DynamoDB', { sessionId, error });
    throw new Error('Failed to update session data');
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  // Validate sessionId is non-empty
  if (!sessionId || sessionId.trim() === '') {
    logger.warn('[Session Store] Invalid sessionId provided to deleteSession');
    return false;
  }
  
  // Build PK and SK for DynamoDB deletion
  const PK = `SESSION#${sessionId}`;
  const SK = 'METADATA';
  
  try {
    // First check if session exists
    const item = await DynamoDBService.getItem(PK, SK);
    
    // If session doesn't exist, return false
    if (!item) {
      logger.debug('[Session Store] Session not found for deletion', { sessionId });
      return false;
    }
    
    // Call DynamoDBService.deleteItem(PK, SK)
    await DynamoDBService.deleteItem(PK, SK);
    logger.info('[Session Store] Deleted session', { sessionId });
    
    // Return true if deletion succeeded
    return true;
  } catch (error) {
    // Handle DynamoDB operation failures
    logger.error('[Session Store] Failed to delete session from DynamoDB', { sessionId, error });
    throw new Error('Failed to delete session data');
  }
}


