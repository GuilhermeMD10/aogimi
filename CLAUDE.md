# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo orientation

`jp-eco` (codename "Aogimi") is a Japanese-reading-and-vocab ecosystem with three independently-deployable parts in this monorepo:

| Path | What | Stack |
|---|---|---|
| `backend/` | REST API for users, books, decks, devices, dictionary search | Node 18+, Express, PostgreSQL |
| `web-frontend/aogimi-web/` | Next.js App Router web app | Next 16, React 19, Tailwind v4, shadcn |
| `mobile-frontend/aogimi-mobile/` | Expo mobile app (iOS, Android, web target unused) | Expo 55, React Native 0.83 (Fabric) |
| `helpers/files/` | Source data + JMdict/KANJIDIC2/JMnedict parsers (one-off scripts) | Node |
| `docs/audit-remaining.md` | Known-but-deferred audit findings; consult before opening "obvious bugs" |

No workspace tool. Each part has its own `package.json` and `node_modules` — `cd` into the one you care about.

## Common commands

### Backend (`backend/`)

```bash
cd backend
npm start          # node server.js, listens on $PORT (default 3000)
npm run dev        # node --watch server.js (auto-restart)
psql "$DATABASE_URL" -f migrations/NNN_<name>.sql   # apply a migration manually
```

Migrations live in `backend/migrations/` and are numbered. There is no migration runner — apply by hand in order. `011_jlpt_seed.psql` uses `\copy` (psql metacommand) so it must be run with `psql -f`, not via a generic Postgres client.

No tests, no linter. (vitest setup + auth tests are on the deferred list — see `docs/SECURITY.md`.)

CORS expects the frontend at `http://localhost:3001` or `http://localhost:3002` by default. Set `CORS_ORIGIN` (comma-separated) to change. CORS now goes through the `cors` package — origin-less requests (native app, curl) pass through; everything else must be in the allowlist.

JWT secrets are required: `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`, both ≥ 32 chars. Server refuses to start without them. Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. See [`docs/AUTH.md`](docs/AUTH.md) for the full token model.

### Web frontend (`web-frontend/aogimi-web/`)

```bash
cd web-frontend/aogimi-web
npm run dev               # next dev (Turbopack)
npm run build             # next build
npm run start             # next start (production)
npm run lint              # eslint .
npx tsc --noEmit          # type-check only
```

No test runner. Lint count is the current quality bar — see baseline in `docs/audit-remaining.md`.

### Mobile frontend (`mobile-frontend/aogimi-mobile/`)

```bash
cd mobile-frontend/aogimi-mobile
npm start                 # expo start (Metro)
npm run ios               # expo run:ios
npm run android           # expo run:android
npm run lint              # expo lint
npm run typecheck         # tsc --noEmit
```

No test runner.

## Architecture — the parts that take multiple files to see

### Auth (cross-stack)

JWT access + refresh tokens. Login returns a pair; the access token (15 min, claims `{ userId, username }`) goes in `Authorization: Bearer`; the refresh token (30 day, claims `{ userId, tokenId }`) lives in **expo-secure-store** on mobile and localStorage on web. Server stores SHA-256 hashes of refresh tokens in `refresh_tokens`; every `/auth/refresh` rotates (old revoked, new issued).

**Identity is the token, never the body.** Protected routes ignore `userId` in body/path — `req.user.userId` is the only source. Routes that take a resource id (`:id` for book / deck / card / etc.) check ownership via `backend/src/services/ownership.js` and return **404** on mismatch (not 403) so the response shape is indistinguishable from "doesn't exist".

Both clients chokepoint every API call through `lib/api.ts`, which injects the Authorization header and refresh-retries once on 401 (single-flight). On terminal 401 → tokens wiped, AuthProvider flips to signed-out.

There is **no guest mode**. The previous guest pipeline (user.id = 0 with convert-to-account) was removed; signed-out is the local-first state and sign-up flushes whatever's pending.

Full flow + endpoint table: [`docs/AUTH.md`](docs/AUTH.md). Hardening posture + deferred items: [`docs/SECURITY.md`](docs/SECURITY.md).

### Backend follows route → service → repository

- `src/routes/<entity>.js` — Express handlers, request parsing, status codes.
- `src/services/<entity>Service.js` — business logic, assembles cross-table responses.
- `src/repositories/<entity>Repository.js` — raw SQL.
- `src/search/` — `PgSearchIndex.js` is the unified ranking pipeline used by `searchService`; it boosts JLPT-tier words with `+50 + jlpt_level*5`.
- `src/services/assembler.js` — turns flat SQL row tuples (word + readings + kanji + meanings) into the `WordResult` shape the frontends consume.

When the schema or API changes, update `backend/SCHEMA.md` and `backend/API_ROUTES.md`. The web frontend's `backend-connections.txt` mirrors API_ROUTES from a client perspective and is the inventory for cross-referencing payload shapes.

### Web: theme architecture is the dominant non-obvious pattern

The whole app is themable through three layers stacked over a single `data-theme="<name>"` attribute on `<html>`:

1. **Color + shape tokens** in `styles/themes/<name>.css` and `styles/shape-defaults.css`. The shape-token surface (`--lgc-surface-*`, `--lgc-button-*`, `--lgc-chip-*`, `--lgc-toolbar-*`, etc.) is what lets Stamp express its identity — hard offset shadows, sumi borders, crisp corners, serif fonts — without forking components.
2. **Primitive classes** that read those tokens: `.lgc-card`, `.lgc-button`, `.lgc-button-secondary`, `.lgc-chip`, `.lgc-section-label` in `styles/primitives.css`. Anywhere a card/button/chip is rendered, use these — not hand-rolled `bg-lgc-bg-elev … border-lgc-border` chains.
3. **Whole-screen swaps** via the registry in `web-frontend/aogimi-web/themes/index.ts`, resolved by `useThemedComponent` (`web-frontend/aogimi-web/themes/useThemedComponent.ts`). Variants live at `themes/<theme>/<mirror-of-components-path>/<X>.tsx`. **Last resort** — only for screens whose visual *tree* genuinely differs.

The `THEMES` record in `components/providers/ThemeProvider.tsx` is the **single source of truth** for theme keys. `AppTheme = keyof typeof THEMES`. The storage validator, the pre-hydration `<script>` in `app/layout.tsx`, the registry, and `ThemeSwitcher` all derive from it. Adding a theme = one record entry + one CSS file. TypeScript fails the build if anything drifts.

A pre-hydration `<script>` injected in `app/layout.tsx` reads `localStorage.getItem('app-theme')` and sets `data-theme` *before* paint, so there is no flash-of-default-theme on cold load. `ThemeProvider` initialises its `useState` synchronously from `document.documentElement.dataset.theme` so React state matches what's painted.

Full docs:
- `web-frontend/aogimi-web/PROJECT_CONTEXT.md` — start here, end-to-end overview.
- `web-frontend/aogimi-web/THEMES.md` — token inventory + per-token consumer list + dispatch decision rule.
- `web-frontend/aogimi-web/THEME_AUTHORING.md` — step-by-step playbook for adding a theme.
- `web-frontend/aogimi-web/backend-connections.txt` — endpoint catalog + payload shapes the frontend depends on.
- `web-frontend/aogimi-web/DECISIONS.md` — scope decisions + deferred work.

### Web: state architecture

Six React Context providers in `web-frontend/aogimi-web/components/providers/`, mounted by `AppShell`. **No Redux, Zustand, Jotai, etc.** Cross-feature signalling happens through "pending fields" on `ReaderStateProvider` — e.g. the reader sets `pendingDictSearch`, `AppShell`'s effect picks it up, calls `dict.runSearch`, and nulls the field. Effects are guarded against double-fire with `useRef`s of the last-handled trigger object (see `components/AppShell.tsx`).

Domain types are in `lib/types/` (NOT in `lib/<x>Api.ts` files — those only export fetch helpers).

### Web: app-level features

Documented in the **Features** section of `web-frontend/aogimi-web/PROJECT_CONTEXT.md`. When a new app-level feature lands (something a user can name — "shortcuts", "highlights sync", "deck import", …), add a subsection there: what it is, entry-point files, where state lives, any non-obvious behaviour. Keep entries terse; deep details belong in the source.

Currently documented features:
- **Keyboard shortcuts** — typed registry in `lib/shortcuts/registry.ts`, runtime in `components/providers/ShortcutsProvider.tsx`, cheatsheet modal opened by `Shift + ?`. Consumers subscribe via `useShortcut(id, fn)`.

### Mobile: mirrors the web theme pattern

Same three-layer system (`theme/tokens.ts`, `theme/createThemedComponent.tsx`, `themes/index.ts` + `themes/useThemedComponent.ts`). The Stamp theme registers `HomeScreen`, `DictionaryScreen`, `DictEntry`, `BottomTabBar` and uses theme-decoration atoms (`components/theme-decorations/stamp/`).

`mobile-frontend/aogimi-mobile/THEMES.md` is the mobile mirror of the web `THEMES.md`.

### Books: per-device storage + Postgres metadata

EPUB/PDF blobs never go to Postgres. They live in IndexedDB (web) or `expo-file-system documents/books/` (mobile). The backend stores **only metadata + reading progress** in `book_progress` rows.

Library mount on the web reconciles all three storage layers (`components/library/RestoreLibrary.tsx`):
1. Load local IndexedDB book records.
2. Register the device (`POST /api/devices`) if absent.
3. Fetch backend books (`GET /api/books/user/{id}`).
4. `POST /api/books/match` reconciles unidentified local files against existing user books by hash priority: file_hash → content_hash → dc_identifier+title → filename.
5. Backfill identity (`PUT /api/books/{id}/identity`) for matched-but-stale rows.
6. Mark availability per device (`POST /api/devices/{deviceId}/books/{bookId}/available`).

### Reading progress sync

Debounced ~2s during a session (web `ReaderStateProvider`), plus fire-and-forget `navigator.sendBeacon` on tab close. Failures swallowed silently — non-critical.

## Gotchas

- **Next.js 16 has breaking changes.** `web-frontend/aogimi-web/AGENTS.md` says: read `node_modules/next/dist/docs/` before writing route code. Conventions don't match training data — heed deprecation notices.
- **React Native 0.83 + Fabric:** `transform: pressed ? [...] : undefined` between press states gets coerced to `null` and crashes the transform processor (`forEach on null`). Always pass a stable-shape transform array, e.g. `transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }]`.
- **Hex literals in components are not allowed** except in `JlptChip` (per-level palette, hardcoded by design) and theme decoration atoms. If a surface "doesn't change under stamp", grep it for `#[0-9a-f]{6}` and replace with `--lgc-*` token / `bg-lgc-*` class.
- **No inline `borderRadius: <px>` on theme-relevant surfaces.** Use `rounded-*` Tailwind classes or `var(--radius-md)`. Pure decoratives (`'50%'`, `999`) are fine.
- **No inline `if (theme === 'stamp')` branches** in components. Either move the variation into a shape token, or fork via the registry.
- **`react-hooks/set-state-in-effect`** fires false positives on legitimate "sync from external trigger" effects (see `AppShell.tsx` `pendingDictSearch`/`pendingCard`, `PendingCardOverlay.tsx` phase seed). Block-disabled with explanatory comment where the pattern is correct.
- **Migrations are manual.** Sequence matters — apply in numbered order. `011_jlpt_seed.psql` is psql-specific because of `\copy`.
- **Two design canvases vs production**: `web-frontend/aogimi-web/aogimi-DS/` and `components/home/HomeView/HomeDemos.tsx` + `components/library/LibraryDesk.tsx` + `components/views/DictionaryView/{DictionaryQuiet,DictionarySidekick}.tsx` are intentionally pinned reference layouts. They use inline pixel radii on purpose — don't sweep them into the token system without explicit visual review.

## Conventions

- Domain types in `web-frontend/aogimi-web/lib/types/` (one file per domain). API files in `lib/<domain>Api.ts` import their types from there; no type declarations alongside fetch helpers.
- `lib/util/cn.ts` is the Tailwind class merger. shadcn's `components.json` aliases `utils` → `@/lib/util/cn`, so future `shadcn add` writes the right path.
- Don't run git commits, pushes, or destructive DB operations — the human handles those.
- All `*Api.ts` fetch helpers accept an optional `AbortSignal`; pair with `useEffect` cleanup.
