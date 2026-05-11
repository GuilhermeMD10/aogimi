// Backend `book_progress` row + supporting types.

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

// ── Hash-based matching ─────────────────────────────────────────────────────

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
