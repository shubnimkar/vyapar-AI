import { SessionManager } from './session-manager';

export function resolveUserScopedKey(baseKey: string, explicitUserId?: string): string {
  const userId = explicitUserId || SessionManager.getCurrentUser()?.userId;
  return userId ? `${baseKey}-${userId}` : baseKey;
}

export function isUserScopedKey(key: string | null, baseKey: string): boolean {
  return Boolean(key && (key === baseKey || key.startsWith(`${baseKey}-`)));
}
