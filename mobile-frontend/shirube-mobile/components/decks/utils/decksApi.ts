import { request } from '@/lib/api';
import type { CardRecord, CardState, DeckRecord } from '../types';

// ── Decks ───────────────────────────────────────────────────────────────────

export function fetchUserDecks(userId: number, signal?: AbortSignal): Promise<DeckRecord[]> {
  return request<DeckRecord[]>(`/api/decks/user/${userId}`, { signal });
}

export function fetchDeck(id: string, signal?: AbortSignal): Promise<DeckRecord> {
  return request<DeckRecord>(`/api/decks/${id}`, { signal });
}

export function createDeck(
  userId: number,
  name: string,
  description = '',
): Promise<DeckRecord> {
  return request<DeckRecord>('/api/decks', {
    method: 'POST',
    body: JSON.stringify({ userId, name, description }),
  });
}

export function updateDeck(
  id: string,
  updates: Partial<{ name: string; description: string }>,
): Promise<DeckRecord> {
  return request<DeckRecord>(`/api/decks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteDeck(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/decks/${id}`, { method: 'DELETE' });
}

// ── Cards ───────────────────────────────────────────────────────────────────

export function fetchDeckCards(deckId: string, signal?: AbortSignal): Promise<CardRecord[]> {
  return request<CardRecord[]>(`/api/decks/${deckId}/cards`, { signal });
}

export function createCard(
  deckId: string,
  data: {
    front: string;
    back: string;
    reading?: string;
    notes?: string;
    contextSentence?: string;
  },
): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCard(
  cardId: string,
  updates: Partial<{ front: string; reading: string; back: string; notes: string; state: CardState }>,
): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function reviewCard(cardId: string): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/cards/${cardId}/review`, { method: 'POST' });
}

export function deleteCard(cardId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/decks/cards/${cardId}`, { method: 'DELETE' });
}
