# Shirube

A Japanese reading + vocabulary ecosystem. Users import EPUBs / PDFs,
read in-app, look up words against JMdict / KANJIDIC2, and build
flashcard decks for spaced study. Reading progress, decks, and devices
sync to a Postgres backend; the actual book files live per-device.

Three independently-deployable parts in this monorepo:

| Path | What | Stack |
|---|---|---|
| [`backend/`](./backend/) | REST API for users, books, decks, devices, dictionary | Node 18+, Express, PostgreSQL |
| [`web-frontend/shirube-web/`](./web-frontend/shirube-web/) | Next.js App Router web app (desktop / laptop only) | Next 16, React 19, Tailwind v4 |
| [`mobile-frontend/shirube-mobile/`](./mobile-frontend/shirube-mobile/) | Expo mobile app (iOS, Android) | Expo 55, React Native 0.83 (Fabric) |

No workspace tool. Each part has its own `package.json` and
`node_modules` — `cd` into the one you're working on.

---

## Quick start

**Prereqs:** Node 18+, a Postgres connection string (Railway / any
managed Postgres works, or a local instance), and for mobile: Xcode
(iOS) or Android Studio + an emulator.

```bash
# 1. Backend
cd backend
cp .env.example .env
# Edit .env: paste DATABASE_URL, generate JWT_ACCESS_SECRET + JWT_REFRESH_SECRET
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm install
# Apply migrations in numeric order:
for f in migrations/0??_*.sql; do psql "$DATABASE_URL" -f "$f"; done
npm run dev   # listens on $PORT (default 3000)
```

```bash
# 2. Web
cd web-frontend/shirube-web
npm install
npm run dev   # http://localhost:3001 (or :3002)
```

```bash
# 3. Mobile
cd mobile-frontend/shirube-mobile
npm install
npm start     # Expo Metro; press i / a to launch sim
```

Sign up via the web app or mobile, both clients hit the same backend.

---

## Documentation map

Start here, drill down by topic:

**Architecture**
- [`docs/SYNC_ARCHITECTURE.md`](./docs/SYNC_ARCHITECTURE.md) — how a book
  moves between local storage and the backend (state machine, reconciliation rules).
- [`docs/SYNC_TEST_FLOWS.md`](./docs/SYNC_TEST_FLOWS.md) — manual test scenarios.

**Auth + security**
- [`docs/AUTH.md`](./docs/AUTH.md) — JWT access + refresh model, token
  storage on each client, cold-boot flow, account-switch wipe, refresh-retry.
- [`docs/SECURITY.md`](./docs/SECURITY.md) — hardening posture, threat model,
  deferred items (password reset, httpOnly cookies, etc.).

**Backend**
- [`backend/SCHEMA.md`](./backend/SCHEMA.md) — every table + index.
- [`backend/API_ROUTES.md`](./backend/API_ROUTES.md) — every endpoint
  + auth + ownership rules.

**Web**
- [`web-frontend/shirube-web/PROJECT_CONTEXT.md`](./web-frontend/shirube-web/PROJECT_CONTEXT.md)
  — primer for new contributors.
- [`web-frontend/shirube-web/THEMES.md`](./web-frontend/shirube-web/THEMES.md),
  [`web-frontend/shirube-web/THEME_AUTHORING.md`](./web-frontend/shirube-web/THEME_AUTHORING.md)
  — theme token system.
- [`web-frontend/shirube-web/DECISIONS.md`](./web-frontend/shirube-web/DECISIONS.md)
  — scope decisions + deferred work.

**Mobile**
- [`mobile-frontend/shirube-mobile/README.md`](./mobile-frontend/shirube-mobile/README.md)
  — setup, build commands, gotchas.
- [`mobile-frontend/shirube-mobile/STORAGE.md`](./mobile-frontend/shirube-mobile/STORAGE.md)
  — AsyncStorage + filesystem layout.
- [`mobile-frontend/shirube-mobile/THEMES.md`](./mobile-frontend/shirube-mobile/THEMES.md)
  — mobile theme system (mirrors web).

**Working with Claude Code agents**
- [`CLAUDE.md`](./CLAUDE.md) — repo-wide guidance loaded into every agent.

---

## Project shape in one paragraph

The backend is a thin Express app over Postgres. The frontend clients
are local-first: they store books, reading progress, decks, and cards
locally and push to the backend opportunistically. Each client owns
its own offline-first pipeline (`pending` → `synced` markers, newer-wins
on `last_read_at`) but the sync semantics are identical between web
and mobile, which is what makes the [`SYNC_ARCHITECTURE.md`](./docs/SYNC_ARCHITECTURE.md)
doc cross-cutting. Auth is JWT access + refresh, with refresh tokens
stored server-side as SHA-256 hashes for revocation, rotated on every
refresh — see [`docs/AUTH.md`](./docs/AUTH.md).

---

## Naming history

The project was called "Langeco" / "langecko" earlier. Some directory
names, CSS variables (`--lgc-*`), and storage keys still carry that
prefix — they're stable identifiers we keep for backwards compat with
local state, not the current branding. The user-facing name is **Shirube**.

---

## License

TBD.
