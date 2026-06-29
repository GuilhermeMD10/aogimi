'use client';

import { useAuth } from '../providers/AuthProvider';

/**
 * Returns the authenticated user, throwing if called outside an authed
 * context. Use this in components or sub-trees that are only rendered after
 * an explicit auth gate (e.g. routes guarded upstream, modals shown only
 * when `user` is present), so call sites stop sprinkling `user!.id` /
 * `if (!user) return null` defensive checks.
 */
export function useAuthedUser() {
  const { user } = useAuth();
  if (!user) {
    throw new Error('useAuthedUser called outside an authed context');
  }
  return user;
}
