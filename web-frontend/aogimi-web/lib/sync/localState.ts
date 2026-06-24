// Storage layer for the per-book local sync state on web.
//
// Reads/writes the `syncState` field directly on the IDB BookRecord
// row. Opens its own connection to the same `aogimi-books` database
// to avoid a circular import with `bookStore.importBook` (which calls
// into this module to mark pending/synced during import).
//
// Forward-compat: legacy rows without `syncState` are treated as
// `'synced'` — they came from imports that successfully pushed to the
// backend before the marker existed.

import { openDB, type IDBPDatabase } from 'idb';
import type { SyncState } from './types';

// Same DB / store as bookStore.ts. Keep these in sync if bookStore
// ever bumps its version.
const DB_NAME = 'aogimi-books';
const DB_VERSION = 1;
const META_STORE = 'metadata';

// Minimum shape this module needs to read from IDB. The full
// BookRecord lives in lib/bookStore.ts; we only touch syncState +
// id here.
type StoredBook = {
  id: string;
  filename: string;
  syncState?: SyncState;
};

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export function effectiveSyncState(book: StoredBook): SyncState {
  return book.syncState ?? 'synced';
}

export async function markPending(filename: string): Promise<void> {
  try {
    const db = await getDb();
    const book = (await db.get(META_STORE, filename)) as StoredBook | undefined;
    if (!book) return;
    await db.put(META_STORE, { ...book, syncState: 'pending' as const });
  } catch {
    /* IDB unavailable — best-effort */
  }
}

export async function markSynced(filename: string): Promise<void> {
  try {
    const db = await getDb();
    const book = (await db.get(META_STORE, filename)) as StoredBook | undefined;
    if (!book) return;
    await db.put(META_STORE, { ...book, syncState: 'synced' as const });
  } catch {
    /* */
  }
}

/**
 * Return every IDB book row where `syncState === 'pending'`. Used by
 * Sync-now to iterate the push queue and by the library merge to
 * surface pending books in the UI.
 *
 * Generic over the caller's full BookRecord shape — this module only
 * needs syncState + id to filter, but the caller usually wants the
 * full row.
 */
export async function listPending<T extends StoredBook>(): Promise<T[]> {
  try {
    const db = await getDb();
    const all = (await db.getAll(META_STORE)) as T[];
    return all.filter((b) => b.syncState === 'pending');
  } catch {
    return [];
  }
}
