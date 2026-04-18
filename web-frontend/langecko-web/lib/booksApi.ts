const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Types matching backend responses ─────────────────────────────────────────

export interface UserBookRecord {
  id: string; // UUID
  user_id: number;
  filename: string;
  title: string;
  author: string;
  cover_color: string;
  total_pages: number | null;
  current_page: number;
  cfi_position: string | null;
  progress: number;
  started_at: string;
  last_read_at: string;
  created_at: string;
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function registerBook(params: {
  userId: number;
  filename: string;
  title: string;
  author: string;
  coverColor: string;
  totalPages?: number;
}): Promise<UserBookRecord> {
  const res = await fetch(`${API}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to register book');
  return res.json();
}

export async function getUserBooks(userId: number): Promise<UserBookRecord[]> {
  const res = await fetch(`${API}/api/books/user/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function getBookRecord(id: string): Promise<UserBookRecord> {
  const res = await fetch(`${API}/api/books/${id}`);
  if (!res.ok) throw new Error('Book not found');
  return res.json();
}

export async function updateBookProgress(
  id: string,
  params: { cfiPosition?: string; progress?: number },
): Promise<UserBookRecord> {
  const res = await fetch(`${API}/api/books/${id}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to update progress');
  return res.json();
}

export async function deleteBookRecord(id: string): Promise<void> {
  const res = await fetch(`${API}/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
}
