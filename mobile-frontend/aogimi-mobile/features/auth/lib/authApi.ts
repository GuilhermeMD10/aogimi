// Thin wrappers around `/api/auth/*`. All of these `skipAuth: true`
// because they ARE the authentication exchange — bearing a previous
// access token while logging in or refreshing would be a category
// error (and the server would happily ignore it anyway).

import { request, type AuthFetchOptions } from '@/lib/api';
import type { UserProfile } from '@/features/profile/types';

export type AuthSuccess = {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
};

const PUBLIC: AuthFetchOptions = { skipAuth: true };

/**
 * **`email` is required** as of the auth redesign — `registerSchema` in
 * `backend/src/validation/auth.js` rejects a body without it. `users.email` is
 * still a nullable column (pre-redesign accounts have none and there is nothing
 * to backfill from), so the requirement lives at the request boundary, not in
 * the schema. It is stored, not used to authenticate: login stays username-keyed.
 *
 * **The endpoint is closed.** `POST /api/auth/register` answers 403 before it
 * validates anything — see `REGISTRATION_OPEN` in `app/(auth)/signup.tsx`, which
 * mirrors that state so the form isn't offered. This function is kept correct
 * and complete so reopening is a backend edit plus flipping that constant.
 */
export function registerUser(
  username: string,
  email: string,
  password: string,
): Promise<AuthSuccess> {
  return request<AuthSuccess>('/api/auth/register', {
    ...PUBLIC,
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export function loginUser(username: string, password: string): Promise<AuthSuccess> {
  return request<AuthSuccess>('/api/auth/login', {
    ...PUBLIC,
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

/** Logout is fire-and-forget on the wire. Even if the server rejects
 *  (revoked already, network down), the client wipes its tokens — the
 *  user wanted out. */
export function logoutUser(refreshToken: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/auth/logout', {
    ...PUBLIC,
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}
