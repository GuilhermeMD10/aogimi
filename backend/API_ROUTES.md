# Aogimi — API Routes

Every endpoint the frontend calls. Edit when routes change. See
[`SCHEMA.md`](./SCHEMA.md) for the underlying tables and
[`docs/AUTH.md`](../docs/AUTH.md) for the token model.

Base URL: `http://localhost:3000` (configurable via `PORT`).
CORS: `http://localhost:3001` and `:3002` in dev; production sets
`CORS_ORIGIN`. Native mobile sends no Origin header, so CORS is
not a factor for it.

---

## Authentication

Every route below the dictionary section requires
`Authorization: Bearer <jwt>` and returns 401 on missing / invalid /
expired. Clients auto-refresh once via `/api/auth/refresh` before
surfacing the 401. See [`docs/AUTH.md`](../docs/AUTH.md).

The `userId` field is **ignored** in request bodies and path params
where it duplicates the token identity — `req.user.userId` is the only
source of truth. Routes that take a resource id (`:id` for book, deck,
card, etc.) cross-check ownership via
`backend/src/services/ownership.js`; mismatch returns **404** (not 403)
so the response shape is identical to "doesn't exist", preventing id
enumeration.

---

## Public — Auth surface

| Method | Path | Body | Response | Rate limit |
|---|---|---|---|---|
| POST | `/api/auth/register` | `{ username, password }` | `{ user, accessToken, refreshToken }` (201) | 3/hr/IP |
| POST | `/api/auth/login` | `{ username, password }` | `{ user, accessToken, refreshToken }` | 5/15min/(IP+username) |
| POST | `/api/auth/refresh` | `{ refreshToken }` | `{ user, accessToken, refreshToken }` | global only |
| POST | `/api/auth/logout` | `{ refreshToken }` | `{ ok: true }` (idempotent) | global only |

**Those are the native shapes.** Browser clients (detected by `Origin`) get the
refresh token as an httpOnly + Secure + SameSite=Lax **cookie** scoped to
`/api/auth` instead of in the JSON — so the responses are `{ user, accessToken }`,
and refresh / logout read the token from the cookie rather than the body.
`/api/auth/refresh` additionally 403s a browser request whose `Origin` isn't
allowlisted (CSRF guard). See [`docs/AUTH.md`](../docs/AUTH.md).

Errors:
- 400: zod validation failure (username/password format) — passwords must be 8+ chars with at least one non-letter
- 401: invalid credentials / refresh token
- 409: `Username already taken` (register only)
- 429: rate limited

---

## Public — Dictionary (no auth)

### Search

| Method | Path | Body / Params | Response | DB Tables |
|---|---|---|---|---|
| GET | `/api/search?q=食べる` | `q` (required) | Unified search: words, names, kanji | words, kanji, names |

### Words

| Method | Path | Params | Response | DB Tables |
|---|---|---|---|---|
| GET | `/api/words/:id` | `id` | Single word | words |
| GET | `/api/words/:id/details` | `id` | Word + kanji breakdown + readings (with pitchAccents) + ≤ 5 example sentences | words, kanji, example_sentences |
| GET | `/api/words/:id/langs` | `id` | All translations across languages | words |
| GET | `/api/words/meaning?q=eat&lang=eng` | `q`, `lang?` | Words by meaning | words |
| GET | `/api/words/meaning/pos?q=study&pos=suru&lang=eng` | `q`, `pos`, `lang?` | Words by meaning + POS | words |
| GET | `/api/words/pos?pos=noun&lang=eng` | `pos`, `lang?` | Words by POS | words |
| GET | `/api/words/priority?marker=ichi1` | `marker` | Words by priority marker | words |
| GET | `/api/words/kana-only?limit=50` | `limit?` | Kana-only words | words |
| GET | `/api/words/kanji/:kanji?common=true` | `kanji`, `common?` | Words containing kanji | words |
| GET | `/api/words/kana/:kana` | `kana` | Words by kana reading | words |
| GET | `/api/words/kana-prefix/:prefix?limit=20` | `prefix`, `limit?` | Words by kana prefix | words |

### Kanji

| Method | Path | Params | Response | DB Tables |
|---|---|---|---|---|
| GET | `/api/kanji/:literal` | `literal` | Single kanji | kanji |
| GET | `/api/kanji?grade=2` | `grade` (int or range "1-6") | Kanji by grade | kanji |
| GET | `/api/kanji?strokes=9` | `strokes` (int or range "8-12") | Kanji by stroke count | kanji |
| GET | `/api/kanji?radical=72` | `radical` (int) | Kanji by radical | kanji |
| GET | `/api/kanji?meaning=water` | `meaning` | Kanji by meaning | kanji |
| GET | `/api/kanji?on=ショク` | `on` (katakana) | Kanji by on reading | kanji |
| GET | `/api/kanji?kun=た.べ` | `kun` (hiragana) | Kanji by kun reading | kanji |

### Names

| Method | Path | Params | Response | DB Tables |
|---|---|---|---|---|
| GET | `/api/names?q=tanaka` | `q` | Search proper-name dictionary | names |

### Translate (DeepL proxy)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/translate` | `{ text, targetLang }` | `{ translated }` |

Disabled when `DEEPL_API_KEY` is not set.

---

## Protected — User profile

Identity is the JWT. Routes that take `:id` in the path verify it
matches `req.user.userId` via `requireUserMatch`.

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| GET | `/api/user/:id` | — | `UserProfile` (public columns) | `:id` must match token user |
| PATCH | `/api/user` | `{ updates: ProfileUpdate }` | `UserProfile` | Allow-listed fields only (display_name, email, language, avatar_index, onboarding_completed) |
| PUT | `/api/user/onboarding` | `{ completed: boolean }` | `{ message: 'OK' }` | |
| DELETE | `/api/user` | — | `{ message: 'Account deleted' }` | Revokes all refresh tokens, cascade-deletes everything |

`UserProfile` shape:
```
{ id, username, display_name, email, language, avatar_index,
  onboarding_completed, created_at }
```
`password_hash` is never returned.

---

## Protected — Books

| Method | Path | Body | Response | Ownership check |
|---|---|---|---|---|
| POST | `/api/books` | `{ filename, title, author?, coverColor?, fileHash?, ...fingerprints }` | `BookProgressRecord` | user is `req.user.userId` |
| POST | `/api/books/match` | `{ books: BookFingerprint[] }` | `(MatchResult \| null)[]` | scoped to caller |
| GET | `/api/books/user/:userId` | — | `BookProgressRecord[]` | `:userId` ↔ token user |
| GET | `/api/books/:id` | — | `BookProgressRecord` | `bookOwnedBy(token, id)` |
| PUT | `/api/books/:id/progress` | `{ cfiPosition, progress, spineIndex, totalSpineItems }` | `BookProgressRecord` | `bookOwnedBy` |
| POST | `/api/books/:id/progress` | (same) | (same) | (same) — sendBeacon variant |
| PATCH | `/api/books/:id` | `{ title }` | `BookProgressRecord` | `bookOwnedBy` |
| PUT | `/api/books/:id/identity` | `{ ...fingerprints }` | `BookProgressRecord` | `bookOwnedBy` |
| DELETE | `/api/books/:id` | — | `{ message }` | `bookOwnedBy` |

### Bookmarks (nested)

| Method | Path | Body | Response | Ownership check |
|---|---|---|---|---|
| POST | `/api/books/:id/bookmarks` | `{ cfi, label? }` | `Bookmark` | `bookOwnedBy` |
| GET | `/api/books/:id/bookmarks` | — | `Bookmark[]` | `bookOwnedBy` |
| DELETE | `/api/books/bookmarks/:bookmarkId` | — | `{ message }` | `bookmarkOwnedBy` |

---

## Protected — Decks + cards

| Method | Path | Body | Response | Ownership check |
|---|---|---|---|---|
| POST | `/api/decks` | `{ name, description? }` | `DeckRecord` | user is `req.user.userId` |
| GET | `/api/decks/user/:userId` | — | `DeckRecord[]` | `:userId` ↔ token user |
| GET | `/api/decks/:id` | — | `DeckRecord` | `deckOwnedBy` |
| PUT | `/api/decks/:id` | `{ name?, description? }` | `DeckRecord` | `deckOwnedBy` |
| DELETE | `/api/decks/:id` | — | `{ message }` | `deckOwnedBy` (cascades to cards) |

`DeckRecord` carries two derived fields alongside the `decks` row, assembled in
[`src/repositories/deckRepository.js`](./src/repositories/deckRepository.js):

```
{ id, user_id, name, description, created_at,
  card_count: number,
  last_card: { id, front, reading, back, state, created_at } | null }
```

- `card_count` — a scalar subquery over `cards`.
- `last_card` — the deck's **most recently added card** (`created_at DESC`, `id
  DESC` as tiebreaker), or `null` for an empty deck. Added for the decks screen's
  "Last Added Word" row. Only the displayed columns are selected; it is not a
  `CardRecord` and carries no SRS state beyond `state`. A `LEFT JOIN LATERAL`
  keeps the whole list to one round trip — **don't** fetch each deck's card
  inventory to read the newest row off the end.

All four deck responses share this shape: `POST` and `PUT` re-read through
`findById` after mutating, so a client never has to know which endpoint produced
a deck.

`description` is still a column and the mobile app still reads and writes it.
The web dropped the feature with the decks redesign and ignores the field.

### Cards (nested)

| Method | Path | Body | Response | Ownership check |
|---|---|---|---|---|
| POST | `/api/decks/:id/cards` | `{ front, reading?, back, notes?, contextSentence? }` | `CardRecord` | `deckOwnedBy(:id)` |
| GET | `/api/decks/:id/cards` | — | `CardRecord[]` | `deckOwnedBy(:id)` |
| GET | `/api/decks/:id/cards/due` | — | `CardRecord[]` (due in this deck, most-overdue first) | `deckOwnedBy(:id)` |
| GET | `/api/decks/:id/cards/due/count` | — | `{ count: number }` | `deckOwnedBy(:id)` |
| PUT | `/api/decks/cards/:cardId` | `{ front?, reading?, back?, notes?, state?, contextSentence? }` | `CardRecord` | `cardOwnedBy` |
| POST | `/api/decks/cards/:cardId/review` | `{ outcome: 'again' \| 'hard' \| 'easy' }` | `CardRecord` (with updated SRS columns) | `cardOwnedBy` |
| DELETE | `/api/decks/cards/:cardId` | — | `{ message }` | `cardOwnedBy` |

Submitting a review applies the SRS algorithm
([`src/services/cardSrsService.js`](./src/services/cardSrsService.js))
and atomically updates the card's `difficulty`, `stability`,
`last_outcomes`, `last_reviewed_at`, and `state`. The same call appends
an event row to `card_reviews` and bumps the user's `study_days` row
for today.

`CardRecord` includes the SRS columns: `difficulty`, `stability`,
`last_outcomes`, `last_reviewed_at`, `next_due_at`, plus the legacy `notes`,
`reviewed_times`, etc. State enum: `new | seen | learned | mastered`.

**Due cards.** A card is *due* when it has never been reviewed
(`next_due_at IS NULL`) or its scheduled `next_due_at` has passed. Each
review recomputes `next_due_at = last_reviewed_at + stability ·
ln(1/0.9)` (≈ `stability/10` days).

Six surfaces expose that predicate, all sharing one SQL fragment
(`DUE` in [`src/repositories/cardRepository.js`](./src/repositories/cardRepository.js))
so the definition can't drift between them:

| Surface | Shape |
|---|---|
| `GET /api/decks/:id/cards/due` | raw inventory for one deck, no `limit` |
| `GET /api/study/due` | raw inventory across all decks, no `limit` |
| `GET /api/decks/:id/cards/due/count` | `{ count }` for one deck |
| `GET /api/study/due/counts` | `{ total, byDeck }` across all decks |
| `GET /api/study/due/random` | one random due card |
| `POST /api/study/session` + `dueOnly: true` | a ready-to-study session — mode-ordered and `limit`-capped |

The two inventory endpoints apply no `limit` and order most-overdue first with
never-reviewed cards first; the client decides session size.

Reach for the right one:
- **A count** → a count endpoint. Never fetch an inventory to read its
  `.length`; that ships every card row to produce one integer.
- **A session** → `dueOnly`. It reuses the mode ordering and the cap instead of
  making the client re-implement them.
- **An inventory** → only when the client genuinely needs the rows themselves.

---

## Protected — Study (session + prefs)

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/api/study/session` | `{ scope, deckIds?, mode, limit?, dueOnly? }` | `{ cards: CardRecord[] }` | Cards already in display order |
| GET | `/api/study/due` | — | `{ cards: CardRecord[] }` | All cards due now across every deck the user owns, most-overdue first |
| GET | `/api/study/due/counts` | — | `{ total: number, byDeck: { [deckId]: number } }` | Due counts without the card rows. Decks with nothing due are **omitted** from `byDeck` |
| GET | `/api/study/due/random` | — | `{ card: CardRecord \| null }` | One random due card. `null` (with 200) when nothing is due |
| GET | `/api/study/prefs` | — | `{ display, deckOverrides }` | Returns defaults when no row exists |
| PUT | `/api/study/prefs` | `{ display?, deckOverrides? }` | `{ display, deckOverrides }` | Upsert; either field optional |

**Session body**:
- `scope`: `'all'` (every deck owned by the user) or `'deck'` (the listed deck IDs).
- `deckIds`: required when `scope === 'deck'`. Unowned IDs are silently dropped.
- `mode`: one of `hardest` (default) · `random` · `oldest_first` · `oldest_only` · `newest_only` · `by_creation` · `hardest_all_decks`.
- `limit`: defaults to 20. Capped per session size from `user_study_prefs.deck_overrides` if the client passes that value through.
- `dueOnly`: optional boolean, default false. Narrows the candidate **pool** to
  cards due right now (never reviewed, or past `next_due_at`) *before* `mode`
  orders it — it's a filter, not a mode, so it composes with all seven.
  `{ scope: 'all', dueOnly: true }` is the "study every due card across all
  decks" session. Combining it with a mode that also filters
  (`oldest_only`, `newest_only`) intersects both and can legitimately return
  fewer than `limit` cards. 400 if present and not a boolean.

**Mode semantics**:
- `hardest` — difficulty + (1−R) fading boost + recent-failure boost + state bias + random jitter, sorted desc.
- `random` — uniform shuffle, no weighting.
- `oldest_first` — by `last_reviewed_at` ASC; never-reviewed cards float first.
- `oldest_only` — filter to cards last reviewed > 7 days ago (or never), then shuffle.
- `newest_only` — only `state = 'new'`, shuffled.
- `by_creation` — by `created_at` ASC.
- `hardest_all_decks` — `hardest` ordering, but pool = every deck the user owns regardless of `scope`.

**Prefs `display` shape** (defaults shown):
```json
{
  "preset": "default",
  "front": { "reading": false, "context": true, "jlpt": true, "deckName": true },
  "back":  { "exampleSentence": true }
}
```

**Prefs `deckOverrides` shape**:
```json
{ "<deckId>": { "mode": "hardest", "sessionSize": 20 } }
```

---

## Protected — Stats

Read-only aggregations for the global stats screen. All queries scoped
to the token user.

| Method | Path | Response |
|---|---|---|
| GET | `/api/stats/activity` | `{ daysStudied: number, perDay: [{ date: 'YYYY-MM-DD', count: number }] }` |
| GET | `/api/stats/cards` | `{ byState: { new, seen, learned, mastered }, total: number, hardest: CardRecord[] }` |
| GET | `/api/stats/recent-upgrades` | `RecentUpgrade[]` — the 5 latest tier promotions, newest first |

- `perDay` covers the last 365 days; only days with ≥ 1 review are listed.
- `hardest` returns at most 20 cards (sorted by `difficulty` desc, with
  recent-Again count as a tiebreaker).

### `RecentUpgrade`

```
{ cardId, deckId, deckName, front, reading, back,
  stateBefore, stateAfter, reviewedAt }
```

Read from the `card_reviews` log, not from `cards`, so each row reports the
transition it actually caused and later reviews don't overwrite it.

- **Promotions only.** An "upgrade" moves *up* the ladder
  `new < seen < learned < mastered`; `again`-driven demotions
  (mastered→learned, learned→seen) are excluded, as is any review that leaves
  the tier unchanged.
- **Events, not distinct cards** — a card promoted twice appears twice.
- Card + deck columns are joined in so a caller can render the promotion
  without a follow-up fetch per card.
- camelCase because it's a purpose-built aggregate rather than a raw `cards`
  row (`CardRecord` stays snake_case).

---

## Protected — Devices

Per-device book availability tracking (which device has the local
file for which book).

| Method | Path | Body / Params | Response | Ownership check |
|---|---|---|---|---|
| POST | `/api/devices` | `{ deviceId, name? }` | `DeviceRecord` | user is `req.user.userId` |
| GET | `/api/devices/user/:userId` | — | `DeviceRecord[]` | `:userId` ↔ token user |
| PUT | `/api/devices/:deviceId` | `{ name }` | `DeviceRecord` | `deviceOwnedBy` |
| DELETE | `/api/devices/:deviceId` | — | `{ message }` | `deviceOwnedBy` |
| POST | `/api/devices/:deviceId/books/:bookId/available` | — | `BookAvailability` | `deviceOwnedBy` AND `bookOwnedBy` |
| DELETE | `/api/devices/:deviceId/books/:bookId/available` | — | `{ message }` | (same) |
| GET | `/api/devices/:deviceId/books` | — | `BookProgressRecord[]` (with `available` flag) | `deviceOwnedBy` |

---

## Error response shape

All error responses are JSON:
```
{ "error": "<message>" }
```

- 400 — body validation failure (zod) or weak password
- 401 — missing / invalid / expired token, or wrong credentials on `/auth/login`
- 403 — token user ≠ path `:userId` (in `requireUserMatch` routes)
- 404 — resource not found, OR token user doesn't own the resource (id-only routes)
- 409 — username already taken
- 429 — rate limited (`Retry-After` header set)
- 500 — generic; backend never echoes internal messages on the auth surface
