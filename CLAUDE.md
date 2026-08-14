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
npm run verify:fsrs                                # FSRS-6 vs py-fsrs 6.3.1 vectors
npm run verify:sky                                 # star map vs web copy + golden values
npm run verify:camera                              # UI-thread clamp mirror vs lib/camera.ts
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
**`POST /api/auth/register` is closed** — a `return res.status(403)` is the handler's first
statement, so nothing behind it runs (validation, the 3/hr/IP limiter and the 409 paths are
all still wired). To reopen, delete that one `return`; don't rewrite the handler.
No OAuth, no password reset, no session-only mode.

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
  - `sky/` — `sky/map` (the star-map engine: platform-free `lib/`, camera/frame `hooks/`, SVG
    `components/`; knows nothing about decks or routes), `sky/stage` (the `/sky` page **and** the
    deck data layer half the app borrows — `DecksProvider`, `decksApi`, quota caps, `CardDraft`),
    `sky/study` — itself `sky/study/session` + `sky/study/stats`. Orchestrated by
    `sky/stage/views/SkyView` (`/sky`) and `sky/study/views/StudyView` (`/study`); `sky/index.ts`
    exports only those two views, everything else comes from the sub-barrel that owns it.
- `shared/` — `shared/components` (**put new primitives here**), `shared/ui` (outgoing),
  `shared/icons`.
- `lib/` — feature-agnostic infra ONLY: `api.ts`, `tokenStore.ts`, `useFetchWithAbort.ts`,
  `storage/_helpers.ts`, `util/`.

The layer rule is enforced by `import/no-restricted-paths` in `eslint.config.mjs`. Cross-feature
"import only via the barrel" is convention, not enforced.

### Web: state architecture

React Context providers, **each owned by its feature**, composed by
`features/app-shell/AppShell.tsx`: `AuthProvider`→`auth`, `DecksProvider`→`sky/stage`,
`DictionaryStateProvider`→`dictionary`, `ReaderStateProvider`+`ThemeProvider`→`app-shell`.
**No Redux, Zustand, Jotai.** Cross-feature signalling goes through "pending fields" on
`ReaderStateProvider` — the reader sets `pendingCard`, `SkyView` picks it up on mount and
nulls it. Effects guard double-fire with `useRef`s of the last-handled trigger object
(`AppShell.tsx`, `PendingCardOverlay.tsx`). To avoid barrel cycles, feature code imports
providers/hooks **by file path**, not via the app-shell/auth barrel.

Domain types live in each feature's `types.ts`; a feature's fetch helpers live in its `lib/`
and import those types — no type declarations alongside fetch helpers.

### Web: routes and app-level features

**Per-feature detail lives in PROJECT_CONTEXT.md's `## Features` section** — a section each for
Dictionary, Decks, Settings, Auth, Dock and the Sky engine. Read the one you're touching; add a
section there (not here) when a new user-nameable feature lands.

Route map: `/` library shelf · `/reader/[bookId]` open book · `/dictionary` · `/sky` ·
`/study` · `/profile` · `/help` · `/credits` · `/authenticate`.

**What does not exist — don't recreate it:** no home dashboard (**`/` is the library shelf**,
so `/reader` survives only as the parent segment of `/reader/[bookId]`), no `/settings`
(settings is a column of `/profile`), no `/decks` (**the decks page IS `/sky`** — the grid and
the star map merged, and the Dock's "Decks" entry points there), no `/word/[id]` (the entry is a
pane in `/dictionary`).

Cross-file invariants that are easy to break without noticing:

- **`sky/lib/fsrs.ts` mirrors `backend/src/services/fsrs.js` line for line** —
  FSRS-6, 21 parameters, verified against py-fsrs 6.3.1. Change one, change both,
  then run **both** harnesses: `backend/scripts/verify-fsrs.js` and
  `web-frontend/aogimi-web/scripts/verify-fsrs.mts` (Node strips the types; no
  build step). The backend is the only writer — the web copy exists so the study
  screen can move before the POST lands. `fsrs.ts` sits at the **sky domain root**
  because `study`, `stage` and `map` all read it and sub-features can't import
  each other.
- **A review only counts if the card is due.** `cardSrsService.isDue` (mirrored in
  `sky/study/session/lib/srs.ts`) gates every memory update: grading a card early
  changes nothing at all — no stability, no rank, no schedule, no `card_reviews` row,
  no streak. Enforced server-side in `cardService.reviewCard`; the client copy only
  keeps the UI honest and skips the round trip. **Practice is an overlay on `/sky`**
  (`sky/components/PracticeOverlay`), not a route: the stage already holds every card,
  so a local session needs no `/api/study/session` and no review POST. The stage's one
  button is "Study N due" → `/study?due=1` while anything is due, then "Study ahead" →
  the overlay. **A bare `/study` redirects to `/sky`.** `useStudySession` takes a
  `StudySource`: `remote` (fetched, grades count) or `local` (cards handed in, grades
  only move the bar) — local *is* practice, there is no second flag. One consequence: a card re-seated by the
  in-session queue is no longer due, so FSRS's same-day path is currently unreachable.
- **Rank comes from stability alone** — `new` (never reviewed) · `met` S<21 ·
  `learned` 21≤S<365 · `mastered` S≥365. Never from difficulty or answer streaks.
  `cards.peak_rank` is a high-water mark: once a card reaches `learned` the UI
  draws `displayedRank()`, not `state`, so a lapse never demotes a star — the lost
  stability shows as **brightness** (retrievability) instead. Brightness is the one
  place fractional elapsed days are correct; **scheduling always floors to whole
  days**. Desired retention is fixed at 0.9 and deliberately not exposed.
- **`auth`'s `validate()` mirrors `backend/src/validation/auth.js` exactly** — validating less
  means a valid-looking form returns a server error.
- **`settings/lib/credits.ts` is the audited what-we-ship inventory** — several data licenses
  require it; keep it in sync (its Typography list mirrors `app/layout.tsx`'s `next/font` imports).
- **`/sky` and `/dictionary` keep navigation state in the URL only** — nothing persisted (a
  localStorage mirror of the same facts drifted). `/sky`: `?deck=`/`&card=`, Escape walks
  card → deck → sky. `/dictionary`: `?q=` + `?id=`/`?kanji=`, and `views/DictionaryView.tsx`
  is the only file that reads or writes it. `/study` reads its whole config from the query
  string: `?deck={id}` uses that deck's saved mode/size, `?due=1` is every due card shuffled,
  no params = all decks in `hardest_all_decks` mode. Exits to `/sky`.
- **The reader's two lookup surfaces are built from `features/dictionary`'s exports, not
  copies** — `dict-sidebar` (`scale="compact"`) and `reader-bubble` (`scale="full"`). The
  barrel's components own no width, fill, edge, scroll or padding so the surface supplies the
  box; `scale` carries the type/spacing step-down.
- **`/sky` chrome reads `lib/nightChrome.ts` constants, deliberately not tokens** — the stage
  is night in both themes. Exceptions: `active`/`activeInk` reference `--active`.
- **Dock:** `aria-current="page"` is load-bearing three times over — accessible state, CSS hook
  for the active ink, and what the sliding pill's measurement queries. Reader's entry is `/`
  and matches exactly. **Pages reserve `pb-[140px]`.**
- Two prefix tests depend on the route shape and are deliberately not equality checks —
  `AppShell`'s `isOpenBook` (hides the dock) and `useReaderActions`'s `isDictSurfaceVisible`.

### Mobile: mid-catch-up to the web (2026-08-08)

Mobile was a release behind and is being brought level in phases. **Phases 0–5 are done, and
phase 6 (the design-dependent half) is in progress.** `mobile-frontend/aogimi-mobile/TODO.md`
opens with a **"Phase 6 — open items"** section that is the live, current list — what is
unverified, which judgment calls need eyeballing, and where to resume. Read it before starting
mobile work; don't re-derive it here. What changed, because none of it matches older notes:

- **Structure now mirrors the web**: `features/<domain>/{components,hooks,lib,providers,views}`
  + `shared/` + `lib/`, with the same one-way layer rule enforced by `import/no-restricted-paths`
  in `eslint.config.js`. `components/` no longer exists. Decks live at `features/sky/stage`,
  study at `features/sky/study` — the decks page *is* becoming the sky, as on the web.
- **Always our fonts, never the handoff's.** Design handoffs arrive naming their own typefaces —
  the Home board asks for M PLUS 1 + Space Mono. The answer is always no. Mobile uses **Switzer**
  (the `ui`/`display`/`mono` roles) + **Noto Sans JP** (`jp`/`jpSans`), matching the web's
  `--face-ui` / `--face-mono` / `--face-jp`; Lora stays, but only as the *reader's* body face.
  Substitute in `theme/tokens.ts`, **never at a call site** — no component names a family.
  `theme/switzer.ts` is the one place a font file is registered (`.otf` in `assets/fonts/`,
  committed under the ITF Free Font License; the web's `.woff2` can't be reused — RN has no woff2).
  **Neither family ships a 600 cut**, so `fontWeight: '600'` gets synthesised and looks wrong — the
  `ChipShape`/`sectionLabel` unions no longer permit it, but ~60 inline uses survive on
  un-redesigned screens and each should go to `'700'` as its screen is reached.
- **Two themes: Day ("Ink on paper") + Night ("Midnight").** Restored 2026-08-12 with the handoff,
  after phase 6 had collapsed the app to one. `theme/tokens.ts` exports `PALETTES = { day, night }`
  typed by a single `Palette` (mapped over Day, so a key missing from Night is a compile error);
  `ThemeContext` resolves one and exposes **`usePalette()`**, which is what a redesigned screen
  reads. Preference is `'day' | 'night' | 'system'`, persisted to `aogimi_theme_name`, default
  `'system'` via `useColorScheme()`, changed at `/profile/settings/appearance`.
  - The legacy `useColors()` bridge is now `legacyColors(palette)`, **derived from the active
    column**, so the ~61 screens still on it follow the theme for free. What they can't follow is a
    *hardcoded* `#FFFFFF`, of which there are still many — so **Night looks wrong on screens the
    redesign hasn't reached**, and that is expected, not a bug to chase globally.
  - `export const palette` survives as a **deprecated Day-locked alias** for the ~21 modules that
    read it inside a module-scope `StyleSheet.create` (which can't call a hook). Don't add call
    sites; a screen being redesigned switches to `usePalette()` + a `useMemo`'d style factory.
  - **The surface contract is about role, not lightness** — the reset's `paperTile` < `paper` ≤ `bg`
    ladder is gone, because the columns order themselves differently (Day `paper` > `bg` >
    `paperTile`, Night `paper` > `paperTile` > `bg`). The rule: `paper` is the **raised card** and
    separates from `bg`; `paperTile` is an **inset within a card** and is judged against `paper`,
    not against the canvas. Cards sit *above* the canvas now.
  - **Alpha is allowed again** in `tintA/B`, `bdA/B` and the `*Bg`/`*Bd` washes — the reset banned it
    because one column's alphas vanished on the other ground, and two columns each carrying their
    own removes that failure mode. `paperBd` stays opaque in both.
  - Radii were re-valued to the handoff's steps: `md` 10 → **12** (buttons), `lg` 14 → **16** (cards).
    Names unchanged.
  - **`sky1..3`/`deckSky` stay dark in Day too** — stars need night. That's why `nightChrome`'s
    panels are light: black ink on a near-black panel was the least readable pair in the app.
    Untouched by the handoff: `sky/map/lib/palette.ts` (`verify:sky` asserts it bit-identical to the
    web — the handoff prints the rank ladder as `r1..r4`; **do not re-declare those hexes**), the
    reader's page themes in `readerStorage.ts`, the manga shell (black, for image viewing),
    `ResultButtons`' four grade hues, and `bookPush`'s `cover_color` — that one is pushed to the
    backend and rendered by the web, so it's shared data, not styling. `BookCover` uses the stored
    hex as a *key* into the four cover fills rather than painting it.
  - **No `dock*` group.** The handoff draws a flat slab; `Dock.tsx` keeps the web's glass. Standing
    rule for this redesign: **the handoff owns geometry, the web owns material.**
- **Mobile motion and decoration were stripped to nothing on 2026-08-10**, same intent as the
  colour reset. No press feedback (every `({ pressed }) => …` style callback deleted — pressing a
  control gives no response, which is a **known regression to be replaced, not preserved**), no
  shadows or elevation (`softSurface` is zeroed, fields kept), no decorative gradients (covers and
  heroes are flat fills), no transitions (`BottomSheet`, `FloatingBackButton`, `ReaderBottomDock`
  and `PdfDock` are instant; the reader's foliate `animated` attribute is unset). **Gestures kept
  working** — swipe-to-dismiss, tap-outside, pinch-zoom — they just lost their motion, and the
  sheet/docks no longer track your finger mid-drag. **Exempt by design: the whole Dock**
  (blur/sheens/sliding pill), `MangaScrollView`'s Reanimated pinch-zoom, and the `sky/map`
  renderer. Radii, borders, spacing and typography are structure and were not touched.
  The live per-item list is in `mobile-frontend/aogimi-mobile/TODO.md`.
- **FSRS-6**, ported line-for-line from the backend; `features/sky/lib/fsrs.ts` with the due gate
  in `features/sky/study/lib/srs.ts`. **Three mirrors now** (backend, web, mobile) and three
  harnesses — change one, change all three, run all three.
- **`features/sky/map/lib` is a verbatim copy of the web's** — see its README. `verify:sky`
  asserts bit-identical output. `features/sky/lib/skyProjection.ts` is the `CardRecord` → star
  boundary that keeps the engine free of FSRS and the API.
- **Mobile's sky renderer is `@shopify/react-native-skia`, not `react-native-svg`** (2026-08-13), and
  the camera's live pose lives in Reanimated shared values on the **UI thread** — a pan or pinch is a
  matrix on a world-space scene, with no React render at all. `hooks/useSkyCamera.ts` holds the two
  poses (live, and the *committed* one LOD/culling resolve against) and explains the one trade: between
  commits a pinch scales the picture, so star radii drift and snap back at each commit
  (`COMMIT_ZOOM_RATIO`). **The outer tier is no longer locked** — the web's immobile chooser was wrong
  on a phone. Consequence worth knowing: worklets **cannot** call `lib/camera.ts` (Reanimated only
  workletizes imports under experimental `bundleMode`), so its clamp law is mirrored as worklets in
  `map/native/cameraWorklet.ts` — a **fourth** verified mirror alongside the three FSRS copies. Change
  one, change both, run `verify:camera`. Native module: changing it needs `expo prebuild`.
- **Gone**: DeepL (entirely), the `/stats` screen, the multi-theme shell.
- `lib/localSchema.ts` wipes local decks/cards on a `LOCAL_SCHEMA_VERSION` bump — the app is
  undeployed, so stale local rows are dropped rather than migrated.

- **Routes are restructured**: four tabs — `home` (a mobile-only dashboard the web has no
  equivalent of) · `reader` · `dictionary` · `sky`. Profile and Settings are **pushed** screens
  (`/profile`, `/profile/settings/*`), reached from Home's header avatar; there is no decks
  page, so `/sky/[deckId]` and the study routes keep Sky lit. The dock is
  `features/app-shell/Dock.tsx` — the web's glass material, and it exports **`useDockClearance()`**,
  which screens must use for bottom padding because the dock floats.
- **Home (2026-08-12), then Profile + Settings (2026-08-13), are rebuilt against handoffs** and set
  the pattern: the view is composition + data only, every card is its own file in the feature's
  `components/`, and each reads `usePalette()` + a `useMemo`'d style factory. The handoff's Library
  and Word-of-the-Day cards were **cut, not deferred** — Library duplicates the Reader tab, and
  there is no word-of-the-day data. Continue-reading shows **% only**: `page_count` is PDF-only, so
  "page N / M" would be present on some books and absent on others.
- **A handoff never adds a feature.** Drawing a row implies a working setting, so a row with nothing
  behind it does not get built: Settings kept exactly its five existing entries and only changed
  *arrangement* (flat list → the handoff's labelled groups), skipping the font picker, study
  toggles, sync/export/delete and version footer. Profile skipped Daily goal, Study reminder and the
  sky strip, and its stat strip reads DAYS STUDIED · MASTERED · STARS because **nothing counts
  "sessions"** — `study_days` rolls up per day, `card_reviews` logs single grades.
- **Pushed screens exit via `shared/components/BackBar`** (chevron + "Back" + the title), not the
  handoff's boxed icon-only chevron, and they **do not draw the dock** — a tab bar on a pushed screen
  offers two competing ways back. Used by Profile, Settings, Language, Appearance.
- **Shared surfaces live in `shared/components/`**: `Card` (the `paper`/`paperBd`/radius-16 box, no
  shadow), `RowGroup` + `Row` + `SectionLabel` (the handoff's grouped settings list — `RowGroup`
  suppresses the last row's divider itself, including when that row is conditional), `DangerButton`
  (48px outline, the only destructive affordance). All theme-aware; `shared/components/Button` is
  **not** — it still reads the Day-locked static palette.
- **Recent dictionary lookups are device-local and have no web counterpart.** Two stores in
  `features/dictionary/lib/dictionaryStorage.ts`: recent *searches* (strings typed, drives the
  dictionary tab's suggestions) and recent *lookups* (entries opened, drives Home's card, written
  by **every** surface that opens a word — the tab and the reader's drawer). Lookups snapshot
  headword/reading/gloss at write time rather than storing an id, so Home never does N SQLite
  reads on mount. Not a sync gap — reading history stays on the phone.
- **`ios/` is generated and untracked.** It is `Aogimi.xcodeproj` / `com.aogimi.mobile` / scheme
  `aogimi`. Never hand-edit it: change `app.json`, then `npx expo prebuild --clean -p ios`. A
  stale native project (the old Shirube one) once linked a misplaced native-module registry and
  produced a **silent blank screen** — RN views rendered, Fabric components did not.

Still outstanding: the sky **stage screen**, and the screen-by-screen redesign, of which Home is
done. Fonts are **in** (Switzer + Noto Sans JP, both loading). Mobile keeps three things the web
doesn't — an offline SQLite dictionary, reader highlights/bookmarks/annotations, and i18n
(en/ja/pt) — none of which the redesign should remove.

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
  Standing exceptions: `JlptChip` (per-level palette, both platforms) and mobile's grade-button
  row (`ResultButtons`), whose four colours are the FSRS grades' meaning, not decoration.
- **No inline `borderRadius: <px>`** on token-relevant surfaces — use `rounded-*` or
  `var(--radius-md)`. Pure decoratives (`'50%'`, `999`) are fine.
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
