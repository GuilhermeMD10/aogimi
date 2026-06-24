// Wipe every locally-stored register that belongs to the *user* (as opposed
// to the device). Called when a different account signs into the same
// browser so account A's books, highlights, search history, etc. don't
// leak into account B.
//
// Kept here as the single owner of "what is user-scoped on disk" so the
// answer doesn't drift across the codebase. If a new per-user register is
// added later, add it to this orchestrator.
//
// What we KEEP on purpose:
//   - lgc_device_id   (device identity, not user)
//   - app-theme       (device preference)
//   - auth_user       (about to be overwritten by the new sign-in)
//
// What we WIPE:
//   - IndexedDB `shirube-books` (metadata + files blobs)
//   - localStorage `lgc_avatar_index`
//   - localStorage `lgc_needs_onboarding`
//   - localStorage `dictionary_state` + `dictionary_recent_searches`
//   - localStorage `reader_book_<filename>` (every match — highlights /
//     bookmarks / prefs / lastCfi)
//   - localStorage `reader_progress_<filename>` (every match)

import { wipeBookDatabase } from '@/components/books/utils/bookStore';

const USER_PREFIXES = ['reader_book_', 'reader_progress_'];
const USER_KEYS = [
  'lgc_avatar_index',
  'lgc_needs_onboarding',
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

  // 1. localStorage — fixed keys + prefix sweeps. Snapshot the key list
  //    first because removing while iterating breaks the index.
  try {
    for (const key of USER_KEYS) localStorage.removeItem(key);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && USER_PREFIXES.some((p) => k.startsWith(p))) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    /* private mode / quota — nothing else to do */
  }

  // 2. IndexedDB `shirube-books` — drops metadata + raw EPUB/PDF bytes
  //    and resets the cached connection so the next read re-opens fresh.
  try {
    await wipeBookDatabase();
  } catch {
    /* best-effort */
  }
}
