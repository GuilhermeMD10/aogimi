// AsyncStorage-backed local store for cards. Same shape as
// `deckLocalState`: the UI reads from this store, backend GETs hydrate
// it, writes go local-first then opportunistically push.
//
// Cards reference a deck via `deck_id`. When a card is created against
// a pending (not-yet-synced) deck, `deck_id` holds the deck's local
// UUID. After the deck pushes and gets a real backend id, callers must
// invoke `rewriteDeckId` here so the card carries the correct foreign
// key on its own subsequent push.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CardRecord, LocalCard, PendingOp, SyncState } from '../types';

const KEY = 'card_local_state_v1';

type CardMap = Record<string, LocalCard>;

async function readMap(): Promise<CardMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as CardMap) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: CardMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* best-effort */
  }
}

// ── Reads ──────────────────────────────────────────────────────────────────

export async function getAllCards(): Promise<LocalCard[]> {
  const map = await readMap();
  return Object.values(map);
}

export async function getCardsByDeckId(deckId: string): Promise<LocalCard[]> {
  const all = await getAllCards();
  return all.filter((c) => c.deck_id === deckId);
}

export async function getCard(id: string): Promise<LocalCard | null> {
  const map = await readMap();
  return map[id] ?? null;
}

export async function listPendingCards(): Promise<LocalCard[]> {
  const all = await getAllCards();
  return all.filter((c) => c.syncState === 'pending');
}

// ── Writes ─────────────────────────────────────────────────────────────────

export async function setCard(card: LocalCard): Promise<void> {
  const map = await readMap();
  map[card.id] = card;
  await writeMap(map);
}

export async function removeCard(id: string): Promise<void> {
  const map = await readMap();
  if (!(id in map)) return;
  delete map[id];
  await writeMap(map);
}

export async function markCardPending(id: string, op: PendingOp): Promise<void> {
  const map = await readMap();
  const existing = map[id];
  if (!existing) return;
  map[id] = { ...existing, syncState: 'pending', pendingOp: op };
  await writeMap(map);
}

export async function markCardSynced(
  localId: string,
  backendCard: CardRecord,
): Promise<string> {
  const map = await readMap();
  delete map[localId];
  map[backendCard.id] = {
    ...backendCard,
    syncState: 'synced',
    pendingOp: undefined,
  };
  await writeMap(map);
  return backendCard.id;
}

/**
 * Rewrite every card's `deck_id` from `oldDeckId` → `newDeckId`. Used
 * immediately after a pending deck create succeeds and the deck moves
 * from its client-side UUID to the backend's real id. Cards keep their
 * own ids; only the foreign key is updated.
 */
export async function rewriteDeckId(
  oldDeckId: string,
  newDeckId: string,
): Promise<void> {
  if (oldDeckId === newDeckId) return;
  const map = await readMap();
  let touched = false;
  for (const card of Object.values(map)) {
    if (card.deck_id === oldDeckId) {
      card.deck_id = newDeckId;
      touched = true;
    }
  }
  if (touched) await writeMap(map);
}

/**
 * Merge a fresh backend card list (scoped to a single deck) into the
 * local store. Same rules as `hydrateFromBackend` on decks: synced &
 * missing entries get overwritten with remote shape; pending entries
 * stay; local-synced entries not in the remote list get dropped.
 *
 * Scoped to one `deckId` because cards are fetched per-deck — we must
 * NOT delete cards in other decks when only one deck's list arrived.
 */
export async function hydrateFromBackend(
  deckId: string,
  remote: CardRecord[],
): Promise<void> {
  const map = await readMap();
  const remoteIds = new Set(remote.map((r) => r.id));

  for (const r of remote) {
    const local = map[r.id];
    if (!local || local.syncState === 'synced') {
      map[r.id] = { ...r, syncState: 'synced', pendingOp: undefined };
    }
  }

  for (const [id, local] of Object.entries(map)) {
    if (
      local.deck_id === deckId &&
      local.syncState === 'synced' &&
      !remoteIds.has(id)
    ) {
      delete map[id];
    }
  }

  await writeMap(map);
}

export async function clearAllCards(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

export function effectiveCardSyncState(card: LocalCard): SyncState {
  return card.syncState ?? 'synced';
}
