// Local cache of synced books. Different from the pending-import sync
// store (`localState.ts`):
//   - localState tracks books the user imported OFFLINE that haven't
//     been pushed yet. Synthetic id, file on disk, no backend twin.
//   - syncedBookCache mirrors books that DO have a backend twin, so the
//     library + reader can paint without a network round-trip when
//     offline.
//
// Two pieces of state:
//   1. `Record<bookId, BookRecord>` — the latest known BookRecord for
//      every synced book. Refreshed on each successful useBooks fetch.
//   2. `sessionPending: Set<bookId>` — books that experienced a
//      backend error during a reader session, so their reader state
//      lives only in local storage until the user does a manual sync.
//      Visually they render with the UNSYNCED pill; functionally the
//      reader stops pushing during the session.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BookRecord } from '../types';

const CACHE_KEY = 'synced_book_cache_v1';
const PENDING_KEY = 'session_pending_books_v1';

type CacheMap = Record<string, BookRecord>;

async function readCache(): Promise<CacheMap> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as CacheMap) : {};
  } catch {
    return {};
  }
}

async function writeCache(map: CacheMap): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* best-effort */
  }
}

async function readPendingSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

async function writePendingSet(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* best-effort */
  }
}

// ── Reads ──────────────────────────────────────────────────────────────────

export async function getCachedBook(id: string): Promise<BookRecord | null> {
  const map = await readCache();
  return map[id] ?? null;
}

export async function getAllCachedBooks(): Promise<BookRecord[]> {
  const map = await readCache();
  return Object.values(map);
}

export async function isSessionPending(id: string): Promise<boolean> {
  const set = await readPendingSet();
  return set.has(id);
}

export async function listSessionPendingIds(): Promise<string[]> {
  return Array.from(await readPendingSet());
}

// ── Writes ─────────────────────────────────────────────────────────────────

export async function cacheBook(book: BookRecord): Promise<void> {
  const map = await readCache();
  map[book.id] = book;
  await writeCache(map);
}

/**
 * Overwrite the cache with the given list. Used by `useBooks` on every
 * successful backend fetch — the backend is the source of truth for
 * which books exist, so any cached entry NOT in the new list is
 * dropped (the user deleted it on another device).
 */
export async function cacheBooks(books: BookRecord[]): Promise<void> {
  const map: CacheMap = {};
  for (const b of books) map[b.id] = b;
  await writeCache(map);
}

export async function removeCachedBook(id: string): Promise<void> {
  const map = await readCache();
  if (!(id in map)) return;
  delete map[id];
  await writeCache(map);
  // Also drop any session-pending flag — the book is gone.
  await clearSessionPending(id);
}

/**
 * Mark a book as having a backend error during this session. The
 * library pill flips to UNSYNCED and the reader stops attempting
 * backend pushes. Cleared on the next successful manual sync.
 */
export async function markSessionPending(id: string): Promise<void> {
  const set = await readPendingSet();
  if (set.has(id)) return;
  set.add(id);
  await writePendingSet(set);
}

export async function clearSessionPending(id: string): Promise<void> {
  const set = await readPendingSet();
  if (!set.delete(id)) return;
  await writePendingSet(set);
}

export async function clearAllSessionPending(): Promise<void> {
  await writePendingSet(new Set());
}

export async function clearSyncedBookCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([CACHE_KEY, PENDING_KEY]);
  } catch {
    /* best-effort */
  }
}
