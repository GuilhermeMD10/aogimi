// Wipe every locally-stored register that belongs to the *user* (as opposed
// to the device). Called when a different account signs into the same
// browser so account A's books, search history, etc. don't leak into
// account B.
//
// Kept here as the single owner of "what is user-scoped on disk" so the
// answer doesn't drift across the codebase. If a new per-user register is
// added later, add it to this orchestrator.
//
// What we KEEP on purpose:
//   - lgc_device_id   (device identity, not user)
//   - auth_user       (about to be overwritten by the new sign-in)
//
// What we WIPE:
//   - IndexedDB books DB (metadata + files blobs)
//   - localStorage dictionary_state + dictionary_recent_searches
//
// Onboarding state now lives on the backend (`users.onboarding_completed`),
// so there's no per-account onboarding key to clear here.

import { wipeBookDatabase } from '@/components/books/utils/bookStore';

const USER_KEYS = [
  'dictionary_state',
  'dictionary_recent_searches',
];

/**
 * Best-effort wipe — every step is independent and catches its own errors
 * so a single failure (Safari private mode quota, blocked IDB handle from
 * another tab, etc.) does not stop the rest.
 */
export async function wipeUserData(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. localStorage — fixed user-scoped keys.
  try {
    for (const key of USER_KEYS) localStorage.removeItem(key);
  } catch {
    /* private mode / quota — nothing else to do */
  }

  // 2. IndexedDB books DB — drops metadata + raw EPUB/PDF bytes and resets
  //    the cached connection so the next read re-opens fresh.
  try {
    await wipeBookDatabase();
  } catch {
    /* best-effort */
  }
}
