const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Types matching backend responses ─────────────────────────────────────────

export interface DeckRecord {
  id: string;
  user_id: number;
  book_id: string | null;
  name: string;
  description: string;
  created_at: string;
  card_count: number;
}

export interface CardRecord {
  id: string;
  deck_id: string;
  front: string;
  reading: string;
  back: string;
  notes: string;
  state: 'new' | 'learning' | 'mastered';
  reviewed_times: number;
  created_at: string;
}

// ── Deck API ─────────────────────────────────────────────────────────────────

export async function createDeck(params: {
  userId: number;
  name: string;
  description?: string;
  bookId?: string;
}): Promise<DeckRecord> {
  const res = await fetch(`${API}/api/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to create deck');
  return res.json();
}

export async function getUserDecks(userId: number): Promise<DeckRecord[]> {
  const res = await fetch(`${API}/api/decks/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch decks');
  return res.json();
}

export async function getDeck(id: string): Promise<DeckRecord> {
  const res = await fetch(`${API}/api/decks/${id}`);
  if (!res.ok) throw new Error('Deck not found');
  return res.json();
}

export async function updateDeck(
  id: string,
  params: { name?: string; description?: string },
): Promise<DeckRecord> {
  const res = await fetch(`${API}/api/decks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update deck');
  return res.json();
}

export async function deleteDeck(id: string): Promise<void> {
  const res = await fetch(`${API}/api/decks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete deck');
}

// ── Card API ─────────────────────────────────────────────────────────────────

export async function getDeckCards(deckId: string): Promise<CardRecord[]> {
  const res = await fetch(`${API}/api/decks/${deckId}/cards`);
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function createCard(
  deckId: string,
  params: { front: string; back: string; reading?: string; notes?: string },
): Promise<CardRecord> {
  const res = await fetch(`${API}/api/decks/${deckId}/cards`, {
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
  const res = await fetch(`${API}/api/decks/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
}

export async function deleteCard(cardId: string): Promise<void> {
  const res = await fetch(`${API}/api/decks/cards/${cardId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete card');
}

export async function reviewCard(cardId: string): Promise<CardRecord> {
  const res = await fetch(`${API}/api/decks/cards/${cardId}/review`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to record review');
  return res.json();
}
