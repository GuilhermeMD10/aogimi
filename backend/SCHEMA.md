# Langeco — Database Schema

Quick reference for every entity. Edit this file when the schema changes.

---

## users

Authentication + profile. Extended from the original auth-only table.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | serial | PK | |
| username | text | NOT NULL, UNIQUE | Login identifier |
| password | text | NOT NULL | Plaintext for now — hash before prod |
| display_name | text | | Shown in UI (nullable, falls back to username) |
| email | text | | Reserved for future use |
| language | text | NOT NULL DEFAULT 'en' | UI language preference (en, ja, …) |
| avatar_index | smallint | NOT NULL DEFAULT 0 | Index into the kamon glyph set |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

---

## book_progress

Reading progress for a user's book. One row per user–book pair. The EPUB file itself lives in browser IndexedDB — this table holds metadata and reading state.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Canonical identity |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| filename | text | NOT NULL | Original EPUB filename (for IndexedDB lookup) |
| title | text | NOT NULL | Extracted from EPUB OPF |
| author | text | NOT NULL DEFAULT '' | Extracted from EPUB OPF |
| cover_color | text | NOT NULL DEFAULT '#4A4038' | Hex fallback gradient color |
| cfi_position | text | | EPUB CFI string for exact restore (primary) |
| spine_index | smallint | NOT NULL DEFAULT 0 | Chapter-level fallback position |
| total_spine_items | smallint | | Total chapters in the EPUB |
| progress | smallint | NOT NULL DEFAULT 0 | 0–100 percentage (derived from spine ratio) |
| started_at | timestamptz | NOT NULL DEFAULT now() | When the book was first imported |
| last_read_at | timestamptz | NOT NULL DEFAULT now() | Updated on reading session close |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Unique constraint:** (user_id, filename) — one import per filename per user.

**Sync strategy:** Progress is saved to localStorage on every page turn. Backend is updated only on exit events (tab hidden, page unload, explicit book close) via `sendBeacon` or fetch.

---

## bookmarks

Reading bookmarks within a book. Separate table to keep them queryable.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| book_id | uuid | NOT NULL, FK → book_progress(id) ON DELETE CASCADE | |
| cfi | text | NOT NULL | EPUB CFI position |
| label | text | NOT NULL DEFAULT '' | User-provided label |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

---

## decks

Flashcard decks. Standalone (no book FK).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| name | text | NOT NULL | |
| description | text | NOT NULL DEFAULT '' | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

---

## cards

Individual flashcards. Always belong to a deck; user is derived from deck.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| deck_id | uuid | NOT NULL, FK → decks(id) ON DELETE CASCADE | |
| front | text | NOT NULL | Japanese headword |
| reading | text | NOT NULL DEFAULT '' | Kana reading |
| back | text | NOT NULL | Meaning / translation |
| notes | text | NOT NULL DEFAULT '' | Free-form user notes, context sentences, etc. |
| state | text | NOT NULL DEFAULT 'new' | One of: new, learning, mastered |
| reviewed_times | int | NOT NULL DEFAULT 0 | Total review count |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Future SRS columns (not yet added):** next_review_at, interval_days, ease_factor.

---

## Existing dictionary tables (read-only reference data)

These are populated from JMdict/KANJIDIC2/JMnedict imports. Not user-editable.

| Table | Purpose |
|-------|---------|
| words | JMdict word entries (id, jmdict_id, is_common, priority_score) |
| word_kanji | Kanji forms per word |
| word_readings | Kana readings per word |
| word_meanings | Glosses per word (multilingual, FTS-indexed) |
| word_forms | Deinflection table for irregular verbs |
| kanji | KANJIDIC2 kanji data (literal, grade, strokes, readings) |
| names | JMnedict name entries |
