// AsyncStorage queue of graded reviews the backend hasn't confirmed yet.
//
// Every grade that counted (`applyOutcome` → `applied`) is appended here
// BEFORE any network call, with the moment it happened and a client-minted
// id. `reviewPush` drains it: immediately when online, otherwise on Sync-now
// or the next reconnect. The server schedules each event by `reviewedAt`,
// not by arrival, and treats a repeated `clientReviewId` as a no-op — so a
// half-failed drain is simply retried.
//
// Storage only. The network half is `reviewPush.ts`; the split mirrors
// `cardLocalState` / `cardPush`.

import * as Crypto from 'expo-crypto';
import { makeAsyncJsonStore } from '@/lib/storage';
import type { StudyOutcome } from '../types';

const KEY = 'pending_reviews_v1';

export type PendingReview = {
  clientReviewId: string;
  cardId: string;
  outcome: StudyOutcome;
  /** ISO — when the card was graded on this device. */
  reviewedAt: string;
};

// Keyed by clientReviewId; order is recovered by `reviewedAt` on read.
type ReviewMap = Record<string, PendingReview>;

const store = makeAsyncJsonStore<ReviewMap>(KEY);

export function newClientReviewId(): string {
  return Crypto.randomUUID();
}

export async function enqueueReview(review: PendingReview): Promise<void> {
  const map = await store.read();
  map[review.clientReviewId] = review;
  await store.write(map);
}

export async function removeReview(clientReviewId: string): Promise<void> {
  const map = await store.read();
  if (!(clientReviewId in map)) return;
  delete map[clientReviewId];
  await store.write(map);
}

/** Oldest grade first — the order the server should see them in. */
export async function listPendingReviews(): Promise<PendingReview[]> {
  const map = await store.read();
  return Object.values(map).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
}

/** Cards with a grade the backend hasn't seen. A hydrate must not paint the
 *  backend's older state over these. */
export async function pendingReviewCardIds(): Promise<Set<string>> {
  const map = await store.read();
  return new Set(Object.values(map).map((r) => r.cardId));
}

/**
 * A card created offline is queued under its local uuid; once its create
 * pushes and the backend hands back a real id, the grades made against it
 * have to follow. Called from `cardPush` right after `markCardSynced`.
 */
export async function rewriteReviewCardId(oldCardId: string, newCardId: string): Promise<void> {
  if (oldCardId === newCardId) return;
  const map = await store.read();
  let touched = false;
  for (const review of Object.values(map)) {
    if (review.cardId === oldCardId) {
      review.cardId = newCardId;
      touched = true;
    }
  }
  if (touched) await store.write(map);
}

export async function clearAllPendingReviews(): Promise<void> {
  await store.write({});
}
