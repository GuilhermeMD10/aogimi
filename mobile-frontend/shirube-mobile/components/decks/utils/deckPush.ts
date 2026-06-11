// Push pending deck mutations (create / update / delete) to the
// backend. Best-effort: any failure leaves the entry in 'pending' for
// a later retry. No exceptions bubble out of these helpers.
//
// On a successful create, the local entry is re-keyed from its
// client-side UUID to the backend's real id; callers should then
// `rewriteDeckId` on the card store so cards referencing this deck
// keep their foreign key in sync.

import * as Crypto from 'expo-crypto';
import { createDeck, deleteDeck, updateDeck } from './decksApi';
import type { LocalDeck } from '../types';
import {
  getDeck,
  listPendingDecks,
  markDeckSynced,
  removeDeck,
  setDeck,
} from './deckLocalState';
import { rewriteDeckId } from './cardLocalState';
import { pushAllByOp } from './syncByOp';

export type DeckPushResult =
  | { ok: true; deckId: string }
  | { ok: false; reason: 'rejected' };

export type DeckSyncSummary = {
  pushed: string[];
  failed: string[];
};

/**
 * Mint a client-side deck id. UUIDs avoid clashes with backend ids and
 * survive being keyed by themselves in the local store.
 */
export function newLocalDeckId(): string {
  return Crypto.randomUUID();
}

/**
 * Local-first deck create. Returns the local deck immediately, then
 * fires the push in the background. On push success the entry is
 * re-keyed under the backend id; on failure it stays 'pending'.
 *
 * Returns the LocalDeck (with the client-side id) so the caller can
 * navigate immediately — the id may be replaced later by the push
 * outcome, but for navigation purposes the local id works because the
 * local store is the canonical UI source.
 */
export async function createDeckLocal(
  userId: number,
  name: string,
  description: string,
): Promise<LocalDeck> {
  const now = new Date().toISOString();
  const localId = newLocalDeckId();
  const local: LocalDeck = {
    id: localId,
    user_id: userId,
    name,
    description,
    created_at: now,
    syncState: 'pending',
    pendingOp: 'create',
  };
  await setDeck(local);

  // Fire-and-forget push. Caller doesn't await — the deck is
  // immediately visible from the local store.
  void pushDeck(local);

  return local;
}

/** Local-first deck update. Marks pending and tries to push. */
export async function updateDeckLocal(
  id: string,
  updates: Partial<{ name: string; description: string }>,
): Promise<LocalDeck | null> {
  const existing = await getDeck(id);
  if (!existing) return null;

  // Same guard as updateCardLocal — refuse to rewrite a pending-delete
  // into a pending-update, which would resurrect the row on the server.
  if (existing.pendingOp === 'delete') {
    return null;
  }

  const merged: LocalDeck = {
    ...existing,
    ...updates,
    // If this was a brand-new pending create, keep `pendingOp: 'create'`
    // — the push will POST the merged shape. Otherwise downgrade to
    // 'update'.
    syncState: 'pending',
    pendingOp: existing.pendingOp === 'create' ? 'create' : 'update',
  };
  await setDeck(merged);

  void pushDeck(merged);
  return merged;
}

/**
 * Local-first deck delete. If the deck was never pushed (pending
 * create), drop it from the local store outright — no DELETE to send.
 * Otherwise mark `pendingOp: 'delete'` and try to push.
 */
export async function deleteDeckLocal(id: string): Promise<void> {
  const existing = await getDeck(id);
  if (!existing) return;

  if (existing.pendingOp === 'create') {
    await removeDeck(id);
    return;
  }

  await setDeck({ ...existing, syncState: 'pending', pendingOp: 'delete' });
  void pushDeck({ ...existing, syncState: 'pending', pendingOp: 'delete' });
}

// ── Push ──────────────────────────────────────────────────────────────────

/**
 * Push a single pending deck. Branches on `pendingOp`. On success,
 * mutates the local store accordingly. No exceptions bubble out — the
 * return discriminates outcomes.
 */
export async function pushDeck(deck: LocalDeck): Promise<DeckPushResult> {
  if (deck.syncState !== 'pending') {
    return { ok: true, deckId: deck.id };
  }

  try {
    if (deck.pendingOp === 'create') {
      const remote = await createDeck(deck.user_id, deck.name, deck.description);
      const newId = await markDeckSynced(deck.id, remote);
      // Patch every card's deck_id reference. Cheap to do here so
      // callers don't have to remember.
      await rewriteDeckId(deck.id, newId);
      return { ok: true, deckId: newId };
    }

    if (deck.pendingOp === 'update') {
      const remote = await updateDeck(deck.id, {
        name: deck.name,
        description: deck.description,
      });
      await markDeckSynced(deck.id, remote);
      return { ok: true, deckId: deck.id };
    }

    if (deck.pendingOp === 'delete') {
      await deleteDeck(deck.id);
      await removeDeck(deck.id);
      return { ok: true, deckId: deck.id };
    }

    // No pendingOp on a 'pending' record — treat as already synced.
    return { ok: true, deckId: deck.id };
  } catch (err) {
    // 4xx (rejected by backend) vs network error — the difference
    // matters less here than for books; we surface both as "stays
    // pending" and let the user retry via Sync-now.
    void err;
    return { ok: false, reason: 'rejected' };
  }
}

/**
 * Walk every pending deck and try to push. Returns a summary the UI
 * can use to report progress. Order: creates → updates → deletes, so
 * that any cards waiting on a freshly-created deck's backend id have
 * the id available before they push.
 */
export async function pushAllPendingDecks(): Promise<DeckSyncSummary> {
  const pending = await listPendingDecks();
  return pushAllByOp(pending, pushDeck);
}
