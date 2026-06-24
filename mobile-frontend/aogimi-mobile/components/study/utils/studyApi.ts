import { request } from '@/lib/api';
import type { CardRecord } from '../../decks/types';
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
 * Submit a review outcome for a single card. The backend applies the
 * algorithm and writes both the updated card and an event row to
 * card_reviews. We also apply the algorithm locally for immediate UI
 * feedback; the two computations match by construction.
 */
export function submitReview(cardId: string, outcome: StudyOutcome): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/cards/${cardId}/review`, {
    method: 'POST',
    body: JSON.stringify({ outcome }),
  });
}
