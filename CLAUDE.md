# CLAUDE.md

Guidance for Claude Code working in this repository.

**This file is a rule sheet, not a history.** Keep it terse — rationale and per-screen
narrative belong in `web-frontend/aogimi-web/info-documents/DECISIONS.md` and
`PROJECT_CONTEXT.md`. Don't grow this file back; every prompt pays for it.

## Repo orientation

`jp-eco` (codename "Aogimi") is a Japanese-reading-and-vocab ecosystem, three
independently-deployable parts, no workspace tool — each has its own `package.json`
and `node_modules`, so `cd` into the one you care about.

| Path | What | Stack |
|---|---|---|
| `backend/` | REST API: users, books, decks, devices, dictionary search | Node 18+, Express, PostgreSQL |
| `web-frontend/aogimi-web/` | Next.js App Router web app | Next 16, React 19, Tailwind v4, shadcn |
| `mobile-frontend/aogimi-mobile/` | Expo app (iOS, Android; web target unused) | Expo 55, React Native 0.83 (Fabric) |
| `helpers/files/` | Source data + JMdict/KANJIDIC2/JMnedict parsers (one-off scripts) | Node |

**Web docs live in `web-frontend/aogimi-web/info-documents/`**, not at the package root:

- `REDESIGN.md` — **read first if you're redesigning a screen.** Token traps, primitive
  inventory, data gaps, how to verify.
- `PROJECT_CONTEXT.md` — end-to-end overview; the **Theming** and **Features** sections
  are the long form of what's summarised below.
- `DECISIONS.md` — scope decisions + known-but-deferred work. **Consult before opening
  an "obvious bug"** — it's probably deferred on purpose.
- `backend-connections.txt` — endpoint catalog + payload shapes the frontend depends on.
- `AGENTS.md` — house rules for agents in this package.
- `DEEPL.md` — translation integration.

## Common commands

```bash
# backend/
npm start                                          # node server.js, $PORT (default 3000)
npm run dev                                        # node --watch server.js
psql "$DATABASE_URL" -f migrations/NNN_<name>.sql   # apply one migration, by hand

# web-frontend/aogimi-web/
npm run dev | build | start | lint                 # next dev is Turbopack; lint is eslint .
npx tsc --noEmit

# mobile-frontend/aogimi-mobile/
npm start | run ios | run android | lint | typecheck
```

No test runner anywhere, and no linter on the backend (vitest + auth tests are deferred —
`backend/docs/SECURITY.md`). **Web lint is the quality bar: 0 errors, 3 warnings** as of
2026-08-05. Don't add to it; drive it down when you're already in a file.

Backend env: `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` are required, both ≥ 32 chars —
the server refuses to start without them (`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`).
CORS allows `localhost:3001` / `:3002` by default, override with `CORS_ORIGIN`
(comma-separated); it goes through the `cors` package, so origin-less requests (native app,
curl) pass and everything else must be allowlisted.

## Architecture — the parts that take multiple files to see

### Auth (cross-stack)

Full flow + endpoint table: `backend/docs/AUTH.md`. Posture + deferred items: `backend/docs/SECURITY.md`.

JWT access (15 min, `{ userId, username }`, `Authorization: Bearer`) + refresh (30 day,
`{ userId, tokenId }`), delivered **per transport**:

- **Web** — memory + httpOnly cookie (`lib/tokenStore.ts`): access token in memory only,
  refresh token an httpOnly + Secure + SameSite=Lax cookie scoped to `/api/auth`; calls use
  `credentials: 'include'` and a silent boot refresh re-mints access. **Tokens are not in
  localStorage — don't put them back.** `/auth/refresh` also enforces an Origin allowlist as a
  CSRF guard.
- **Mobile** — refresh token in expo-secure-store, returned in the response body since native
  clients send no Origin.

Server stores SHA-256 hashes in `refresh_tokens`; every refresh rotates (old revoked).

**Identity is the token, never the body.** Protected routes ignore `userId` in body/path —
`req.user.userId` is the only source. Routes taking a resource `:id` check ownership via
`backend/src/services/ownership.js` and return **404** on mismatch (not 403), so the response
is indistinguishable from "doesn't exist".

Both clients chokepoint every call through `lib/api.ts`: injects the header, refresh-retries
once on 401 (single-flight); terminal 401 → tokens wiped, signed-out.

**No guest mode** — signed-out is the local-first state and sign-up flushes what's pending.
Sign-up takes `{ username, email, password }`, login `{ username, password }`; `users.email`
is nullable in the DB for pre-redesign accounts and is **not** a login key.
**`POST /api/auth/register` is disabled server-side** (403 as the handler's first statement;
remove that `return` to re-enable). No OAuth, no password reset, no session-only mode.

### Backend: route → service → repository

- `src/routes/<entity>.js` — handlers, request parsing, status codes.
- `src/services/<entity>Service.js` — business logic, cross-table assembly.
- `src/repositories/<entity>Repository.js` — raw SQL.
- `src/search/PgSearchIndex.js` — the unified ranking pipeline `searchService` uses; boosts
  JLPT-tier words by `+50 + jlpt_level*5`.
- `src/services/assembler.js` — flat SQL row tuples (word + readings + kanji + meanings) →
  the `WordResult` shape both frontends consume.

Schema or API change ⇒ update `backend/SCHEMA.md` and `backend/API_ROUTES.md` (and
`info-documents/backend-connections.txt`, its client-side mirror).

### Web: design tokens

**One system: `styles/ds-tokens.css`**, two themes on `html[data-theme]` (`light`/`dark`).
The outgoing `--lgc-*` layer is fully deleted. Long form: PROJECT_CONTEXT.md → Theming.

- Colour/shape: `--ink` `--soft` `--muted` `--faint` `--card` `--cardalt` `--bd` `--btn`
  `--track`/`--fill` `--cover-1..4` `--stage-*` `--radius-*`. Read as `text-(--ink)`, `bg-(--card)`.
- Type roles: `--face-jp` (Noto Sans JP) / `--face-ui` / `--face-mono` (both Switzer,
  self-hosted in `app/fonts/`). **Not `--font-*`** — that's what `next/font` emits.
  **Neither family ships a 600 cut**, so use `font-medium` / `font-bold`; `font-semibold`
  gets synthesised.
- **Don't mirror tokens into Tailwind's `@theme`.** Components read them directly; `@theme`
  holds only the `rounded-*` scale and the shadcn colour namespace (pointed at `--paper-*`).
  Note `--color-border` reaches past shadcn — the base layer's `*` rule makes it every
  element's default border colour.
- **There is no `h1..h6` font rule, deliberately** — an element rule beats a face inherited
  from a wrapper. `html` carries `--face-ui`; a heading wanting Japanese says `--face-jp` at
  the call site. Form controls must state it (the UA stylesheet overrides inheritance).
- Primitives are **React components in `shared/components/`**, theme-agnostic — never write a
  light variant and a dark variant; the palette swaps underneath. Earns a place there once
  used twice. **Don't add to `shared/ui/`** (down to the radix `sheet` + `button`).
- Cards are transparent by design and `--bd` is transparent too, so hairline dividers don't
  show until filled. Need a real fill *now*: `--paper-*`/`PaperCard`, or `GlassCard`.
  A component that can't use the shared surface tokens **gets its own group, not a fill of the
  shared ones** — filling `--card`/`--cardalt`/`--bd` repaints every finished screen.
- **Frosted surfaces are `styles/glass.css`**, addressed by the classes
  `shared/components/glass.ts` exports (`GLASS_SURFACE`/`SHEEN`/`BUTTON`/`SHEET` +
  `GLASS_SCRIM`/`ACTIVE`/`PRESS`); every number lives in that file's `:root` block, the one
  tweak surface. **Two traps:** the recipe is `@layer components`, so a selected branch that
  also sets `text-*` overrides the ink `GLASS_ACTIVE` brings; and a button with its own
  `transition-*` utility must name `transform` there or `GLASS_PRESS` snaps instead of easing.
- **`--active` (+ `--active-ink`) is the app's one "this is selected" colour**, theme-invariant
  like `--accent` — `--active-ink` does *not* flip, so it isn't `--btn-ink`. Selection only; a
  filled primary action is still `--btn`. Glass takes the same hue at `--glass-active-fill`.

Theme persists in `aogimi-theme` (localStorage), applied by a **pre-paint `<script>`** in
`app/layout.tsx` — an effect fires after paint and flashes — falling back to
`prefers-color-scheme`. Every screen is token-driven, so **a screen that looks wrong in dark
mode is a bug**, not an accepted cost. `dark:` is redefined in `globals.css` as
`html[data-theme="dark"] &`, not shadcn's `.dark *` and not `prefers-color-scheme`; nothing uses it.

The only surviving `lgc` strings are the localStorage keys `lgc_device_id` and
`lgc_last_user_id`. **Don't rename them** — renaming orphans every install's device identity.

### Web: feature-oriented structure

Organized **by feature, not by file type**. Three layers, one-way: `lib`/`shared` ← `features` ← `app`.

- `app/` — routing only; each page is a thin wrapper rendering one feature view.
- `features/<feature>/` — self-contained slices owning `components/` `hooks/` `lib/`
  `providers/` `views/` `types.ts` as needed, public API via `index.ts` **barrel**.
  Top level: `mobile-gate` `auth` `dictionary` `profile` `settings` `onboarding` `app-shell`,
  plus two domains with sub-features:
  - `books/` — `books/library`, `books/reader` (epub/pdf/text/manga engines + the two lookup
    surfaces `reader-bubble` and `dict-sidebar`), shared data layer `books/lib`; orchestrated
    by `books/views/BooksView` (`/`) and `books/reader/views/ReaderView` (`/reader/[bookId]`).
  - `study/` — `study/decks`, `study/session`, `study/stats`; orchestrated by
    `study/views/StudyView` (`/study`).
- `shared/` — `shared/components` (**put new primitives here**), `shared/ui` (outgoing),
  `shared/icons`.
- `lib/` — feature-agnostic infra ONLY: `api.ts`, `tokenStore.ts`, `useFetchWithAbort.ts`,
  `storage/_helpers.ts`, `util/`.

The layer rule is enforced by `import/no-restricted-paths` in `eslint.config.mjs`. Cross-feature
"import only via the barrel" is convention, not enforced.

### Web: state architecture

React Context providers, **each owned by its feature**, composed by
`features/app-shell/AppShell.tsx`: `AuthProvider`→`auth`, `DecksProvider`→`study/decks`,
`DictionaryStateProvider`→`dictionary`, `ReaderStateProvider`+`ThemeProvider`→`app-shell`.
**No Redux, Zustand, Jotai.** Cross-feature signalling goes through "pending fields" on
`ReaderStateProvider` — the reader sets `pendingCard`, `DecksView` picks it up on mount and
nulls it. Effects guard double-fire with `useRef`s of the last-handled trigger object
(`AppShell.tsx`, `PendingCardOverlay.tsx`). To avoid barrel cycles, feature code imports
providers/hooks **by file path**, not via the app-shell/auth barrel.

Domain types live in each feature's `types.ts`; a feature's fetch helpers live in its `lib/`
and import those types — no type declarations alongside fetch helpers.

### Web: routes and app-level features

**Per-feature detail lives in PROJECT_CONTEXT.md's `## Features` section** — a section each for
Dictionary, Decks, Settings, Auth, Dock and the Sky engine. Read the one you're touching; add a
section there (not here) when a new user-nameable feature lands.

Route map: `/` library shelf · `/reader/[bookId]` open book · `/dictionary` · `/decks` ·
`/study` · `/profile` · `/help` · `/credits` · `/authenticate`.

**What does not exist — don't recreate it:** no home dashboard (**`/` is the library shelf**,
so `/reader` survives only as the parent segment of `/reader/[bookId]`), no `/settings`
(settings is a column of `/profile`), no `/sky` (the star map is `/decks`; `features/sky` is
the engine, with no route), no `/word/[id]` (the entry is a pane in `/dictionary`).

Cross-file invariants that are easy to break without noticing:

- **`study/decks/lib/rankProgress.ts` mirrors the promotion rules in
  `backend/src/services/cardSrsService.js`** — change one, change both.
- **`auth`'s `validate()` mirrors `backend/src/validation/auth.js` exactly** — validating less
  means a valid-looking form returns a server error.
- **`settings/lib/credits.ts` is the audited what-we-ship inventory** — several data licenses
  require it; keep it in sync (its Typography list mirrors `app/layout.tsx`'s `next/font` imports).
- **`/decks` and `/dictionary` keep navigation state in the URL only** — nothing persisted (a
  localStorage mirror of the same facts drifted). `/decks`: `?deck=`/`&card=`, Escape walks
  card → deck → sky. `/dictionary`: `?q=` + `?id=`/`?kanji=`, and `views/DictionaryView.tsx`
  is the only file that reads or writes it. `/study` reads its whole config from the query
  string: `?deck={id}` uses that deck's saved mode/size, `?due=1` is every due card shuffled,
  no params = all decks in `hardest_all_decks` mode. Exits to `/decks`.
- **The reader's two lookup surfaces are built from `features/dictionary`'s exports, not
  copies** — `dict-sidebar` (`scale="compact"`) and `reader-bubble` (`scale="full"`). The
  barrel's components own no width, fill, edge, scroll or padding so the surface supplies the
  box; `scale` carries the type/spacing step-down.
- **`/decks` chrome reads `lib/nightChrome.ts` constants, deliberately not tokens** — the stage
  is night in both themes. Exceptions: `active`/`activeInk` reference `--active`.
- **Dock:** `aria-current="page"` is load-bearing three times over — accessible state, CSS hook
  for the active ink, and what the sliding pill's measurement queries. Reader's entry is `/`
  and matches exactly. **Pages reserve `pb-[140px]`.**
- Two prefix tests depend on the route shape and are deliberately not equality checks —
  `AppShell`'s `isOpenBook` (hides the dock) and `useReaderActions`'s `isDictSurfaceVisible`.

### Mobile: mirrors the web theme pattern

Three layers (`theme/tokens.ts`, `theme/createThemedComponent.tsx`, `themes/index.ts` +
`themes/useThemedComponent.ts`); the Stamp theme registers `HomeScreen`, `DictionaryScreen`,
`DictEntry`, `BottomTabBar` and uses decoration atoms in `components/theme-decorations/stamp/`.
Documented in `mobile-frontend/aogimi-mobile/THEMES.md`. (Web has no per-theme dispatch.)

### Books: per-device storage + Postgres metadata

EPUB/PDF blobs never go to Postgres. On web they live in a **single IndexedDB database
`aogimi`** — `features/books/lib/booksDb.ts` is the sole connection factory (stores:
`metadata`, `files`, `handles` for the File System Access directory handle), and `getDb()`
runs a one-time idempotent migration from the two former DBs (`aogimi-books` + `aogimi-fs`).
On mobile: `expo-file-system documents/books/`. The backend holds metadata + reading position
in `book_progress`.

Library mount on the web reconciles all three storage layers
(`features/books/library/components/RestoreBooks.tsx`, driven by `views/BooksView.tsx`):
load local IndexedDB records → register the device (`POST /api/devices`) if absent → fetch
backend books (`GET /api/books/user/{id}`) → `POST /api/books/match` to reconcile unidentified
local files **by hash priority: file_hash → content_hash → dc_identifier+title → filename** →
backfill identity (`PUT /api/books/{id}/identity`) for matched-but-stale rows → mark
availability (`POST /api/devices/{deviceId}/books/{bookId}/available`).

### Reading progress / position

**Backend-buffered**, deliberately not a per-turn backend write (rationale in DECISIONS.md).
Position comes from foliate's `relocate` (EPUB) / pdf.js's `pagechanging` (PDF) and persists
in two tiers:

- **localStorage** (`features/books/lib/readerSession.ts`, key `reader_progress_<filename>`) —
  every page turn; the per-device buffer and source of truth between flushes.
- **Backend** (`book_progress.cfi_position`/`spine_index`/`progress` via
  `PUT/POST /api/books/:id/progress`) — flushed periodically (~60s), **on exit**
  (`visibilitychange:hidden`/`pagehide` via a keepalive POST — `fetch(keepalive)`, *not*
  `sendBeacon`, so it carries the in-memory Bearer token), and **on unmount** (normal fetch:
  "Back to library" is an SPA nav that fires no unload event).

`features/books/views/useProgressSync.ts` owns the wiring; readers forward position via an
`onRelocate` prop. On open, `BooksView` resolves the restore anchor as the **newer** of the
local snapshot and the backend row, and the engine does a one-shot `goTo`. The first relocate
of a session only **seeds the dedup baseline**, so opening a book never writes back the restored
position — a manual "mark finished" (`{ progress: 100 }`) sticks until a real page turn.
**PDFs need no extra column:** `features/books/reader/lib/pdfPosition.ts` encodes the page as
`page-N` in the `cfi_position` slot (1-based page mirrored into `spine_index`), which is what
the mobile PDF reader writes, so the two resume each other. Where *inside* a page isn't stored.
Reader typography prefs are in-memory only (reset per open).

## Gotchas

- **Next.js 16 has breaking changes.** Read `node_modules/next/dist/docs/` before writing
  route code — conventions don't match training data. Heed deprecation notices.
- **React Native 0.83 + Fabric:** `transform: pressed ? [...] : undefined` gets coerced to
  `null` between press states and crashes the transform processor (`forEach on null`). Always
  pass a stable-shape array: `transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }]`.
- **Hex literals in components are discouraged, not banned.** Anything that reads as palette
  belongs in tokens (grep `#[0-9a-f]{6}`). But a one-off value that makes a *single* component
  work is fine hardcoded with a comment saying why it isn't a token — adding to
  `ds-tokens.css` widens the palette every screen reads, which is the more expensive mistake.
  Standing exceptions: `JlptChip` (per-level palette) and mobile decoration atoms.
- **No inline `borderRadius: <px>`** on token-relevant surfaces — use `rounded-*` or
  `var(--radius-md)`. Pure decoratives (`'50%'`, `999`) are fine.
- **No inline `if (theme === 'stamp')` branches** (mobile only) — move the variation into a
  shape token or fork via the registry.
- **`react-hooks/set-state-in-effect`** false-positives on legitimate "sync from external
  trigger" effects (`AppShell.tsx` pending fields, `PendingCardOverlay/` phase seed).
  Block-disabled with a comment where the pattern is correct.
- **Migrations are manual and order-sensitive.** `011_jlpt_seed.psql` is psql-specific
  (`\copy`), so it must run via `psql -f`, not a generic Postgres client.
- **There are no pinned design canvases.** The library shelf (`BooksView`) is the last live
  screen awaiting redesign, not a reference layout. A redesign is expected to rewrite its
  screen — don't preserve the outgoing one's inline pixel radii.

## Conventions

- **Web file placement.** By feature, never by file type. Pick an existing feature under
  `features/`; create one only for a genuinely new user-nameable concern.
  - Fixed sub-folder names: `components/` (PascalCase `Foo.tsx`), `hooks/` (`useFoo.ts`),
    `lib/` (camelCase api/storage/pure logic, `fooApi.ts`), `providers/` (`FooProvider.tsx`),
    `views/` (`FooView.tsx`), plus `types.ts`. **Only create a sub-folder that will hold a
    file** — no empty scaffolding.
  - Each feature's `index.ts` barrel is its public API. Others import `@/features/foo`; a
    types-only borrow may import `@/features/foo/types`. Inside a feature, relative imports.
  - A domain with sub-features (`books`, `study`) nests them as siblings, each with its own
    barrel; what they share sits at the domain root. **Sub-features don't import each other** —
    an orchestrator view at the domain root composes them.
  - Routing stays in `app/`. Cross-cutting primitives → `shared/components` (not `shared/ui`),
    global icons → `shared/icons`, feature-agnostic infra → `lib/`.
- `lib/util/cn.ts` is the Tailwind class merger; shadcn's `components.json` aliases `utils` to
  it so future `shadcn add` writes the right path.
- All `*Api.ts` fetch helpers accept an optional `AbortSignal` — pair with `useEffect` cleanup.
- **Don't run git commits, pushes, or destructive DB operations** — the human handles those.
