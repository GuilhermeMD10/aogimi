# Shirube — API Routes

Every endpoint the frontend calls. Edit when routes change.

Base URL: `http://localhost:3000` (configurable via PORT env var).
CORS: `http://localhost:3001`, `http://localhost:3002` (configurable via CORS_ORIGIN).

---

## Search

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| GET | `/api/search?q=食べる` | `q` (required) | Unified search: words, names, kanji | words, kanji, names |

---

## Words

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| GET | `/api/words/:id` | `id` (word ID) | Single word | words |
| GET | `/api/words/:id/details` | `id` (word ID) | Word + kanji breakdown (readings as `{ form, pitchAccents }`) + up to 5 example sentences | words, kanji, example_sentences |
| GET | `/api/words/:id/langs` | `id` (word ID) | All translations across languages | words |
| GET | `/api/words/meaning?q=eat&lang=eng` | `q` (required), `lang` (optional) | Words by meaning | words |
| GET | `/api/words/meaning/pos?q=study&pos=suru&lang=eng` | `q`, `pos` (required), `lang` (optional) | Words by meaning + POS | words |
| GET | `/api/words/pos?pos=noun&lang=eng` | `pos` (required), `lang` (optional) | Words by POS | words |
| GET | `/api/words/priority?marker=ichi1` | `marker` (required) | Words by priority marker | words |
| GET | `/api/words/kana-only?limit=50` | `limit` (optional, default 50) | Kana-only words | words |
| GET | `/api/words/kanji/:kanji?common=true` | `kanji`, `common` (optional) | Words containing kanji | words |
| GET | `/api/words/kana/:kana` | `kana` | Words by kana reading | words |
| GET | `/api/words/kana-prefix/:prefix?limit=20` | `prefix`, `limit` (optional) | Words by kana prefix | words |

---

## Kanji

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| GET | `/api/kanji/:literal` | `literal` (single character) | Single kanji | kanji |
| GET | `/api/kanji?grade=2` | `grade` (1–10 or range "1-6") | Kanji by grade | kanji |
| GET | `/api/kanji?strokes=9` | `strokes` (int or range "8-12") | Kanji by stroke count | kanji |
| GET | `/api/kanji?radical=72` | `radical` (int) | Kanji by radical | kanji |
| GET | `/api/kanji?meaning=water` | `meaning` (string) | Kanji by meaning | kanji |
| GET | `/api/kanji?on=ショク` | `on` (katakana) | Kanji by on reading | kanji |
| GET | `/api/kanji?kun=た.べ` | `kun` (hiragana) | Kanji by kun reading | kanji |

---

## Names

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| GET | `/api/names/kanji/:kanji` | `kanji` | Names by kanji | names |
| GET | `/api/names/kana/:kana` | `kana` | Names by kana | names |
| GET | `/api/names/kana-prefix/:prefix?limit=20` | `prefix`, `limit` (optional) | Names by prefix | names |
| GET | `/api/names/type/:type` | `type` (surname, place, masc, fem) | Names by type | names |
| GET | `/api/names/meaning?q=yamada` | `q` (required) | Names by meaning | names |

---

## Users

Auth is username+password in request body (no tokens yet).

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| POST | `/api/user/create` | `{ username, password }` | `{ id, username }` | users |
| GET | `/api/user/:id` | `id` (user ID) | Public profile | users |
| POST | `/api/user/info` | `{ username, password }` | Full profile (display_name, email, language, avatar_index, onboarded_at) | users |
| POST | `/api/user/update` | `{ username, password, updates }` | Updated profile | users |
| PUT | `/api/user/onboarding` | `{ userId, completed }` | `{ message }` | users |
| POST | `/api/user/delete` | `{ username, password }` | `{ message }` | users |

---

## Books (book_progress)

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| POST | `/api/books` | `{ userId, filename, title, author, coverColor, fileHash?, contentHash?, pdfIdOriginal?, pdfIdCurrent?, pageCount?, hasTextLayer?, producer?, xmpDocumentId?, xmpOriginalId?, pageHashes?, textLength?, detectedDoi?, detectedIsbn?, pagePhashes?, fingerprintVersion?, dcIdentifier?, language?, publisher? }` | Book record (idempotent on `(userId, filename)`); `fingerprintVersion` defaults to 1 when omitted. | book_progress |
| POST | `/api/books/match` | `{ userId, books: MatchCandidate[] }` — each: `{ file_hash, content_hash, pdf_id_original, xmp_original_id, detected_doi, detected_isbn, page_count, page_phashes, metadata: { title, author?, dc_identifier?, filename } }`. EPUB candidates leave PDF-only fields null; PDFs without a text layer leave text-derived fields null. Mobile candidates always leave text-derived + `page_phashes` null (no extractors). | `(MatchResult \| null)[]` parallel-indexed; match_type ∈ `file_hash` / `xmp_original_id` / `pdf_trailer_id` / `doi` / `isbn` / `content` / `visual` / `metadata` / `filename` (priority order) | book_progress |
| GET | `/api/books/user/:userId` | `userId` | All user books, ordered by last_read_at | book_progress |
| GET | `/api/books/:id` | `id` (UUID) | Single book | book_progress |
| PUT | `/api/books/:id/progress` | `{ cfiPosition?, progress?, spineIndex?, totalSpineItems? }` | Updated book | book_progress |
| POST | `/api/books/:id/progress` | Same as PUT — for `navigator.sendBeacon()` / RN `fetch` keepalive | Updated book | book_progress |
| PATCH | `/api/books/:id` | `{ title }` | Updated book | book_progress |
| PUT | `/api/books/:id/identity` | `{ fileHash?, contentHash?, pdfIdOriginal?, pdfIdCurrent?, pageCount?, hasTextLayer?, producer?, xmpDocumentId?, xmpOriginalId?, pageHashes?, textLength?, detectedDoi?, detectedIsbn?, pagePhashes?, fingerprintVersion?, dcIdentifier?, language?, publisher? }` — COALESCE on the row, never clobbers a non-null field | Updated book | book_progress |
| DELETE | `/api/books/:id` | `id` (UUID) | `{ message }` | book_progress, bookmarks, device_books (cascade) |

### Bookmarks (nested under books)

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| POST | `/api/books/:id/bookmarks` | `{ cfi (required), label? }` | Bookmark | bookmarks |
| GET | `/api/books/:id/bookmarks` | `id` (book UUID) | All bookmarks for book | bookmarks |
| DELETE | `/api/books/bookmarks/:bookmarkId` | `bookmarkId` (UUID) | `{ message }` | bookmarks |

---

## Devices

Per-browser / per-install identity. The device id is generated client-side
(`crypto.randomUUID`) on first launch and persisted in localStorage /
AsyncStorage. The `device_books` rows track which devices have which book
files locally so the library can show a "not on this device" state.

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| POST | `/api/devices` | `{ userId, deviceId, name? }` | Device record (idempotent — also updates last_seen_at) | devices |
| GET | `/api/devices/user/:userId` | `userId` | All devices for user, with per-device book_count | devices |
| PUT | `/api/devices/:deviceId` | `{ userId, name }` | Renamed device | devices |
| DELETE | `/api/devices/:deviceId?userId={userId}` | `userId` query | `{ message }` | devices, device_books (cascade) |
| POST | `/api/devices/:deviceId/books/:bookId/available` | `{ userId }` | Availability row | device_books |
| DELETE | `/api/devices/:deviceId/books/:bookId/available?userId={userId}` | `userId` query | `{ message }` | device_books |
| GET | `/api/devices/:deviceId/books?userId={userId}` | `userId` query | All user books + `available: boolean` per device | book_progress, device_books |

---

## Decks & Cards

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| POST | `/api/decks` | `{ userId, name, description? }` | Deck | decks |
| GET | `/api/decks/user/:userId` | `userId` | All user decks | decks |
| GET | `/api/decks/:id` | `id` (UUID) | Single deck | decks |
| PUT | `/api/decks/:id` | `{ name?, description? }` | Updated deck | decks |
| DELETE | `/api/decks/:id` | `id` (UUID) | `{ message }` | decks, cards (cascade) |
| POST | `/api/decks/:id/cards` | `{ front, back, reading?, notes? }` | Card | cards |
| GET | `/api/decks/:id/cards` | `id` (deck UUID) | All cards in deck | cards |
| PUT | `/api/decks/cards/:cardId` | `{ front?, reading?, back?, notes?, state? }` | Updated card | cards |
| POST | `/api/decks/cards/:cardId/review` | `cardId` | Card with incremented review count | cards |
| DELETE | `/api/decks/cards/:cardId` | `cardId` | `{ message }` | cards |

---

## Translate (DeepL proxy)

| Method | Path | Body / Params | Response | DB Tables |
|--------|------|---------------|----------|-----------|
| POST | `/api/translate` | `{ text (≤5000 chars), target? (default "EN") }` | `{ translatedText, detectedLanguage }` | None (external API) |

---

## Frontend sync strategy

- **Dictionary / kanji / names / translate**: On-demand per user action. No polling.
- **User auth**: On login/signup and profile edits. No session tokens — credentials sent per request. Account switch on either client wipes local user-scoped storage before installing the new session (see [PROJECT_CONTEXT.md](../web-frontend/shirube-web/PROJECT_CONTEXT.md) / mobile `lib/auth/wipeUserData.ts`).
- **Book progress**: Local cache on every page turn (web localStorage `reader_progress_<filename>`, mobile AsyncStorage `reader_book_<filename>`). Backend sync debounced ~2s during a session, plus fire-and-forget `sendBeacon` on tab close (web) / `fetch keepalive` on `AppState` background (mobile).
- **Library import / sync**:
  1. `POST /api/books/match` first with `{ file_hash, content_hash, pdf_id_original, xmp_original_id, detected_doi, detected_isbn, page_count, page_phashes, metadata }` candidates — backend tries `file_hash → xmp_original_id → pdf_id_original → doi → isbn+page_count(±5%) → content_hash → visual(phash+page_count(±10%)) → dc_identifier → title+author → filename`.
  2. On match: reuse the existing book id, fire `PUT /api/books/:id/identity` to backfill any missing hash fields.
  3. On no match: `POST /api/books` to create.
  4. Always finish with `POST /api/devices/:deviceId/books/:bookId/available` so cross-device library listings know this device has the file.
- **Decks / cards**: On-demand CRUD. Deck list refreshed after mutations.

**Total endpoints**: 55 (route handlers; the `/progress` row accepts both PUT and POST, counted twice).
