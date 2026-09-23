import { request, API_BASE, getAccessToken } from '@/lib';
import type {
  BookIdentityPayload,
  BookMatchCandidate,
  BookMatchResult,
  BookProgressUpdate,
  BookRecord,
} from '../types';

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
    pdfIdOriginal?: string | null;
    pdfIdCurrent?: string | null;
    pageCount?: number | null;
    hasTextLayer?: boolean | null;
    producer?: string | null;
    xmpDocumentId?: string | null;
    xmpOriginalId?: string | null;
    pageHashes?: string[] | null;
    textLength?: number | null;
    detectedDoi?: string | null;
    detectedIsbn?: string | null;
    pagePhashes?: string[] | null;
    fingerprintVersion?: number | null;
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

// Progress save for app-background / shutdown moments where a full
// `request()` round-trip (401 → refresh → retry) isn't an option. RN has no
// sendBeacon equivalent; we use fetch with keepalive (Hermes supports it) so
// the request continues even if JS execution stops. Bypassing `request()`
// means we must stamp the Bearer token ourselves — /api/books/* sits behind
// authenticateJWT and a bare fetch is a silent 401.
//
// Resolves `true` only on a 2xx, so the caller can record the position as
// pushed only when the server actually took it. Never rejects.
export function sendProgressBeacon(id: string, update: BookProgressUpdate): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return Promise.resolve(false);
  try {
    return fetch(`${API_BASE}/api/books/${id}/progress`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(update),
      keepalive: true,
    })
      .then((res) => res.ok)
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function updateBookTitle(id: string, title: string): Promise<BookRecord> {
  return request<BookRecord>(`/api/books/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function updateBookIdentity(id: string, identity: BookIdentityPayload): Promise<BookRecord> {
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

