import { request } from '@/lib/api';
import type { UserProfile, UserProfileUpdate, UserPublic } from '../types';

export function createUser(username: string, password: string): Promise<UserPublic> {
  return request<UserPublic>('/api/user/create', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchUserInfo(username: string, password: string): Promise<UserProfile> {
  return request<UserProfile>('/api/user/info', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function updateUserProfile(
  username: string,
  password: string,
  updates: UserProfileUpdate,
): Promise<UserProfile> {
  return request<UserProfile>('/api/user/update', {
    method: 'POST',
    body: JSON.stringify({ username, password, updates }),
  });
}
