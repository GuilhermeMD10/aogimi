import { apiGet, apiSend, apiSendVoid } from '@/lib/api';
import type { CardRecord, DeckRecord } from '../types';

// Feature-local API for decks/cards/reviews. Routed through `lib/api`
// helpers so session-invalidation works uniformly; the file stays
// scoped to the decks domain.

export async function createDeck(params: {
  userId: number;
  name: string;
  description?: string;
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

export async function updateDeck(
  id: string,
  params: { name?: string; description?: string },
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

export async function createCard(
  deckId: string,
  params: { front: string; back: string; reading?: string; notes?: string; contextSentence?: string },
): Promise<CardRecord> {
  return apiSend<CardRecord>(`/api/decks/${deckId}/cards`, 'POST', params);
}

export async function updateCard(
  cardId: string,
  params: { front?: string; reading?: string; back?: string; notes?: string; state?: string },
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
