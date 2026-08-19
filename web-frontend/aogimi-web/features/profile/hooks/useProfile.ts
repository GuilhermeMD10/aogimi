'use client';

import { useCallback, useState } from 'react';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import { getUserProfile, updateUserProfile } from '../lib/userApi';
import type { UserProfile } from '../types';

/**
 * The signed-in user's profile row. The auth context's username doubles as an
 * instant fallback so the identity card renders from the session immediately
 * and refines when the fetch lands — no full-page spinner.
 */
export function useProfile() {
  const user = useAuthedUser();

  const { data, loading, error } = useFetchWithAbort<UserProfile>(
    (signal) => getUserProfile(user.id, signal),
    [user.id],
  );

  // A saved display name overlays the fetched row so a successful edit shows
  // without a refetch. Failures never reach here — `saveDisplayName` throws
  // and the caller keeps its draft (and the editor open) instead.
  const [savedName, setSavedName] = useState<string | null>(null);

  const saveDisplayName = useCallback(async (name: string) => {
    await updateUserProfile({ display_name: name });
    setSavedName(name);
  }, []);

  return {
    displayName: savedName ?? data?.display_name ?? data?.username ?? user.username,
    email: data?.email ?? null,
    loading,
    error,
    saveDisplayName,
  };
}
