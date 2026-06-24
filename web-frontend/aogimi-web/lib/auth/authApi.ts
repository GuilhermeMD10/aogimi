// Thin wrappers around `/api/auth/*`. These ARE the auth exchange,
// so they all use `apiSendPublic` to skip the Authorization header
// and the refresh-retry interceptor. A 401 here means "you typed
// the wrong password", not "your session is dead".

import { apiSendPublic } from '../api';
import type { UserProfile } from '@/lib/types';

export type AuthSuccess = {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
};

export function registerUser(username: string, password: string): Promise<AuthSuccess> {
  return apiSendPublic<AuthSuccess>('/api/auth/register', 'POST', { username, password });
}

export function loginUser(username: string, password: string): Promise<AuthSuccess> {
  return apiSendPublic<AuthSuccess>('/api/auth/login', 'POST', { username, password });
}

export function logoutUser(refreshToken: string): Promise<{ ok: boolean }> {
  return apiSendPublic<{ ok: boolean }>('/api/auth/logout', 'POST', { refreshToken });
}
