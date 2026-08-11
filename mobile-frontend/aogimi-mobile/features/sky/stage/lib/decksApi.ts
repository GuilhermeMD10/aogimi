import { request } from '@/lib/api';
import type { CardRecord, CardState, DeckRecord, DeckWithCards } from '../types';

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

/**
 * Every deck the user owns **with its full card inventory**, in one round trip.
 *
 * Two queries server-side (the deck list plus one pooled card query) instead of
 * a per-deck fan-out, which is what makes this the read behind a screen that
 * needs everything at once — the star map, where every card is a star. Same
 * deck rows and order as `fetchUserDecks`; empty decks carry `cards: []`.
 *
 * Unpaginated, bounded by the per-user card quota (`MAX_CARDS_PER_DECK` ×
 * `MAX_DECKS`). Don't reach for this to answer a question about one deck.
 */
export function fetchUserDecksWithCards(
  userId: number,
  signal?: AbortSignal,
): Promise<{ decks: DeckWithCards[] }> {
  return request<{ decks: DeckWithCards[] }>(`/api/decks/user/${userId}/cards`, { signal });
}

// ── Cards ───────────────────────────────────────────────────────────────────

export function fetchDeckCards(deckId: string, signal?: AbortSignal): Promise<CardRecord[]> {
  return request<CardRecord[]>(`/api/decks/${deckId}/cards`, { signal });
}

/**
 * How many cards in this deck are due right now.
 *
 * **A count endpoint, deliberately.** The alternative — fetching the deck's due
 * inventory and reading `.length` — ships every card row across the wire to
 * produce one integer. Due-ness is defined by one shared SQL fragment
 * server-side, so this can't drift from what a session actually serves.
 */
export function fetchDeckDueCount(
  deckId: string,
  signal?: AbortSignal,
): Promise<{ count: number }> {
  return request<{ count: number }>(`/api/decks/${deckId}/cards/due/count`, { signal });
}

/**
 * **Request keys are camelCase; response keys are the raw snake_case columns.**
 * You POST `jlptLevel` and `contextSentence`, and read back `jlpt_level` and
 * `context_sentence`. Card reads are `SELECT *` server-side, so the response is
 * the column list verbatim with no mapping layer to smooth it over.
 *
 * `jlptLevel` must be a JSON **number or null** — the string `"3"` is a 400,
 * deliberately, so a client bug surfaces instead of being coerced away.
 * `meanings` is capped at `MAX_CARD_MEANINGS` entries by both zod and a DB
 * CHECK, and each entry must be non-empty after trim (send a shorter array for
 * fewer meanings, never an `''` placeholder).
 *
 * `back` remains **required** — `meanings` sits beside it, not in place of it.
 * Derive it with `cardBack()` rather than composing it at the call site.
 */
export function createCard(
  deckId: string,
  data: {
    front: string;
    back: string;
    reading?: string;
    notes?: string;
    contextSentence?: string;
    jlptLevel?: number | null;
    meanings?: string[];
  },
): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Note the update path is `COALESCE` server-side, so **`{ jlptLevel: null }` is
 * a no-op, not a clear** — there is no way to unset a tier through this route.
 * `{ meanings: [] }` does clear, because an empty array is not null.
 */
export function updateCard(
  cardId: string,
  updates: Partial<{
    front: string;
    reading: string;
    back: string;
    notes: string;
    contextSentence: string;
    state: CardState;
    jlptLevel: number | null;
    meanings: string[];
  }>,
): Promise<CardRecord> {
  return request<CardRecord>(`/api/decks/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function deleteCard(cardId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/decks/cards/${cardId}`, { method: 'DELETE' });
}
