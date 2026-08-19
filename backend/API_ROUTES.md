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
| POST | `/api/auth/register` | `{ username, email, password }` | **403 — closed**, see below | 5/30min/IP |
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
- 400: zod validation failure (username / email / password format) — passwords must be 8+ chars with at least one non-letter; email must be a valid address, max 254 chars
- 401: invalid credentials / refresh token
- 409: `Username already taken` (`code: USERNAME_TAKEN`) or `That email is already in use`
  (`code: EMAIL_TAKEN`) — register only. Both are 23505; the constraint name
  picks the message, so the client can point at the offending field.
- 429: rate limited

**`email` is required on register**, but `users.email` is nullable in the DB:
pre-existing accounts have no address and nothing to backfill from. The
requirement lives in `registerSchema`, not in the column. Login is
username-keyed — the address is stored for later, not used to authenticate.

**Register is closed**: the handler's first statement is
`return res.status(403).json({ error: "Registration is currently disabled." })`,
so no request gets past it — validation, `registerLimiter` (5/30min/IP) and the
409 paths above are all still wired and simply unreachable. To open sign-ups
again, delete that one `return` rather than rewriting the handler.

---

## Public — Dictionary (no auth)

### Search

| Method | Path | Body / Params | Response | DB Tables |
|---|---|---|---|---|
| GET | `/api/search?q=食べる` | `q` (required) | Unified search: words, names, kanji | words, kanji, names |

### Words

| Method | Path | Params | Response | DB Tables |
|---|---|---|---|---|
| GET | `/api/words/:id/details` | `id` | Word + kanji breakdown + readings (with pitchAccents) + ≤ 5 example sentences | words, kanji, example_sentences |

> Kanji and name data reach clients through the ranked search pipeline, which
> returns them inline for single-kanji and kana queries — there are no separate
> kanji/name lookup endpoints.

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
  onboarding_completed, sky_seed, created_at }
```
`password_hash` is never returned. `sky_seed` (16 hex chars, migration 025)
is the immutable per-user seed the client generates the star map from — it
rides on every profile-shaped response (register/login/refresh included) but
is **not** PATCHable.

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
| GET | `/api/decks/user/:userId/cards` | — | `{ decks: (DeckRecord & { cards: CardRecord[] })[] }` | `:userId` ↔ token user |
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

`description` is a column the mobile app reads and writes; the web client
ignores the field.

`GET /api/decks/user/:userId/cards` is the bulk read behind the /sky page: every
deck the user owns (same rows and order as `GET /api/decks/user/:userId`), each
carrying its full card list under `cards` (same `CardRecord` shape and
`created_at DESC` order as `GET /api/decks/:id/cards`; empty decks carry
`cards: []`). Two queries server-side — the deck list plus one pooled card
query — instead of a per-deck fan-out. Unpaginated; bounded by the per-user
card quota.

### Cards (nested)

| Method | Path | Body | Response | Ownership check |
|---|---|---|---|---|
| POST | `/api/decks/:id/cards` | `{ front, reading?, back, notes?, contextSentence?, jlptLevel?, meanings? }` | `CardRecord` | `deckOwnedBy(:id)` |
| GET | `/api/decks/:id/cards` | — | `CardRecord[]` | `deckOwnedBy(:id)` |
| GET | `/api/decks/:id/cards/due/count` | — | `{ count: number }` | `deckOwnedBy(:id)` |
| PUT | `/api/decks/cards/:cardId` | `{ front?, reading?, back?, notes?, state?, contextSentence?, jlptLevel?, meanings? }` | `CardRecord` | `cardOwnedBy` |
| POST | `/api/decks/cards/:cardId/review` | `{ outcome: 'again' \| 'hard' \| 'good' \| 'easy' }` | `CardRecord` (with updated SRS columns) | `cardOwnedBy` |
| DELETE | `/api/decks/cards/:cardId` | — | `{ message }` | `cardOwnedBy` |

The four outcomes are FSRS grades 1–4. **`good` was added in migration 027** —
older clients sending only `again`/`hard`/`easy` still validate, but their
third button is emitting grade 4 (Easy) on every success, which applies the
easy bonus each time and drives difficulty to its floor. Such a client wants
updating, not just tolerating.

**A review only counts if the card is due.** Grading a card whose
`next_due_at` is still in the future returns the card **unchanged**, with a
`200`: no memory update, no `card_reviews` row, no `reviewed_times`, no
`study_days` bump. Studying ahead is practice and moves nothing in either
direction — it can't earn stability and it can't lose it. The check lives in
`cardSrsService.isDue` and mirrors the `DUE` SQL fragment that decides which
cards a due session serves, so a card the app tells you to study always counts.
Clients run the same rule locally to avoid promising a rank change that won't
happen, but this is the authority.

Submitting a review of a **due** card runs FSRS-6 ([`src/services/fsrs.js`](./src/services/fsrs.js),
wrapped by [`src/services/cardSrsService.js`](./src/services/cardSrsService.js))
and atomically updates the card's `stability`, `difficulty`, `state`,
`peak_rank`, `last_outcomes`, `last_reviewed_at` and `next_due_at`. The same
call appends an event row to `card_reviews` and bumps the user's `study_days`
row for today.

`CardRecord` includes the SRS columns: `stability`, `difficulty` (**both
nullable** — null until the card's first review), `state`, `peak_rank`,
`last_outcomes`, `last_reviewed_at`, `next_due_at`, plus the legacy `notes`,
`reviewed_times`, etc. Rank enum: `new | met | learned | mastered` (the `seen`
tier was renamed `met` in 027).

`state` is the card's *current* rank, derived from `stability`; `peak_rank` is
the highest it has ever held. **Clients should draw `peak_rank` once it reaches
`learned`** and show the lost stability as brightness instead — see
`fsrs.displayedRank`. Retrievability is never returned: it is a function of
`stability` and elapsed time, so a client computes it on demand rather than
holding a copy that is stale the moment it arrives.

**Request keys are camelCase, response keys are the raw snake_case columns.**
That asymmetry has always been true (`contextSentence` in, `context_sentence`
out), but `jlptLevel` is the first *card* field where the two names differ
visibly enough to trip someone up: you **POST `jlptLevel`** and you **read
`jlpt_level`**. Card reads are `SELECT *`, so the response is the column list
verbatim — there is no mapping layer to fix it in.

Two snapshot fields, added in migration 026 and captured from the dictionary
entry the card was made from:

- **`jlpt_level`** — `number | null`, 5 (N5, easiest) … 1 (N1). `null` means
  unknown, which covers both "not on any JLPT list" and "card created before
  026". Sent as `jlptLevel`, and only as a JSON **number** — the string `"3"` is
  a 400, deliberately, so a client bug surfaces instead of being coerced away.
  It is *not* recomputed when the card is edited: a `PUT` that changes `front`
  leaves the old tier in place, and because the update path is `COALESCE`,
  `{"jlptLevel": null}` is a **no-op, not a clear**.
- **`meanings`** — `string[]`, at most 3 entries, each 1–200 chars after trim
  (empty-string entries are rejected rather than stored; send a shorter array
  for fewer meanings). **Never `null`** — the column is `NOT NULL DEFAULT
  '{}'`, so a card with no captured glosses returns `[]` and clients can type
  it as a non-nullable `string[]`. `PUT` with `[]` does clear it.

`back` is unchanged and still **required** on POST — `meanings` sits beside it,
not in place of it. Existing clients that only read `back` keep working.

Two card-adjacent read surfaces deliberately do **not** carry the new fields,
because they hand-pick their columns and neither renders a JLPT chip: the
`last_card` object on the deck reads (`GET /api/decks/user/:userId`) and
`GET /api/stats/recent-upgrades`.

**Due cards.** A card is *due* when it has never been reviewed
(`next_due_at IS NULL`) or its scheduled `next_due_at` has passed. Each
review recomputes `next_due_at` from the new stability; at the fixed desired
retention of 0.9 the interval equals the stability, rounded to whole days.

Three surfaces expose that predicate, all sharing one SQL fragment
(`DUE` in [`src/repositories/cardRepository.js`](./src/repositories/cardRepository.js))
so the definition can't drift between them:

| Surface | Shape |
|---|---|
| `GET /api/decks/:id/cards/due/count` | `{ count }` for one deck |
| `GET /api/study/due/counts` | `{ total, byDeck }` across all decks |
| `POST /api/study/session` + `dueOnly: true` | a ready-to-study session — mode-ordered and `limit`-capped |

Reach for the right one:
- **A count** → a count endpoint. Never fetch a session to read its `.length`;
  that ships every card row to produce one integer.
- **The cards** → `dueOnly`. It reuses the mode ordering and the cap instead of
  making the client re-implement them.

---

## Protected — Study (session + prefs)

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/api/study/session` | `{ scope, deckIds?, mode, limit?, dueOnly? }` | `{ cards: CardRecord[] }` | Cards already in display order |
| GET | `/api/study/due/counts` | — | `{ total: number, byDeck: { [deckId]: number } }` | Due counts without the card rows. Decks with nothing due are **omitted** from `byDeck` |
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
- `hardest` — `(1−R)` fading + normalised difficulty + rank bias + random jitter, sorted desc.
  The fading term leads: under FSRS, retrievability already folds in stability,
  elapsed time and every past grade, so it is the best answer to "what needs
  reviewing". Never-reviewed cards count as half-faded so they land mid-pack
  rather than last.
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
| GET | `/api/stats/cards` | `{ byState: { new, met, learned, mastered }, total: number, hardest: CardRecord[] }` |
| GET | `/api/stats/recent-upgrades?deckId=` | `RecentUpgrade[]` — the 5 latest tier promotions, newest first. `deckId` (optional uuid) narrows them to one deck; 400 if it isn't a uuid |

- `perDay` covers the last 365 days; only days with ≥ 1 review are listed.
- `hardest` returns at most 20 cards (sorted by `difficulty` desc — the FSRS
  [1, 10] scale since 027 — with recent-Again count as a tiebreaker). Cards
  with `state = 'new'` are excluded, which is also what keeps null difficulties
  out of the list.

### `RecentUpgrade`

```
{ cardId, deckId, deckName, front, reading, back,
  stateBefore, stateAfter, reviewedAt }
```

Read from the `card_reviews` log, not from `cards`, so each row reports the
transition it actually caused and later reviews don't overwrite it.

- **Promotions only.** An "upgrade" moves *up* the ladder
  `new < met < learned < mastered`; demotions (a lapse dropping stability back
  below a threshold) are excluded, as is any review that leaves the tier
  unchanged.
- **Reports `state`, not `peak_rank`.** This list answers "what did I just
  achieve", and a card whose *displayed* rank is being held up by its
  high-water mark achieved nothing on the review that lapsed it.
- **Events, not distinct cards** — a card promoted twice appears twice.
- Card + deck columns are joined in so a caller can render the promotion
  without a follow-up fetch per card.
- **`deckId` filters before the limit.** Don't fetch the global five and
  filter client-side: a deck's own recent promotions frequently aren't among
  the five most recent overall, so an active deck would look idle. Ownership
  needs no separate check — rows are already scoped by `user_id`, so another
  user's deck id matches nothing.
- camelCase because it's a purpose-built aggregate rather than a raw `cards`
  row (`CardRecord` stays snake_case).

---

## Quotas + input limits

Every write endpoint validates its body against a zod schema
(`src/validation/*.js`) and every insert is gated by a per-user quota
(`src/services/quotas.js`). All numbers live in one file:
[`src/config/limits.js`](./src/config/limits.js).

| Resource | Limit | Error code |
|---|---|---|
| Books per user | 50 | `BOOK_QUOTA_EXCEEDED` |
| Decks per user | 50 | `DECK_QUOTA_EXCEEDED` |
| Cards per deck | 5000 | `CARD_QUOTA_EXCEEDED` |
| Bookmarks per book | 500 | `BOOKMARK_QUOTA_EXCEEDED` |

Field caps (characters, after trim): deck name 100 · card front/reading 200 ·
card back/notes/context 2000 · card meaning (one entry of `meanings`) 200 ·
book title/author/filename 500 · book CFI 2000 · bookmark label 100 ·
display_name 64 · email 254 · language 16.

Array caps: `books/match` candidates 200 · `pageHashes`/`pagePhashes` 5000 ·
session `deckIds` 50 · card `meanings` 3.

`cards.state` and `cards.peak_rank` are constrained to
`new | met | learned | mastered` by both the schema and DB CHECKs (migration
024, restated and renamed in 027). Writing `state` through
`PUT /api/decks/cards/:cardId` is allowed but not meaningful: it is derived
from `stability` and the next grade overwrites it.

`cards.jlpt_level` is constrained to `1..5` (or `null`) and `cards.meanings` to
at most 3 entries by both zod and a DB CHECK (migration 026). The **per-entry**
200-char cap on `meanings` is zod-only — expressing it in a CHECK needs an
`unnest`, so it lives in one place instead of two half-places.

One quota exemption, because the underlying write is an upsert rather than an
insert: `POST /api/books` with a `filename` the user already has returns the
existing row, so it is not refused at the book quota (re-syncing a library
from a second device still works at the cap).

Result-size ceilings: public dictionary lookups are internally capped at 100
rows; `POST /api/study/session` accepts `limit` up to 200 (a larger value is a
400).

## Error response shape

All error responses are JSON:
```
{ "error": "<message>" }
```

Quota rejections carry three extra fields so a client can render an exact
message without parsing prose:
```
{ "error": "Deck limit reached (50). Delete a deck to make room.",
  "code": "DECK_QUOTA_EXCEEDED", "limit": 50, "current": 50 }
```

- 400 — body validation failure (zod) or weak password
- 401 — missing / invalid / expired token, or wrong credentials on `/auth/login`
- 403 — token user ≠ path `:userId` (in `requireUserMatch` routes)
- 404 — resource not found, OR token user doesn't own the resource (id-only routes)
- 409 — username already taken; email already in use (`EMAIL_TAKEN`, on
  `PATCH /api/user`); resource quota reached (`*_QUOTA_EXCEEDED`, see above)
- 429 — rate limited (`Retry-After` header set)
- 500 — generic; backend never echoes internal messages on the auth surface
