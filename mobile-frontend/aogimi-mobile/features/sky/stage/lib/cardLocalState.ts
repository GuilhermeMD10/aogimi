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
import { makeAsyncJsonStore } from '@/lib/storage';
import type { CardRecord, LocalCard, SyncState } from '../types';

const KEY = 'card_local_state_v1';

type CardMap = Record<string, LocalCard>;

const store = makeAsyncJsonStore<CardMap>(KEY);
const readMap = store.read;
const writeMap = store.write;

// ── Reads ──────────────────────────────────────────────────────────────────

export async function getAllCards(): Promise<LocalCard[]> {
  const map = await readMap();
  return Object.values(map);
}

export async function getCardsByDeckId(deckId: string): Promise<LocalCard[]> {
  const all = await getAllCards();
  return all.filter((c) => c.deck_id === deckId);
}

/**
 * Visible card count for a deck — same filter the deck-detail page
 * applies (excludes soft-deleted cards). Used by the decks list so
 * the count it shows matches what the detail page would render.
 */
export async function getDeckCardCount(deckId: string): Promise<number> {
  const cards = await getCardsByDeckId(deckId);
  return cards.filter((c) => c.pendingOp !== 'delete').length;
}

export type DeckCardStats = {
  total: number;
  new: number;
  met: number;
  learned: number;
  mastered: number;
};

const EMPTY_STATS: DeckCardStats = { total: 0, new: 0, met: 0, learned: 0, mastered: 0 };

/**
 * Per-state breakdown for a deck. Drives the small state-counts row
 * shown on the deck tile + detail page. Excludes delete-pending cards
 * (same filter as `getDeckCardCount`).
 */
export async function getDeckCardStats(deckId: string): Promise<DeckCardStats> {
  const cards = await getCardsByDeckId(deckId);
  return cards.reduce<DeckCardStats>((acc, c) => {
    if (c.pendingOp === 'delete') return acc;
    acc.total += 1;
    if (c.state === 'new') acc.new += 1;
    else if (c.state === 'met') acc.met += 1;
    else if (c.state === 'learned') acc.learned += 1;
    else if (c.state === 'mastered') acc.mastered += 1;
    return acc;
  }, { ...EMPTY_STATS });
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

/**
 * Apply an SRS outcome to a card's local state without touching its
 * `syncState`/`pendingOp` — review submission is a separate sync
 * concern from the regular create/update/delete push path. Returns
 * the merged card, or null if the card isn't in the local store.
 */
export async function applyLocalReview(
  cardId: string,
  srsUpdate: {
    difficulty: number | null;
    stability: number | null;
    last_outcomes: string;
    /** Non-null in practice on every call — a review sets it — but typed as the
     *  SRS layer produces it rather than narrowed at the call site. */
    last_reviewed_at: string | null;
    /** Server-authoritative in principle, but written here too: an offline
     *  session has no server to ask, and the next session's due filter reads
     *  this. A later sync overwrites it with the backend's value. */
    next_due_at: string | null;
    state: CardRecord['state'];
    /** High-water mark — only ever climbs. Passed in rather than recomputed
     *  because `applyOutcome` already resolved it against the prior peak. */
    peak_rank: CardRecord['state'];
  },
): Promise<LocalCard | null> {
  const map = await readMap();
  const existing = map[cardId];
  if (!existing) return null;
  const merged: LocalCard = {
    ...existing,
    ...srsUpdate,
    reviewed_times: existing.reviewed_times + 1,
  };
  map[cardId] = merged;
  await writeMap(map);
  return merged;
}

/**
 * Revert a card's local SRS state to a known-prior snapshot. Used by
 * the in-session Undo button — we keep the previous values in memory
 * and write them back if the user reverses a review tap.
 */
export async function revertLocalReview(
  cardId: string,
  prior: {
    difficulty: number | null;
    stability: number | null;
    last_outcomes: string;
    last_reviewed_at: string | null;
    next_due_at: string | null;
    state: CardRecord['state'];
    peak_rank: CardRecord['state'];
    reviewed_times: number;
  },
): Promise<LocalCard | null> {
  const map = await readMap();
  const existing = map[cardId];
  if (!existing) return null;
  const merged: LocalCard = { ...existing, ...prior };
  map[cardId] = merged;
  await writeMap(map);
  return merged;
}

export async function clearAllCards(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}

