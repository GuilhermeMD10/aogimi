# Aogimi Web — Project Context

A primer for new contributors and agents. Read this first; specialised docs ([DECISIONS.md](DECISIONS.md), [backend-connections.txt](backend-connections.txt)) drill into specific surfaces.

---

## What this is

Aogimi is a **Japanese reading + vocabulary app**. Users import EPUBs / PDFs, read in-app, look up words against JMdict / KANJIDIC2, and build flashcard decks for spaced study. Decks, devices, and profile/study settings sync to a Postgres backend; the actual book files live per-device (IndexedDB) and are reconciled by hash on demand. EPUB reading position is buffered in localStorage on every page turn and flushed to the backend `book_progress` row periodically + on exit, so books resume where you left off (across devices); see the Persistence model. PDFs resume too — the page number rides in the same `cfi_position` column as `page-N`, which is what the mobile reader writes.

The app ships as a single Next.js client. There's a separate Expo mobile app (`mobile-frontend/aogimi-mobile`) that mirrors the same backend; this doc is **web-only**.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router; not the version your training data has — read `node_modules/next/dist/docs/` before writing route code) |
| React | **19.2** |
| Styling | **Tailwind v4** (CSS variables via `@theme inline`), shadcn/Radix primitives |
| Icons | `lucide-react` |
| EPUB | **foliate-js**, vendored in `public/foliate-js` and run in an iframe sandboxed **without `allow-scripts`** — book content is untrusted. `epubjs` is gone. |
| PDF | `pdfjs-dist` + `react-pdf`, client-side |
| Storage | localStorage (auth user, theme, sky hue, recent lookups, device id, per-book position) + a single `aogimi` IndexedDB via `idb` (book blobs + metadata + FS directory handle) |
| Bundle helpers | `clsx`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority` |

No state library (Redux/Zustand/Jotai). State lives in **React Context providers**.

No CSS-in-JS. Themed surfaces read the design tokens directly — `bg-(--paper)`, `text-(--ink)`, or raw `style={{ background: 'var(--bg)' }}`. Both go through the same source (`styles/ds-tokens.css`).

---

## Top-level layout

**Organised by feature, never by file type.** Three layers, and the dependency
arrow only ever points one way: `lib`/`shared` ← `features` ← `app`. That rule is
enforced by `import/no-restricted-paths` in `eslint.config.mjs`, not just
convention.

```
web-frontend/aogimi-web/
├── app/                          ROUTING ONLY. Each page is a thin wrapper over one feature view.
│   ├── layout.tsx                Fonts, the pre-paint theme script, ThemeProvider → AuthProvider → AppShell
│   ├── globals.css               Imports the style files; declares the Tailwind @theme aliases
│   ├── fonts/                    Self-hosted Switzer (ui + mono)
│   ├── page.tsx                  /                    the library shelf
│   ├── reader/[bookId]/page.tsx  /reader/[bookId]     one open book (no bare /reader page)
│   ├── dictionary/page.tsx       /dictionary
│   ├── sky/page.tsx              /sky                 the star map — and the decks screen
│   ├── study/page.tsx            /study               the session runner
│   ├── profile/page.tsx          /profile             account card + the settings column
│   ├── help/page.tsx             /help
│   ├── credits/page.tsx          /credits
│   └── authenticate/page.tsx     /authenticate
│
├── features/                     Self-contained slices. Each owns whichever of components/ hooks/
│   │                             lib/ providers/ views/ types.ts it needs; index.ts is its public API.
│   ├── app-shell/                AppShell, Dock, TopBar + the Reader / SkyHue / Theme providers
│   ├── auth/                     /authenticate, AuthProvider, the mirrored validate()
│   ├── books/                    library/ · reader/ (epub, pdf, text, manga + dict-sidebar,
│   │                             reader-bubble) · lib/ (IndexedDB, hashing, progress) · views/
│   ├── dictionary/               /dictionary, and the parts the reader's two lookup surfaces reuse
│   ├── sky/                      map/ (the platform-free star-map engine) · stage/ (/sky + the deck
│   │                             data layer half the app borrows) · study/ (session/ + stats/)
│   ├── profile/  settings/  onboarding/  mobile-gate/
│
├── shared/
│   ├── components/               Cross-cutting primitives — PUT NEW ONES HERE
│   ├── icons/                    The outgoing lucide-mapped set
│   └── ui/                       Outgoing shadcn — down to button + sheet; don't add to it
│
├── lib/                          Feature-agnostic infra ONLY — no domain types, no feature logic
│   ├── api.ts                    request() + apiGet / apiSend / apiSendVoid / apiSendPublic
│   ├── tokenStore.ts             Access token in memory; the refresh token is an httpOnly cookie
│   ├── useFetchWithAbort.ts
│   ├── storage/_helpers.ts
│   └── util/                     cn (Tailwind class merge), pitch, relativeTime
│
├── styles/
│   ├── ds-tokens.css             The palette: colour, shape, type, page canvas (light + dark)
│   ├── glass.css                 The frosted-surface recipe — every number, one tweak surface
│   ├── sync-tokens.css           Book sync-state colours (synced / unsynced / to-import)
│   └── utilities.css             Reader highlights, word hover, vertical text, selection
│
└── scripts/, public/, info-documents/
```

**Domain types live in the feature that owns them** (`features/<x>/types.ts`), and
that feature's `lib/*Api.ts` imports them — there is no central `lib/types/`.
Inside a feature, imports are relative; across features they go through the
barrel (`@/features/foo`), or `@/features/foo/types` for a types-only borrow.

---

## Run-of-show: a request hits the app

1. Browser loads `/` → Next.js renders `app/layout.tsx` (RSC).
2. A **pre-paint `<script>`** (`THEME_INIT`) stamps `data-theme` and `data-sky-hue` on `<html>` before first paint — an effect would fire after paint and flash. It reads `aogimi-theme` / `aogimi-sky-hue`, falls back to `prefers-color-scheme`, then applies the `FORCED_THEME` pin. `/authenticate` is the one exception: it renders `light` regardless and parks the user's real choice in `data-user-theme` for `ThemeProvider` to pick up.
3. React hydrates. `ThemeProvider` mirrors that same decision (its own `FORCED_THEME` constant must match the script's — change one, change both).
4. `AuthProvider` restores the session: `auth_user` from localStorage plus a silent `/api/auth/refresh` that re-mints the in-memory access token from the httpOnly cookie. No user and not on `/authenticate` → `AppShell` redirects (and the reverse: a signed-in visitor on `/authenticate` goes to `/`).
5. `AppShell` mounts the rest, outermost first: `SkyHueProvider` → `ReaderStateProvider` → `DictionaryStateProvider` → `DecksProvider`.
6. The route renders inside `AppShell`, alongside the floating `Dock` (hidden on `/authenticate` **and** on an open book, `/reader/<id>`) and any active reader bubble.

---

## Theming

**One token system: `styles/ds-tokens.css`.** The redesign's incremental migration is over — the outgoing `--lgc-*` layer is deleted, and so are the three webfonts and the four screens that were the last things reading it. If you find a `--lgc-*` reference in a doc, it's history; the only surviving `lgc` strings in the codebase are two localStorage keys (`lgc_device_id`, `lgc_last_user_id`), which are **not** renamed because renaming them would orphan every existing install's device identity.

### The palette (`styles/ds-tokens.css`)

Two themes, `light` ("Ink on paper") and `dark` ("Midnight"), selected by `html[data-theme]`.

- **Colour + shape tokens**: `--ink`, `--soft`, `--muted`, `--faint`, `--card`, `--cardalt`, `--bd`, `--btn`, `--active`/`--active-ink`, `--track`/`--fill`, `--cover-1..4`, `--stage-new`/`-met`/`-learned`/`-mastered`, `--radius-*`. Read them as `text-(--ink)`, `bg-(--card)`.
- **`--active` is the one answer to "this one is selected"**, app-wide and theme-invariant (like `--accent`, and for the same reason: a marker that changes hue with the theme stops being a marker). It arrived as the dock pill's tint and was promoted because the app had been answering that question three ways — `--btn` (black on paper, white at night, so selection flipped with the theme), a `--gold` edge on the library's filter hover, and shadcn's `bg-primary`. Stated as a solid colour; glass derives the 65% density it wants (`--glass-active-fill`). Selected controls take `--active` + `--active-ink` — note `--active-ink` does **not** flip with the theme, so it is not `--btn-ink`. It is for *selection*, not for primary actions: a filled Study or Sign-in button is still `--btn`.
- **Type**: `--face-jp`, `--face-ui`, `--face-mono` → Noto Sans JP (jp) and Switzer (ui + mono — the 2026-08 font audition retired Space Mono; the approved look wears Switzer everywhere, and the roles stay separate so re-splitting is a one-line change in ds-tokens.css). Switzer is a Fontshare family, self-hosted from `app/fonts/`. Named `--face-*`, not `--font-*`, so a role never reads as one of the `--font-switzer`/`--font-noto-sans-jp` variables `next/font` emits in `app/layout.tsx`. **No 600 cut ships in either family** (Switzer 400/500/700, Noto Sans JP 500/700), so use `font-medium` / `font-bold` — a `font-semibold` gets synthesised.
- **Not mirrored into Tailwind's `@theme`.** Components read the tokens directly. `@theme` holds only what Tailwind itself must know: the `rounded-*` radius scale, and the shadcn colour namespace (`--color-popover`, `--color-border`, …) that the two surviving shadcn components paint with. Those are pointed at the filled `--paper-*` group, and `--color-border` reaches past shadcn — the `*` rule in the base layer makes it every element's default border colour.
- **Cards are transparent by design** — shadow and layout separate surfaces, not a fill. `--bd` is transparent too, so hairline dividers are invisible until you fill it. Filling `--card`/`--cardalt`/`--bd` switches the whole app to filled cards with no markup change. For something that needs a real fill *now*, there are two answers: the `--paper-*` group (`PaperCard`) or, since the glass pass, `GlassCard` — the same ruled-list shell built out of `GLASS_SURFACE`. `/profile` took the glass one and is no longer a `--paper-*` consumer; settings, help and credits still are.
- **Primitives are React components**, not CSS classes: `shared/components/` (`Button`, `Card`, `Chip`, `CoverTile`, `Eyebrow`, `JlptChip`, `MonoAction`, `PaperCard`, `GlassCard`, `ProgressTrack`, `Skeleton`, `SkyBar`, `StageDot`, plus `HAIRLINE`/`DASHED` and the `GLASS_*` class names). They read tokens and know nothing about the theme — there is never a light and a dark variant of a component, because the palette swaps underneath it.
- **Frosted surfaces live in `styles/glass.css`**, not in tokens and not in components — the recipe needs `::before` (the specular edge lines) and a `:hover` fill, which a React component can't express without inline styles that then lose to everything. `shared/components/glass.ts` exports the greppable class names: `GLASS_SURFACE` / `GLASS_SHEEN` / `GLASS_BUTTON` / `GLASS_SHEET` for the four surfaces, plus three modifiers — `GLASS_SCRIM` (the dark variant, **only** for glass landing on cover art), `GLASS_ACTIVE` (the selected state: `--active` tint, its dark ink, brighter edge and glow, hover neutralised) and `GLASS_PRESS` (the `translateY(1px) scale(.985)` nudge, 120ms). **One material, app-wide**: the library and the dock share the white fill at 15%, blur 13, `.075` edge and the small inner glow, so the two glass screens read as the same substance. Only the book card's slide-up sheet and a live cover's ⋯ circle take the scrim. Compose with Tailwind for geometry, radius, padding and type — utilities beat the recipe, which is why a selected branch must not also set `text-*`. `GLASS_PRESS` is opt-in rather than part of `GLASS_BUTTON` because an element has one `transform` and some already spend theirs (the book card lifts on hover); a button with its own `transition-*` utility has to name `transform` in that list or the nudge snaps instead of easing.
- **Page canvas** is app-wide chrome, set in `globals.css`: base gradient on `<html>`, star tiles on `<body>`. Split across two elements because a single 43-layer `background` would need a 43-entry `background-size` list (a shorter list gets cycled by the spec).
- **Base-layer type**: `html` carries `--face-ui` and there is deliberately **no `h1..h6` rule**. A global heading face beats an inherited one no matter what a screen's wrapper sets, which is exactly how four migrated headings ended up rendering in the old display serif. Form controls (`button`, `input`, `select`, `textarea`) do need the face said explicitly — the UA stylesheet gives them the platform font instead of inheriting.

- **Sky hue is a second axis, `data-sky-hue` on `<html>`** (`default` · `ginga` · `ember` · `aurora`), owned by `features/app-shell/providers/SkyHueProvider.tsx` and persisted in `aogimi-sky-hue`. It recolours the star map only; it is not a theme and does not touch the palette above. The control is the Sky hue row of the settings list on `/profile`.

Theme choice persists in the `aogimi-theme` localStorage key, applied by the pre-paint `<script>` described in the run-of-show above. Falls back to `prefers-color-scheme`. It moves to a `users.theme` column later. The switch is the Theme row of the settings list on `/profile`.

**The app is currently pinned to Midnight.** `FORCED_THEME = 'dark'` in `features/app-shell/providers/ThemeProvider.tsx`, mirrored by the same constant inside `app/layout.tsx`'s init script — both must change together. While the pin is on, `ThemeProvider` reports `locked`, `setTheme`/`toggle` are no-ops and the settings row shows the state without offering the switch. The stored preference is deliberately still read and never overwritten, so unpinning restores whatever the user last chose. Light is not dead code — `/authenticate` renders in it today, and every screen is still token-driven, so **a screen that looks wrong in light is still a bug**.

`dark:` is redefined in `globals.css` as `html[data-theme="dark"] &`, not shadcn's `.dark *` (a class this app never sets) and not `prefers-color-scheme`. Nothing uses it — the tokens swap underneath components instead — but if you do reach for it, it now means what the theme switch means.

---

## State architecture

All state is in **React Context providers, each owned by the feature it belongs to** and composed by `AppShell` (`ThemeProvider` and `AuthProvider` sit above it, in `app/layout.tsx`). **No Redux, Zustand or Jotai.** To avoid barrel cycles, feature code imports a provider **by file path**, not through the owning feature's `index.ts`.

| Provider | Owned by | What it owns | localStorage key(s) |
|---|---|---|---|
| `AuthProvider` | `auth` | Current user, login/signup/logout. **Token storage = "memory + httpOnly cookie"**: the access token lives in memory only ([`lib/tokenStore.ts`](../lib/tokenStore.ts)), the refresh token is an httpOnly cookie set by the backend and never readable by JS. On boot a silent `/api/auth/refresh` re-mints the access token. The session-invalidation hook in [`lib/api.ts`](../lib/api.ts) auto-signs-out on an unrecoverable 401. See [`../../../backend/docs/AUTH.md`](../../../backend/docs/AUTH.md). | `auth_user`, `lgc_last_user_id` (tokens are **not** in localStorage — don't put them back) |
| `ThemeProvider` | `app-shell` | `light` / `dark`, mirroring the pre-paint script. Currently pinned by `FORCED_THEME` (see Theming). | `aogimi-theme` |
| `SkyHueProvider` | `app-shell` | The star map's hue preset (`default`/`ginga`/`ember`/`aurora`), stamped as `data-sky-hue`. | `aogimi-sky-hue` |
| `ReaderStateProvider` | `app-shell` | The reader bubble's visibility (`readerBubble`), the docked-dictionary toggle (`sidekickOpen`), and the `pendingCard` hand-off to `/sky`. The **open book is not here** — the reader is `/reader/[bookId]`, so the id in the URL is the session and `ReaderView` resolves the file, restore anchor and progress sync from it. | (none) |
| `DictionaryStateProvider` | `dictionary` | Search query/results + the word the reader's surfaces have open (`selectedWordId`). Nothing is persisted: `/dictionary` keeps query and selection in the URL, and a second copy in localStorage gave two sources of truth that drifted. A *kanji* selection isn't here — the field is a word id and a character has none, so the reader's surfaces keep that half locally (`reader/hooks/useDictSelection.ts`). | `dictionary_recent_searches` (written by `pushRecentSearch`, not by provider state) |
| `DecksProvider` | `sky/stage` | Deck summaries the rest of the app reads (the add-card flow, the study runner's deck identity), plus `createDeck` / `deleteDeck` / `bumpCardCount`. The `/sky` page holds its own fuller copy — see that section for why both exist. | (none) |

**Cross-feature signalling goes through "pending fields"** on `ReaderStateProvider`: the reader sets `pendingCard`, `SkyView` picks it up on mount and nulls it. Effects guard double-fire with a `useRef` of the last-handled trigger *object* (`AppShell.tsx`, `PendingCardOverlay.tsx`) — this is the documented false positive of `react-hooks/set-state-in-effect`, block-disabled with a comment where the pattern is correct.

The reader and the dictionary, though, talk through **`features/app-shell/hooks/useReaderActions.ts`**, not through pending fields. `requestDictLookup(word, sentence)` runs the search and opens the bubble *only* if no dictionary surface is already visible (`/dictionary`, or the reader with its column docked — a prefix test on `/reader/`, because `/reader` bare is not a page). `requestAddCard` opens the bubble and also sets `pendingCard`, which `/sky` consumes on mount if it happens to be there; `AppShell` clears both together on close so the card can't be created twice. The old `pendingDictSearch` / `pendingBookOpen` fields and their `fired*Ref` guards are gone — that logic now lives at the call site, gated by stable function identity.

---

## API surface

Backend lives at `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`). Full endpoint inventory + payload shapes in [backend-connections.txt](backend-connections.txt). HTTP helpers in `lib/api.ts`:

- `apiGet<T>(path, signal?)` — GET → JSON
- `apiSend<T>(path, method, body?, signal?)` — POST/PUT/PATCH/DELETE → JSON
- `apiSendVoid(path, method, body?, signal?)` — same, ignores response body
- `apiSendPublic<T>(...)` — same as `apiSend` but **skips the Authorization
  header** and the 401 refresh-retry. Use for `/api/auth/*` and anything
  else that must not carry a bearer token.

**Authorization is injected automatically.** Every authenticated call
goes through `request()` in `lib/api.ts`, which:
1. Stamps `Authorization: Bearer <access>` if a token is present.
2. On 401, calls `/api/auth/refresh` once (single-flight, so concurrent
   401s share one in-flight refresh) and retries the original request.
3. If the refresh itself fails 401, clears tokens and fires the
   session-invalidation hook → `AuthProvider` wipes the stored user.

See [`../../docs/AUTH.md`](../../docs/AUTH.md) for the full token model.

All accept an optional `AbortSignal`. Pair with `useEffect` cleanup to cancel in-flight fetches when components unmount.

There are no server-only Next.js API routes — every data call goes straight to the backend API.

---

## Persistence model

| Where | What | Notes |
|---|---|---|
| **Backend (Postgres)** | Users (incl. `onboarding_completed`, avatar, study display prefs + deck overrides), books metadata + "finished" flag, decks, cards, devices, JMdict/KANJIDIC2 | Everything that should sync across devices; single source of truth for settings (no local cache) |
| **IndexedDB** (`aogimi`) | EPUB / PDF blobs (`files`) + per-file metadata (`metadata`) + the FS Access directory handle (`handles`) | Per-device — files don't leave the browser. **`features/books/lib/booksDb.ts` is the sole connection factory**; `getDb()` runs a one-time idempotent migration from the two former DBs (`aogimi-books` + `aogimi-fs`). |
| **localStorage** | `auth_user`, `lgc_last_user_id`, `aogimi-theme`, `aogimi-sky-hue`, `dictionary_recent_searches`, `library-dir`, `lgc_device_id`, and `reader_progress_<filename>` per book | Per-device, low-stakes. **`lgc_device_id` and `lgc_last_user_id` keep their old prefix on purpose** — renaming them orphans every install's device identity. |

Library mount reconciles all three: load local IndexedDB → register the device (`POST /api/devices`) if absent → fetch backend books (`GET /api/books/user/{id}`) → `POST /api/books/match` to resolve unidentified local files **by hash priority: `file_hash` → `content_hash` → `dc_identifier`+title → filename** → backfill identity (`PUT /api/books/{id}/identity`) for matched-but-stale rows → `POST /api/devices/{deviceId}/books/{bookId}/available` for files present locally. See [`features/books/library/components/RestoreBooks.tsx`](../features/books/library/components/RestoreBooks.tsx), driven by `views/BooksView.tsx`.

**Reading position is backend-buffered, not written per page turn.** Two tiers: `reader_progress_<filename>` in localStorage on every relocate (the per-device buffer and the source of truth between flushes), and `book_progress` on the backend flushed ~60s, **on exit** (`visibilitychange:hidden`/`pagehide`, via `fetch(keepalive)` — *not* `sendBeacon`, so it carries the in-memory Bearer token) and **on unmount** (a normal fetch: "back to library" is an SPA nav that fires no unload event). `features/books/views/useProgressSync.ts` owns the wiring. On open, the restore anchor is the **newer** of the local snapshot and the backend row, and the first relocate of a session only seeds the dedup baseline — so opening a book never writes back the position it just restored. **PDFs need no extra column**: `features/books/reader/lib/pdfPosition.ts` encodes the page as `page-N` in the `cfi_position` slot (mirrored into `spine_index`), which is exactly what the mobile PDF reader writes, so the two resume each other.

---

## Features

App-level features that ride on top of the architecture above. Document new features here as they land — describe what the feature is, the entry points, where state lives, and any non-obvious behaviour. Keep entries terse; details belong in the source.

> **Still missing from this section:** the Reader and the Library shelf — the
> biggest feature in the app has no entry of its own, and the Persistence model
> above is currently standing in for it. Write it up when someone next works in
> `features/books`. (`/study` and the theme switch used to be on this list; both
> are covered now — study under Sky, the theme switch under Theming.)

### Dictionary (`features/dictionary`)

**One route, two states, the URL decides which.** `/dictionary` with no `q` is the centred prompt (`components/BeforeSearch.tsx`); `?q=辞書` is the results rail beside the selected entry (`views/SearchView.tsx`). `views/DictionaryView.tsx` is the only thing that reads or writes the URL and picks between the two.

- **The URL is the single source of truth.** `?q=` is the query, `?id=<n>` / `?kanji=<char>` is the selected row. The field's text is local draft state that pushes into the URL after a 200 ms pause (`replace`, so a typed query leaves one history entry); everything downstream reads back out. Nothing is persisted — the previous `dictionary_state` localStorage mirror was a second source of truth that let a stale result surface behind the empty state.
- **New queries `push`, selection changes `replace`.** The rail never leaves the screen, so "back" to the row above is meaningless and would bury the query you actually want to return to.
- **The detail pane never blanks.** Headword, reading, pitch, pills and meanings all come from the `WordResult` the rail already holds, so switching entries repaints instantly. Only the kanji breakdown and example sentences wait on `/api/words/:id/details`, and only those two show a skeleton. `hooks/useWordDetails.ts` caches per word id and deliberately does **not** cancel a request when the selection moves on — killing them on a fast scroll caches nothing.
- **Rail contents are normalised** by `lib/results.ts`: `/api/search` answers with four different shapes (one kanji entry, a list of them, or neither; names only sometimes). Kanji entries are selectable and get their own detail pane (`KanjiEntryDetail`); names sit at the bottom, display-only, because there's no per-name endpoint.
- **↑/↓ walk the rail** from anywhere including the field, `/` and ⌘K focus it, `Esc` clears.
- **The touchable parts are the library's glass**, at the dock's values. The field is a `GLASS_SURFACE` in all three variants (hero / rail / sidebar — so the reader's docked column and bubble get it too), the prompt's history chips are `GLASS_BUTTON` + `GLASS_PRESS`, and so are the entry pane's two kanji surfaces (the header's per-character chips and the "Kanji in this word" cards — display-only cards take `GLASS_SURFACE`, since there is no hover to have). That replaced four bespoke states: an `--accent` border-and-text swap on the chips, a `--muted` 35% border mix on hovered results, an `--accent` edge on the selected one, and a `scale-105` + `--btn` fill on the add-to-deck button. One screen, one hover: the fill brightens.
- **A result row is `GLASS_ROW`, not a pane.** The rail is a *list*, so its rows carry the glass hover fill and nothing at rest — no fill, no border, no blur, no specular edge — and `ROW_LIST` rules a hairline between them so they read as one running column. Rows spent a pass as full `GLASS_BUTTON`s and forty frosted cards made the eye count cards instead of scanning. The interactions are unchanged: hover brightens, `GLASS_PRESS` nudges, and the selected row is `GLASS_ACTIVE`. `ROW_LIST` writes its hairline colour out literally rather than composing `HAIRLINE` — Tailwind scans source text, so an interpolated class name is one it never generates — and rules the children rather than the `<ul>`, because `border-color` isn't inherited.
- **The prompt is heading + field + chips.** The ruled "Recently looked up" column and the dashed reserved panel beside it are gone — the chips are the same history one click away, so the second list only restated it.
- **A lit row flips every ink.** `--ink`/`--soft`/`--muted`/`--faint` are light-on-dark at night and would vanish on `--active`'s pale tint, so `ResultRow`'s `rowInk(selected)` returns one of two ink sets — the dark side being `--active-ink` at four `color-mix` densities, since Tailwind's slash-opacity can't apply to an arbitrary `var()` colour. Bordered children (`ClassPill`, the kanji tile) swap `HAIRLINE` for a dark edge mix the same way. `JlptChip` needs nothing: it is a solid pill carrying its own near-black ink.
- **`EntryBack` is the last `--accent` border hover** in the feature (the "← Results" control the reader's two surfaces show and `/dictionary` doesn't). Not converted.
- **The reader's two lookup surfaces are built out of this screen's parts, not beside them.** `features/books/reader/dict-sidebar/` (the column docked beside the book, 320–480px) and `features/books/reader/reader-bubble/` (the floating 880×620 panel, five phases) render the same `WordRow`/`KanjiRow`, the same `RailList` and the same `EntryDetail`/`KanjiEntryDetail` — at `scale="compact"` and `scale="full"` respectively. The barrel exists to make that possible; the pieces own no width, fill, edge, scroll or padding, and the surface supplies the box. `DictionarySidekick` and `WordDetailView`, which were hand-written copies on the retired `--lgc-*` palette, are deleted.

### Sky, decks & study (`features/sky`)

**One domain, three sub-features, two routes.** `/sky` is the star map *and* the
decks screen — the old deck grid, the deck-detail screen and the separate `/sky`
star map all merged into it, so **there is no `/decks` route**; the Dock's
"Decks" entry points at `/sky`. `/study` is the session runner. Everything under
`features/sky` is one of:

| Sub-feature | What | Knows about |
|---|---|---|
| `sky/map` | The star-map engine: platform-free `lib/`, camera/frame `hooks/`, the SVG renderer. | Nothing above it — not decks, not routes. |
| `sky/stage` | `views/SkyView.tsx` (the `/sky` page) **and** the deck data layer half the app borrows: `DecksProvider`, `decksApi`, quota caps, `CardDraft`. | Decks and cards. |
| `sky/study` | `session/` (the runner) + `stats/` (`lib/statsApi.ts`, the `/api/stats` fetchers). | Cards and grades. |

Two files sit at the **domain root** rather than in a sub-feature, because
siblings don't import each other and both of these are shared by more than one:
`lib/fsrs.ts` (`stage` reads it for retrievability and the rank ladder, `study`
for scheduling — `map` does not, it only draws what it is handed) and
`components/PracticeOverlay.tsx` (the one thing that composes `stage`'s
inventory with `study`'s runner). `sky/index.ts` exports only the two views;
everything else comes from the sub-barrel that owns it.

#### `/sky` — the stage

Every deck is a constellation in a card frame on the page's own night canvas,
filling the viewport below the shared `TopBar` (no page scroll). Three tiers:

- **outer sky** — every framed constellation, the stat ledger, one action cluster;
  clicking a frame is the only way in.
- **focused deck** — the camera flies in, the stats bar takes the top of the stage
  and the card list panel opens on the left.
- **card** — a star or a row opens the detail as its own card on the right,
  *beside* the list rather than instead of it.

Details worth knowing:

- **Navigation state is the URL, and nothing else.** `?deck={uuid}&card={uuid}`,
  uuids only — never a render-local index, so a link means the same sky after any
  reorder. Focus changes `push` (a tier is a place to come back to), selection
  changes `replace` (the map never leaves the screen, so "back" to the previous
  ring is meaningless) — the dictionary's precedent. A stale or foreign uuid
  degrades to the outer view rather than erroring. Escape walks
  confirm → card → deck → sky. Two invariants live in the setters: a selected
  card's deck is always the focused deck, and changing focus clears the
  selection — the URL builder simply never emits `card` without `deck`. **Nothing
  is persisted**; a localStorage mirror of the same facts drifted.
- **The sky is `SkyMap`** (from `sky/map`) with two host-supplied extras.
  `frameMeta` carries the per-deck due count (`hooks/useDeckDueCounts.ts` — one
  `/api/study/due/counts` call feeding frames, chrome and ledger alike), the
  `deckVisuals` cover colour/glyph and a "STARTED MAR 2026" subtitle; card and
  mastered counts are deliberately omitted, since `SkyMap` derives them from the
  same cards array the page already handed it and so cannot disagree.
- **`insets` is the camera's chrome allowance, T/R/B/L, stage-relative.** Outer:
  `96/24/96/24` — `bottom` is the Dock's clearance and nothing more, now that the
  stat band sits in the top row. It used to be 216 (the band's own height at the
  bottom of the screen), and that came straight off the axis the deck grid is
  starved on: a deck's cell is ~500 world units tall *before* a single star, so
  how large a deck is drawn is set by the **height** of the free window.
  Focused is a **2×2**, `deckInsets(panelHidden, detailOpen)` — `left` 316 (the
  list panel's own right edge, no gutter, so the sky's dashed boundary meets the
  glass) or 58 collapsed; `right` 58 at rest or 360 while the detail card is
  open. An insets change re-fits the camera as a 400ms flight, so opening a card
  or collapsing the panel glides rather than snaps. Hosts may build the object
  fresh per render — `useCamera` normalises it to its four numbers.
- **A focused deck rests filling the free window, not at `MAX_ZOOM`.** The deck
  tier passes `adaptiveZoomLimits`, so `focusLimits` (`sky/map/lib/camera.ts`)
  resolves *both* limits from the deck's own box: the resting fit is capped at
  `FOCUS_FIT_MAX_ZOOM` (4) instead of `MAX_ZOOM` (2) — a sparse deck used to
  float in the middle of the window — and the ceiling is that fit ×
  `FOCUS_ZOOM_HEADROOM`, so there is always somewhere further in to go. The fit
  only ever *caps*, so the whole deck is on screen at every tier.
- **Leaving a deck by wheel takes a deliberate second push.** Wheel-out while
  already pinned at the floor accumulates `|deltaY|` and calls `onZoomOutFloor`
  only past `ESCAPE_PUSH_PX` (320), decaying after `ESCAPE_PUSH_DECAY_MS` (500)
  and cleared by any zoom-in. One notch used to leave, which meant a flick aimed
  at the fitted view usually exited the deck.

**Whole-sky chrome** — `components/StageActions.tsx`, right-aligned inside the
same bounded column the TopBar uses (`max-w-[1300px]` + `px-11`), so its right
edge lands on the TopBar's rather than on the deliberately-unbounded stage's; the
wrapper is `pointer-events-none` so the sky stays draggable through the empty
half of the row. It holds the all-decks `StudyButton` and "New deck" (glass
popover form → `DecksProvider.createDeck`). `components/StageLedger.tsx` sits in
the same top row: DAYS STUDIED / STARS IN YOUR SKY / DUE TODAY / MASTERED plus
the all-decks mastery mix (`components/MixBar.tsx`), one fixed size. Stars,
mastered and the mix are counted off cards already in memory; only `days` is a
request (`hooks/useSkyLedger.ts` → `/api/stats/activity`). The ledger's expanded
state and its recent-upgrades feed are gone — that section was the sole consumer
of `/api/stats/recent-upgrades`, so the outer tier now makes one request fewer.
`components/UpgradeRows.tsx` and `hooks/useDeckUpgrades.ts` are **orphaned by
that and still present**.

**Focused-deck chrome** — three surfaces, all glass:

- `components/DeckBar.tsx` — the stats bar, full width across the top, rendered
  in **both** panel states so the way out never collapses with the panel. Back ·
  deck name · CARDS / MASTERED / DUE TODAY / STARTED · mastery mix · delete deck.
  It replaced the breadcrumb, the old panel header and the panel's collapsible
  deck-info drawer — that drawer borrowed the card list's own height to show
  figures you consult once. **One fixed-height line, and that is load-bearing**:
  the bar is 80px to its bottom edge (20 offset + 22 padding + its tallest cell,
  the 38px delete button), and the panels below it and the camera's top inset are
  hard-coded off that number, so a cell that wrapped would push the bar down over
  sky the camera had already been fitted to. Every cell is `shrink-0` or
  ellipsised and the mix legend clips rather than wraps; STARTED hides below
  1100px. The deck name carries no meta line — `{n} cards · {n} due · started`
  would restate three figures standing 200px to its right.
- `components/GlassColumn.tsx` — the card list panel, 296px, list only. This
  deck's `StudyButton` pinned at the top (`/study?deck={id}`, or practice when
  nothing is due), the all-decks search (`components/CardSearch.tsx`, an
  in-memory filter over every card the page holds — no endpoint and no debounce,
  so results can never disagree with the map) with the collapse control beside
  it, the sort row, then rows of **rank dot · word · the active sort's figure**.
  Reading and glosses left the rows when the detail stopped replacing the list —
  printing them twice was what made rows three lines tall and the column 340px
  wide. The « button collapses it to a "≡ CARDS" handle and the camera re-fits.
- `components/CardDetailCard.tsx` — the selected card, floating on the opposite
  side of the sky: rank pill, headword + reading, `JlptChip`, all meanings
  numbered, IN CONTEXT, the `lib/rankProgress.ts` mastery meter, ADDED, and a
  footer of Dictionary + Remove. It used to be a second state of the list panel;
  the list now stays up and keeps its row highlight, and the camera simply takes
  a second inset on the right.

Destructive acts confirm through `components/NightConfirm.tsx` — the page owns
the confirm step, the surfaces only request it.

- **Data is one request**: `GET /api/decks/user/:userId/cards` via
  `hooks/useSkyDecks.ts` — the sky, the panels, the search index and the ledger
  counts all read the same rows. **Mutations flow through both owners** so
  nothing holds a ghost: `DecksProvider` (the summaries the rest of the app
  reads) takes the API call, and `useSkyDecks` hides the row optimistically then
  refetches.
- **The night chrome palette is `lib/nightChrome.ts`, deliberately not tokens.**
  The stage is night in *both* themes, so everything floating on it is
  light-on-dark always — the same reasoning as the dock's `--dock-glass-*` block,
  kept feature-local because these are one feature's constants rather than app
  chrome. Two exceptions reference tokens: `active`/`activeInk` are `--active`,
  so the stage agrees with the dock about what selected looks like. Rank
  dots/bars/pills read `stageColor()` (the `--stage-*` ramp) so the list chrome
  and the stars always agree — that is also why the stats bar's MASTERED figure
  is `stageColor('mastered')` and not a chrome gold.
- **Three sorts: Added, Mastery, JLPT**, each chip cycling desc → asc → off (off
  = the order the endpoint returned). JLPT became possible with migration 026,
  which snapshots `jlpt_level` onto the card at add time; cards older than it
  have `null` and the sort parks them last **in both directions**, since flipping
  the arrow shouldn't promote the rows that have nothing to sort by.
- **The reader's pending-card hand-off lands here**: `SkyView` consumes
  `ReaderStateProvider.pendingCard` on mount behind a handled-ref guard and runs
  `components/PendingCardOverlay/` over the stage; submitting creates the card,
  refreshes the sky and focuses that deck via the URL. `back` is derived at the
  API boundary by `cardBack()` and only there — `CardDraft` deliberately carries
  no `back`, because it would be a second representation of the same reading and
  glosses.
- **Quotas mirror the backend**: `MAX_DECKS` 50, `MAX_CARDS_PER_DECK` 5000,
  `MAX_MEANINGS_ON_CARD` 3 (`lib/limits.ts`, `lib/cardLimits.ts`). Exported from
  the barrel because the reader bubble creates decks and cards too and must show
  the same caps.
- **Deck descriptions don't exist on the web** — dropped with the redesign. The
  column and the mobile app still have the feature.

#### Rank, and why it is only ever stability

- **Rank is a threshold on FSRS stability, and `lib/rankProgress.ts` only
  presents it.** `sky/lib/fsrs.ts` owns the ladder — `new` (never reviewed) ·
  `met` S<21 · `learned` 21≤S<365 · `mastered` S≥365 — and **mirrors
  `backend/src/services/fsrs.js` line for line** (FSRS-6, 21 parameters, verified
  against py-fsrs 6.3.1). Change one, change both, then run *both* harnesses:
  `backend/scripts/verify-fsrs.js` and `scripts/verify-fsrs.mts`. The backend is
  the only writer; the web copy exists so the study screen can move before the
  POST lands. Never derive rank from difficulty or answer streaks — this replaced
  a streak-and-difficulty meter that had to show the *lower* of two gates and
  could never quite explain itself. The bar interpolates in **log space**, because
  stability grows multiplicatively (2.3 → 11 → 46 → 163 → 497 on the Good-only
  path); linear, it would sit near empty for three reviews and then jump most of
  its length in one.
- **`peak_rank` is a high-water mark, and it is what gets drawn.** Once a card
  reaches `learned`, `shownRank()` holds that tier through any lapse — the star's
  shape is a record of what the user achieved. The lost stability shows as
  **brightness** instead (retrievability, `Star.glow`), so a slipped mastered word
  reads as "you knew this, go refresh it" rather than "you lost it". Every rank
  render site goes through `shownRank()`; reading `state` directly puts the list
  chrome a tier out of step with the sky beside it. Brightness is the one place
  fractional elapsed days are correct — **scheduling always floors to whole days**,
  and desired retention is fixed at 0.9 and deliberately not exposed.

#### `/study` — the session runner

**Reads its whole config from the query string** (`sky/study/views/StudyView.tsx`):

    /study?due=1          every due card, shuffled  (+ &deck={id} to scope it)
    /study?deck={id}      one deck, mode + size from its saved override

A **bare `/study` `replace`s to `/sky`** — `replace`, not `push`, so Back doesn't
bounce straight into the redirect. It used to be the study-ahead session; see
below. Exits go to `/sky`. A due session studies everything due, so its size is
the due count, which has to be fetched before the spec exists — hence the gate
before the runner mounts: `useStudySession` fires off the spec, and a spec that
changed a beat later would start one session and throw it away.

- **A review only counts if the card is due.** `cardSrsService.isDue` on the
  server (mirrored in `study/session/lib/srs.ts`) gates every memory update:
  grading a card early changes **nothing at all** — no stability, no rank, no
  schedule, no `card_reviews` row, no streak. The client copy only keeps the UI
  honest and skips the round trip. One consequence: a card re-seated by the
  in-session queue is no longer due, so FSRS's same-day path is currently
  unreachable.
- **That gate is why the study button's order is a feature, not styling.** It is
  "Study N due" while anything is due and only becomes "Study ahead" once the
  queue is empty — offering practice while real work is waiting would send people
  to the one place their effort cannot count. `components/StudyButton.tsx` is
  shared by the stage's action cluster and the focused deck's panel; only `due`
  and `href` differ. Its `null` count is a **third state**, deliberately not
  folded into "nothing due": `null` means the request is still in flight, and
  treating it as zero flashed "Study ahead" on arrival — a link that changes
  destination a beat after paint, at the moment someone is most likely to click.
- **Practice is an overlay on `/sky`, not a route.** `sky/components/PracticeOverlay.tsx`
  drills cards the stage is already holding — the focused deck's when you are in
  one, every deck's out on the sky — so it needs no `/api/study/session` and
  posts no reviews. Navigating to `/study` would only have thrown that inventory
  away and re-fetched it to grade into the void. `useStudySession` takes a
  `StudySource`: `remote` (fetched, grades count) or `local` (cards handed in,
  grades only move the bar). **Local *is* practice — there is no second flag.**
  One request still fires: `useStudyDisplayPrefs` reads `/api/study/prefs`, so a
  card shows the same fields in practice as in a real session.

### Settings, Help & Credits (`features/settings`)

**There is no `/settings` route.** Every setting is `components/SettingsList.tsx`
— one glass ruled list — rendered as the right-hand column of `/profile`, beside
the account card. Five rows in one `GlassCard`: Theme, Sky hue, Help, Credits,
Delete account. Five rows across four concerns did not need a page, four eyebrows
and four paper cards to separate them.

**Two routes are left, on the old shell.** `/help` and `/credits` still render
thin pages over their views, and both wrap themselves in
`components/SettingsShell.tsx` — TopBar (with the `back to profile` pill
eyebrow) + a sticky "Settings" rail + the 900px-capped panel column. The rail
still says Settings; they are still the settings pages, they just have no
settings page to sit under.

- **Reached from the About rows of the list on `/profile`** — no nav entry, and
  `/profile`'s Settings *button* is gone with the route it pointed at. The exit
  from Help and Credits is the TopBar pill (the eyebrow's own
  `← BACK TO SETTINGS` link went with `/settings`).
- **The theme picker is the canonical control.** `TopBar`'s pill toggle is gone
  (the pill collapsed back to a single profile link with an optional eyebrow
  prop); `ThemeRow` drives `ThemeProvider` directly. The swatch dots are literal
  colours by design — they depict the themes, so they never follow the active
  one.
- **Delete account** (the last row) fronts `DELETE /api/user` with a typed-
  "delete" native `<dialog>` confirm (`components/DeleteAccountDialog.tsx`),
  then wipes the local session and lands on `/authenticate`. There is no sign-out
  row and no signed-out branch: sign out is the account card's button one column
  over, and `AppShell` redirects a signed-out visitor before `/profile` renders.
- **Content is hand-authored and ships with the app.** Help copy lives in
  `views/HelpView.tsx` (works offline, no CMS); the Credits list is
  `lib/credits.ts`, the audited what-we-actually-ship inventory — several data
  licenses require the page, so keep that file in sync with reality (its
  Typography section mirrors the `next/font` imports in `app/layout.tsx`).
- Built on the `--paper-*` ruled-list surface; `PaperCard` / `PAPER_GHOST`
  were promoted to `shared/components` when this screen became their second
  consumer. The settings *list* has since followed `/profile` onto the glass twin
  (`GlassCard` / `GLASS_GHOST` / `GLASS_ROW`), so the remaining paper consumers
  are help, credits and the delete-account dialog — the obvious next screens to
  follow it.

### Auth (`/authenticate`, `features/auth`)

Split screen: a night panel left (`components/SkyPanel.tsx`, `1.15fr`, dropped
below `lg`), the form right (`components/AuthForm.tsx`, `1fr`, 420px column).
`views/AuthView.tsx` owns all the state and the submit; the components are
presentational.

- **`mode` is local state, not a route or a search param.** `AppShell` gates on
  `pathname === '/authenticate'` exactly and redirects there, so a second route
  would mean editing that predicate for a linkable URL nobody asked for.
- **The mode switcher never moves.** The signup-only EMAIL field is always
  mounted and goes `invisible` + `inert` in login mode instead of unmounting,
  so the field stack is the same box in both modes, the panel's height never
  changes, and its vertical centring never recomputes. Immobile by
  construction, not by a pixel-measured `min-height` that a font swap or a
  wrapped error could invalidate. The cost is a field's worth of blank space in
  the login state — the same trade the handoff made deliberately.
  `components/ModeSwitch.tsx` is a **radiogroup**, not a tablist: there are no
  tab panels, both modes render one form.
- **Signup collects username + email + password; login is username +
  password.** Email is required client- and server-side for new accounts —
  `validate()` in `AuthView` mirrors `backend/src/validation/auth.js` exactly
  (username 3–32 of `[a-zA-Z0-9_.-]`, password 8–72 with one non-letter),
  because checking less means a valid-looking form returns a server error.
  **Registration is currently CLOSED.** `POST /api/auth/register` opens with
  `return res.status(403)` as the handler's first statement, so nothing behind
  it runs — the validation, the 3/hr/IP limiter and the 409 paths are all still
  wired underneath. **To reopen, delete that one `return`**; don't rewrite the
  handler. The web form is unchanged and will start working the moment it goes.
- **Every control is glass; the backgrounds are untouched.** The fields are
  `GLASS_SURFACE` panes with a `GLASS_BUTTON` password reveal inside, the submit
  CTA is a glass button (the filled `--btn` `Button` and the handoff's blue drop
  shadow are gone — glass ships at depth 0), and `ModeSwitch` is a glass track
  holding two `GLASS_ROW`s with `GLASS_ACTIVE` on the selected one, which is the
  dock's shell-and-pill arrangement at a smaller size. The right panel's
  `bg-(--bg)` and the night `SkyPanel` are deliberately unchanged. Nothing on the
  screen reads `--paper-*` any more.
- **Google / Apple are built and flagged off.** `components/SocialButtons.tsx`
  renders behind `SHOW_SOCIAL_AUTH = false` in `AuthForm`; there is no OAuth on
  the backend, and two prominent buttons that do nothing are worse than none.
  Converted to glass anyway, so flipping the flag reveals two buttons that match
  the panel instead of two paper ones to find later.
- Not built, by owner call: "Keep me signed in" (the refresh cookie is always
  30-day persistent — there is no session-only mode to toggle), "Forgot
  password?" (no route, no reset-token table, no mailer), terms/privacy links
  (no routes). The generated constellation is deferred — the sky panel is its
  background plus the scrim, and the star map mounts as a sibling child when it
  lands. The panel's colours are hardcoded because it is night in both themes.
- No loading branch and no redirect effect: `AppShell` already returns `null`
  while auth resolves and already replaces to `/` once a user exists.

### Dock (`features/app-shell/Dock.tsx`)

The fixed bottom nav on every signed-in screen, composed by `AppShell` (hidden
on `/authenticate`). Replaced `WorkspaceNav`, which is deleted.

- **Reader · Dictionary · Decks │ Profile.** Settings lost its entry —
  pre-decided when settings was redesigned, and settings is now a column of
  `/profile` rather than a route at all. Sky and Decks are **one entry**: the two
  merged, and the surviving route is `/sky`, so a second entry would be the same
  destination twice. The key and label still say "decks" (`Dock.types.ts`)
  because that is what the page is *for*; only the path moved. Home went the same way for the same reason — the dashboard
  was deleted and the shelf took `/`, so Home's entry would have been Reader's
  destination under a second name. **Reader's path is therefore `/`**, matched
  exactly; `/reader/<bookId>` is an open book and hides the dock outright.
- `next/link`, not `router.push` on a `<button>`, so middle-click and
  open-in-new-tab work and prefetch happens. Active state is
  `aria-current="page"` — which is also the CSS hook for the active ink *and*
  what the pill measurement queries for; `/` matches exactly, the rest match
  their subtree.
- **Labels always visible** (the hover tooltip went with the icon-only
  version), and **monochrome** — the per-item brand hexes were outgoing-system
  decoration. Profile renders the `--avatar` circle the TopBar pill uses rather
  than a glyph.
- **It is glass, not a near-black slab.** The "Dock Bar" handoff replaced the
  `--dock-*` token group with a white-tinted frosted shell (no hover state — the
  handoff gives hover the same fill as idle) and a lit lavender **pill that
  slides** between entries. Colour, sheen and the three timings live in
  `styles/glass.css` as the `--dock-glass-*` block and `.glass-dock` /
  `.glass-dock-item` / `.glass-dock-pill`; the component owns geometry and the
  measurement only. The `--dock-*` group is deleted from `ds-tokens.css` — its
  whole justification was being white-on-dark in both themes, which is what
  glass is by construction. The pill's tint is `--active`, so it and every
  selected chip in the app move together.
- The pill's `left`/`width` are the active item's `offsetLeft`/`offsetWidth`,
  re-read before paint on route change and from a `ResizeObserver` +
  `document.fonts.ready` — both are relative to the shell's padding box, which
  is what `left` resolves against, so they agree despite the shell being
  `translate`d and horizontally scrollable. Its vertical inset and the shell's
  block padding are one constant (`PAD`) for the same reason.
- The divider is hardcoded — one value, used once, white-on-dark either way.
- Icons are inlined at the handoff's geometry; `shared/icons` is the outgoing
  lucide set and its shapes are not these. Pages reserve `pb-[140px]`.

### Sky engine (`features/sky/map`)

The **rendering half** of the sky domain, and the only part with no idea decks
exist — see the Sky, decks & study entry above for the page that hosts it.
`lib/` is pure TypeScript written to be copied to mobile (see `lib/README.md`),
plus the web-binding hooks (`useCamera`, `useSkyFrame`, `useSkyGenerator`,
`useSkySeed`) and the SVG renderer
(`SkyCanvas`/`SkyStars`/`SkyClouds`/`SkyFrames`/`SkyPanel`/`SkyWash`). The
sub-barrel's production surface is **`SkyMap`** (uuid-keyed focus/selection,
`frameMeta`, `insets`, `onSettled`) plus `useSkySeed`; `Sky.tsx` remains the
unrouted demo harness.

The old `/sky` route's other tenant, the study-stats tab screen, is gone:
`features/sky/study/stats` holds only `lib/statsApi.ts` — the `/api/stats`
fetchers the stage ledger reads (`fetchActivity`), plus `fetchCards` and
`fetchRecentUpgrades`, which currently have no consumer.

- **Moving between tiers is a camera flight** (`useCamera.flyTo`,
  `CAMERA_TWEEN_MS` = 400ms, interruptible); the host selects after the flight
  via `onSettled`. Insets changes re-fit as the same flight.
- **A card's drawn size is set by the field it sits in**, since the camera fits
  that field to the stage. With two or more decks the grid bounds every card;
  a lone deck has no neighbour to do it, so `layoutDecks` floors its field at
  `SOLO_FIELD_CELLS` (2) cells per axis — otherwise the single card is drawn
  edge to edge and grows in both axes with every card mined into it. Lower the
  constant to make a lone card bigger; it applies to the one-deck case only.
- `sky_seed` (`users.sky_seed`, migration 025) is the account's one immutable
  16-hex seed; `useSkySeed` fetches it off the profile and caches per user.

---

## Conventions to know

- **`'use client'` everywhere a component uses hooks**. RSC opportunities exist (static layout shells) but haven't been pursued.
- **File placement is by feature, never by file type.** Pick an existing feature under `features/`; create one only for a genuinely new user-nameable concern. Fixed sub-folder names: `components/` (PascalCase), `hooks/` (`useFoo.ts`), `lib/` (camelCase, `fooApi.ts`), `providers/` (`FooProvider.tsx`), `views/` (`FooView.tsx`), plus `types.ts`. **Only create a sub-folder that will hold a file** — no empty scaffolding. Cross-cutting primitives go to `shared/components` (**not** `shared/ui`, which is outgoing), global icons to `shared/icons`, feature-agnostic infra to `lib/`.
- **Domain types live in the owning feature's `types.ts`**, and that feature's `lib/*Api.ts` imports them. There is no `lib/types/`; a fetch helper never declares a domain type beside itself.
- **A domain with sub-features nests them as siblings** (`books`, `sky`), each with its own barrel; what they share sits at the domain root. **Sub-features don't import each other** — an orchestrator view at the domain root composes them.
- **All `*Api.ts` fetch helpers accept an optional `AbortSignal`** — pair with `useEffect` cleanup.
- **`lib/util/cn.ts`** is the Tailwind class merger. shadcn's `components.json` aliases `utils` to `@/lib/util/cn` — this means new shadcn-generated code uses the right path.
- **No hex literals in components.** One acceptable exception: `JlptChip`'s per-level palette (5 hardcoded colors by design). Everything else reads the design tokens. A one-off value that exists to make a *single* component work may stay hardcoded there with a comment saying why it isn't a token — widening the palette every screen reads is the more expensive mistake.
- **No inline `borderRadius: <pixel>` on token-relevant surfaces.** Use Tailwind `rounded-*` (which reads `--radius-*`) or `style={{ borderRadius: 'var(--radius-md)' }}`. Pure decorative shapes (`'50%'`, `999`) are fine.
- **Document new features in the Features section above.** When a new app-level feature lands (something a user can name — "shortcuts", "highlights sync", "deck import", …), add a subsection: what it is, entry-point files, where state lives, any non-obvious behaviour. Keep entries terse; deep details belong in the source.

---

## Where each concern lives

| Concern | Files |
|---|---|
| **Design tokens** | `styles/ds-tokens.css` (colour, shape, type, page canvas — the whole palette) |
| **Glass** | `styles/glass.css` (every number, in its `:root` block) + `shared/components/glass.ts` (the class names) |
| **Token primitives** | `shared/components/` — React components, not CSS classes (`Button`, `Card`, `PaperCard`, `GlassCard`, `Chip`, `Eyebrow`, `JlptChip`, `StageDot`, …), plus the `GLASS_*` recipe names |
| **App shell / nav** | `features/app-shell/` — `AppShell.tsx` (auth gate + provider composition), `Dock.tsx` + `Dock.types.ts`, `TopBar.tsx`, `providers/`, `hooks/useReaderActions.ts` |
| **Auth flow** | `features/auth/` — `views/AuthView.tsx`, `providers/AuthProvider.tsx`, `lib/authApi.ts`, `lib/wipeUserData.ts`; tokens in `lib/tokenStore.ts`, injection + refresh-retry in `lib/api.ts` |
| **Library / book sync** | `features/books/library/`, `features/books/views/BooksView.tsx`, `features/books/lib/` (`booksDb.ts` is the sole `aogimi` IDB factory, plus `booksApi.ts`, `epubIdentity.ts`, `pdfIdentity.ts`, `reconcileBooks.ts`) |
| **Reader** | `features/books/reader/` — engines in `components/`, the two lookup surfaces in `dict-sidebar/` + `reader-bubble/`, position maths in `lib/pdfPosition.ts` / `lib/readerSession.ts`; sync wiring in `features/books/views/useProgressSync.ts` |
| **Dictionary** | `app/dictionary/page.tsx` → `features/dictionary/` (`views/DictionaryView.tsx` owns the URL, `views/SearchView.tsx` is the rail + entry layout, `hooks/useWordDetails.ts`, `lib/results.ts`, `lib/dictApi.ts`, `providers/DictionaryStateProvider.tsx`) |
| **Sky / decks** | `app/sky/page.tsx` → `features/sky/stage/views/SkyView.tsx`; engine in `features/sky/map/`, data layer in `features/sky/stage/lib/decksApi.ts` + `providers/DecksProvider.tsx` |
| **Study / SRS** | `app/study/page.tsx` → `features/sky/study/views/StudyView.tsx`; the ladder in `features/sky/lib/fsrs.ts` (**mirrors `backend/src/services/fsrs.js`**), presentation in `features/sky/stage/lib/rankProgress.ts` |
| **Profile / settings** | `app/profile/page.tsx` → `features/profile/`; the settings list, help and credits in `features/settings/` (`lib/credits.ts` is the audited ship inventory) |

---

## Common tasks → starting points

| Task | Start at |
|---|---|
| Change a primary button's look across the whole app | [shared/components/Button.tsx](../shared/components/Button.tsx) — `BASE` + the `VARIANTS` map. |
| Change a color across the whole app | Edit the token in [styles/ds-tokens.css](../styles/ds-tokens.css), in **both** the `light` and `dark` blocks. |
| Wire a new backend endpoint | Add the type to the owning feature's `types.ts`, the fetch helper to its `lib/<domain>Api.ts` (taking an optional `AbortSignal`), then update [backend-connections.txt](backend-connections.txt) — and `backend/SCHEMA.md` + `backend/API_ROUTES.md` if the backend changed. |
| Change how a frosted surface looks | The `:root` block of [styles/glass.css](../styles/glass.css) — every value the recipe reads is declared there. |
| Retune the SRS | [features/sky/lib/fsrs.ts](../features/sky/lib/fsrs.ts) **and** `backend/src/services/fsrs.js` together, then run both harnesses (`backend/scripts/verify-fsrs.js`, `scripts/verify-fsrs.mts`). |
| Add a new page route | New folder under `app/`, add `page.tsx`. Auth-gated routes hide naturally — `AppShell` redirects when there's no user. |
| Cancel an in-flight fetch | Pass an `AbortSignal` to the API call; clean up in `useEffect`. |

---

## Out of scope (for now)

Tracked in [DECISIONS.md](DECISIONS.md). Highlights:

- Reading position covers **EPUB and PDF** (localStorage buffer + periodic/exit backend flush via `useProgressSync`); resume works across devices, and PDFs share the EPUB column via `page-N`. *Where inside a page* isn't stored.
- Highlights / bookmarks / annotations removed entirely (UI, storage, and foliate wiring) — not currently a feature.
- Backend-backed theme storage deferred (theme is a localStorage key, and is currently pinned to `dark` by `FORCED_THEME` anyway).
- No OAuth, no password reset, no session-only sign-in, and **no guest mode** — signed-out is the local-first state, and signing up flushes what's pending.
- No test runner in this package. Web lint is the quality bar: **0 errors, 0 warnings** as of 2026-08-07 — don't add to it.
- Backend-backed reader typography prefs deferred (in-memory only, reset each time a book opens).
- PDF reader is parse-only, no real reader UI.
- Anki `.apkg` export.
- "Up next" library section.
- Search/filter/sort wiring on the library shelf.

---

## Repo etiquette

From [AGENTS.md](AGENTS.md):

> This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

In practice that means: when in doubt about App Router, server components, route handlers, or middleware, look at `node_modules/next/dist/docs/` instead of guessing.

---

## Reference docs

- **[REDESIGN.md](REDESIGN.md) — read first when redesigning a screen.** Self-contained context for a fresh agent: what's done, token traps, primitive inventory, recurring data gaps, verification.
- [backend-connections.txt](backend-connections.txt) — endpoint catalog + payload shapes
- [DECISIONS.md](DECISIONS.md) — scope & deferred work
- [AGENTS.md](AGENTS.md) — Next.js version warning
