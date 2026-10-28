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

/** `DELETE /api/user` — the server cascades every user-data table off the
 *  token's identity and revokes every session. Nothing is sent in the body;
 *  the caller (`AuthContext.deleteAccount`) owns the local wipe that follows
 *  a success. */
export function deleteCurrentUser(signal?: AbortSignal): Promise<{ message: string }> {
  return request<{ message: string }>('/api/user', {
    method: 'DELETE',
    signal,
  });
}
