// Storage layer for the per-book local sync state on mobile.
//
// Replaces the older `lib/storage/bookFingerprints.ts` module. Same
// underlying AsyncStorage key (`book_fingerprints_v1`) so existing
// data on devices upgrading from the old shape is not invalidated —
// the new shape only adds optional fields (`syncState`,
// `pendingPayload`) which existing readers treat as defaults.
//
// All functions are best-effort: on AsyncStorage failure they fall
// back to safe values (null reads, no-op writes) rather than throwing.
//
// This module is the ONLY place that reads/writes the storage key.
// Callers should go through `lib/sync/index.ts` re-exports.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAsyncJsonStore } from '@/lib/storage';
import type { LocalBookEntry, PendingPayload, SyncState } from '../types';

const KEY = 'book_fingerprints_v1';

type EntryMap = Record<string, LocalBookEntry>;

const store = makeAsyncJsonStore<EntryMap>(KEY);
const readMap = store.read;
const writeMap = store.write;

// ── Direct accessors ───────────────────────────────────────────────────────

export async function getEntry(filename: string): Promise<LocalBookEntry | null> {
  const map = await readMap();
  return map[filename] ?? null;
}

export async function getStoredFileHash(filename: string): Promise<string | null> {
  const entry = await getEntry(filename);
  return entry?.fileHash ?? null;
}

/**
 * Read the entire local-sync map in one AsyncStorage round-trip. Used
 * by reconcile + library merge paths where iterating per-book would
 * otherwise re-parse the JSON dozens of times.
 */
export async function readAllEntries(): Promise<EntryMap> {
  return readMap();
}

// ── Mutators ───────────────────────────────────────────────────────────────

/**
 * Convenience for the common "set fingerprint, mark synced" path used
 * by locate flows (file was already on the backend). Preserves any
 * existing `pendingPayload` (it's a no-op on the synced state machine
 * but doesn't actively delete it — call `markSynced` for that).
 */
export async function setStoredFileHash(
  filename: string,
  fileHash: string,
): Promise<void> {
  const map = await readMap();
  const prev = map[filename] ?? { fileHash: '' };
  map[filename] = { ...prev, fileHash };
  await writeMap(map);
}

/**
 * Move a book into the `pending` state with a metadata snapshot the
 * push pass can later POST to the backend.
 */
export async function markPending(
  filename: string,
  fileHash: string,
  pendingPayload: PendingPayload,
): Promise<void> {
  const map = await readMap();
  map[filename] = { fileHash, syncState: 'pending', pendingPayload };
  await writeMap(map);
}

/**
 * Flip a book to `synced` and drop the metadata snapshot — its job
 * (carrying enough data to retry the POST) is over now that the backend
 * has the row.
 */
export async function markSynced(filename: string): Promise<void> {
  const map = await readMap();
  const prev = map[filename];
  if (!prev) return;
  // Strip pendingPayload by destructuring it out.
  const { pendingPayload: _payload, ...rest } = prev;
  map[filename] = { ...rest, syncState: 'synced' };
  await writeMap(map);
}

export async function removeEntry(filename: string): Promise<void> {
  const map = await readMap();
  if (filename in map) {
    delete map[filename];
    await writeMap(map);
  }
}

/**
 * Drop the entire map. Called by `wipeUserData` on account switch so
 * the next account's imports don't compare against a previous user's
 * fingerprints.
 */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

// ── Convenience predicates ─────────────────────────────────────────────────

/**
 * Treat absent `syncState` as `'synced'` for legacy entries that
 * pre-date the marker. They came from imports that successfully pushed
 * before the marker existed.
 */
export function effectiveSyncState(entry: LocalBookEntry): SyncState {
  return entry.syncState ?? 'synced';
}
