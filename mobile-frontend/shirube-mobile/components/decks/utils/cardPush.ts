// Push pending card mutations (create / update / delete) to the
// backend. Mirrors `deckPush.ts` in shape. Best-effort: failures leave
// the entry pending for a later retry.

import * as Crypto from 'expo-crypto';
import { createCard, deleteCard, updateCard } from './decksApi';
import type { CardRecord, CardState, LocalCard } from '../types';
import {
  getCard,
  listPendingCards,
  markCardSynced,
  removeCard,
  setCard,
} from './cardLocalState';

export type CardPushResult =
  | { ok: true; cardId: string; previousId: string }
  | { ok: false; reason: 'rejected' | 'network'; previousId: string };

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
    return { ok: true, cardId: card.id, previousId: card.id };
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
      return { ok: true, cardId: newId, previousId: card.id };
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
      return { ok: true, cardId: card.id, previousId: card.id };
    }

    if (card.pendingOp === 'delete') {
      await deleteCard(card.id);
      await removeCard(card.id);
      return { ok: true, cardId: card.id, previousId: card.id };
    }

    return { ok: true, cardId: card.id, previousId: card.id };
  } catch (err) {
    void err;
    return { ok: false, reason: 'rejected', previousId: card.id };
  }
}

/**
 * Walk every pending card and try to push. Ordered creates → updates
 * → deletes for the same reason decks are: a pending update on a
 * pending-create card should resolve in one pass.
 */
export async function pushAllPendingCards(): Promise<CardSyncSummary> {
  const summary: CardSyncSummary = { pushed: [], failed: [] };
  const pending = await listPendingCards();

  const byOp = (op: LocalCard['pendingOp']) =>
    pending.filter((c) => c.pendingOp === op);

  for (const c of byOp('create')) {
    const result = await pushCard(c);
    if (result.ok) summary.pushed.push(c.id);
    else summary.failed.push(c.id);
  }

  for (const c of byOp('update')) {
    const result = await pushCard(c);
    if (result.ok) summary.pushed.push(c.id);
    else summary.failed.push(c.id);
  }

  for (const c of byOp('delete')) {
    const result = await pushCard(c);
    if (result.ok) summary.pushed.push(c.id);
    else summary.failed.push(c.id);
  }

  return summary;
}
