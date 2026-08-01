import { apiGet, apiSend } from '@/lib/api';
import type { CardRecord } from '../../decks/types';
import type { DueCounts, StudyOutcome, StudySessionConfig } from '../types';

// Backend wires for the study session endpoint. The per-card review
// endpoint lives in decks/utils/decksApi.ts (reviewCard) since it's
// scoped to a card resource — kept there to match the routes file
// layout backend-side.

export async function fetchStudySession(
  config: StudySessionConfig,
  signal?: AbortSignal,
): Promise<{ cards: CardRecord[] }> {
  return apiSend<{ cards: CardRecord[] }>('/api/study/session', 'POST', config, signal);
}

/**
 * How many cards are due, in total and per deck. One request — use this rather
 * than fetching the due inventory to measure its length.
 */
export async function fetchDueCounts(signal?: AbortSignal): Promise<DueCounts> {
  return apiGet<DueCounts>('/api/study/due/counts', signal);
}

/**
 * One random card out of everything due right now, across every deck.
 * `card` is null when nothing is due — a normal state, not an error.
 */
export async function fetchRandomDueCard(
  signal?: AbortSignal,
): Promise<{ card: CardRecord | null }> {
  return apiGet<{ card: CardRecord | null }>('/api/study/due/random', signal);
}

export async function submitReview(
  cardId: string,
  outcome: StudyOutcome,
): Promise<CardRecord> {
  return apiSend<CardRecord>(`/api/decks/cards/${cardId}/review`, 'POST', { outcome });
}
