# Architecture

The long version of the decisions summarised in the [README](../README.md). Everything here is
read from source; where the code and the older docs disagree, the code wins and the
disagreement is noted.

---

## 1. Why three deployables and no workspace tool

`backend/`, `web-frontend/aogimi-web/` and `mobile-frontend/aogimi-mobile/` each have their own
`package.json` and `node_modules`. There is no npm workspace, no pnpm workspace, no Nx, no
Turborepo.

The upside is that each package installs, builds and deploys with nothing to configure, and a
Next 16 dependency resolution cannot break an Expo 55 one. React Native in particular is
unforgiving about hoisted dependencies and Metro resolution, and a shared `node_modules` is a
recurring source of build failures there.

The cost is exactly one thing, and it is the cost the README is honest about: **there is no
mechanism for shared code.** Anything both the backend and a client needs has to be copied. The
FSRS scheduler is the expensive instance. If this repository were set up again, a workspace with
a `packages/scheduler` would remove two of the four mirrors described below.

## 2. Backend layering in detail

### The three layers

```
src/routes/<entity>.js         parse · validate (zod) · check ownership · status codes
        │
        ▼
src/services/<entity>Service.js business logic · cross-table assembly · domain errors
        │
        ▼
src/repositories/<entity>Repository.js   SQL, and nothing else
        │
        ▼
src/db.js                       one pg Pool
```

### The rule that keeps it honest

A repository owns exactly one SQL family and imports nothing but `../db` (three of them also
import `../config/limits` for `LIMIT` clamps — that is the only exception, and it is a constant
table, not another repository).

Every cross-entity operation therefore lands in a service, where it is visible:

- **`services/cardService.reviewCard`** coordinates `cardRepository`, `cardReviewRepository` and
  `studyDayRepository`. Applying a review means three writes to three tables; none of those
  repositories knows the others exist.
- **`services/quotas.js`** reads counts from `deckRepository`, `cardRepository` and
  `bookRepository` to answer "is this user at their limit". A repository-level quota check
  would need each repository to know about the others.
- **`services/searchService.js`** composes `kanjiRepository`, `nameRepository`, the search index
  and the deinflector, and is the only place that knows a single-kanji query should also fetch
  names and kanji-containing words.

### Where routes bypass a service, and why

`src/routes/study.js` imports `userStudyPrefsRepository` directly for the two `/prefs`
endpoints. There is no prefs service because there is no logic — the handler reads a row or
upserts one, with a defaults object for the not-yet-created case. Introducing a service that
only forwards would add a file and no clarity. This is the single deviation in the route layer.

`src/routes/stats.js` calls `statsService`, which is itself thin, because the aggregation SQL
belongs in `statsRepository` and the route belongs to a group.

### Errors

Services throw plain `Error`s carrying a `code` (`INVALID_CREDENTIALS`, `USERNAME_TAKEN`,
`USER_GONE`, `DECK_QUOTA_EXCEEDED`) or a `status` property. Routes map those onto HTTP codes and
never echo an internal message on the auth surface. The terminal handler in `app.js` catches
everything else: a CORS rejection becomes 403, a Postgres `22P02` becomes 404, and everything
else becomes a generic 500 with no stack trace regardless of `NODE_ENV`.

## 3. FSRS-6 — the full note

### The three quantities

| | Meaning | Persisted |
|---|---|---|
| **S** stability | Days for recall probability to fall from 100% to 90% | `cards.stability`, nullable until first review |
| **D** difficulty | How hard it is to raise S for this card, `[1, 10]` | `cards.difficulty`, nullable until first review |
| **R** retrievability | Probability of recall right now, `(0, 1]` | **Never** — derived from S and elapsed time |

The forgetting curve is `R(t, S) = (1 + FACTOR·t/S)^DECAY`, a decaying **power** function. That
is the empirical basis of FSRS and the thing an exponential implementation gets wrong.

### The constants that must be derived, not copied

- `DECAY = -w[20]`. The parameter is stored positive; using `+w20` inverts the curve so memory
  would strengthen with time.
- `FACTOR = 0.9^(1/DECAY) - 1`, defined so `R(S, S) === 0.9` exactly. The familiar `19/81 ≈
  0.2346` is the FSRS-4.5 value; FSRS-6 with the default `w20` gives ≈ 0.9803. `w20` is
  optimisable, so hardcoding either number is wrong.
- The mean-reversion target in `nextDifficulty` is the **unclamped** `D0(4)` — about −4.7716
  with default parameters, not 1.0. Clamping it there changes every subsequent difficulty.

The harness asserts all three. It also caught a transcription slip in a commonly quoted value:
`D0(4)` circulates as −4.7723, where `w4 - exp(w5·3) + 1` is −4.771631 — the same expression
reproduces `D0(1..3)` to the last quoted digit, so the slip is in the quoted number, not the
formula. Practically it moves every subsequent difficulty by ~7e-7, because `w7` is 0.001 — but
the harness asserts the derived value.

### The branches

```
review(prior, outcome, now)
  ├─ first review           → S = w[grade-1],  D = clamp(D0(grade))
  ├─ elapsed < 1 day        → short-term formula (replaces the long-term path entirely)
  ├─ grade = Again          → lapse formula,   ceiling S/exp(w17·w18)  ← not plain S
  └─ Hard / Good / Easy     → recall formula,  hard penalty w15, easy bonus w16
```

Ordering is load-bearing twice. Stability is computed **before** difficulty and reads the old
difficulty. R is measured **before** the review, against the state that was decaying.

The lapse ceiling is the detail most third-party write-ups state as `min(…, S)`. The reference
implementation uses `min(…, S / exp(w17·w18))`, which is close and different.

### Scheduling floors, display does not

`fsrs.elapsedDaysFor` floors to whole days, matching py-fsrs reading `.days` off a timedelta —
that is what makes these numbers comparable to every published FSRS figure. But
`cardSrsService.computeRetrievability` deliberately uses **fractional** elapsed days, because it
drives a star's brightness and a progress ring, and an indicator that steps once a day reads as
a stuck UI rather than as decay. This is the one place fractional time is correct.

### The due gate

`cardSrsService.isDue` mirrors the `DUE` SQL fragment in `cardRepository` exactly:

```js
const DUE = "(next_due_at IS NULL OR next_due_at <= now())";
```

The two must agree, because one decides which cards a session *serves* and the other decides
whether a grade *counts*. A card that qualifies for one but not the other is a card the user is
told to study and then gets no credit for.

Grading a card that is not due does nothing: no stability change, no rank change, no schedule
change, no `card_reviews` row, no `study_days` bump. The reason is that FSRS's model is "what
does recall at *this* retrievability tell us about the memory", and a card reviewed at R ≈ 0.99
tells us nearly nothing — but the recall formula will award a stability increase anyway. Without
the gate, repeatedly drilling a fresh card inflates it for free.

One consequence worth knowing: a card re-seated by the in-session queue is no longer due, so
FSRS's same-day path is currently unreachable through the UI. The formula is implemented and
verified; nothing routes to it.

### Rank and the high-water mark

Rank is a pure function of stability: `new` (never reviewed) · `met` (S<21) · `learned`
(21≤S<365) · `mastered` (S≥365). Never difficulty, never streaks. A stability threshold means
something a streak cannot, and it cannot be farmed — cramming a card five times in a session
takes the same-day path, which barely moves S.

`cards.peak_rank` is a high-water mark. Once a card reaches `learned`, `displayedRank()` never
draws it lower again: the shape of a star is a record of what the user achieved, and taking it
away on one bad morning punishes the person for the algorithm's own correct pessimism. The lost
stability is still shown — as brightness, from retrievability. A lapsed mastered card keeps its
silhouette and goes dim.

`cards.state` is redundant with stability by construction and is kept anyway, because
`statsRepository` buckets by it in SQL and `idx_cards_state` exists. Deriving it per query would
be the expensive kind of purity.

### Desired retention

Fixed at 0.9 and deliberately not exposed. At 0.9 the interval equals stability, which is what
every published FSRS table assumes. Lower it and reviews space out (0.8 → 3.3× the interval);
raise it and they crowd (0.95 → 0.4×). A slider here lets a user destroy their own retention
with a control they have no way to evaluate.

### Parameters are not optimised

The shipped 21 are the authors' defaults, fitted on ~10k Anki collections. A per-user fit needs
400–1000 reviews before it beats them, and the optimiser is torch-based gradient descent that
has no business in a request process. `card_reviews` is complete and append-only, so an offline
fit stays possible later.

## 4. The four mirrors

| Mirror | Copies | Forced? | Harness |
|---|---|---|---|
| FSRS-6 scheduler | backend, web, mobile | No — workspace-tooling gap | three, all pinned to py-fsrs 6.3.1 |
| Sky generation lib | web, mobile | No — same gap | `verify:sky` (golden values + cross-copy equality) |
| Camera clamp law | `lib/camera.ts`, `native/cameraWorklet.ts` | **Yes** | `verify:camera` (exact agreement) |
| Auth validation | `backend/src/validation/auth.js`, web `auth`'s `validate()` | No | none — validating less means a valid-looking form returns a server error |

The camera one is the only genuine constraint. Reanimated workletises only imports processed
under experimental `bundleMode`; outside it, a UI-thread worklet cannot call an imported plain
function. The sky camera's pan/zoom clamp runs on the UI thread — a pan or pinch is a matrix on
a world-space scene with no React render at all — so the clamp law had to be restated as
worklets. `map/lib` cannot absorb them, because `verify:sky` asserts that directory is
byte-identical to the web's.

The discipline that makes the rest tolerable: **each mirror is pinned to an external reference,
never to its sibling.** Two copies checked only against each other can drift together and both
be wrong. That is why all three FSRS harnesses assert the same py-fsrs vectors independently,
and why `verify:sky` keeps golden values checked in even though it also does a direct
cross-copy comparison.

`verify:sky` and `verify:camera` both compile their targets with `tsc` into a temp directory
rather than importing directly — the sky lib uses a TypeScript parameter property that Node's
strip-only type support rejects, and its imports are extensionless. Bending the source to suit
the runner was rejected because the source must stay byte-identical to the web's.

## 5. Auth flow, end to end

```
POST /api/auth/login  { username, password }
   │  bcrypt.compare against users.password_hash (cost 12)
   │  sign access  (15m, HS256, JWT_ACCESS_SECRET,  { userId, username })
   │  sign refresh (30d, HS256, JWT_REFRESH_SECRET, { userId, tokenId })
   │  INSERT refresh_tokens (token_hash = sha256(refresh), expires_at = now + 30d)
   │
   ├─ Origin header present  →  Set-Cookie: aogimi_refresh=… ; HttpOnly; Secure;
   │                            SameSite=Lax; Path=/api/auth; Max-Age=30d
   │                            body: { user, accessToken }
   └─ no Origin (native)     →  body: { user, accessToken, refreshToken }
```

Refresh reads the token from the cookie **or** the body, whichever is present. For browser
requests it first rejects any `Origin` not on the CORS allowlist — SameSite=Lax already blocks
the cookie cross-site, and this is defence in depth that also covers a future `SameSite=None`
configuration. On success the old `refresh_tokens` row is revoked and a new one inserted. On
`INVALID_REFRESH` or `USER_GONE` the browser's stale cookie is cleared so it stops being
resent on every page load.

Logout accepts a missing or bad token gracefully — the client just wants confirmation it can
drop local state — but still attempts revocation when a token is supplied.

The cookie is host-only (no `Domain`) and scoped to `/api/auth`, which works because the
intended deployment is same-site: web at the apex, API at an `api.` subdomain sharing a
registrable domain. `localhost:3001 → localhost:3000` is also same-site, so dev matches prod.
Moving the API to a different registrable domain requires `COOKIE_SAMESITE=none`, which forces
`Secure` on — the code handles that automatically.

Client side, `lib/api.ts` on both platforms is the chokepoint: it injects `Authorization`,
retries once through `/auth/refresh` on a 401, and does so **single-flight** so parallel 401s
share one in-flight refresh promise rather than racing through rotated tokens. A terminal 401
fires registered session-invalidation handlers, which wipe local state.

The web client also carries a one-time legacy migration: a previous build stored both tokens in
`localStorage`, and that refresh token stays valid server-side for ~30 days and is readable by
any script. `tokenStore.ts` purges the old keys on boot and revokes the leftover refresh token
first. Safe to delete once the deployed base has cycled.

## 6. Book identity and the matching chain

The problem: the same book arrives on two devices as two files that may not be byte-identical.
Re-downloaded EPUBs get repacked, PDFs get re-saved with new trailer IDs, scanned PDFs get
re-OCRed with a different text layer. The user expects one library entry with one reading
position.

`bookService.matchBooks` walks candidates against the user's library in strict priority order,
returning the first hit with a `match_type`:

| # | Signal | Formats | Why here |
|---|---|---|---|
| 1 | `file_hash` (SHA-256 of full bytes) | both | Same bytes. Nothing stronger exists. |
| 2 | XMP `OriginalDocumentID` | PDF | Stable across exports and re-saves. |
| 3 | PDF trailer `/ID[0]` | PDF | Survives metadata edits and most re-saves. |
| 4 | Scraped DOI | PDF | From the first ~3 pages. |
| 5 | ISBN + page count within 5% | PDF | Checksum-validated. The page-count guard separates editions. |
| 6 | `content_hash` | both | EPUB spine text SHA; PDF normalised-extracted-text SHA. Null for image-only PDFs. |
| 7 | Perceptual hash | PDF | Mean Hamming distance ≤ 8 over per-page dHashes, page count within 10%. Catches re-OCRed scans and image-only documents nothing text-derived can fingerprint. |
| 8 | `dc:identifier` | EPUB | OPF metadata, often an ISBN. |
| 9 | Title + author, case-insensitive | both | Metadata fallback. |
| 10 | Filename | both | Last resort. |

**Only layer 1 is trusted for silent auto-attach on import.** Layers 2–5 can collide legitimately
— batch-generated PDFs of a manga series routinely share a trailer `/ID` and XMP `DocumentID` —
and a false attach silently destroys the original's reading position.
Weaker matches are surfaced, not applied.

The route caps the candidate array length in its zod schema, because matching is a
Hamming-distance loop per candidate × per stored book × per sampled page, run synchronously. An
unbounded array stalls the event loop for every other request.

### Reconciliation on library mount

`features/books/lib/reconcileBooks.ts` runs once after auth and on an explicit "Sync now". Per
local IndexedDB book, keyed by filename:

- Backend has the same filename and the hashes agree → keep.
- Backend has it with a **different** `file_hash` → the local bytes are stale (the user
  re-uploaded different bytes under the same name elsewhere). Wipe the local file, reader record
  and progress.
- One side has a hash and the other does not → backfill the missing side.
- Backend does not have it → `POST /api/books` (idempotent on user+filename) to re-register, then
  re-evaluate. Network failure keeps the local copy for the next pass.

Deliberately not done: touching backend records absent locally (the UI surfaces those with a
"locate file" affordance instead), running on every refresh, or confirming before a wipe. The
aggressive wipe is a project decision; the file notes where a >25% safety threshold would go if
that becomes uncomfortable.

## 7. Reading position

Two tiers, because a per-turn backend write is a request per page turn:

1. **localStorage** (`reader_progress_<filename>`) — every page turn. This is the per-device
   buffer and the source of truth between flushes.
2. **Backend** (`book_progress.cfi_position` / `spine_index` / `progress`) — flushed
   periodically (~60s), on unmount, and on exit.

The exit path is `visibilitychange: hidden` and `pagehide`, using **`fetch(keepalive)`, not
`sendBeacon`**. `sendBeacon` cannot set headers, and the access token lives only in memory —
there is no cookie to fall back on for the API surface. Unmount uses a normal fetch, because
"back to library" is an SPA navigation that fires no unload event at all.

On open, the restore anchor is the newer of the local snapshot and the backend row, and the
engine does a one-shot `goTo`. The **first relocate of a session only seeds the dedup baseline**,
so opening a book never writes the restored position back — which is what makes a manual "mark
finished" (`{ progress: 100 }`) stick until a real page turn.

PDFs need no schema change: `pdfPosition.ts` encodes the page as `page-N` in the `cfi_position`
slot with the 1-based page mirrored into `spine_index`. The mobile PDF reader writes the same
encoding, so the two clients resume each other. Position *within* a page is not stored.

## 8. Search pipeline

```
GET /api/search?q=…
  normalize (NFKC, trim)
  ├─ single kanji     → kanji row ‖ words containing it ‖ names        (3 queries in parallel)
  ├─ contains kanji   → direct form match, else deinflect → retry
  ├─ pure kana        → deinflected word search ‖ names ‖ on-reading ‖ kun-reading kanji
  └─ romaji / English → romaji→kana search ‖ English gloss search, merged JP-first, deduped
  → index.hydrate(orderedIds)      one query, full nested payload
  → annotateKanjiGrades(rows)      one query for every unique CJK char across all results
  → JS sort (see below)
```

`hydrate` builds the entire nested result inside Postgres — `json_agg` subqueries for kanji
forms, readings with pitch accents, and meanings, each ordered by a per-form priority score
computed in SQL. That per-form scoring is what makes `kanji[0]` the canonical spelling (言う, not
云う) even when both live under the same `word_id`. The weights match migration 008's word-level
scoring and `assembler.js`'s `priorityScore`, so the search list and the detail page agree.

`annotateKanjiGrades` collects every unique CJK character across all results and resolves grades
in one round trip regardless of result count — the obvious N+1 in this pipeline, avoided.

The final ordering is done in JS because it is not expressible as a single SQL `ORDER BY` over
the scored set: a single-kanji word with an exact whole-meaning match in senses 1–5 outranks any
longer compound with an equally exact match, then any other exact whole-meaning match by
earliest sense, then JLPT presence with **higher numeric level first** (N5 before N1, since N5
vocabulary is what a learner meets more often), then kanji grade ascending, then primary form
length as a simplicity tiebreak.

`priority_score` is stripped from the public payload — it is an internal ranking input, not part
of the contract.

## 9. What is deliberately not here

- **No blob storage.** No S3, no CDN, no server-side book files. This removes an entire class of
  copyright liability and cost, at the price of the "not on this device" state the library UI
  has to render.
- **No guest mode.** Signed-out *is* the local-first state, and sign-up flushes what is pending.
- **No per-user FSRS optimisation.** See §3.
- **No desired-retention setting.** See §3.
- **No cross-device session listing or remote revoke.** Deferred. Revocation exists per token,
  and account deletion revokes all of them.
- **No audit logging.** Deferred. The request logger records the request line only — never
  bodies, never headers, never the `Authorization` token.
