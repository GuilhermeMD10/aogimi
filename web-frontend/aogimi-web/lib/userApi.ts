// Profile endpoints. Identity is carried by the Authorization header
// in `lib/api.ts`; helpers here only ship the data they're updating —
// no usernames or passwords. Login + registration live in
// `lib/auth/authApi.ts`.

import { apiGet, apiSend, apiSendVoid } from './api';
import type { ProfileUpdate, UserProfile } from '@/features/profile/types';

// Re-export for backwards-compatible imports across the app.
export { loginUser, registerUser, logoutUser } from './auth/authApi';
export type { AuthSuccess } from './auth/authApi';

/** Compatibility alias — older code imports `signupUser`. */
export { registerUser as signupUser } from './auth/authApi';

export function getUserProfile(userId: number, signal?: AbortSignal): Promise<UserProfile> {
  return apiGet<UserProfile>(`/api/user/${userId}`, signal);
}

export function updateUserProfile(updates: ProfileUpdate): Promise<UserProfile> {
  return apiSend<UserProfile>('/api/user', 'PATCH', { updates });
}

/** Mark onboarding complete for the current (signed-in) user. */
export function markOnboardingCompleted(): Promise<void> {
  return apiSendVoid('/api/user/onboarding', 'PUT', { completed: true });
}

export function deleteCurrentUser(): Promise<void> {
  return apiSendVoid('/api/user', 'DELETE');
}
