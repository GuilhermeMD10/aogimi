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
| words | JMdict word entries (id, jmdict_id, is_common, priority_score, jlpt_level) |
| word_kanji | Kanji forms per word |
| word_readings | Kana readings per word (incl. `pitch_accents` from Kanjium) |
| word_meanings | Glosses per word (multilingual, FTS-indexed) |
| word_forms | Deinflection table for irregular verbs |
| kanji | KANJIDIC2 kanji data (literal, grade, jlpt_level, strokes, readings) |
| names | JMnedict name entries |
| example_sentences | Curated example sentences keyed by word form (Kanjium) |

**JLPT levels (`words.jlpt_level`, `kanji.jlpt_level`):** smallint 1–5 (1 = N1
hardest, 5 = N5 easiest), NULL when not in any of the JLPT N1..N5 lists.
Sourced from `backend/jlptwordslist/n{1..5}.csv`. Loaded via migrations 010
(schema + staging), 011 (`\copy` from CSV), 012 (match → JMdict + derive
per-character level + drop staging). Used as a ranking boost in search
(`+50 + jlpt_level*5`) and surfaced to the frontend as a chip on word rows
and per-kanji breakdowns.

**Pitch accent (`word_readings.pitch_accents`):** TEXT, NULL when no data.
Raw Kanjium position numbers, comma-separated when multiple patterns are
accepted (e.g. `"0"`, `"1"`, `"2,3"`). Position 0 = heiban (flat); other
positions are 1-indexed mora boundaries where the drop occurs. Sourced from
the Kanjium project's `accents.txt` (~50k rows). Loaded via migration 013
(adds the column) + `helpers/files/parse_pitch_accents.js` (imports the TSV
into a temp table and updates via JOIN on `word_kanji.kanji + word_readings.kana`,
with a kana-only fallback for entries that lack a kanji form). Coverage is
partial — Kanjium doesn't span all of JMdict — so a notable fraction of
readings stay NULL; UIs should hide pitch UI when unset.

**Example sentences (`example_sentences`):** Curated Japanese sentences with
English translations, ruby furigana markup, and a difficulty label. The
curated headword lives in `word_form`, but lookups go through
`contained_forms TEXT[]` (GIN-indexed) — the union of the curated key plus
every `<rb>kanji</rb>` token the parser extracts from `ja_ruby`. This means
a sentence keyed for "ご馳走" also surfaces when the user looks up "私"
(because `<rb>私</rb>` is in the ruby) — every word the sentence mentions
gets the sentence. Sourced from Kanjium's `sentences.txt` (~13k rows).
Loaded via migration 014 (table) + 015 (contained_forms column + index) +
`helpers/files/parse_example_sentences.js`. Surfaced on
`GET /api/words/:id/details` as up to 5 sentences per word, ordered by id.
