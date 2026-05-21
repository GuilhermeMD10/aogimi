import { apiGet, apiSend, apiSendVoid } from './api';
import type { AuthUser, ProfileUpdate, UserProfile } from '@/lib/types';

// ── Auth ─────────────────────────────────────────────────────────────────────

export function loginUser(username: string, password: string): Promise<AuthUser> {
  return apiSend<AuthUser>('/api/user/info', 'POST', { username, password });
}

export function signupUser(username: string, password: string): Promise<AuthUser> {
  return apiSend<AuthUser>('/api/user/create', 'POST', { username, password });
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function getUserProfile(userId: number, signal?: AbortSignal): Promise<UserProfile> {
  // Routed through apiGet (not raw fetch) so the api.ts session-invalidation
  // interceptor catches a 401 USER_NOT_FOUND here too.
  return apiGet<UserProfile>(`/api/user/${userId}`, signal);
}

export function updateUserProfile(
  username: string,
  password: string,
  updates: ProfileUpdate,
): Promise<UserProfile> {
  return apiSend<UserProfile>('/api/user/update', 'POST', { username, password, updates });
}

// ── Onboarding ───────────────────────────────────────────────────────────────

export function markOnboardingCompleted(userId: number): Promise<void> {
  return apiSendVoid('/api/user/onboarding', 'PUT', { userId, completed: true });
}
