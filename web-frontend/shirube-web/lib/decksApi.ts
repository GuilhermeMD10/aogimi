import { API_URL } from './api';
import type { CardRecord, DeckRecord } from '@/lib/types';

export async function createDeck(params: {
  userId: number;
  name: string;
  description?: string;
  bookId?: string;
}): Promise<DeckRecord> {
  const res = await fetch(`${API_URL}/api/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create deck');
  return res.json();
}

export async function getUserDecks(userId: number, signal?: AbortSignal): Promise<DeckRecord[]> {
  const res = await fetch(`${API_URL}/api/decks/user/${userId}`, { signal });
  if (!res.ok) throw new Error('Failed to fetch decks');
  return res.json();
}

export async function getDeck(id: string, signal?: AbortSignal): Promise<DeckRecord> {
  const res = await fetch(`${API_URL}/api/decks/${id}`, { signal });
  if (!res.ok) throw new Error('Deck not found');
  return res.json();
}

export async function updateDeck(
  id: string,
  params: { name?: string; description?: string },
): Promise<DeckRecord> {
  const res = await fetch(`${API_URL}/api/decks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update deck');
  return res.json();
}

export async function deleteDeck(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/decks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete deck');
}

export async function getDeckCards(deckId: string, signal?: AbortSignal): Promise<CardRecord[]> {
  const res = await fetch(`${API_URL}/api/decks/${deckId}/cards`, { signal });
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function createCard(
  deckId: string,
  params: { front: string; back: string; reading?: string; notes?: string; contextSentence?: string },
): Promise<CardRecord> {
  const res = await fetch(`${API_URL}/api/decks/${deckId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create card');
  return res.json();
}

export async function updateCard(
  cardId: string,
  params: { front?: string; reading?: string; back?: string; notes?: string; state?: string },
): Promise<CardRecord> {
  const res = await fetch(`${API_URL}/api/decks/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
}

export async function deleteCard(cardId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/decks/cards/${cardId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete card');
}

export async function reviewCard(cardId: string): Promise<CardRecord> {
  const res = await fetch(`${API_URL}/api/decks/cards/${cardId}/review`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to record review');
  return res.json();
}
