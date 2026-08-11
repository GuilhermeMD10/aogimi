import { request } from '@/lib/api';
import type { CardRecord } from '../../stage/types';
import type { StudyOutcome, StudySessionConfig } from '../types';

/**
 * Resolve a study session on the backend. Returns the cards already
 * sorted in display order. Throws on auth failure or 5xx; callers fall
 * back to local ordering.
 */
export function fetchStudySession(
  config: StudySessionConfig,
  signal?: AbortSignal,
): Promise<{ cards: CardRecord[] }> {
  return request<{ cards: CardRecord[] }>('/api/study/session', {
    method: 'POST',
    body: JSON.stringify(config),
    signal,
  });
}

/**
 * Due counts across every deck, without the card rows.
 *
 * `byDeck` **omits decks with nothing due** — it is not a complete deck map, so
 * read it as `byDeck[id] ?? 0` rather than assuming a key exists. `total` is
 * the sum across all decks, not the number of keys.
 *
 * Prefer this over counting a fetched inventory: due-ness is one shared SQL
 * fragment server-side, and asking for the rows to count them ships the whole
 * card table to produce a handful of integers.
 */
export function fetchDueCounts(
  signal?: AbortSignal,
): Promise<{ total: number; byDeck: Record<string, number> }> {
  return request<{ total: number; byDeck: Record<string, number> }>('/api/study/due/counts', {
    signal,
  });
}

/**
 * Submit a review outcome for a single card. The backend applies the
 * algorithm and writes both the updated card and an event row to
 * card_reviews. We also apply the algorithm locally for immediate UI
 * feedback; the two computations match by construction.
 *
 * **A review of a card that isn't due returns the card unchanged, with a 200.**
 * `applyOutcome` runs the same check client-side and skips this call entirely
 * in that case, so reaching here normally means the grade counted.
 */
export function submitReview(cardId: string, outcome: StudyOutcome): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/cards/${cardId}/review`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}
