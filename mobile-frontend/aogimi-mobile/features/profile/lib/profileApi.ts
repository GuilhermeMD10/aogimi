// Profile read/update for the current (signed-in) user. Identity is
// carried by the Authorization header in `lib/api.ts`; these helpers
// only need the data they're sending — no usernames or passwords.
//
// Login + registration live in `lib/auth/authApi.ts`. Anything that
// touches credentials goes through there, NOT here.

import { request } from '@/lib/api';
import type { UserProfile, UserProfileUpdate } from '../types';

export function fetchUserById(userId: number, signal?: AbortSignal): Promise<UserProfile> {
  return request<UserProfile>(`/api/user/${userId}`, { signal });
}

export function updateUserProfile(updates: UserProfileUpdate): Promise<UserProfile> {
  return request<UserProfile>('/api/user', {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
}

export function setOnboardingCompleted(completed: boolean): Promise<{ message: string }> {
  return request<{ message: string }>('/api/user/onboarding', {
    method: 'PUT',
    body: JSON.stringify({ completed }),
  });
}

export function deleteCurrentUser(): Promise<{ message: string }> {
  return request<{ message: string }>('/api/user', {
    method: 'DELETE',
  });
}
