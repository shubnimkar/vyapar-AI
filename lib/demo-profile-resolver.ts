import { UserProfile } from './types';

const PROFILE_STORAGE_KEYS = ['vyapar_profile', 'vyapar-user-profile'];
const SESSION_STORAGE_KEY = 'vyapar-user-session';

function parseStoredJson<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getStoredProfile(): Partial<UserProfile> | null {
  for (const key of PROFILE_STORAGE_KEYS) {
    const parsed = parseStoredJson<Partial<UserProfile>>(localStorage.getItem(key));
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getSessionUserId(): string | null {
  const session = parseStoredJson<{ userId?: string }>(localStorage.getItem(SESSION_STORAGE_KEY));
  return session?.userId || null;
}

export async function resolveProfileForDemoData(
  existingProfile?: Partial<UserProfile> | null
): Promise<Partial<UserProfile> | null> {
  if (existingProfile?.business_type && existingProfile?.city_tier) {
    return existingProfile;
  }

  const storedProfile = getStoredProfile();
  if (storedProfile?.business_type && storedProfile?.city_tier) {
    return storedProfile;
  }

  const userId = getSessionUserId();
  if (!userId) {
    return existingProfile || storedProfile;
  }

  try {
    const response = await fetch(`/api/profile?userId=${encodeURIComponent(userId)}`);
    const result = await response.json();

    if (response.ok && result?.success && result.data) {
      return result.data as Partial<UserProfile>;
    }
  } catch {
    // Ignore fetch failure and fall back to any locally available profile fields.
  }

  return existingProfile || storedProfile;
}
