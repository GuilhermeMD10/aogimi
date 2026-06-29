import { apiSend } from '@/lib/api';
import type { CardRecord } from '../../decks/types';
import type { StudyOutcome, StudySessionConfig } from '../types';

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

export async function submitReview(
  cardId: string,
  outcome: StudyOutcome,
): Promise<CardRecord> {
  return apiSend<CardRecord>(`/api/decks/cards/${cardId}/review`, 'POST', { outcome });
}
