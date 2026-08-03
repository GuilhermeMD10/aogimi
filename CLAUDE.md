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
| `web-frontend/aogimi-web/info-documents/DECISIONS.md` | Scope decisions + known-but-deferred work; consult before opening "obvious bugs" |

**Web docs live in `web-frontend/aogimi-web/info-documents/`**, not at the package root: `PROJECT_CONTEXT.md`, `DECISIONS.md`, `AGENTS.md`, `backend-connections.txt`, `DEEPL.md`.

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

No test runner. Lint count is the current quality bar: **9 errors, 5 warnings** as of 2026-08-03. Don't add to it; drive it down when you're already in a file.

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

JWT access + refresh tokens. The access token (15 min, claims `{ userId, username }`) goes in `Authorization: Bearer`; the refresh token (30 day, claims `{ userId, tokenId }`) is delivered **per transport**:

- **Web** — "memory + httpOnly cookie" (`lib/tokenStore.ts`): the access token is in-memory only and the refresh token is an httpOnly + Secure + SameSite=Lax cookie scoped to `/api/auth`, so JS can't read it. Calls use `credentials: 'include'`; a silent `/api/auth/refresh` on boot re-mints the access token. `/auth/refresh` also enforces an Origin allowlist as a CSRF guard (403 otherwise). Tokens are **not** in localStorage — don't put them back.
- **Mobile** — refresh token in **expo-secure-store** (Keychain / Keystore), returned in the response body since native clients send no Origin.

Server stores SHA-256 hashes of refresh tokens in `refresh_tokens`; every `/auth/refresh` rotates (old revoked, new issued).

**Identity is the token, never the body.** Protected routes ignore `userId` in body/path — `req.user.userId` is the only source. Routes that take a resource id (`:id` for book / deck / card / etc.) check ownership via `backend/src/services/ownership.js` and return **404** on mismatch (not 403) so the response shape is indistinguishable from "doesn't exist".

Both clients chokepoint every API call through `lib/api.ts`, which injects the Authorization header and refresh-retries once on 401 (single-flight). On terminal 401 → tokens wiped, AuthProvider flips to signed-out.

There is **no guest mode**. The previous guest pipeline (user.id = 0 with convert-to-account) was removed; signed-out is the local-first state and sign-up flushes whatever's pending.

**Sign-up collects `{ username, email, password }`; login is `{ username, password }`.** Email became required at the register boundary with the auth redesign — `users.email` stays nullable in the DB because pre-redesign accounts have none, and it is **not** a login key. `POST /api/auth/register` is **disabled server-side** (403 before validation, first statement in the handler); remove that `return` to re-enable sign-ups. There is no OAuth, no password reset, and no session-only "keep me signed in" mode — the refresh cookie is always 30-day persistent.

Full flow + endpoint table: [`docs/AUTH.md`](docs/AUTH.md). Hardening posture + deferred items: [`docs/SECURITY.md`](docs/SECURITY.md).

### Backend follows route → service → repository

- `src/routes/<entity>.js` — Express handlers, request parsing, status codes.
- `src/services/<entity>Service.js` — business logic, assembles cross-table responses.
- `src/repositories/<entity>Repository.js` — raw SQL.
- `src/search/` — `PgSearchIndex.js` is the unified ranking pipeline used by `searchService`; it boosts JLPT-tier words with `+50 + jlpt_level*5`.
- `src/services/assembler.js` — turns flat SQL row tuples (word + readings + kanji + meanings) into the `WordResult` shape the frontends consume.

When the schema or API changes, update `backend/SCHEMA.md` and `backend/API_ROUTES.md`. `web-frontend/aogimi-web/info-documents/backend-connections.txt` mirrors API_ROUTES from a client perspective and is the inventory for cross-referencing payload shapes.

### Web: design tokens

**One system: `styles/ds-tokens.css`.** Two themes, `light` and `dark`, on `html[data-theme]`. The redesign's screen-by-screen migration is finished and the outgoing `--lgc-*` layer is deleted — `styles/themes/default.css`, `styles/shape-defaults.css`, `styles/primitives.css`, the stranded `shared/ui` primitives, and the three webfonts they carried (Inter, Source Serif 4, Geist Mono). Full detail in PROJECT_CONTEXT.md's **Theming** section; the teardown's decisions are the last section of DECISIONS.md.

- Colour/shape tokens `--ink`, `--soft`, `--muted`, `--faint`, `--card`, `--cardalt`, `--bd`, `--btn`, `--track`/`--fill`, `--cover-1..4`, `--stage-*`, `--radius-*`. Read as `text-(--ink)`, `bg-(--card)`.
- Type tokens are `--face-jp` / `--face-ui` / `--face-mono` (Noto Sans JP for jp; Switzer — self-hosted Fontshare woff2s in `app/fonts/` — for ui **and** mono, which retired Space Mono in the 2026-08 font audition; the roles stay separate so re-splitting is one line in ds-tokens.css). **Not** `--font-*`, which is what `next/font` emits (`--font-switzer`, `--font-noto-sans-jp`) — a role shouldn't read as a font variable. **Neither family ships a 600 cut** (Switzer loads 400/500/700, Noto Sans JP 500/700), so use `font-medium` / `font-bold`; a `font-semibold` is synthesised.
- **Don't mirror these into Tailwind's `@theme`.** Components read the tokens directly, so an alias is just a second name to keep in step. `@theme` holds only what Tailwind must know: the `rounded-*` scale, and the shadcn colour namespace that `shared/ui`'s two surviving files (`sheet.tsx`, `button.tsx`) paint with, pointed at the `--paper-*` group. `--color-border` reaches past shadcn — the base layer's `*` rule makes it every element's default border colour.
- **There is no `h1..h6` font rule, deliberately.** A rule on the element beats a face inherited from a wrapper, which is how four migrated headings ended up in the old display serif. `html` carries `--face-ui`; headings that want the Japanese face say `--face-jp` at the call site. Form controls do need it stated (the UA stylesheet overrides inheritance).
- Primitives are **React components** in `shared/components/`, not CSS classes. They read tokens and are theme-agnostic — never write a light variant and a dark variant of a component; the palette swaps underneath it. Something earns a place there once it's used twice. **Don't add to `shared/ui/`** — it's down to the radix `sheet` + `button` that `SessionConfigSheet` needs.
- Cards are transparent by design (shadow separates them). `--bd` is transparent too, so hairline dividers don't show until it's filled. For something that needs a real fill now, reach for `--paper-*` / `PaperCard`.
- **A component that can't use the shared surface tokens gets its own group, not a fill of the shared ones.** `--paper-*` is the precedent (born as `--deck-*`, generalized when profile became the second consumer; settings is the third): ruled lists and the deck card need a real fill and edge, but filling `--card`/`--cardalt`/`--bd` to fix them would repaint every finished screen. `shared/components/PaperCard.tsx` is the ruled-list shell that reads the group. The app-wide switch to filled cards is still one line in `ds-tokens.css` and still unused. `--dock-*` is the second instance of the pattern for a different reason: the dock is near-black in **both** themes, so its inks are light-on-dark even in the light theme, where `--ink`/`--muted` are the opposite.

Theme choice persists in the `aogimi-theme` localStorage key, applied by a pre-paint `<script>` in `app/layout.tsx` (an effect fires after paint and flashes), falling back to `prefers-color-scheme`; a `users.theme` column supersedes it later. The switch is the Appearance card on `/settings` (TopBar's pill is a plain profile link). Every screen is token-driven now, so a screen that looks wrong in dark mode **is a bug**, not an accepted cost.

`dark:` is redefined in `globals.css` as `html[data-theme="dark"] &` — not shadcn's `.dark *` (never set here) and not `prefers-color-scheme`. Nothing uses it; the tokens swap underneath components instead.

The only surviving `lgc` strings are the localStorage keys `lgc_device_id` and `lgc_last_user_id`. **Don't rename them** — they're storage keys, and renaming orphans every existing install's device identity.

Full docs (all under `web-frontend/aogimi-web/info-documents/`):
- **`REDESIGN.md` — read this first if you're redesigning a screen.** Self-contained context for a fresh agent: what's done, the token traps, the primitive inventory, the recurring data gaps, and how to verify.
- `PROJECT_CONTEXT.md` — start here, end-to-end overview (see the **Theming** section).
- `backend-connections.txt` — endpoint catalog + payload shapes the frontend depends on.
- `DECISIONS.md` — scope decisions + deferred work.
- `AGENTS.md` — house rules for agents working in this package.

### Web: feature-oriented structure

The web app is organized **by feature, not by file type**. Three layers with one-way dependencies — `lib`/`shared` ← `features` ← `app`:

- `app/` — Next.js routing only. Pages are thin: each imports one feature view.
- `features/<feature>/` — self-contained slices. Each owns its `components/`, `hooks/`, `lib/`, `providers/`, `views/`, `types.ts` as needed and exposes a **public API via `index.ts` (barrel)**. Cross-feature imports go through the barrel; a types-only borrow may import `@/features/<x>/types` directly. Top-level features: `mobile-gate`, `auth`, `dictionary`, `home`, `profile`, `settings`, `onboarding`, `app-shell`, plus two domains with sub-features:
  - `books/` — `books/library` (the book list), `books/reader` (epub/pdf/text/manga engines + the two lookup surfaces, `reader-bubble` and `dict-sidebar`), shared data layer in `books/lib`, orchestrated by `books/views/BooksView` (the `/reader` route) and `books/reader/views/ReaderView` (`/reader/[bookId]`).
  - `study/` — `study/decks`, `study/session` (the study runner), `study/stats`, orchestrated by `study/views/StudyView` (the `/study` route, which needs both decks and session).
- `shared/` — `shared/components` (the redesign's general components — **put new primitives here**), `shared/ui` (the outgoing primitives + shadcn, being retired), `shared/icons` (global icons).
- `lib/` — feature-agnostic infra ONLY: `api.ts`, `tokenStore.ts`, `useFetchWithAbort.ts`, `storage/_helpers.ts`, `util/`.

The layer rule is enforced by `import/no-restricted-paths` in `eslint.config.mjs` (lib/shared must not import features; features must not import app). Cross-feature "import only via the barrel" is convention (could be hardened with eslint-plugin-boundaries).

### Web: state architecture

React Context providers, **each owned by its feature** and composed by `AppShell` (`features/app-shell/AppShell.tsx`): `AuthProvider`→`features/auth`, `DecksProvider`→`features/study/decks`, `DictionaryStateProvider`→`features/dictionary`, `ReaderStateProvider`+`ThemeProvider`→`features/app-shell`. **No Redux, Zustand, Jotai, etc.** Cross-feature signalling happens through "pending fields" on `ReaderStateProvider` — e.g. the reader sets `pendingCard`, `DecksView` picks it up on mount and nulls it. Effects guard against double-fire with `useRef`s of the last-handled trigger object (see `AppShell.tsx`, `PendingCardOverlay.tsx`). To avoid barrel cycles, feature code imports providers/hooks **by file path**, not via the app-shell/auth barrel.

Domain types live in each feature's `types.ts` (e.g. `features/dictionary/types.ts`, `features/books/types.ts`, `features/profile/types.ts`). A feature's fetch helpers live in its `lib/` (e.g. `features/study/decks/lib/decksApi.ts`) and import those types; no type declarations alongside fetch helpers. (`lib/types/` was dissolved in the feature refactor.)

### Web: app-level features

Documented in the **Features** section of `web-frontend/aogimi-web/PROJECT_CONTEXT.md`. When a new app-level feature lands (something a user can name — "shortcuts", "highlights sync", "deck import", …), add a subsection there: what it is, entry-point files, where state lives, any non-obvious behaviour. Keep entries terse; deep details belong in the source.

Currently documented features:
- **Home dashboard** (`features/home`) — `Home.tsx` composes the rows; `components/HeroBanner.tsx` (greeting + the deliberately empty sky panel) and `components/HomeCards.tsx` (continue-reading, study, library, dictionary, decks panel — all five in one file by request). Each card owns its request via a hook in `features/home/hooks/`, its own empty state and its own skeleton, so one slow query can't hold up the page. Renders the shared `TopBar` itself rather than inheriting it from the layout.
- **Study route** (`/study`, `features/study/views/StudyView.tsx`) — studying used to be local `screen` state inside `DecksView`; it's now a route so it can be linked to and survive a refresh. Config comes from the query string: no params = all decks `hardest_all_decks`; `?deck={id}` = that deck's saved mode/size; `?due=1` = every due card shuffled, sized from a due-count endpoint. Exits to `/decks`.
- **Theme switch** — `light` / `dark` via `html[data-theme]`, picked on `/settings` (Appearance card, the only theme control), persisted in `aogimi-theme`. See the design-tokens section above.
- **Settings / Help / Credits** (`/settings` + `/help` + `/credits`, `features/settings`) — three routes, one `SettingsShell` (TopBar with a `back to profile` pill eyebrow + sticky "Settings" rail), so navigating between them reads as the panel column swapping. Reached only from `/profile`'s Settings button. Appearance (theme picker), About (links to the other two), Data (sign out; delete account = `DELETE /api/user` behind a typed-"delete" `<dialog>` confirm, then `/authenticate`). Help prose ships with the app; the Credits list (`lib/credits.ts`) is the audited what-we-ship inventory — several data licenses require it, keep it in sync (Typography mirrors `app/layout.tsx`'s `next/font` imports).
- **Decks** (`/decks`, `features/study/decks`) — the unified sky stage: the old deck list, deck detail and the `/sky` route are all merged into one full-viewport view (`views/DecksView.tsx`). Every deck is a framed constellation on a grid (frames drawn by the sky engine — `features/sky` — fed per-deck `frameMeta`; clicking a frame is the way in). **The URL is the only navigation state**: `?deck={uuid}` is the focused deck, `&card={uuid}` the selected card; push on focus change, replace on selection, Escape walks card → deck → whole sky. Chrome overlays the stage: `StageChrome` (Study-all-due + New-deck buttons at the outer tier; deck-scoped Study + delete-deck when focused), `StageLedger` (account stats, mastery mix, recent upgrades — outer tier only), `GlassColumn` (focused deck: `CardSearch`, sortable card list, deck info, card detail with dictionary/delete actions). Glass chrome reads `lib/nightChrome.ts` constants, deliberately not tokens — the stage is night in both themes (same justification as `--dock-*`). Due counts come from one `/api/study/due/counts` call (`hooks/useDeckDueCounts.ts`), shared by frames, chrome and ledger. Deck rename/descriptions and per-deck session config currently have no surface (`SessionConfigSheet`/`useDeckOverrides` are orphaned but alive — `/study?deck=` still applies saved overrides). The reader's pending-card flow still lands here (`PendingCardOverlay` over the stage). `lib/rankProgress.ts` mirrors the promotion rules in `backend/src/services/cardSrsService.js` — change one, change both.
- **Dictionary** (`/dictionary`, `features/dictionary`) — one route, two states chosen by the URL: no `q` is the centred prompt (`components/BeforeSearch.tsx`), `?q=…` is a 380px results rail beside the selected entry (`views/SearchView.tsx`). `views/DictionaryView.tsx` is the only place that reads or writes the URL — `?q=` is the query, `?id=`/`?kanji=` the selected row — and **nothing is persisted**, because a localStorage mirror of the same facts drifted. New queries `push`, selection changes `replace`. The entry pane renders headword/reading/pitch/meanings straight from the rail's `WordResult` so switching is instant; only the kanji breakdown and examples wait on `/api/words/:id/details` (`hooks/useWordDetails.ts`, cached per id, not cancelled on selection change). **The reader's two lookup surfaces are built from this feature's exports rather than copies of them** — `features/books/reader/dict-sidebar/` (docked, 320–480px, `scale="compact"`) and `features/books/reader/reader-bubble/` (floating 880×620, five phases, `scale="full"`) render the same rows, `RailList` and entry panes. The barrel's components own no width, fill, edge, scroll or padding so the surface can supply the box; `scale` carries the type/spacing step-down. `DictionarySidekick` and `WordDetailView` are deleted.

- **Auth** (`/authenticate`, `features/auth`) — split screen: night `SkyPanel` left (dropped below `lg`, colours hardcoded because it's night in both themes; the generated constellation is deferred), `AuthForm` right. `mode` is **local state**, not a route — `AppShell` gates on `pathname === '/authenticate'` exactly. The switcher can't move when the mode changes: the signup-only email field stays mounted and goes `invisible` + `inert` in login mode, so the panel's height and centring never change. `ModeSwitch` is a radiogroup (no tab panels exist). `validate()` mirrors `backend/src/validation/auth.js` exactly — validating less means a valid-looking form returns a server error. `SocialButtons` is built behind `SHOW_SOCIAL_AUTH = false` (no OAuth exists); "keep me signed in", "forgot password", and terms/privacy links are not built.
- **Dock** (`features/app-shell/Dock.tsx`) — the fixed bottom nav, composed by `AppShell`, hidden on `/authenticate`. Replaced `WorkspaceNav` (deleted; the "don't touch it" deferral is lifted). Reader · Dictionary · Decks │ Home · Profile — Settings lost its entry (reachable from `/profile`), and Sky's went with the /sky → /decks merge. `next/link` + `aria-current="page"`, monochrome, labels always visible, Profile renders the `--avatar` circle. Reads the **`--dock-*`** group: near-black in both themes, so it can't use `--card`/`--muted`/`--ink` — same justification as `--paper-*`. Pages reserve `pb-[140px]`.

Routes worth knowing: there is no `/sky` — the star map lives at `/decks` (see the Decks entry; `features/sky` is the map engine only, with no route of its own; the old stats tabs are gone, `features/study/stats` survives only as the `statsApi` fetchers the ledger uses). There is no `/word/[id]` — the entry detail is a pane inside `/dictionary`.

### Mobile: mirrors the web theme pattern

Same three-layer system (`theme/tokens.ts`, `theme/createThemedComponent.tsx`, `themes/index.ts` + `themes/useThemedComponent.ts`). The Stamp theme registers `HomeScreen`, `DictionaryScreen`, `DictEntry`, `BottomTabBar` and uses theme-decoration atoms (`components/theme-decorations/stamp/`).

`mobile-frontend/aogimi-mobile/THEMES.md` documents the mobile theme system. (The web theming system has since been removed — see the web section above.)

### Books: per-device storage + Postgres metadata

EPUB/PDF blobs never go to Postgres. On web they live in a **single IndexedDB database `aogimi`** (`features/books/lib/booksDb.ts` is the sole connection factory; stores: `metadata`, `files` blobs, `handles` for the File System Access directory handle). On mobile they live in `expo-file-system documents/books/`. The backend stores **metadata + reading position** in `book_progress` rows (EPUB CFI / spine index / percent) — see *Reading progress / position* below and DECISIONS.md.

The `aogimi` DB merged two former databases (`aogimi-books` + `aogimi-fs`); `booksDb.getDb()` runs a one-time, idempotent copy-then-delete migration from them on first open.

Library mount on the web reconciles all three storage layers (`features/books/library/components/RestoreBooks.tsx`, driven by `features/books/views/BooksView.tsx`):
1. Load local IndexedDB book records.
2. Register the device (`POST /api/devices`) if absent.
3. Fetch backend books (`GET /api/books/user/{id}`).
4. `POST /api/books/match` reconciles unidentified local files against existing user books by hash priority: file_hash → content_hash → dc_identifier+title → filename.
5. Backfill identity (`PUT /api/books/{id}/identity`) for matched-but-stale rows.
6. Mark availability per device (`POST /api/devices/{deviceId}/books/{bookId}/available`).

### Reading progress / position

**Backend-buffered, EPUB only.** Position is captured from foliate's `relocate` event in the reader engines and persisted in two tiers (rationale in DECISIONS.md — deliberately *not* a per-turn backend write):

- **localStorage** (`features/books/lib/readerSession.ts`, key `reader_progress_<filename>`) is written on every page turn — cheap, no network, the per-device buffer / source of truth between flushes.
- **The backend** (`book_progress.cfi_position` / `spine_index` / `progress` via `PUT/POST /api/books/:id/progress`) is flushed only **periodically** (~60s backstop), **on exit** (`visibilitychange:hidden` / `pagehide` via a keepalive POST — `fetch(keepalive)`, *not* `sendBeacon`, so it carries the in-memory Bearer token), and **on unmount** (normal fetch — "Back to library" is an SPA nav that fires no unload event).

`features/books/views/useProgressSync.ts` owns the wiring; readers forward position via an `onRelocate` prop. On open, `BooksView` resolves the restore anchor as the **newer** of the localStorage snapshot and the backend row (same device ⇒ local; switched device ⇒ backend) and the engine does a one-shot `goTo`. The first relocate of a session only **seeds the dedup baseline**, so opening a book never writes back the restored position — a manual "mark finished" (`{ progress: 100 }`) sticks until the user actually turns a page. PDF position is **not** tracked yet (no backend column). Reader typography prefs remain in-memory only (reset per open) pending backend-backed storage.

## Gotchas

- **Next.js 16 has breaking changes.** `web-frontend/aogimi-web/info-documents/AGENTS.md` says: read `node_modules/next/dist/docs/` before writing route code. Conventions don't match training data — heed deprecation notices.
- **React Native 0.83 + Fabric:** `transform: pressed ? [...] : undefined` between press states gets coerced to `null` and crashes the transform processor (`forEach on null`). Always pass a stable-shape transform array, e.g. `transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }]`.
- **Hex literals in components are discouraged, not banned.** Anything that reads as palette belongs in tokens — grep a surface for `#[0-9a-f]{6}` and replace with a `ds-tokens.css` token (`bg-(--paper)`, `text-(--ink)`). But a one-off value that exists to make a *single* component work is fine hardcoded there rather than promoted to a global token: adding a token to `ds-tokens.css` widens the palette every screen reads, and that's the more expensive mistake. Document the value in a comment saying why it isn't a token. Standing exceptions: `JlptChip` (per-level palette, by design) and, on mobile, theme decoration atoms.
- **No inline `borderRadius: <px>` on token-relevant surfaces.** Use `rounded-*` Tailwind classes or `var(--radius-md)`. Pure decoratives (`'50%'`, `999`) are fine.
- **No inline `if (theme === 'stamp')` branches** in components. (Mobile only — web has no per-theme dispatch anymore. On mobile, move the variation into a shape token or fork via the registry.)
- **`react-hooks/set-state-in-effect`** fires false positives on legitimate "sync from external trigger" effects (see `features/app-shell/AppShell.tsx` pending-field effects, `features/study/decks/components/PendingCardOverlay/` phase seed). Block-disabled with explanatory comment where the pattern is correct.
- **Migrations are manual.** Sequence matters — apply in numbered order. `011_jlpt_seed.psql` is psql-specific because of `\copy`.
- **There are no pinned design canvases any more.** `aogimi-DS/`, `HomeDemos.tsx`, `DictionaryQuiet.tsx` and `DictionarySidekick.tsx` are all deleted; the library shelf (`BooksView`) is the last live production screen still awaiting redesign, not a reference layout. Every screen gets replaced eventually — a redesign is expected to rewrite the screen it's assigned, and there's no need to preserve the outgoing one's inline pixel radii.

## Conventions

- **Web file placement & naming (where new code goes).** Place by feature, never by file type. Pick the existing feature under `features/`; create a new one only for a genuinely new user-nameable concern.
  - A feature's internals use fixed sub-folder names — `components/` (PascalCase `Foo.tsx`), `hooks/` (camelCase `useFoo.ts`), `lib/` (camelCase: api/storage/pure logic, e.g. `fooApi.ts`), `providers/` (`FooProvider.tsx`), `views/` (route/page-level `FooView.tsx`), plus `types.ts`. **Only create a sub-folder that will hold a file** — no empty scaffolding.
  - Each feature has an `index.ts` **barrel** = its public API. Other features import from the barrel (`@/features/foo`); a types-only borrow may import `@/features/foo/types` directly. Inside a feature, use relative imports (`./`, `../`).
  - A domain with sub-features (`books`, `study`) nests them as sibling folders (`books/library`, `books/reader`), each with its own structure + barrel; things shared by the sub-features live at the domain root (`books/lib`, `books/types.ts`). Sub-features stay independent — they don't import each other (an orchestrator view at the domain root composes them).
  - Routing stays in `app/`; a page is a thin wrapper that renders one feature view. Cross-cutting UI primitives → `shared/components` (`shared/ui` is the outgoing set — don't add to it), global icons → `shared/icons`. `lib/` is feature-agnostic infra only.
- Domain types live in each feature's `types.ts` (e.g. `features/dictionary/types.ts`). A feature's fetch helpers live in its `lib/` (e.g. `features/study/decks/lib/decksApi.ts`) and import those types; no type declarations alongside fetch helpers. `web-frontend/aogimi-web/lib/` holds only feature-agnostic infra (`api.ts`, `tokenStore.ts`, `useFetchWithAbort.ts`, `storage/_helpers.ts`, `util/`).
- `lib/util/cn.ts` is the Tailwind class merger. shadcn's `components.json` aliases `utils` → `@/lib/util/cn`, so future `shadcn add` writes the right path.
- Don't run git commits, pushes, or destructive DB operations — the human handles those.
- All `*Api.ts` fetch helpers accept an optional `AbortSignal`; pair with `useEffect` cleanup.
