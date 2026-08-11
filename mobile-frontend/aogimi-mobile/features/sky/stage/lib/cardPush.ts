// Push pending card mutations (create / update / delete) to the
// backend. Mirrors `deckPush.ts` in shape. Best-effort: failures leave
// the entry pending for a later retry.

import * as Crypto from 'expo-crypto';
import { createCard, deleteCard, updateCard } from './decksApi';
import { cardBack } from './cardBack';
import { pushAllByOp } from './syncByOp';
import type { CardDraft, CardState, LocalCard } from '../types';
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

/**
 * Local-first card create. Returns immediately; push fires in background.
 *
 * **Takes a `CardDraft`**, not a loose bag of strings. That matters here more
 * than it does on the web: this is an offline queue, so whatever the draft
 * omits is persisted empty and POSTed empty later, with no second pass that
 * ever fills it in. When the parameter took only `{front, back, reading}`,
 * every card authored on mobile was permanently missing its `jlpt_level` and
 * structured `meanings` — it degraded to the legacy shape rather than failing
 * loudly, which is exactly why it went unnoticed.
 *
 * `back` is derived from the draft rather than passed in, so the stored blob
 * and the structured fields cannot disagree.
 */
export async function createCardLocal(
  deckId: string,
  draft: CardDraft,
  options: { notes?: string } = {},
): Promise<LocalCard> {
  const now = new Date().toISOString();
  const localId = newLocalCardId();
  const back = cardBack(draft);
  const local: LocalCard = {
    id: localId,
    deck_id: deckId,
    front: draft.front,
    reading: draft.reading,
    back,
    notes: options.notes ?? '',
    context_sentence: draft.contextSentence ?? '',
    state: 'new',
    peak_rank: 'new',
    reviewed_times: 0,
    // Snapshots captured from the source dictionary entry at add time. A draft
    // built from a bare selection legitimately has neither — `null` there means
    // "no entry behind this card", which is indistinguishable from "not on any
    // JLPT list" and is meant to be.
    jlpt_level: draft.jlptLevel,
    meanings: draft.meanings,
    // **Null, not a seeded default.** Under FSRS-6 an unreviewed card has no
    // memory state at all — `review()` branches on `stability == null` to take
    // the first-review path, where S0 comes from the grade. The old code seeded
    // 0.30 / 2.0 here to match the pre-027 column defaults; carrying those
    // forward would make every locally-created card look already-reviewed and
    // send it down the subsequent-review formulas from its very first grade.
    difficulty: null,
    stability: null,
    last_outcomes: '',
    last_reviewed_at: null,
    // Null = never reviewed = due now, which is what a fresh card should be.
    next_due_at: null,
    created_at: now,
    syncState: 'pending',
    pendingOp: 'create',
  };
  await setCard(local);
  void pushCard(local);
  return local;
}

/**
 * Local-first card update.
 *
 * Keys here are the **local record's** field names (snake_case), not the POST
 * body's — `pushCard` does that translation. `meanings` and `jlpt_level` are
 * listed explicitly because the merge below is a spread: an unlisted field
 * would still be copied at runtime while the type quietly claimed it couldn't
 * be, which is the sort of accident that survives a typecheck.
 */
export async function updateCardLocal(
  id: string,
  updates: Partial<{
    front: string;
    reading: string;
    back: string;
    notes: string;
    context_sentence: string;
    state: CardState;
    meanings: string[];
    jlpt_level: number | null;
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
        contextSentence: card.context_sentence,
        // camelCase out, snake_case back — see `createCard`.
        jlptLevel: card.jlpt_level,
        meanings: card.meanings,
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
        contextSentence: card.context_sentence,
        state: card.state,
        // Sent so a card that was created offline and edited before its first
        // successful push doesn't lose these on the update path. Note a null
        // `jlptLevel` is a COALESCE no-op server-side, so this can add a tier
        // but never clear one.
        jlptLevel: card.jlpt_level,
        meanings: card.meanings,
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
