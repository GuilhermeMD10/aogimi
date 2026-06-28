// Thin wrappers around `/api/auth/*`. These ARE the auth exchange,
// so they all use `apiSendPublic` to skip the Authorization header
// and the refresh-retry interceptor. A 401 here means "you typed
// the wrong password", not "your session is dead".

import { apiSendPublic } from '../api';
import type { UserProfile } from '@/features/profile/types';

export type AuthSuccess = {
  user: UserProfile;
  accessToken: string;
  // Web clients never receive this — the refresh token is delivered as an
  // httpOnly cookie. It's present only on the native (no-Origin) transport,
  // so it's optional in the shared shape.
  refreshToken?: string;
};

export function registerUser(username: string, password: string): Promise<AuthSuccess> {
  return apiSendPublic<AuthSuccess>('/api/auth/register', 'POST', { username, password });
}

export function loginUser(username: string, password: string): Promise<AuthSuccess> {
  return apiSendPublic<AuthSuccess>('/api/auth/login', 'POST', { username, password });
}

/** Revoke the current session. The refresh token rides in the httpOnly
 *  cookie, so no argument is needed — the backend reads the cookie, revokes
 *  the row, and clears the cookie. */
export function logoutUser(): Promise<{ ok: boolean }> {
  return apiSendPublic<{ ok: boolean }>('/api/auth/logout', 'POST');
}

/** Migration only: revoke a refresh token left in localStorage by the
 *  pre-cookie build, by passing it in the logout body (the backend's logout
 *  reads cookie-or-body). Best-effort; the caller ignores failures. */
export function revokeLegacyRefreshToken(refreshToken: string): Promise<{ ok: boolean }> {
  return apiSendPublic<{ ok: boolean }>('/api/auth/logout', 'POST', { refreshToken });
}
