# Aogimi

A three-deployable Node/PostgreSQL/React system — an Express REST API over Postgres, a Next.js
web client, and an Expo/React Native client — that unifies an e-book reader, a Japanese
dictionary, and a spaced-repetition scheduler into one account with cross-device sync. In
product terms: it turns the Japanese you actually read into the Japanese you actually know. You
import an EPUB or PDF, tap a word you don't recognise, and it becomes a card scheduled by FSRS-6.

The parts worth a reviewer's time are the scheduler (FSRS-6, all 21 parameters, verified against
the reference implementation), the sync model (book files never leave the device; only metadata
and reading position sync), and the auth transport (one token model, two deliveries, chosen per
client because browsers and native apps have different threat surfaces).

Live demo: `TODO: demo` · Demo credentials: `TODO: demo`

---

## Architecture at a glance

Three independently-deployable packages, no workspace tool — each has its own `package.json` and
`node_modules`.

| Path | What | Stack |
|---|---|---|
| [`backend/`](./backend/) | REST API: auth, books, decks, cards, study, stats, dictionary | Node 18+, Express 4, PostgreSQL, `pg` |
| [`web-frontend/aogimi-web/`](./web-frontend/aogimi-web/) | Next.js App Router web client | Next 16, React 19, Tailwind v4 |
| [`mobile-frontend/aogimi-mobile/`](./mobile-frontend/aogimi-mobile/) | Expo client (iOS, Android) | Expo 55, React Native 0.83 (Fabric) |

The backend is the only writer to Postgres. Both clients are local-first: they hold the state
they need to work offline and push opportunistically. Book blobs are the hard boundary — large,
the user's own files, and a copyright surface — so they never reach the server. Postgres stores
only the metadata and fingerprints needed to recognise the same book on another device.

```
                       ┌─────────────────────────────┐        ┌────────────────┐
    HTTPS + Bearer     │  backend/  (Express, Node)  │        │   PostgreSQL   │
 ┌────────────────────▶│  routes → services → repos  │───────▶│  17 tables —   │
 │                     │  raw SQL via `pg`           │        │  9 user-data,  │
 │                     └─────────────────────────────┘        │  8 dictionary. │
 │                                                            │  No blobs.     │
 │                                                            └────────────────┘
 ├── web-frontend/aogimi-web/          ├── mobile-frontend/aogimi-mobile/
 │   IndexedDB `aogimi`                │   expo-file-system documents/books/
 │     metadata · files · handles      │     (raw EPUB/PDF bytes)
 │     (raw EPUB/PDF bytes)            │   assets/dictionary.sqlite
 │   localStorage                      │     (bundled offline dictionary, FTS5,
 │     reading-position buffer         │      built from Postgres)
 │   access token in memory only       │   access token in memory,
 └── refresh token in httpOnly cookie  └── refresh in expo-secure-store
```

The mobile dictionary is a build artefact, not a second source of truth:
`helpers/files/build_sqlite_dict.js` dumps the Postgres dictionary tables into one SQLite file
with an FTS5 index over English glosses, and that ships in the app bundle. Mobile searches
locally; the web client calls `/api/search`.

Longer version of everything below: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Engineering decisions

### No ORM

Every repository uses raw `pg` with parameterised queries. Nothing in the dependency tree
generates SQL.

The two queries this system depends on are not ones an ORM writes well.
`PgSearchIndex.searchEnglish` is a CTE with a `MAX(CASE …)` scoring ladder over `word_meanings`;
`PgSearchIndex.hydrate` builds the entire nested `WordResult` payload inside Postgres with
correlated `json_agg` subqueries ordered by a computed priority score — one round trip, no N+1,
no post-hoc object-graph assembly. Either through a query builder means writing the SQL anyway
and then fighting the abstraction about it.

What is lost is real: no migration generator; no compile-time link between a column rename and
the code reading it, so a typo is a runtime error rather than a build error; and `snake_case`
row objects with no types attached, so the mapping to `camelCase` payloads is manual. Accepted
because the schema is small and stable.

### Route → service → repository, strictly

- `src/routes/<entity>.js` — request parsing, `zod` validation, ownership checks, status codes.
- `src/services/<entity>Service.js` — business logic and cross-table assembly.
- `src/repositories/<entity>Repository.js` — SQL, and nothing else.

The rule that makes this hold: **a repository owns exactly one SQL family and never imports
another repository.** Cross-entity work happens one layer up, where it is visible.
`cardService.reviewCard` coordinates `cardRepository`, `cardReviewRepository` and
`studyDayRepository`, because applying a review means updating the card, appending to the review
log and bumping the study-day counter — and none of those repositories knows the others exist.
`services/quotas.js` reads counts from five repositories to answer "is this user at their
limit", and is a service for exactly that reason.

The payoff: every SQL statement lives in a file named after the table it touches, so "where does
`cards.next_due_at` get written" is a one-file answer. It also keeps the ownership check honest —
`services/ownership.js` is five small SQL predicates that routes call *before* the service layer
runs, so no service has to remember to re-check. On the backend this is convention; on both
frontends the equivalent rule (`lib`/`shared` ← `features` ← `app`) is enforced by
`import/no-restricted-paths` in ESLint.

### FSRS-6, implemented from the spec and pinned to the reference

[`backend/src/services/fsrs.js`](./backend/src/services/fsrs.js) is a from-scratch
implementation of FSRS-6 — the free spaced-repetition scheduler — with all 21 parameters. It is
pure: no database, no card rows, no notion of a user. The domain layer that turns a card row
into a review is a separate file, `cardSrsService.js`.

The model has three quantities: **stability** (S), days until recall probability falls to 90%;
**difficulty** (D ∈ [1,10]), how hard it is to raise S; and **retrievability** (R), probability
of recall right now, a power-law function of S and elapsed time. S and D are persisted; R never
is, because it is derivable and would go stale every second.

Getting it right is mostly a matter of not making the handful of mistakes that produce
plausible-but-wrong intervals. Version matters — FSRS-4.5 has 17 parameters, FSRS-5 has 19, and
the formulas are not interchangeable, so `PARAMS.length` is asserted at module load rather than
trusted. `FACTOR` is derived so `R(S, S) === 0.9` exactly, because the widely-quoted `19/81` is
the FSRS-4.5 value. Hard is a *success with a penalty*, not a lapse. Stability is computed before
difficulty and reads the **old** difficulty. Elapsed time is the actual gap floored to whole
days, never the scheduled interval — a card reviewed 100 days after a 2-day interval has
R ≈ 0.56, and that gap is precisely the stability bonus the spacing effect exists to award. Each
is walked through in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#3-fsrs-6--the-full-note).

Two consequences are visible in the product. Rank comes from **stability alone** — `new` / `met`
(S<21) / `learned` (21≤S<365) / `mastered` (S≥365) — never from difficulty or answer streaks,
because "this will still be there in a year" is a fact about memory where "five Easies in a row"
is a fact about one afternoon. And **a review only counts if the card is due**:
`cardSrsService.isDue` gates every memory update, so grading early changes nothing at all — no
stability, no schedule, no `card_reviews` row. Studying ahead is practice. Without that gate,
drilling a fresh card at R ≈ 0.99 would hand out free stability, because the formula will
happily award it.

**Verification.** `cd backend && node scripts/verify-fsrs.js` is a test-vector harness against
**py-fsrs 6.3.1** run with `Scheduler(learning_steps=[], relearning_steps=[],
enable_fuzzing=False)` and desired retention 0.9 — the pure DSR path. It asserts the derived
constants, then replays seven review sequences chosen so a failure localises to one formula:
each single grade, six consecutive Good, Good×3 → Again → Good×2, six Hard, six Easy, an
always-100-days-late sequence, and a same-day sequence. Stability and difficulty are compared to
1e-4, intervals exactly, then the rank ladder and the `displayedRank` rule. Non-zero exit on
failure.

The overdue and same-day sequences matter most: if the overdue rows match the on-schedule rows,
R is being fed the scheduled interval instead of real elapsed time, and if same-day stability
explodes into the hundreds, the short-term branch is missing. Both bugs produce output that
looks fine in isolation.

### The verified-mirror constraint

The scheduler exists in **three** copies — backend, web and mobile — and the camera clamp law is
a fourth mirror. That is duplication, and it is worth being precise about which parts were
forced and which were chosen.

**Forced.** Reanimated only workletises imports under experimental `bundleMode`, so a UI-thread
worklet physically cannot call a shared imported function. The sky camera's pan/zoom clamp runs
on the UI thread, so its law is restated as worklets in `map/native/cameraWorklet.ts` alongside
the plain `lib/camera.ts`. There is no version of this that is one copy.

**Chosen.** The backend/web/mobile scheduler split follows from having no workspace tool: three
packages, three `node_modules`, no shared-package mechanism. The backend is the only writer —
the client copies exist so the study screen can show post-review state immediately instead of
waiting on the POST. A monorepo tool would collapse this to one package. That work is not done.

The mitigation: **every mirror has its own harness, each pinned to an external reference rather
than to its sibling** — two checked only against each other can drift together and both be wrong.

```bash
cd backend                        && node scripts/verify-fsrs.js    # vs py-fsrs 6.3.1
cd web-frontend/aogimi-web        && node scripts/verify-fsrs.mts   # same vectors
cd mobile-frontend/aogimi-mobile  && npm run verify:fsrs            # same vectors
cd mobile-frontend/aogimi-mobile  && npm run verify:sky             # golden values + web equality
cd mobile-frontend/aogimi-mobile  && npm run verify:camera          # worklet vs lib/camera.ts
```

`verify:sky` asserts both golden star positions from a verified run *and* bit-identical output
against the web package's copy when present (skipped, not failed, on a mobile-only checkout).
`verify:camera` asserts exact agreement — `Object.is` per component, so a `-0`/`0` split fails —
because the two copies are the same arithmetic on the same doubles, and anything less than exact
means a real edit.

### Auth, and why the transport differs per client

One token model: a 15-minute HS256 access token carrying `{ userId, username }`, and a 30-day
refresh token carrying `{ userId, tokenId }`. Two separate signing secrets, so a leak of one does
not compromise both. The server refuses to start if either is missing or under 32 chars — there
is no safe default for a signing key, and silently signing with `dev-secret` in production is a
bug you find after it ships.

Refresh tokens are stored as **SHA-256 hashes**; the raw token never exists in the database.
Every refresh **rotates**: the old row is revoked and a new one inserted, so reuse of a stolen
token is detectable on the next legitimate use. A daily sweep hard-deletes expired and revoked
rows, since the table otherwise grows by one row per login and per rotation.

Delivery differs because the clients have different attack surfaces:

- **Web** — access token in a module variable, never in `localStorage`, so it cannot be lifted
  from disk; it is lost on reload and re-minted by a silent boot refresh. The refresh token is an
  **httpOnly + Secure + SameSite=Lax cookie scoped to `/api/auth`**, with no JavaScript-reachable
  representation at all — an XSS payload smuggled in through a malicious EPUB cannot read it.
  `/auth/refresh` additionally rejects any browser request whose `Origin` is off the allowlist.
- **Mobile** — refresh token in the response body, stored in `expo-secure-store`, because native
  clients send no `Origin` header and cannot participate in the cookie flow.

The server picks the transport per request by testing for a non-empty `Origin`, so both clients
hit the same four endpoints, and both funnel every call through a single `lib/api.ts` that
injects the header and retries once through `/auth/refresh` on a 401 — **single-flight**, so
parallel 401s share one refresh instead of burning through rotated tokens in a thundering herd.

### Security posture

**Identity is the token, never the request.** Protected routes read `req.user.userId` and ignore
any `userId` in a body, query or path. Where a `:id` names a resource, `services/ownership.js`
verifies it belongs to the caller *before* the handler does work.

**Ownership mismatches return 404, not 403**, so "doesn't exist" and "isn't yours" are
indistinguishable and IDs cannot be enumerated. A malformed UUID (Postgres `22P02`) folds into
the same 404 at both the ownership check and a terminal backstop — otherwise a bad UUID would
500 while a well-formed unknown one 404s, which is itself an oracle.

Also in place: `helmet`, an explicit CORS origin allowlist (origin-less requests pass, so native
clients work and everything else must be listed), `express-rate-limit` globally at 100 req/min
plus tighter auth-surface limiters (login is 5 per 15 min keyed by IP+username, so one bad actor
cannot lock out others behind the same NAT), `zod` validation at every write boundary,
`express.json({ limit: '10kb' })`, bcrypt at cost 12, a `PUBLIC_COLUMNS` allow-list keeping
`password_hash` out of every response, an HTTPS redirect in production via `x-forwarded-proto`,
and a terminal error handler that never returns a stack trace regardless of `NODE_ENV`.

Per-user quotas are enforced with a `COUNT` before every insert (50 books, 50 decks, 5000
cards/deck, 500 bookmarks/book, 10 devices) and answer **409, not 403** — the request is
well-formed and the caller is authorised, it just conflicts with current state. The rate limiter
caps request *rate*, not row *total*: without these, 100 req/min is ~144k rows/day.

### Local-first sync

Book bytes never reach Postgres. What syncs is metadata, reading position and bookmarks — enough
for "you have this book, but not on this device" to work.

The hard part is that the same book arrives on two devices as two files that are often not
byte-identical: EPUBs get repacked, PDFs re-saved with new trailer IDs, scans re-OCRed. So
**import** fingerprints the file and asks `POST /api/books/match`, which walks a **ten-layer
priority chain**, strongest signal first: `file_hash` (same bytes) → XMP `OriginalDocumentID` →
PDF trailer `/ID[0]` → scraped DOI → ISBN with page count within 5% → `content_hash` (EPUB spine
text, or normalised extracted PDF text) → perceptual hash (mean Hamming distance ≤ 8 over sampled
page dHashes) → `dc:identifier` → title+author → filename.
[Full table, with why each layer sits where it does.](./docs/ARCHITECTURE.md#6-book-identity-and-the-matching-chain)

**Library mount** is a separate, narrower pass (`reconcileBooks.ts` on both clients): it aligns
local records against the backend list by filename and `file_hash`, backfills whichever side is
missing a hash, re-registers local-only books, and wipes local bytes the backend reports as stale.
It deliberately never touches backend records absent locally — those render with a "locate file"
affordance instead.

**Only the first layer is trusted for silent auto-attach on import.** Weaker signals collide
legitimately — batch-generated PDFs of a manga series share trailer IDs — and a false attach
destroys the original's reading position and highlights.

Reading position is buffered in two tiers rather than written per page turn: every turn writes to
`localStorage`, and the backend is flushed periodically (~60s), on unmount, and on exit via
`visibilitychange:hidden` / `pagehide`. The exit path uses **`fetch(keepalive)` rather than
`sendBeacon`** — `sendBeacon` cannot set an `Authorization` header, and the access token lives
only in memory. The first relocate of a session only seeds the dedup baseline, so opening a book
never writes the restored position back over a manual "mark finished". PDFs need no extra
column: `pdfPosition.ts` encodes the page as `page-N` in the `cfi_position` slot, and mobile
writes the same encoding, so the two clients resume each other's PDFs.

### Search ranking

`src/search/PgSearchIndex.js` is one ranking pipeline over Postgres, bounded by `LIMIT` on every
path — no method scans a table or loads a full join fan-out into memory. English queries score in
tiers: 1000 exact primary-gloss match, 600 `"query "` prefix, 300 bare prefix, 100 full-text
match on any gloss in the sense, plus a sense-order gradient (sense 1 → +50, decaying by 5,
senses 11+ ignored), plus JMdict's precomputed `priority_score`, +20 for `is_common`, and a
**JLPT tier boost of `50 + jlpt_level * 5`** — N5 → +75, N1 → +55, non-JLPT → 0.

That boost is sized deliberately: large enough to lift JLPT vocabulary above equally-relevant
non-JLPT entries, small enough that it never overtakes an exact match, so unambiguous queries
stay deterministic. The sense-order gradient's 45-point spread stays inside the tier gaps for the
same reason.

`services/assembler.js` is the flattening layer. SQL returns tuples — one row per
word × reading × kanji × meaning — and `assembleWords` folds them into the single `WordResult`
shape both clients consume, deduplicating forms while keeping each one's best priority score, so
`kanji[0]` is the canonical spelling (言う, not 云う) rather than whatever JMdict listed first. Its
weights match migration 008's word-level scoring and the SQL inside `hydrate`, so the detail page
and the search list agree on what "common" means. Query-shape routing, the deinflector
(`食べた` → `食べる`), the romaji→kana converter and the final JS sort are in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md#8-search-pipeline).

---

## Data model

**17 tables**: 9 user-data, 8 read-only dictionary. Column-level reference in
[`backend/SCHEMA.md`](./backend/SCHEMA.md). The ones that carry the design:

| Table | Notes |
|---|---|
| `users` | `sky_seed` is a 16-hex procedural seed; star positions derive client-side from (seed, deck uuid, card uuid), so nothing positional is stored. Immutable — not in the PATCH allow-list. |
| `refresh_tokens` | SHA-256 `token_hash` (unique), `expires_at`, `revoked_at`. Rotation writes a new row and revokes the old. |
| `cards` | `stability`/`difficulty` nullable until first review, `state` + `peak_rank` (high-water mark), `next_due_at`, and `meanings`/`jlpt_level` snapshotted from the dictionary at add time and never recomputed. |
| `card_reviews` | Append-only log: outcome, before/after stability and difficulty, before/after state, elapsed days. Complete enough to replay every card's memory state from scratch — which is what migration 027 did. |
| `book_progress` | Metadata plus the full fingerprint set the matcher walks (`file_hash`, `content_hash`, PDF trailer and XMP IDs, DOI, ISBN, per-page and perceptual hashes, `fingerprint_version`). No blob column. |
| `study_days` | Per-day rollup. It counts *days*, not sessions — nothing in the schema knows what a session is. |

### Migrations

**29 numbered files** (`000_` through `028_`), plus `reset_user_data.sql` alongside them. No
framework, no `schema_migrations` table — `scripts/migrate.sh` sorts by basename and runs each
through `psql` with `ON_ERROR_STOP=on`, one invocation per file, with the `BEGIN`/`COMMIT` inside
each file providing transactionality. The reset script is skipped by the runner; it is the
wipe-and-recreate utility for the 9 user-data tables, not part of the chain.

One migration is psql-specific: **`011_jlpt_seed.psql`** uses `\copy` — a psql client command,
not SQL — to load `jlptwordslist/n{1..5}.csv` into a staging table, so it must run via `psql -f`
from `backend/` for the relative paths to resolve. A generic Postgres driver will not execute it.
`012` backfills `words.jlpt_level` from the staging table and drops it.

`027_fsrs6.sql` is the interesting one. It replaced a home-grown "FSRS-lite" scheduler whose
columns could not be reinterpreted: difficulty was `[0.05, 0.95]` against FSRS-6's `[1,10]`,
computed by a different formula and meaning a different thing, and the old stability was a fixed
per-grade multiplier that was "days" in name only. So it leaves every card valid but unreviewed,
and `scripts/replay-fsrs.js` rebuilds real memory state from `card_reviews`.

### Dictionary corpora

JMdict (words, readings, priority markers), KANJIDIC2 (kanji, grades, stroke counts, radicals,
on/kun readings), JMnedict (proper names), a pitch-accent dataset, and an example-sentence corpus
with ruby markup — whose `<rb>` tokens are extracted at import into a GIN-indexed
`contained_forms` array, so a word's examples are found by containment rather than by a curated
headword key. The parsers live in `helpers/files/` alongside `build_sqlite_dict.js`, which
produces the mobile SQLite bundle. **`helpers/` is excluded by `.gitignore`** — see Known gaps.

---

## API surface

**41 endpoints** across 8 routers, plus `GET /healthz`. Dictionary and auth routers are mounted
before `authenticateJWT`; everything else behind it. Full table with ownership rules and status
codes: [`docs/API.md`](./docs/API.md) and [`backend/API_ROUTES.md`](./backend/API_ROUTES.md).

| Group | Mount | Auth | № | Purpose |
|---|---|---|---|---|
| Auth | `/api/auth` | public | 4 | `register` (currently 403), `login`, `refresh`, `logout`. Transport chosen per client. |
| Search | `/api/search` | public | 1 | The unified ranked lookup; routes by query shape. |
| Words | `/api/words` | public | 1 | `GET /:id/details` — the word detail payload: kanji breakdown plus example sentences. |
| User | `/api/user` | required | 4 | Read own profile, patch editable fields, finish onboarding, delete account (cascades, revokes all refresh tokens). |
| Books | `/api/books` | required | 12 | Register, match against library, list, read, update progress, patch metadata, backfill identity, delete, plus nested bookmarks. |
| Decks | `/api/decks` | required | 12 | Deck CRUD, all-decks-with-cards in one response, card CRUD, per-deck due count, and `POST /cards/:cardId/review`. |
| Study | `/api/study` | required | 4 | Session resolution (with `dueOnly`), per-deck due counts, and display prefs. |
| Stats | `/api/stats` | required | 3 | Study activity, card-state buckets, recent rank upgrades. |

Errors are JSON `{ error, … }`. Quota violations add `code`, `limit` and `current` so the client
can render an exact message without parsing prose.

---

## Running it locally

Prerequisites: **Node 18+** for the backend (**Node ≥ 22.18** for the `.mts` harnesses, which
rely on native type stripping), **PostgreSQL 14+** with `psql` on `PATH`, and for mobile, Xcode
or Android Studio.

```bash
createdb aogimi

# 1. Backend — required: DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET.
#    Both secrets must be >= 32 chars or the server throws on boot:
#      node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
cd backend && cp .env.example .env && npm install
DATABASE_URL='postgresql://…' ./scripts/migrate.sh
npm run dev          # node --watch server.js, $PORT (default 3000)

# 2. Web
cd web-frontend/aogimi-web && cp .env.example .env && npm install
npm run dev          # http://localhost:3001

# 3. Mobile
cd mobile-frontend/aogimi-mobile && cp .env.example .env && npm install
npm start            # Expo Metro; i / a to launch a simulator
```

Every variable each package reads is documented in its `.env.example`. `NEXT_PUBLIC_API_URL`
must be on the backend's `CORS_ORIGIN` allowlist (default `localhost:3001,:3002`);
`EXPO_PUBLIC_API_URL` must be reachable from the simulator or device, so not `localhost` from
physical hardware. `ios/` is generated and untracked — change `app.json`, then
`npx expo prebuild --clean -p ios`.

**Two steps do not work from a fresh clone, and both are `.gitignore` problems rather than code
problems.** Migration `011` needs `jlptwordslist/n1.csv`…`n5.csv` relative to `backend/`, and
those CSVs are ignored. Seeding the dictionary means running the parsers in `helpers/files/`
against `DATABASE_URL` with the source XML in `helpers/files/data/`, and `helpers/` is ignored
too. See Known gaps.

Nothing above was executed against a live database — the steps are read from the scripts and the
code, not from a run.

---

## Verification and quality

**There is no unit test runner in this repository.** No vitest, no jest, no `*.test.*` files.
Verification is five harnesses, each a plain script that exits non-zero on failure, plus linting.

| Command | Package | Asserts |
|---|---|---|
| `node scripts/verify-fsrs.js` | `backend/` | FSRS-6 against py-fsrs 6.3.1: derived constants, seven review sequences (S and D to 1e-4, intervals exact), rank ladder, `displayedRank` monotonicity. |
| `node scripts/verify-fsrs.mts` | `web-frontend/aogimi-web/` | Same vectors against the TypeScript mirror. Node strips the types; no build step. Not wired to an npm script. |
| `npm run verify:fsrs` | `mobile-frontend/aogimi-mobile/` | Same vectors against the mobile mirror. |
| `npm run verify:sky` | `mobile-frontend/aogimi-mobile/` | Star-map generation: golden positions, plus bit-identical equality against the web copy when present. Also that placement never reads mutable card state and one seed rebuilds one sky. |
| `npm run verify:camera` | `mobile-frontend/aogimi-mobile/` | The worklet camera clamp against `lib/camera.ts`: exact agreement over a randomised pose sweep, the degenerate cases, clamp idempotence, and that `zoomAround` pins the world point under the focal pixel. |
| `npm run lint` | `web-frontend/aogimi-web/` | **Currently 0 errors, 0 warnings.** This is the quality bar for web. |
| `npm run typecheck` / `npx tsc --noEmit` | mobile / web | Type check. |

The backend has no linter configured.

---

## Known gaps

**No unit test suite.** The harnesses cover the algorithms with the highest cost of being subtly
wrong. They cover no route handler, no repository, no auth flow — and the auth surface is what
most deserves tests.

**Registration is closed.** `POST /api/auth/register` returns 403 as the handler's first
statement. Everything behind it — validation, the rate limiter, the 409 paths — is intact and
unreachable; reopening is deleting one `return`. The demo credentials above are the way in.

**The `devices` and `book_availability` tables are orphaned.** Their 7 endpoints were deleted
along with 21 other uncalled routes (see below); the tables remain in Postgres because dropping
them is a destructive migration that has not been written.

**Scheduler duplicated three ways.** Accepted for now with the per-mirror harnesses as the
mitigation, but the backend/web split is a workspace-tooling gap, not a real constraint. Only the
mobile worklet mirror is genuinely forced.

**The web light theme is pinned off.** Every screen is token-driven and both palettes exist, but
`FORCED_THEME = 'dark'` in `ThemeProvider.tsx` (mirrored in the pre-paint script in
`app/layout.tsx` — change one, change both) locks the app to dark and disables the toggle,
pending a design pass over the light palette. `/authenticate` is the one screen that renders
light regardless.

**Mobile parity is incomplete.** Mid-catch-up to the web in phases; the sky stage screen and the
screen-by-screen visual pass are outstanding. Press feedback and motion were stripped in a
deliberate reset and not yet replaced, so
most controls give no visual response on press — a known regression. Mobile also carries three
things the web does not: an offline SQLite dictionary, reader highlights and annotations, and
i18n (en/ja/pt).

**`.gitignore` excludes `helpers/` and the JLPT CSVs.** The four deep-dive documents this README
links — `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/AUTH.md`, `docs/SECURITY.md` — are tracked, but
the dictionary parsers the seed step needs are not, so two of the setup steps above cannot run from
a fresh clone. Both are import-time tooling; nothing in the running application depends on them.

**No password reset, no OAuth, no email verification.** Login is username + password only;
`users.email` is collected but is not a login key and is nullable for older accounts.

**Not transactional where it could be.** `cardService.reviewCard` writes the card, the review log
and the study-day counter as three separate statements, on the reasoning that a partial failure
should leave the user-facing card state correct rather than refuse the whole review. It is a
choice rather than an oversight, but a transaction with the same ordering is better.
