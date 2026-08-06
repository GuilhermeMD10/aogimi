'use client';
import { useEffect, useState } from 'react';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { getUserProfile } from '@/features/profile/lib/userApi';

/**
 * The signed-in user's sky seed — `users.sky_seed`, one immutable 16-hex string per account,
 * which every sky (deck details today, the full map later) generates from.
 *
 * Fetched from the profile because the auth context deliberately carries only `{ id, username }`.
 * Cached at module level: the seed cannot change (it is not in the PATCH allow-list), so one
 * fetch per user per page load is already one more than strictly needed. Returns null until the
 * seed is known — callers render their placeholder (the empty night panel) and mount the sky when
 * it lands, which on a warm cache is the very first render.
 *
 * Against a backend that predates migration 025 the profile has no `sky_seed`, the hook stays
 * null forever, and the sky simply never mounts — the pre-sky page, not an error.
 */
let cached: { userId: number; seed: string } | null = null;

export function useSkySeed(): string | null {
  const user = useAuthedUser();
  const [seed, setSeed] = useState<string | null>(() =>
    cached?.userId === user.id ? cached.seed : null,
  );

  useEffect(() => {
    if (cached?.userId === user.id) return; // state already seeded by the initializer
    const controller = new AbortController();
    getUserProfile(user.id, controller.signal)
      .then((profile) => {
        const s = profile.sky_seed;
        if (typeof s === 'string' && s.length > 0) {
          cached = { userId: user.id, seed: s };
          setSeed(s);
        }
      })
      .catch(() => {
        /* offline / aborted — the sky stays unmounted; the next visit retries */
      });
    return () => controller.abort();
  }, [user.id]);

  return seed;
}
