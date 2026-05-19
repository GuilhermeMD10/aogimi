import { apiSend, apiSendVoid, API_URL } from './api';
import type { AuthUser, ProfileUpdate, UserProfile } from '@/lib/types';

// ── Auth ─────────────────────────────────────────────────────────────────────

export function loginUser(username: string, password: string): Promise<AuthUser> {
  return apiSend<AuthUser>('/api/user/info', 'POST', { username, password });
}

export function signupUser(username: string, password: string): Promise<AuthUser> {
  return apiSend<AuthUser>('/api/user/create', 'POST', { username, password });
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number, signal?: AbortSignal): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/user/${userId}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
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
