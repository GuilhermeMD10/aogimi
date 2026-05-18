import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { cacheSearch, cacheWord, peekSearch, peekWord } from './dictCache';
import type {
  BookMatchCandidate,
  BookMatchResult,
  BookProgressUpdate,
  BookRecord,
  BookmarkRecord,
  CardRecord,
  CardState,
  DeckRecord,
  DeviceBookRecord,
  DeviceRecord,
  EpubIdentity,
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

// Both dictionary endpoints are routed through an in-memory LRU cache
// (see lib/dictCache.ts). Cache hits return the previous response without
// hitting the server; misses go through the network and populate the
// cache on success. Aborted requests don't pollute the cache. Sync
// `peekSearch` / `peekWord` getters live in dictCache.ts for hooks that
// want to skip the loading state entirely on a hit.
export async function queryDictionary(q: string, signal?: AbortSignal): Promise<SearchResponse> {
  const cached = peekSearch(q);
  if (cached) return cached;
  const response = await request<SearchResponse>(
    `/api/search?q=${encodeURIComponent(q)}`,
    { signal },
  );
  if (!signal?.aborted) cacheSearch(q, response);
  return response;
}

export async function fetchWordDetails(
  id: string | number,
  signal?: AbortSignal,
): Promise<WordDetails> {
  const cached = peekWord(id);
  if (cached) return cached;
  const details = await request<WordDetails>(
    `/api/words/${encodeURIComponent(String(id))}/details`,
    { signal },
  );
  if (!signal?.aborted) cacheWord(id, details);
  return details;
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
  data: {
    filename: string;
    title: string;
    author?: string;
    coverColor?: string;
    fileHash?: string | null;
    contentHash?: string | null;
    dcIdentifier?: string | null;
    language?: string | null;
    publisher?: string | null;
  },
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

// Fire-and-forget progress save for app-background / shutdown moments
// where awaiting the response isn't an option. RN has no sendBeacon
// equivalent; we use fetch with keepalive (Hermes supports it) so the
// request continues even if JS execution stops. Errors are swallowed —
// caller's job is just to dispatch.
export function sendProgressBeacon(id: string, update: BookProgressUpdate): void {
  try {
    void fetch(`${API_BASE}/api/books/${id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* best-effort */
  }
}

export function updateBookTitle(id: string, title: string): Promise<BookRecord> {
  return request<BookRecord>(`/api/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function updateBookIdentity(id: string, identity: EpubIdentity): Promise<BookRecord> {
  return request<BookRecord>(`/api/books/${id}/identity`, {
    method: 'PUT',
    body: JSON.stringify(identity),
  });
}

// Reconcile local books with backend by hash/metadata. Used on import or
// when a device sees a local file it doesn't have a backend id for yet.
export function matchBooks(
  userId: number,
  candidates: BookMatchCandidate[],
): Promise<BookMatchResult[]> {
  return request<BookMatchResult[]>('/api/books/match', {
    method: 'POST',
    body: JSON.stringify({ userId, books: candidates }),
  });
}

export function deleteBook(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/books/${id}`, { method: 'DELETE' });
}

// ── Book bookmarks (per-book, server-side) ─────────────────────────────────

export function fetchBookmarks(bookId: string, signal?: AbortSignal): Promise<BookmarkRecord[]> {
  return request<BookmarkRecord[]>(`/api/books/${bookId}/bookmarks`, { signal });
}

export function createBookmark(
  bookId: string,
  data: { cfi: string; label?: string },
): Promise<BookmarkRecord> {
  return request<BookmarkRecord>(`/api/books/${bookId}/bookmarks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteBookmark(bookmarkId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/books/bookmarks/${bookmarkId}`, { method: 'DELETE' });
}

// ── Devices ─────────────────────────────────────────────────────────────────

export function registerDevice(
  userId: number,
  deviceId: string,
  name: string,
): Promise<DeviceRecord> {
  return request<DeviceRecord>('/api/devices', {
    method: 'POST',
    body: JSON.stringify({ userId, deviceId, name }),
  });
}

export function fetchUserDevices(userId: number, signal?: AbortSignal): Promise<DeviceRecord[]> {
  return request<DeviceRecord[]>(`/api/devices/user/${userId}`, { signal });
}

export function renameDevice(deviceId: string, name: string): Promise<DeviceRecord> {
  return request<DeviceRecord>(`/api/devices/${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export function removeDevice(deviceId: string, userId: number): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/devices/${deviceId}?userId=${userId}`,
    { method: 'DELETE' },
  );
}

export function markBookAvailable(
  deviceId: string,
  bookId: string,
  userId: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/devices/${deviceId}/books/${bookId}/available`,
    {
      method: 'POST',
      body: JSON.stringify({ userId }),
    },
  );
}

export function removeBookAvailability(
  deviceId: string,
  bookId: string,
  userId: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/devices/${deviceId}/books/${bookId}/available?userId=${userId}`,
    { method: 'DELETE' },
  );
}

export function fetchDeviceBooks(
  deviceId: string,
  userId: number,
  signal?: AbortSignal,
): Promise<DeviceBookRecord[]> {
  return request<DeviceBookRecord[]>(
    `/api/devices/${deviceId}/books?userId=${userId}`,
    { signal },
  );
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
