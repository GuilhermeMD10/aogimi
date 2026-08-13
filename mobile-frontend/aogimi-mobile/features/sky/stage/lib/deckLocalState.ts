// AsyncStorage-backed local store for decks. Local-first model:
// the UI reads from this store; backend GETs hydrate it; writes go
// here first and then opportunistically push to backend.
//
// Shape: Record<id, LocalDeck>. Pending creates use a UUID generated
// client-side; once the backend create succeeds the entry is rewritten
// under the real backend id so card references can be patched.
//
// This is the ONLY place that reads/writes the storage key.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAsyncJsonStore } from '@/lib/storage';
import type { DeckRecord, LocalDeck } from '../types';

const KEY = 'deck_local_state_v1';

type DeckMap = Record<string, LocalDeck>;

const store = makeAsyncJsonStore<DeckMap>(KEY);
const readMap = store.read;
const writeMap = store.write;

// ── Reads ──────────────────────────────────────────────────────────────────

export async function getAllDecks(): Promise<LocalDeck[]> {
  const map = await readMap();
  return Object.values(map);
}

export async function getDeck(id: string): Promise<LocalDeck | null> {
  const map = await readMap();
  return map[id] ?? null;
}

export async function listPendingDecks(): Promise<LocalDeck[]> {
  const all = await getAllDecks();
  return all.filter((d) => d.syncState === 'pending');
}

// ── Writes ─────────────────────────────────────────────────────────────────

/** Insert or fully replace a deck entry. */
export async function setDeck(deck: LocalDeck): Promise<void> {
  const map = await readMap();
  map[deck.id] = deck;
  await writeMap(map);
}

/** Hard-remove from the store. Used after a successful pending-delete
 *  push, or when reconcile detects a backend-side deletion. */
export async function removeDeck(id: string): Promise<void> {
  const map = await readMap();
  if (!(id in map)) return;
  delete map[id];
  await writeMap(map);
}

/** Mark a deck as synced after a successful push. If `replacementId`
 *  is provided (returned by the backend on create), the entry is
 *  re-keyed under it and the new record (with backend timestamps)
 *  takes effect. Returns the new id for the caller to rewrite card
 *  foreign keys. */
export async function markDeckSynced(
  localId: string,
  backendDeck: DeckRecord,
): Promise<string> {
  const map = await readMap();
  // Remove the old entry (whether the id changed or not) so we don't
  // leave a duplicate when the local UUID differs from the backend id.
  delete map[localId];
  map[backendDeck.id] = {
    ...backendDeck,
    syncState: 'synced',
    pendingOp: undefined,
  };
  await writeMap(map);
  return backendDeck.id;
}

/**
 * Merge a fresh backend list into the local store without trampling
 * pending writes:
 *   - For each remote deck: if local copy is 'synced' (or missing),
 *     overwrite with the remote shape. If local copy is 'pending',
 *     leave it alone (the local edit is newer until pushed).
 *   - For local 'synced' decks NOT in the remote list: remove them
 *     (the backend says they don't exist anymore — likely deleted on
 *     another device). Pending-delete entries stay until pushed.
 *
 * Caller should only invoke this when the backend GET *succeeded* —
 * a network failure must not look like a server-side wipe.
 */
export async function hydrateFromBackend(remote: DeckRecord[]): Promise<void> {
  const map = await readMap();
  const remoteIds = new Set(remote.map((r) => r.id));

  for (const r of remote) {
    const local = map[r.id];
    if (!local || local.syncState === 'synced') {
      map[r.id] = { ...r, syncState: 'synced', pendingOp: undefined };
    }
    // 'pending' → leave alone
  }

  for (const [id, local] of Object.entries(map)) {
    if (local.syncState === 'synced' && !remoteIds.has(id)) {
      delete map[id];
    }
  }

  await writeMap(map);
}

export async function clearAllDecks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

