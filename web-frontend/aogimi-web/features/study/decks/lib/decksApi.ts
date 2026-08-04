import { apiGet, apiSend, apiSendVoid } from '@/lib/api';
import type { CardRecord, DeckRecord, DeckWithCards } from '../types';

// Feature-local API for decks/cards/reviews. Routed through `lib/api`
// helpers so session-invalidation works uniformly; the file stays
// scoped to the decks domain.

export async function createDeck(params: {
  userId: number;
  name: string;
  bookId?: string;
}): Promise<DeckRecord> {
  return apiSend<DeckRecord>('/api/decks', 'POST', params);
}

export async function getUserDecks(
  userId: number,
  signal?: AbortSignal,
): Promise<DeckRecord[]> {
  return apiGet<DeckRecord[]>(`/api/decks/user/${userId}`, signal);
}

export async function getDeck(id: string, signal?: AbortSignal): Promise<DeckRecord> {
  return apiGet<DeckRecord>(`/api/decks/${id}`, signal);
}

/**
 * Every deck with its full card inventory, one round trip — the sky page's mount query, where
 * each card is a star and a per-deck fan-out would be one request per deck. Don't reach for this
 * to read a count or one deck's cards; the narrower endpoints above exist for exactly that.
 */
export async function getUserDecksWithCards(
  userId: number,
  signal?: AbortSignal,
): Promise<DeckWithCards[]> {
  const { decks } = await apiGet<{ decks: DeckWithCards[] }>(
    `/api/decks/user/${userId}/cards`,
    signal,
  );
  return decks;
}

export async function updateDeck(
  id: string,
  params: { name?: string },
): Promise<DeckRecord> {
  return apiSend<DeckRecord>(`/api/decks/${id}`, 'PUT', params);
}

export async function deleteDeck(id: string): Promise<void> {
  return apiSendVoid(`/api/decks/${id}`, 'DELETE');
}

export async function getDeckCards(
  deckId: string,
  signal?: AbortSignal,
): Promise<CardRecord[]> {
  return apiGet<CardRecord[]>(`/api/decks/${deckId}/cards`, signal);
}

/** How many cards are due in this deck. Counted server-side — don't fetch the
 *  due list to read `.length`. */
export async function getDueDeckCardCount(
  deckId: string,
  signal?: AbortSignal,
): Promise<number> {
  const { count } = await apiGet<{ count: number }>(
    `/api/decks/${deckId}/cards/due/count`,
    signal,
  );
  return count;
}

/**
 * Body keys are camelCase where the column is snake_case (`contextSentence`,
 * `jlptLevel`) — that's the established convention for this endpoint, and the
 * *response* stays snake_case `CardRecord`. `CardDraft` is named to match, so
 * the usual call is `{ ...draft, back: cardBack(draft) }`.
 */
export async function createCard(
  deckId: string,
  params: {
    front: string;
    back: string;
    reading?: string;
    notes?: string;
    contextSentence?: string;
    meanings?: string[];
    jlptLevel?: number | null;
  },
): Promise<CardRecord> {
  return apiSend<CardRecord>(`/api/decks/${deckId}/cards`, 'POST', params);
}

export async function updateCard(
  cardId: string,
  params: {
    front?: string;
    reading?: string;
    back?: string;
    notes?: string;
    state?: string;
    contextSentence?: string;
    meanings?: string[];
    jlptLevel?: number | null;
  },
): Promise<CardRecord> {
  return apiSend<CardRecord>(`/api/decks/cards/${cardId}`, 'PUT', params);
}

export async function deleteCard(cardId: string): Promise<void> {
  return apiSendVoid(`/api/decks/cards/${cardId}`, 'DELETE');
}

export async function reviewCard(
  cardId: string,
  outcome: 'again' | 'hard' | 'easy',
): Promise<CardRecord> {
  return apiSend<CardRecord>(`/api/decks/cards/${cardId}/review`, 'POST', { outcome });
}
