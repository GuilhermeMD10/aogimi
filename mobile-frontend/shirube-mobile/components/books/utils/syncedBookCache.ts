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

/**
 * Find a cached BookRecord whose `file_hash` matches. Used by the
 * import dedup path so an offline import can still detect "this book
 * is already in my cloud library" by checking against the locally
 * cached backend list. Returns null when no cached record carries a
 * matching hash (or when `hash` itself is null).
 */
export async function findCachedBookByFileHash(
  hash: string | null,
): Promise<BookRecord | null> {
  if (!hash) return null;
  const map = await readCache();
  for (const book of Object.values(map)) {
    if (book.file_hash && book.file_hash === hash) return book;
  }
  return null;
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
 * Overwrite the cache with the given list. Used in places where the
 * backend response is the absolute truth — typically not during
 * routine refreshes (use `mergeBackendBooks` for those — it preserves
 * locally-newer state). Kept for callers that explicitly want a wipe.
 */
export async function cacheBooks(books: BookRecord[]): Promise<void> {
  const map: CacheMap = {};
  for (const b of books) map[b.id] = b;
  await writeCache(map);
}

/**
 * Merge a fresh backend book list into the cache with newer-wins
 * semantics. This is the canonical refresh path: the local cache is
 * the source of truth for any record where the local `last_read_at`
 * exceeds the backend's (an unpushed reading session). Backend wins
 * everywhere else.
 *
 * Books on the backend list that aren't in local cache are added.
 * Books in local cache but not on the backend list are dropped
 * (deleted on another device).
 */
export async function mergeBackendBooks(books: BookRecord[]): Promise<void> {
  const map = await readCache();
  const incomingIds = new Set(books.map((b) => b.id));
  for (const remote of books) {
    const local = map[remote.id];
    if (!local || isNewer(remote.last_read_at, local.last_read_at)) {
      map[remote.id] = remote;
    }
  }
  for (const id of Object.keys(map)) {
    if (!incomingIds.has(id)) delete map[id];
  }
  await writeCache(map);
}

/**
 * Apply a local reading-progress patch to the persisted cache. Called
 * by the reader's back-press / app-background flush so the library
 * tile + the next reader open both paint the latest local state — not
 * the stale backend snapshot from the last successful fetch.
 *
 * This is what makes the local cache the source of truth: any reading
 * session, online or offline, writes through here. Push-side logic
 * then compares `last_read_at` to decide direction.
 */
export async function persistLocalProgress(
  id: string,
  patch: { progress: number; cfi: string; lastReadAt: string },
): Promise<void> {
  const map = await readCache();
  const existing = map[id];
  if (!existing) return;
  map[id] = {
    ...existing,
    progress: patch.progress,
    cfi_position: patch.cfi,
    last_read_at: patch.lastReadAt,
  };
  await writeCache(map);
}

function isNewer(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a) return false;
  if (!b) return true;
  return new Date(a).getTime() > new Date(b).getTime();
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
