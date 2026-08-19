import { openDB, type IDBPDatabase } from 'idb';

// The single IndexedDB database for the web client. It merges two legacy
// databases:
//   - `aogimi-books` — book metadata (+ syncState) and the imported file blobs
//   - `aogimi-fs`    — the File System Access directory handle
// Both are folded in here on first open (see migrateLegacy). bookStore.ts,
// lib/sync/localState.ts and lib/fsAccess.ts all open the DB through `getDb`
// so there is exactly one connection factory.

const DB_NAME = 'aogimi';
const DB_VERSION = 1;

export const META_STORE = 'metadata';   // book records, in-line keyPath 'id'
export const FILES_STORE = 'files';      // ArrayBuffer blobs, out-of-line key = filename
export const HANDLES_STORE = 'handles';  // FS Access directory handle(s), out-of-line key

// Legacy databases folded into `aogimi` on first open (one-time migration).
const LEGACY_BOOKS_DB = 'aogimi-books';
const LEGACY_FS_DB = 'aogimi-fs';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
          if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE);
          if (!db.objectStoreNames.contains(HANDLES_STORE)) db.createObjectStore(HANDLES_STORE);
        },
      });
      // Best-effort, one-time migration from the legacy split databases. A
      // failure leaves the legacy DBs in place so a later load can retry; the
      // new DB stays usable in the meantime.
      try { await migrateLegacy(db); } catch { /* retry on a future load */ }
      return db;
    })();
  }
  return dbPromise;
}

/**
 * Clear the user's books (metadata + file blobs) — used on account switch so
 * one account's library doesn't leak into the next. The File System Access
 * directory handle is device-scoped and deliberately preserved.
 */
export async function wipeBookDatabase(): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction([META_STORE, FILES_STORE], 'readwrite');
    await Promise.all([
      tx.objectStore(META_STORE).clear(),
      tx.objectStore(FILES_STORE).clear(),
    ]);
    await tx.done;
  } catch {
    /* best-effort */
  }
}

// ── One-time migration from the legacy split databases ──────────────────────

async function migrateLegacy(db: IDBPDatabase): Promise<void> {
  if (typeof indexedDB === 'undefined') return;

  // Skip cleanly once the legacy DBs are gone. Chromium/Safari expose
  // indexedDB.databases(); Firefox doesn't, so it falls through and re-probes
  // each load — the probe is a harmless create+delete of empty DBs.
  if (typeof indexedDB.databases === 'function') {
    try {
      const names = (await indexedDB.databases()).map((d) => d.name);
      if (!names.includes(LEGACY_BOOKS_DB) && !names.includes(LEGACY_FS_DB)) return;
    } catch {
      /* fall through to probe */
    }
  }

  await copyStores(db, LEGACY_BOOKS_DB, [META_STORE, FILES_STORE]);
  await copyStores(db, LEGACY_FS_DB, [HANDLES_STORE]);
  await deleteLegacy();
}

/**
 * Copy every record from a legacy DB's stores into the new DB, record by
 * record so a large `files` store doesn't load entirely into memory. Missing
 * stores (a never-created or already-emptied legacy DB) are skipped, and
 * existing keys are overwritten — so a re-run after an interrupted migration
 * is idempotent.
 */
async function copyStores(
  newDb: IDBPDatabase,
  legacyName: string,
  stores: string[],
): Promise<void> {
  let old: IDBPDatabase | null = null;
  try {
    old = await openDB(legacyName);
    for (const store of stores) {
      if (!old.objectStoreNames.contains(store)) continue;
      const keys = await old.getAllKeys(store);
      for (const key of keys) {
        const value = await old.get(store, key);
        // metadata uses an in-line keyPath ('id'); files/handles use
        // out-of-line keys, so those need the key passed explicitly.
        if (store === META_STORE) await newDb.put(store, value);
        else await newDb.put(store, value, key);
      }
    }
  } catch {
    /* best-effort — leave the legacy DB in place for a later retry */
  } finally {
    old?.close();
  }
}

async function deleteLegacy(): Promise<void> {
  for (const name of [LEGACY_BOOKS_DB, LEGACY_FS_DB]) {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }
}
