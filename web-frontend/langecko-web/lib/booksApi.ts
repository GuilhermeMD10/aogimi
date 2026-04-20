import type { EpubIdentity } from '@/lib/epubIdentity';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Types matching backend book_progress table ──────────────────────────────

export interface BookProgressRecord {
  id: string; // UUID
  user_id: number;
  filename: string;
  title: string;
  author: string;
  cover_color: string;
  cfi_position: string | null;
  spine_index: number;
  total_spine_items: number | null;
  progress: number;
  file_hash: string | null;
  content_hash: string | null;
  dc_identifier: string | null;
  language: string | null;
  publisher: string | null;
  started_at: string;
  last_read_at: string;
  created_at: string;
}

export interface ProgressPayload {
  cfiPosition?: string;
  progress?: number;
  spineIndex?: number;
  totalSpineItems?: number;
}

// ── Match types ─────────────────────────────────────────────────────────────

export interface MatchCandidate {
  file_hash: string;
  content_hash: string;
  metadata: {
    title: string;
    author: string;
    dc_identifier: string | null;
    filename: string;
  };
}

export type MatchType = 'file_hash' | 'content' | 'metadata' | 'filename';

export interface MatchResult {
  match: BookProgressRecord;
  match_type: MatchType;
}

// ── API calls ───────────────────────────────────────────────────────────────

export async function registerBook(params: {
  userId: number;
  filename: string;
  title: string;
  author: string;
  coverColor: string;
  fileHash?: string;
  contentHash?: string;
  dcIdentifier?: string | null;
  language?: string | null;
  publisher?: string | null;
}): Promise<BookProgressRecord> {
  const res = await fetch(`${API}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to register book');
  return res.json();
}

export async function getUserBooks(userId: number): Promise<BookProgressRecord[]> {
  const res = await fetch(`${API}/api/books/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function getBookRecord(id: string): Promise<BookProgressRecord> {
  const res = await fetch(`${API}/api/books/${id}`);
  if (!res.ok) throw new Error('Book not found');
  return res.json();
}

export async function updateBookProgress(
  id: string,
  params: ProgressPayload,
): Promise<BookProgressRecord> {
  const res = await fetch(`${API}/api/books/${id}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

/**
 * Fire-and-forget progress sync via sendBeacon.
 * Survives page unload / tab close — browser guarantees delivery.
 */
export function sendProgressBeacon(id: string, params: ProgressPayload): void {
  const url = `${API}/api/books/${id}/progress`;
  const body = new Blob([JSON.stringify(params)], { type: 'application/json' });
  navigator.sendBeacon(url, body);
}

export async function deleteBookRecord(id: string): Promise<void> {
  const res = await fetch(`${API}/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
}

// ── Hash-based matching ─────────────────────────────────────────────────────

export async function matchBooks(
  userId: number,
  books: MatchCandidate[],
): Promise<(MatchResult | null)[]> {
  const res = await fetch(`${API}/api/books/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, books }),
  });
  if (!res.ok) throw new Error('Failed to match books');
  return res.json();
}

// ── Identity backfill ───────────────────────────────────────────────────────

export async function updateBookIdentity(
  id: string,
  identity: EpubIdentity,
): Promise<BookProgressRecord> {
  const res = await fetch(`${API}/api/books/${id}/identity`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(identity),
  });
  if (!res.ok) throw new Error('Failed to update book identity');
  return res.json();
}
