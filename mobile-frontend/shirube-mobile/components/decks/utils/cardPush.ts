// Push pending card mutations (create / update / delete) to the
// backend. Mirrors `deckPush.ts` in shape. Best-effort: failures leave
// the entry pending for a later retry.

import * as Crypto from 'expo-crypto';
import { createCard, deleteCard, updateCard } from './decksApi';
import { pushAllByOp } from './syncByOp';
import type { CardState, LocalCard } from '../types';
import {
  getCard,
  listPendingCards,
  markCardSynced,
  removeCard,
  setCard,
} from './cardLocalState';

export type CardPushResult =
  | { ok: true; cardId: string }
  | { ok: false; reason: 'rejected' };

export type CardSyncSummary = {
  pushed: string[];
  failed: string[];
};

export function newLocalCardId(): string {
  return Crypto.randomUUID();
}

/** Local-first card create. Returns immediately; push fires in
 *  background. */
export async function createCardLocal(
  deckId: string,
  data: {
    front: string;
    back: string;
    reading?: string;
    notes?: string;
  },
): Promise<LocalCard> {
  const now = new Date().toISOString();
  const localId = newLocalCardId();
  const local: LocalCard = {
    id: localId,
    deck_id: deckId,
    front: data.front,
    reading: data.reading ?? '',
    back: data.back,
    notes: data.notes ?? '',
    state: 'new',
    reviewed_times: 0,
    created_at: now,
    syncState: 'pending',
    pendingOp: 'create',
  };
  await setCard(local);
  void pushCard(local);
  return local;
}

export async function updateCardLocal(
  id: string,
  updates: Partial<{
    front: string;
    reading: string;
    back: string;
    notes: string;
    state: CardState;
  }>,
): Promise<LocalCard | null> {
  const existing = await getCard(id);
  if (!existing) return null;

  // Defense-in-depth: refuse to update a card that's already marked for
  // deletion. Sync order is creates → updates → deletes, so an update
  // here would push first and resurrect the card on the server before
  // the DELETE ran. UI already filters delete-pending cards out of
  // edit surfaces, but if a stale reference somehow reaches this path
  // we bail rather than rewrite the intent.
  if (existing.pendingOp === 'delete') {
    return null;
  }

  const merged: LocalCard = {
    ...existing,
    ...updates,
    syncState: 'pending',
    pendingOp: existing.pendingOp === 'create' ? 'create' : 'update',
  };
  await setCard(merged);
  void pushCard(merged);
  return merged;
}

export async function deleteCardLocal(id: string): Promise<void> {
  const existing = await getCard(id);
  if (!existing) return;

  if (existing.pendingOp === 'create') {
    // Never pushed — just drop locally.
    await removeCard(id);
    return;
  }

  await setCard({ ...existing, syncState: 'pending', pendingOp: 'delete' });
  void pushCard({ ...existing, syncState: 'pending', pendingOp: 'delete' });
}

// ── Push ──────────────────────────────────────────────────────────────────

export async function pushCard(card: LocalCard): Promise<CardPushResult> {
  if (card.syncState !== 'pending') {
    return { ok: true, cardId: card.id };
  }

  try {
    if (card.pendingOp === 'create') {
      const remote = await createCard(card.deck_id, {
        front: card.front,
        reading: card.reading,
        back: card.back,
        notes: card.notes,
      });
      const newId = await markCardSynced(card.id, remote);
      return { ok: true, cardId: newId };
    }

    if (card.pendingOp === 'update') {
      const remote = await updateCard(card.id, {
        front: card.front,
        reading: card.reading,
        back: card.back,
        notes: card.notes,
        state: card.state,
      });
      await markCardSynced(card.id, remote);
      return { ok: true, cardId: card.id };
    }

    if (card.pendingOp === 'delete') {
      await deleteCard(card.id);
      await removeCard(card.id);
      return { ok: true, cardId: card.id };
    }

    return { ok: true, cardId: card.id };
  } catch (err) {
    void err;
    return { ok: false, reason: 'rejected' };
  }
}

/**
 * Walk every pending card and try to push. Ordered creates → updates
 * → deletes for the same reason decks are: a pending update on a
 * pending-create card should resolve in one pass.
 */
export async function pushAllPendingCards(): Promise<CardSyncSummary> {
  const pending = await listPendingCards();
  return pushAllByOp(pending, pushCard);
}
