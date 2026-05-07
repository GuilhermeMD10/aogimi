import { apiSend, apiSendVoid, API_URL } from './api';
import type { StoredAuthUser } from '@/lib/storage/auth';

// ── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = StoredAuthUser;

export interface UserProfile {
  id: number;
  username: string;
  display_name: string | null;
  email: string | null;
  language: string | null;
  avatar_index: number | null;
  created_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  email?: string;
  language?: string;
  avatar_index?: number;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function loginUser(username: string, password: string): Promise<AuthUser> {
  return apiSend<AuthUser>('/api/user/info', 'POST', { username, password });
}

export function signupUser(username: string, password: string): Promise<AuthUser> {
  return apiSend<AuthUser>('/api/user/create', 'POST', { username, password });
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/user/${userId}`);
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
