import { request, API_BASE } from '@/lib/api';
import type {
  BookIdentityPayload,
  BookMatchCandidate,
  BookMatchResult,
  BookProgressUpdate,
  BookRecord,
  BookmarkRecord,
  DeviceBookRecord,
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

// ── Bookmarks (per-book, server-side) ──────────────────────────────────────

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

// ── Device-book availability ───────────────────────────────────────────────

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
