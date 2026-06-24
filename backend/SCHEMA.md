# Aogimi — Database Schema

Quick reference for every entity. Edit this file when the schema
changes. The matching DROP+CREATE in
[`migrations/reset_user_data.sql`](./migrations/reset_user_data.sql)
must stay in lockstep (any migration touching user-data tables also
edits the reset script).

The shape below reflects the schema after
[`022_card_srs.sql`](./migrations/022_card_srs.sql), which extended
`cards` with SRS state and added `card_reviews`, `study_days`, and
`user_study_prefs`. Algorithm lives in
[`src/services/cardSrsService.js`](./src/services/cardSrsService.js).

---

## users

Authentication + profile.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | serial | PK | |
| username | text | NOT NULL, UNIQUE | Login key. 3-32 chars, `[a-zA-Z0-9_.-]`. |
| password_hash | text | NOT NULL | bcrypt (cost 12). Never returned by any API. |
| email | text | nullable | Reserved — not collected at signup yet. See unique index below. |
| display_name | text | nullable | Profile chrome (falls back to username) |
| language | text | NOT NULL DEFAULT 'en' | UI language preference |
| avatar_index | smallint | NOT NULL DEFAULT 0 | Index into the kamon glyph set |
| onboarding_completed | boolean | NOT NULL DEFAULT false | Onboarding modal gate |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | Bumped by every profile update |

**Indexes**
- `users_email_lower_idx UNIQUE ON (LOWER(email)) WHERE email IS NOT NULL`
  — partial unique index. Future-proofs the column for the email-as-login
  switch without another migration.

---

## refresh_tokens

Server-side state for the JWT refresh-token rotation flow. The raw
token is **never** stored — only its SHA-256. See
[`docs/AUTH.md`](../docs/AUTH.md) for the rotation rules.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| token_hash | text | NOT NULL, UNIQUE | SHA-256 hex of the issued refresh JWT |
| expires_at | timestamptz | NOT NULL | Set at insert to `now() + 30 days` |
| revoked_at | timestamptz | nullable | Set on rotation, logout, or admin revoke |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Indexes**
- `idx_refresh_tokens_user_id ON (user_id)`
- `idx_refresh_tokens_token_hash ON (token_hash)` — lookup path

---

## book_progress

Reading progress for a user's book. One row per user–book pair. The
EPUB / PDF file lives on the user's device (web: IndexedDB; mobile:
expo-file-system) — this table holds metadata + reading state + the
identity fingerprints used to match the same book across devices.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | Canonical identity |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| filename | text | NOT NULL | Original filename (key for local lookup) |
| title | text | NOT NULL | Extracted from EPUB OPF or PDF metadata |
| author | text | NOT NULL DEFAULT '' | |
| cover_color | text | NOT NULL DEFAULT '#4A4038' | Hex fallback gradient color |
| cfi_position | text | nullable | EPUB CFI string for exact restore |
| spine_index | smallint | NOT NULL DEFAULT 0 | Chapter-level fallback position |
| total_spine_items | smallint | nullable | Total chapters |
| progress | smallint | NOT NULL DEFAULT 0 | 0–100 percentage |
| file_hash | text | nullable | SHA-256 of full file bytes (both formats) |
| content_hash | text | nullable | EPUB: spine-text SHA. PDF: normalized-text SHA (web only) |
| pdf_id_original | text | nullable | PDF trailer /ID[0] — stable across modifications |
| pdf_id_current | text | nullable | PDF trailer /ID[1] — changes on each save |
| page_count | int | nullable | PDF page count |
| has_text_layer | boolean | nullable | PDF: extractable text vs scanned image |
| producer | text | nullable | PDF /Info /Producer (diagnostic only) |
| xmp_document_id | text | nullable | PDF xmpMM:DocumentID |
| xmp_original_id | text | nullable | PDF xmpMM:OriginalDocumentID — strong cross-device match |
| page_hashes | text[] | nullable | PDF per-page SHA-256 of normalized text |
| text_length | int | nullable | PDF char count of normalized full text |
| detected_doi | text | nullable | PDF DOI scraped from front-matter |
| detected_isbn | text | nullable | PDF checksum-validated ISBN-10/13 |
| page_phashes | text[] | nullable | PDF per-sampled-page dHash (visual match layer) |
| fingerprint_version | int | NOT NULL DEFAULT 1 | Version of the fingerprinting algorithm |
| dc_identifier | text | nullable | OPF dc:identifier (often ISBN) |
| language | text | nullable | OPF dc:language |
| publisher | text | nullable | OPF dc:publisher |
| started_at | timestamptz | NOT NULL DEFAULT now() | First import time |
| last_read_at | timestamptz | NOT NULL DEFAULT now() | Updated on every progress beacon |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Constraints / indexes**
- `UNIQUE (user_id, filename)` — one row per (user, filename) pair.
- `idx_book_progress_user_id ON (user_id)`
- `idx_book_progress_last_read ON (user_id, last_read_at DESC)`
- `idx_book_progress_file_hash ON (file_hash) WHERE file_hash IS NOT NULL`
- `idx_book_progress_content_hash ON (content_hash) WHERE content_hash IS NOT NULL`
- `idx_book_progress_pdf_id_original ON (pdf_id_original) WHERE pdf_id_original IS NOT NULL`
- `idx_book_progress_xmp_original_id ON (xmp_original_id) WHERE xmp_original_id IS NOT NULL`
- `idx_book_progress_detected_doi ON (detected_doi) WHERE detected_doi IS NOT NULL`
- `idx_book_progress_detected_isbn ON (detected_isbn) WHERE detected_isbn IS NOT NULL`

---

## bookmarks

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| book_id | uuid | NOT NULL, FK → book_progress(id) ON DELETE CASCADE | |
| cfi | text | NOT NULL | EPUB CFI of the bookmarked position |
| label | text | NOT NULL DEFAULT '' | User-supplied caption |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Indexes:** `idx_bookmarks_book_id ON (book_id)`

---

## decks

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| name | text | NOT NULL | |
| description | text | NOT NULL DEFAULT '' | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Indexes:** `idx_decks_user_id ON (user_id)`

---

## cards

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| deck_id | uuid | NOT NULL, FK → decks(id) ON DELETE CASCADE | |
| front | text | NOT NULL | |
| reading | text | NOT NULL DEFAULT '' | Kana for the front (optional) |
| back | text | NOT NULL | Meaning / translation |
| notes | text | NOT NULL DEFAULT '' | |
| context_sentence | text | NOT NULL DEFAULT '' | Optional in-context excerpt |
| state | text | NOT NULL DEFAULT 'new' | SRS state: `new` \| `seen` \| `learned` \| `mastered` |
| reviewed_times | int | NOT NULL DEFAULT 0 | Review counter |
| difficulty | real | NOT NULL DEFAULT 0.30 | SRS: how hard this card is intrinsically, clamped [0.05, 0.95] |
| stability | real | NOT NULL DEFAULT 2.0 | SRS: days of memory durability, floor 0.1 |
| last_outcomes | text | NOT NULL DEFAULT '' | Last 5 outcomes encoded `A`/`H`/`E` (Again/Hard/Easy), oldest left |
| last_reviewed_at | timestamptz | nullable | When the card was last reviewed (null for never-reviewed cards) |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**Indexes:**
- `idx_cards_deck_id ON (deck_id)`
- `idx_cards_state ON (deck_id, state)`
- `idx_cards_last_reviewed ON (deck_id, last_reviewed_at)` — for "oldest first" and time-aware ordering

---

## card_reviews

Append-only event log. One row per review submission. Drives stats,
undo, heatmap, and future algorithm retraining.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| card_id | uuid | NOT NULL, FK → cards(id) ON DELETE CASCADE | |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| reviewed_at | timestamptz | NOT NULL DEFAULT now() | When the user submitted the review |
| outcome | text | NOT NULL, CHECK IN ('again','hard','easy') | The result the user picked |
| difficulty_before | real | NOT NULL | Snapshot of card.difficulty pre-update |
| difficulty_after | real | NOT NULL | Snapshot post-update |
| stability_before | real | NOT NULL | Snapshot pre-update |
| stability_after | real | NOT NULL | Snapshot post-update |
| state_before | text | NOT NULL | Snapshot pre-update |
| state_after | text | NOT NULL | Snapshot post-update |
| elapsed_days | real | NOT NULL DEFAULT 0 | Days since the prior review (0 for first review) |

**Indexes:**
- `idx_card_reviews_user_time ON (user_id, reviewed_at)` — heatmap + reviews-per-day
- `idx_card_reviews_card ON (card_id, reviewed_at)` — undo + per-card history

---

## study_days

Rollup of "the user studied at least one card on this calendar date".
Used by the days-studied counter and the heatmap so we don't aggregate
`card_reviews` on every render.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| studied_on | date | NOT NULL | Calendar date in the user's timezone (UTC for now) |
| review_count | int | NOT NULL DEFAULT 0 | Number of reviews logged on this date |

**PK:** `(user_id, studied_on)`
**Indexes:** `idx_study_days_user ON (user_id, studied_on DESC)`

---

## user_study_prefs

Per-user display + filter preferences. One row per user, created lazily
on first `PUT /api/study/prefs`. JSONB keeps future toggles
schema-free.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| user_id | int | PK, FK → users(id) ON DELETE CASCADE | |
| display | jsonb | NOT NULL DEFAULT `{...}` | Front/back content toggles + active preset |
| deck_overrides | jsonb | NOT NULL DEFAULT `{}` | Map of `{ deckId: { mode, sessionSize } }` |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

**`display` shape:**
```json
{
  "preset": "default",           // 'easy' | 'default' | 'hard' | 'production'
  "front": { "reading": false, "context": true, "jlpt": true, "deckName": true },
  "back":  { "exampleSentence": true }
}
```

**`deck_overrides` shape:** `{ "<deckId>": { "mode": "hardest", "sessionSize": 20 } }` —
mode is one of `hardest | random | oldest_first | oldest_only | newest_only | by_creation | hardest_all_decks`.

---

## devices

Per-device library state. The (deviceId, userId) compound PK means
device ids are scoped to their owning user — same device id on two
users is two distinct rows.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| device_id | text | NOT NULL | Client-generated UUID |
| user_id | int | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| name | text | NOT NULL DEFAULT '' | User-supplied device label |
| last_seen_at | timestamptz | NOT NULL DEFAULT now() | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

**PK:** `(device_id, user_id)`

---

## book_availability

Which devices currently have a local file for a given book.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| user_id | int | NOT NULL | |
| device_id | text | NOT NULL | |
| book_id | uuid | NOT NULL, FK → book_progress(id) ON DELETE CASCADE | |
| available_at | timestamptz | NOT NULL DEFAULT now() | |

**PK:** `(user_id, device_id, book_id)`
**FK:** `(device_id, user_id)` → `devices(device_id, user_id)` ON DELETE CASCADE

---

## Dictionary tables (read-only)

These are the bulk reference data for word / kanji / name lookup.
They're loaded once from JMdict / KANJIDIC2 / JMnedict via the
helpers in `helpers/files/` and not user-mutable. Schema details
live in the migration files (001 / 008 / 009 / 010-015 / etc.) rather
than here — the columns rarely change and a flat dump would clutter
this doc.

Tables: `words`, `readings`, `kanji_for_word`, `meanings`, `kanji`,
`example_sentences`, `sentence_contained_forms`, `pitch_accents`,
`jlpt_levels`, `names`.
