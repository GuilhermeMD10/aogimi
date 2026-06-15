// Thin wrappers around `/api/auth/*`. All of these `skipAuth: true`
// because they ARE the authentication exchange — bearing a previous
// access token while logging in or refreshing would be a category
// error (and the server would happily ignore it anyway).

import { request, type AuthFetchOptions } from '../api';
import type { UserProfile } from '@/components/profile/types';

export type AuthSuccess = {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
};

const PUBLIC: AuthFetchOptions = { skipAuth: true };

export function registerUser(username: string, password: string): Promise<AuthSuccess> {
  return request<AuthSuccess>('/api/auth/register', {
    ...PUBLIC,
    method: 'POST',
    body: JSON.stringify({ username, password }),
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
