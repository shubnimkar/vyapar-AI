// Rate Limiter Service
// Prevents abuse of authentication endpoints using in-memory storage

import { logger } from './logger';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Start cleanup timer
if (typeof window === 'undefined') {
  // Only run cleanup on server side
  setInterval(() => {
    cleanup();
  }, CLEANUP_INTERVAL);
}

/**
 * Checks if request is allowed under rate limit
 */
export function check(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // No entry or expired entry
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }
  
  // Entry exists and not expired
  if (entry.count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Resets rate limit for a key
 */
export function reset(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Cleans up expired entries
 */
export function cleanup(): void {
  const now = Date.now();
  let cleaned = 0;
  
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug('Cleaned up expired rate limit entries', { count: cleaned });
  }
}

/**
 * Gets rate limit key for IP address and endpoint
 */
export function getRateLimitKey(ip: string, endpoint: string): string {
  return `${endpoint}:${ip}`;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  SIGNUP: { maxAttempts: 5, windowMs: 60 * 60 * 1000 },        // 5 per hour
  LOGIN: { maxAttempts: 10, windowMs: 15 * 60 * 1000 },        // 10 per 15 minutes
  CHECK_USERNAME: { maxAttempts: 20, windowMs: 60 * 1000 },    // 20 per minute
};

/**
 * Rate Limiter class with all methods
 */
export class RateLimiter {
  static check = check;
  static reset = reset;
  static cleanup = cleanup;
  static getRateLimitKey = getRateLimitKey;
  static RATE_LIMITS = RATE_LIMITS;
}

export default RateLimiter;
