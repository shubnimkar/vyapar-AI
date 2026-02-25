// In-memory session store for Vyapar AI
// No persistent storage - all data lives in memory during session

import { SessionData } from './types';
import { randomBytes } from 'crypto';

// Global in-memory store
const sessionStore = new Map<string, SessionData>();

// Session expiry time: 2 hours
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000;

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create a new session
 */
export function createSession(): SessionData {
  const sessionId = generateSessionId();
  const now = new Date();
  
  const session: SessionData = {
    sessionId,
    createdAt: now,
    lastAccessedAt: now,
    conversationHistory: [],
  };
  
  sessionStore.set(sessionId, session);
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
