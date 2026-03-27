import type { UserProfile } from './types';
import { logger } from './logger';

const storageKeyForUser = (userId: string) => `vyapar-profile-${userId}`;

export function getCachedProfile(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(storageKeyForUser(userId));
    if (!stored) return null;
    return JSON.parse(stored) as UserProfile;
  } catch (error) {
    logger.warn('Failed to read cached profile', { error, userId });
    return null;
  }
}

export function cacheProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKeyForUser(profile.id), JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('vyapar-profile-changed', { detail: { userId: profile.id } }));
  } catch (error) {
    logger.warn('Failed to cache profile', { error, userId: profile.id });
  }
}

export async function pullProfileFromCloud(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();

    if (!response.ok || !result.success || !result.data) {
      return null;
    }

    cacheProfile(result.data as UserProfile);
    return result.data as UserProfile;
  } catch (error) {
    logger.warn('Failed to pull profile from cloud', { error, userId });
    return null;
  }
}

export async function getProfileLocalFirst(userId: string): Promise<UserProfile | null> {
  const cached = getCachedProfile(userId);

  if (cached) {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void pullProfileFromCloud(userId);
    }
    return cached;
  }

  return pullProfileFromCloud(userId);
}

export async function fullSync(userId: string): Promise<{ pulled: number }> {
  const profile = await pullProfileFromCloud(userId);
  return { pulled: profile ? 1 : 0 };
}
