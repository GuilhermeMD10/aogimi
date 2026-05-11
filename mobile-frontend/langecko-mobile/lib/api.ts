import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  BookProgressUpdate,
  BookRecord,
  CardRecord,
  CardState,
  DeckRecord,
  SearchResponse,
  UserProfile,
  UserProfileUpdate,
  UserPublic,
  WordDetails,
} from './types';

// Resolution order:
//   1. EXPO_PUBLIC_API_URL  — explicit dev override (use this for physical
//      devices: set it to your Mac's LAN IP, e.g. http://192.168.x.y:3000).
//   2. expoConfig.extra.apiUrl — overrideable from app.json/eas.json.
//   3. Platform default:
//        - Android emulator → http://10.0.2.2:3000 (special alias that
//          routes to the host's localhost; the emulator's `localhost`
//          points to itself, which is why a plain localhost URL fails).
//        - iOS sim / web / native macOS → http://localhost:3000.
function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromConfig) return fromConfig;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE = resolveApiBase();

// ── Core request helper ─────────────────────────────────────────────────────

type RequestInit = Parameters<typeof fetch>[1];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

// ── Dictionary / translate ──────────────────────────────────────────────────

export function queryDictionary(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  return request<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`, { signal });
}

export function fetchWordDetails(id: string | number, signal?: AbortSignal): Promise<WordDetails> {
  return request<WordDetails>(`/api/words/${encodeURIComponent(String(id))}/details`, { signal });
}

export type TranslationResult = { translatedText: string; detectedLanguage: string };

export function translateText(
  text: string,
  options: { target?: string; signal?: AbortSignal } = {},
): Promise<TranslationResult> {
  return request<TranslationResult>('/api/translate', {
    method: 'POST',
    body: JSON.stringify(options.target ? { text, target: options.target } : { text }),
    signal: options.signal,
  });
}

// ── Users ───────────────────────────────────────────────────────────────────

export function createUser(username: string, password: string): Promise<UserPublic> {
  return request<UserPublic>('/api/user/create', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function fetchUserInfo(username: string, password: string): Promise<UserProfile> {
  return request<UserProfile>('/api/user/info', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function updateUserProfile(
  username: string,
  password: string,
  updates: UserProfileUpdate,
): Promise<UserProfile> {
  return request<UserProfile>('/api/user/update', {
    method: 'POST',
    body: JSON.stringify({ username, password, updates }),
  });
}

// ── Books (book_progress) ───────────────────────────────────────────────────

export function fetchUserBooks(userId: number, signal?: AbortSignal): Promise<BookRecord[]> {
  return request<BookRecord[]>(`/api/books/user/${userId}`, { signal });
}

export function fetchBook(id: string, signal?: AbortSignal): Promise<BookRecord> {
  return request<BookRecord>(`/api/books/${id}`, { signal });
}

export function createBook(
  userId: number,
  data: { filename: string; title: string; author?: string; coverColor?: string },
): Promise<BookRecord> {
  return request<BookRecord>('/api/books', {
    method: 'POST',
    body: JSON.stringify({ userId, ...data }),
  });
}

export function updateBookProgress(id: string, update: BookProgressUpdate): Promise<BookRecord> {
  return request<BookRecord>(`/api/books/${id}/progress`, {
    method: 'PUT',
    body: JSON.stringify(update),
  });
}

export function deleteBook(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/books/${id}`, { method: 'DELETE' });
}

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
  data: { front: string; back: string; reading?: string; notes?: string },
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
