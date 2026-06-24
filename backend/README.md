# Aogimi — Backend

REST API serving users, books, decks, dictionary search, and per-device
sync state. Node + Express + PostgreSQL. No ORM — every repository uses
raw `pg` with parameterized queries.

## Specs you'll want open

- [`SCHEMA.md`](./SCHEMA.md) — every table.
- [`API_ROUTES.md`](./API_ROUTES.md) — every endpoint, with auth + ownership rules.
- [`../docs/AUTH.md`](../docs/AUTH.md) — JWT access + refresh model.
- [`../docs/SECURITY.md`](../docs/SECURITY.md) — hardening posture.

---

## Local setup

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` — any Postgres connection string. Railway / managed
  hosts work for dev too, or point at a local Postgres.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — 64-byte hex strings.
  Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
  Server refuses to start if either is missing or < 32 chars.
- `CORS_ORIGIN` — comma-separated list of allowed web origins. Dev
  defaults to `http://localhost:3001,http://localhost:3002`. Native
  app sends no Origin header → unaffected.

Apply migrations:

```bash
DATABASE_URL='postgresql://…' ./scripts/migrate.sh
```

That runs every numbered migration (`000_…` through the latest) in
order with `ON_ERROR_STOP=on`, so a single SQL failure halts the run
loudly instead of letting the chain limp through with half the schema.

`011_jlpt_seed.psql` is a `psql` metacommand script (`\copy`) — it
loads `backend/jlptwordslist/*.csv` relative to the backend directory.
The runner `cd`s there for you; if you invoke `psql` by hand, make
sure your working directory is `backend/`.

If you've already applied migrations against this DB and just want the
chain to be a no-op verification, re-running the script is safe —
every statement is idempotent (`IF NOT EXISTS`, `IF NOT EXISTS` on
indexes, etc.) except for the destructive cutover migrations (021,
reset_user_data).

Run:

```bash
npm install
npm run dev      # node --watch
# or
npm start        # one-shot
```

---

## Architecture

Route → service → repository, top to bottom:

```
src/
├── app.js                # Express assembly: helmet, cors, rate-limit, auth, routers
├── server.js             # Entry — listens on $PORT (default 3000)
├── db.js                 # pg Pool, configured from DATABASE_URL
│
├── config/auth.js        # JWT secrets + lifetimes, bcrypt rounds
│
├── middleware/
│   ├── authenticateJWT.js   # Verifies Bearer token, attaches req.user
│   └── authorize.js         # requireUserMatch — cross-checks path :userId
│
├── routes/                # Express handlers, request parsing, status codes
│   ├── auth.js             # /api/auth/{register,login,refresh,logout}
│   ├── user.js             # /api/user/* (PROTECTED)
│   ├── books.js            # /api/books/* (PROTECTED + ownership checks)
│   ├── decks.js            # /api/decks/* (PROTECTED + ownership checks)
│   ├── devices.js          # /api/devices/* (PROTECTED + ownership checks)
│   ├── search.js,
│   ├── words.js, kanji.js, names.js, translate.js   # PUBLIC (dictionary)
│
├── services/              # Business logic, cross-table assembly
│   ├── authService.js      # register/login/refresh/logout/revokeAll
│   ├── userService.js      # Profile read/update; allow-list filter
│   ├── ownership.js        # {book,deck,card,bookmark,device}OwnedBy helpers
│   ├── bookService.js, bookmarkService.js,
│   ├── deckService.js, cardService.js,
│   ├── deviceService.js,
│   ├── assembler.js        # Turns flat row tuples into the WordResult API shape
│   ├── searchService.js, kanjiService.js, ...
│
├── repositories/          # Raw SQL only
│   ├── userRepository.js   # PUBLIC_COLUMNS allow-list shields password_hash
│   ├── refreshTokenRepository.js
│   ├── bookRepository.js, deckRepository.js, ...
│
├── validation/
│   └── auth.js             # zod schemas (username + password rules)
│
└── search/
    └── PgSearchIndex.js    # Unified ranking; boosts JLPT-tier words with +50 + jlpt_level*5
```

### Why route → service → repository

- **Route** = transport concerns (parsing, status codes, ownership
  checks via `*OwnedBy` helpers).
- **Service** = business rules (allow-list filtering, multi-table
  assembly, hashing, token rotation).
- **Repository** = exactly one SQL query family per file. No JS logic.

When a route needs to access a related resource, the service borrows
the repo it needs; repositories never import each other.

---

## Auth + ownership in one paragraph

`authenticateJWT` runs in front of every protected router. It attaches
`req.user = { userId, username }`; routes use that as the only
identity source and **ignore** any `userId` in the body or path. Routes
that take a resource id verify ownership via `ownership.js` helpers
and return **404** (not 403) on mismatch so the response is
indistinguishable from "doesn't exist", preventing id enumeration. See
[`../docs/AUTH.md`](../docs/AUTH.md) for the full token flow.

---

## Migrations

Numbered `.sql` / `.psql` files in `migrations/`. The shipped runner is
[`scripts/migrate.sh`](./scripts/migrate.sh); it applies every file in
order with `ON_ERROR_STOP=on`. Order matters — files are applied
lexicographically.

Key files:
- `000_dict_init.sql` — base dict tables (`words`, `kanji`, `names`,
  etc.) as CREATE TABLE IF NOT EXISTS. Required for fresh installs so
  the downstream search-refactor migration finds its tables.
- `001_search_refactor.sql` — dictionary search columns + indexes.
- `003_users.sql` — original users table (now superseded by 021).
- `004_app_entities.sql` — books, decks, cards.
- `006_book_identity_and_devices.sql` — fingerprints + devices.
- `010_jlpt_levels.sql` + `011_jlpt_seed.psql` — JLPT word bucketing.
  011 loads CSVs from `backend/jlptwordslist/` via `\copy`; only works
  when the runner's cwd is `backend/` (the runner handles this).
- `021_auth_hardening.sql` — clean-slate cutover to bcrypt + JWT + email index.
- `022_card_srs.sql` — SRS columns + `card_reviews`/`study_days`/
  `user_study_prefs`.

**Fresh deploy on a clean DB** (e.g. a new Railway / Render Postgres):

```bash
# Nuke if anything was previously half-applied:
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Apply everything in order from local (so 011's CSVs resolve):
DATABASE_URL="$RAILWAY_DATABASE_URL" ./scripts/migrate.sh
```

The migration chain only creates the dictionary table *schema*. To
populate dictionary *data* either run the parsers in `helpers/files/`
against the same `DATABASE_URL`, or `pg_dump --data-only` the dict
tables from a dev DB and pipe into the target.

**Standing rule:** any migration touching user-data tables also edits
[`migrations/reset_user_data.sql`](./migrations/reset_user_data.sql) in
the same change. That file is the master DROP+CREATE used to wipe a
database back to the current correct schema (user-data tables only —
it intentionally leaves dictionary tables alone).

---

## Running scripts

```bash
npm run dev          # node --watch src/app.js — auto-restart
npm start            # one-shot
```

No tests yet — vitest setup is on the deferred list in
[`../docs/SECURITY.md`](../docs/SECURITY.md).

---

## Environment

See [`.env.example`](./.env.example) for the canonical list. The
dev `.env` is gitignored.

---

## Gotchas

- **CORS** is now via the `cors` package; the legacy handwritten
  middleware in `app.js` is gone. Add new origins via the `CORS_ORIGIN`
  env var, not by editing code.
- **Trust proxy 1** is set so `req.ip` resolves to the real client IP
  behind the platform's reverse proxy. Without it, the rate limiter
  would key on the proxy IP and apply globally.
- **bcrypt has a 72-byte cap** on input. zod rejects passwords longer
  than that explicitly so two different passwords can't end up
  indistinguishable to bcrypt's silent truncation.
- **Express-rate-limit's IPv6 helper** must be used in custom
  keyGenerators (`ipKeyGenerator(req.ip)`) — raw `req.ip` would let v6
  clients bypass.
