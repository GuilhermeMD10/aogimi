# Aogimi Web — Project Context

A primer for new contributors and agents. Read this first; specialised docs ([DECISIONS.md](DECISIONS.md), [backend-connections.txt](backend-connections.txt)) drill into specific surfaces.

---

## What this is

Aogimi is a **Japanese reading + vocabulary app**. Users import EPUBs / PDFs, read in-app, look up words against JMdict / KANJIDIC2, and build flashcard decks for spaced study. Decks, devices, and profile/study settings sync to a Postgres backend; the actual book files live per-device (IndexedDB) and are reconciled by hash on demand. EPUB reading position is buffered in localStorage on every page turn and flushed to the backend `book_progress` row periodically + on exit, so books resume where you left off (across devices); see the Reader section. PDF position is not tracked yet.

The app ships as a single Next.js client. There's a separate Expo mobile app (`mobile-frontend/langecko-mobile`) that mirrors the same backend; this doc is **web-only**.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router; not the version your training data has — read `node_modules/next/dist/docs/` before writing route code) |
| React | **19.2** |
| Styling | **Tailwind v4** (CSS variables via `@theme inline`), shadcn/Radix primitives |
| Icons | `lucide-react` |
| EPUB | `epubjs` |
| PDF | `pdfjs-dist` + `react-pdf` (server-side parsing via `pdfreader` in an API route) |
| Storage | localStorage (auth user, recent lookups, device id) + single `aogimi` IndexedDB via `idb` (book blobs + metadata + FS directory handle) |
| Bundle helpers | `clsx`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority` |

No state library (Redux/Zustand/Jotai). State lives in **React Context providers**.

No CSS-in-JS. Themed surfaces read the design tokens directly — `bg-(--paper)`, `text-(--ink)`, or raw `style={{ background: 'var(--bg)' }}`. Both go through the same source (`styles/ds-tokens.css`).

---

## Top-level layout

```
web-frontend/langecko-web/
├── app/                          Next.js App Router routes + global CSS
│   ├── layout.tsx                Root layout: fonts, providers (data-theme="default" on <html>)
│   ├── page.tsx                  / (landing/redirect)
│   ├── globals.css               Imports theme files + primitives + utilities; declares Tailwind @theme aliases
│   ├── authenticate/page.tsx     /authenticate (login/signup)
│   ├── reader/page.tsx           /reader (library + active-book reader)
│   ├── dictionary/page.tsx       /dictionary
│   ├── decks/page.tsx            /decks
│   ├── profile/page.tsx          /profile
│
├── components/                   Default-theme components + theme infra
│   ├── AppShell.tsx              Auth gate, providers, bubble routing
│   ├── WorkspaceNav.tsx          Top nav (theme-dispatched)
│   ├── WorkspaceNav.default.tsx  Default nav variant
│   ├── home/HomeView/            "/" landing page
│   ├── library/                  Library shelf, restore, FsAccess banner
│   ├── reader/                   Text + manga readers, toolbar, panels
│   ├── views/                    Big page-level views (Reader, Dictionary, WordDetail, Card decks)
│   ├── page-bubbles/             Floating overlays (Profile, Reader)
│   ├── onboarding/               First-run explainer
│   ├── profile/                  Profile page sections
│   ├── icons/                    Icon set (lucide-react, mapped to canonical IconNames)
│   ├── ui/                       shadcn primitives (button, sheet, sidebar, …)
│   ├── AvatarPickerModal/        Profile avatar grid
│   ├── OnboardingExplainerModal/ Auth-flow explainer wrapper
│   └── providers/                Auth, Reader state, Bubble routing, Dictionary, Theme
│
├── styles/                       Design-token CSS — three files, that's all
│   ├── ds-tokens.css             The palette: colour, shape, type, page canvas (light + dark)
│   ├── sync-tokens.css           Book sync-state colours (synced / unsynced / to-import)
│   └── utilities.css             Reader highlights, word hover, vertical text, selection
│
├── lib/                          Domain logic, no React
│   ├── api.ts                    apiUrl, apiGet, apiSend, apiSendVoid, fetchJson
│   ├── booksApi.ts               EPUB/PDF book + progress endpoints
│   ├── decksApi.ts               Deck + card endpoints
│   ├── devicesApi.ts             Multi-device sync endpoints
│   ├── dictApi.ts                Dictionary search + word details
│   ├── userApi.ts                Profile read/update; re-exports loginUser/registerUser/logoutUser from lib/auth/authApi.ts
│   ├── auth/
│   │   ├── authApi.ts            /api/auth/{login,register,logout} (public, no Authorization)
│   │   ├── tokenStore.ts         Access + refresh token persistence (localStorage)
│   │   └── wipeUserData.ts       Account-switch wipe
│   ├── types/                    Domain types (book, deck, dict, user, device, epubjs)
│   ├── storage/                  localStorage adapters per concern
│   ├── config/                   limits.ts, deckVisuals.ts
│   ├── util/                     cn (Tailwind class merge), deviceName
│   ├── epubIdentity.ts           Hashing + metadata extraction for EPUB matching
│   ├── fsAccess.ts               File System Access API helpers (uses the shared `aogimi` IDB handles store)
│   └── japanese.ts               Tiny utilities (kana classifiers, etc.)
│
├── hooks/use-mobile.ts           Width-based mobile breakpoint detector
│
└── public/, aogimi-DS/          Static assets + design canvas reference
```

---

## Run-of-show: a request hits the app

1. Browser loads `/` → Next.js renders `app/layout.tsx` (RSC) → root `<html>` ships with `data-theme="default"`.
2. There is only the `default` theme, so `data-theme` is never rewritten — no pre-hydration script, no `app-theme` key.
3. React hydrates. `ThemeProvider` exposes the single `default` theme (no persistence).
4. `AuthProvider` reads `auth-user` from localStorage; if absent and not on `/authenticate`, `AppShell` redirects.
5. `ReaderStateProvider`, `DictionaryStateProvider`, `BubbleProvider` mount.
6. The current route's component renders inside `AppShell`, alongside the floating `Dock` (hidden on `/authenticate`) and any active reader bubble.

---

## Theming

**One token system: `styles/ds-tokens.css`.** The redesign's incremental migration is over — the outgoing `--lgc-*` layer is deleted, and so are the three webfonts and the four screens that were the last things reading it. If you find a `--lgc-*` reference in a doc, it's history; the only surviving `lgc` strings in the codebase are two localStorage keys (`lgc_device_id`, `lgc_last_user_id`), which are **not** renamed because renaming them would orphan every existing install's device identity.

### The palette (`styles/ds-tokens.css`)

Two themes, `light` ("Ink on paper") and `dark` ("Midnight"), selected by `html[data-theme]`.

- **Colour + shape tokens**: `--ink`, `--soft`, `--muted`, `--faint`, `--card`, `--cardalt`, `--bd`, `--btn`, `--track`/`--fill`, `--cover-1..4`, `--stage-new`/`-recent`/`-learned`/`-mastered`, `--radius-*`. Read them as `text-(--ink)`, `bg-(--card)`.
- **Type**: `--face-jp`, `--face-ui`, `--face-mono` → Noto Sans JP (jp) and Switzer (ui + mono — the 2026-08 font audition retired Space Mono; the approved look wears Switzer everywhere, and the roles stay separate so re-splitting is a one-line change in ds-tokens.css). Switzer is a Fontshare family, self-hosted from `app/fonts/`. Named `--face-*`, not `--font-*`, so a role never reads as one of the `--font-switzer`/`--font-noto-sans-jp` variables `next/font` emits in `app/layout.tsx`. **No 600 cut ships in either family** (Switzer 400/500/700, Noto Sans JP 500/700), so use `font-medium` / `font-bold` — a `font-semibold` gets synthesised.
- **Not mirrored into Tailwind's `@theme`.** Components read the tokens directly. `@theme` holds only what Tailwind itself must know: the `rounded-*` radius scale, and the shadcn colour namespace (`--color-popover`, `--color-border`, …) that the two surviving shadcn components paint with. Those are pointed at the filled `--paper-*` group, and `--color-border` reaches past shadcn — the `*` rule in the base layer makes it every element's default border colour.
- **Cards are transparent by design** — shadow and layout separate surfaces, not a fill. `--bd` is transparent too, so hairline dividers are invisible until you fill it. Filling `--card`/`--cardalt`/`--bd` switches the whole app to filled cards with no markup change. For something that needs a real fill *now*, use the `--paper-*` group (`PaperCard`) rather than filling the shared three.
- **Primitives are React components**, not CSS classes: `shared/components/` (`Button`, `Card`, `CardHeader`, `Chip`, `CoverTile`, `Eyebrow`, `MonoAction`, `PaperCard`, `ProgressTrack`, `Skeleton`, `SkyBar`, `StageDot`, plus `HAIRLINE`/`DASHED`). They read tokens and know nothing about the theme — there is never a light and a dark variant of a component, because the palette swaps underneath it.
- **Page canvas** is app-wide chrome, set in `globals.css`: base gradient on `<html>`, star tiles on `<body>`. Split across two elements because a single 43-layer `background` would need a 43-entry `background-size` list (a shorter list gets cycled by the spec).
- **Base-layer type**: `html` carries `--face-ui` and there is deliberately **no `h1..h6` rule**. A global heading face beats an inherited one no matter what a screen's wrapper sets, which is exactly how four migrated headings ended up rendering in the old display serif. Form controls (`button`, `input`, `select`, `textarea`) do need the face said explicitly — the UA stylesheet gives them the platform font instead of inheriting.

Theme choice persists in the `aogimi-theme` localStorage key, applied by a pre-paint `<script>` in `app/layout.tsx` — an effect would fire after paint and flash. Falls back to `prefers-color-scheme`. It moves to a `users.theme` column later. The switch is the Appearance card on `/settings`.

`dark:` is redefined in `globals.css` as `html[data-theme="dark"] &`, not shadcn's `.dark *` (a class this app never sets) and not `prefers-color-scheme`. Nothing uses it — the tokens swap underneath components instead — but if you do reach for it, it now means what the theme switch means.

---

## State architecture

All state is in **React Context providers**, mounted by `AppShell`. Nothing in localStorage / IndexedDB is read directly from a component — every adapter lives in `lib/storage/`.

| Provider | What it owns | localStorage key(s) |
|---|---|---|
| `AuthProvider` | Current user, login/signup/logout flows. **Token storage = "memory + httpOnly cookie"**: the access token lives in-memory only ([`lib/auth/tokenStore.ts`](lib/auth/tokenStore.ts)), the refresh token is an httpOnly cookie set by the backend (never readable by JS). On boot, a silent `/api/auth/refresh` re-mints the access token from the cookie. Session-invalidation hook in [`lib/api.ts`](lib/api.ts) auto-signs-out on unrecoverable 401/403. See [`../../docs/AUTH.md`](../../docs/AUTH.md). | `auth_user` only (tokens are no longer in localStorage) |
| `ThemeProvider` | The single `default` theme (no setter that persists; kept as plumbing for a future redesign) | (none — no longer persisted) |
| `ReaderStateProvider` | The reader bubble's visibility (`readerBubble`), the docked-dictionary toggle (`sidekickOpen`), and the `pendingCard` hand-off to `/decks`. The **open book is not here** — the reader is `/reader/[bookId]`, so the id in the URL is the session and `ReaderView` resolves the file, restore anchor and progress sync from it. | (none) |
| `DictionaryStateProvider` | Search query/results + the word the reader's surfaces have open (`selectedWordId`). Nothing is persisted: `/dictionary` keeps its query and selection in the URL, and holding a second copy in localStorage gave two sources of truth that drifted. A *kanji* selection isn't here — the field is a word id and a character has none, so the reader's surfaces keep that half locally (`reader/hooks/useDictSelection.ts`). | `dictionary_recent_searches` (written by `pushRecentSearch`, not by the provider's state) |
| `BubbleProvider` | Which page-bubble (Profile/Reader) is active | (in-memory only) |

The reader and the dictionary talk through **`features/app-shell/hooks/useReaderActions.ts`**, not through pending fields. `requestDictLookup(word, sentence)` runs the search and opens the bubble *only* if no dictionary surface is already visible (`/dictionary`, or the reader with its column docked — a prefix test on `/reader/`, because `/reader` exactly is the shelf). `requestAddCard` opens the bubble and also sets `pendingCard`, which `/decks` consumes on mount if it happens to be there; `AppShell` clears both together on close so the card can't be created twice. The old `pendingDictSearch` / `pendingBookOpen` fields and their `fired*Ref` guards are gone — the consumer logic now lives at the call site, gated by stable function identity.

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
| **IndexedDB** (`aogimi`) | EPUB / PDF blobs (`files`) + per-file metadata (`metadata`) + FS Access directory handle (`handles`) | Per-device — files don't leave the browser. Single DB; the old `aogimi-books` + `aogimi-fs` DBs were merged (one-time copy-then-delete migration in `components/books/utils/booksDb.ts`). |
| **localStorage** | `auth_user`, `dictionary_recent_searches`, device-id (`lgc_device_id`) | Per-device, low-stakes. No theme / reader / study / avatar / onboarding keys anymore. |

Library mount reconciles all three: load local IndexedDB → register device → fetch backend records → call `POST /api/books/match` to resolve unidentified local files against existing user books → backfill identity (`PUT /api/books/{id}/identity`) where needed → call `POST /api/devices/{deviceId}/books/{bookId}/available` for files present locally. See [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx) for the reconciliation flow.

---

## Features

App-level features that ride on top of the architecture above. Document new features here as they land — describe what the feature is, the entry points, where state lives, and any non-obvious behaviour. Keep entries terse; details belong in the source.

> Home, the `/study` route and the theme switch are described in the repo-root `CLAUDE.md` but have never been written up here. Fold them in when someone next touches them.

### Dictionary (`features/dictionary`)

**One route, two states, the URL decides which.** `/dictionary` with no `q` is the centred prompt (`components/BeforeSearch.tsx`); `?q=辞書` is the results rail beside the selected entry (`views/SearchView.tsx`). `views/DictionaryView.tsx` is the only thing that reads or writes the URL and picks between the two.

- **The URL is the single source of truth.** `?q=` is the query, `?id=<n>` / `?kanji=<char>` is the selected row. The field's text is local draft state that pushes into the URL after a 200 ms pause (`replace`, so a typed query leaves one history entry); everything downstream reads back out. Nothing is persisted — the previous `dictionary_state` localStorage mirror was a second source of truth that let a stale result surface behind the empty state.
- **New queries `push`, selection changes `replace`.** The rail never leaves the screen, so "back" to the row above is meaningless and would bury the query you actually want to return to.
- **The detail pane never blanks.** Headword, reading, pitch, pills and meanings all come from the `WordResult` the rail already holds, so switching entries repaints instantly. Only the kanji breakdown and example sentences wait on `/api/words/:id/details`, and only those two show a skeleton. `hooks/useWordDetails.ts` caches per word id and deliberately does **not** cancel a request when the selection moves on — killing them on a fast scroll caches nothing.
- **Rail contents are normalised** by `lib/results.ts`: `/api/search` answers with four different shapes (one kanji entry, a list of them, or neither; names only sometimes). Kanji entries are selectable and get their own detail pane (`KanjiEntryDetail`); names sit at the bottom, display-only, because there's no per-name endpoint.
- **↑/↓ walk the rail** from anywhere including the field, `/` and ⌘K focus it, `Esc` clears.
- **The reader's two lookup surfaces are built out of this screen's parts, not beside them.** `features/books/reader/dict-sidebar/` (the column docked beside the book, 320–480px) and `features/books/reader/reader-bubble/` (the floating 880×620 panel, five phases) render the same `WordRow`/`KanjiRow`, the same `RailList` and the same `EntryDetail`/`KanjiEntryDetail` — at `scale="compact"` and `scale="full"` respectively. The barrel exists to make that possible; the pieces own no width, fill, edge, scroll or padding, and the surface supplies the box. `DictionarySidekick` and `WordDetailView`, which were hand-written copies on the retired `--lgc-*` palette, are deleted.

### Decks (`features/study/decks`)

**`/decks` is the sky stage: the whole star map and the decks page fused into
one full-viewport screen** (`views/DecksView.tsx`, no page scroll). Every deck
is a constellation wrapped in a "deck card" frame; clicking a frame flies the
camera into the deck and opens a glass column; clicking a star (or list row)
swaps the column to the card's detail. The old deck grid, the deck detail
screen and the `/sky` route are all deleted in its favour.

- **Navigation state is the URL**: `/decks?deck={uuid}&card={uuid}`, uuids
  only. Focus changes `push`, selection changes `replace` (dictionary
  precedent); a stale uuid degrades to the outer view; Escape walks
  confirm → card → deck. Search results and upgrade rows focus the deck, then
  ring the star only once the camera flight lands (`onSettled`).
- **The sky is `SkyMap`** (from `@/features/sky`) with two host-supplied
  extras: `frameMeta` (per-deck due count via `hooks/useDeckDueCounts.ts` — one
  `/api/study/due/counts` call for frames, chrome and ledger — plus
  `deckVisuals` cover colour/glyph and a "STARTED MAR 2026" subtitle) and
  `insets`, the camera's chrome allowance per tier, T/R/B/L (sky 96/48/216/48,
  ledger collapsed 156 bottom; focused 88/58/84 with left **360** column-open —
  the column's own right edge, no gutter, so the sky's dashed boundary meets the
  glass — or 58 hidden). An insets change re-fits the camera as a 400ms flight,
  so collapsing the column glides rather than snaps.
- **A focused deck rests filling the free window, not at MAX_ZOOM.** The deck
  tier passes `adaptiveZoomLimits`, so `focusLimits` (in `features/sky/lib/camera.ts`)
  resolves *both* limits from the deck's own box: the resting fit is the
  fill-the-window zoom capped at `FOCUS_FIT_MAX_ZOOM` (4) instead of `MAX_ZOOM`
  (2) — a sparse deck used to float in the middle of the free window — and the
  ceiling is that fit × `FOCUS_ZOOM_HEADROOM`, clamped to
  `MAX_ZOOM..FOCUS_MAX_ZOOM`, so there is always somewhere further in to go. The
  fit only ever *caps*, so the whole deck is on screen at every tier.
- **Leaving a deck by wheel takes a deliberate second push.** Wheel-out while
  already pinned at the floor accumulates `|deltaY|` and calls `onZoomOutFloor`
  (→ the outer tier) only past `ESCAPE_PUSH_PX` (320), decaying after
  `ESCAPE_PUSH_DECAY_MS` (500) and cleared by any zoom-in. One notch used to
  leave, which meant a flick aimed at the fitted view usually exited the deck.
- **Suspended chrome** (`components/StageChrome.tsx`): brand mark top-left;
  top-right "Study N due" (all decks → `/study?due=1`, deck-scoped →
  `/study?deck={id}`) plus "New deck" (glass popover form, provider
  `createDeck`) at the outer tier or the delete-deck danger button inside one
  (the same act is also in the column's deck-info drawer; both open the same
  confirm). Destructive acts confirm through `components/NightConfirm.tsx`.
- **The bottom ledger** (`components/StageLedger.tsx`, outer tier only): DAYS
  STUDIED / STARS IN YOUR SKY / DUE TODAY / MASTERED, the all-decks mastery mix
  (`components/MixBar.tsx`), and recent-upgrade rows; click toggles
  expanded/collapsed. Stars/mastered/mix are counted off the cards already in
  memory; days + upgrades come from `hooks/useSkyLedger.ts` (`/api/stats/*`).
- **The glass column** (`components/GlassColumn.tsx`, 340px, deck tier), top to
  bottom: back chevron (card → list, list → sky); the deck name, which is
  itself the disclosure for the **deck-info drawer** — closed by default, so the
  card list keeps the height — holding the stat tiles, the mastery mix and
  **Delete deck**; the all-decks search (`components/CardSearch.tsx`, in-memory
  filter — no endpoint, so results can't disagree with the map), rendered in the
  list state only; then either the card list (SORT chips Added/Mastery, cycling
  desc → asc → off) or the card detail (meanings, IN CONTEXT, the
  `lib/rankProgress.ts` mastery meter, dictionary lookup + delete-card actions).
  The « button collapses the whole column to a "≡ CARDS" handle and the camera
  re-fits. The drawer's old RECENT UPGRADES block is gone — the outer tier's
  ledger already carries the promotion feed, and repeating it cost a request per
  deck (`hooks/useDeckUpgrades.ts` is orphaned by that, still present).
- **Data is one request**: `GET /api/decks/user/:userId/cards` via
  `hooks/useSkyDecks.ts` — the sky, the column, the search index and the
  ledger counts all read the same rows. Mutations go through `DecksProvider`
  (summaries) *and* the hook's optimistic `hideDeck`/`hideCard` + `refresh`,
  so frames, stars and lists can never hold a ghost.
- **The night chrome palette is `lib/nightChrome.ts`, not tokens.** The stage
  is night in both themes, so all glass on it is light-on-dark always — the
  `--dock-*` reasoning, kept as feature-local constants. Rank dots/bars/pills
  read `stageColor()` so the list chrome and the stars agree.
- **`lib/rankProgress.ts` mirrors the backend's promotion rules.**
  `backend/src/services/cardSrsService.js` owns them; that file is a client
  copy, and retuning the thresholds there means changing both. Each promotion
  has a streak gate *and* a difficulty gate, and the bar shows the lower of
  the two so it can't read 100% on a card the server won't promote.
- **Two sorts, not three.** Added and Mastery. JLPT is impossible rather than
  unwanted: `cards` has no `word_id`, so a card can't reach a JLPT level.
- **The reader's pending-card hand-off lands here**: `DecksView` consumes
  `ReaderStateProvider.pendingCard` on mount (handled-ref guard) and runs
  `components/PendingCardOverlay/` over the stage; submit creates the card,
  refreshes the sky and focuses that deck via the URL.
- **Deck descriptions don't exist on the web** — dropped with the redesign.
  The column and the mobile app still have the feature.

### Settings, Help & Credits (`features/settings`)

**Three routes, one shell.** `/settings`, `/help` and `/credits` each render a
thin page over one feature view, and all three views wrap themselves in
`components/SettingsShell.tsx` — TopBar (with the `back to profile` pill
eyebrow) + a sticky "Settings" rail + the 900px-capped panel column. Navigating
between them reads as the panel column swapping in place, which is the
handoff's "Help lives inside settings" illusion done with real routes.

- **Reached from `/profile`'s Settings button only** — no nav entry. Help and
  Credits are reached only from the About card's link rows; each carries a
  `← BACK TO SETTINGS` link in its eyebrow row.
- **The theme picker here is the canonical control.** `TopBar`'s pill toggle is
  gone (the pill collapsed back to a single profile link with an optional
  eyebrow prop); the Appearance card drives `ThemeProvider` directly. The
  swatch dots are literal colours by design — they depict the themes, so they
  never follow the active one.
- **Delete account** (Data card) fronts `DELETE /api/user` with a typed-
  "delete" native `<dialog>` confirm (`components/DeleteAccountDialog.tsx`),
  then wipes the local session and lands on `/authenticate`. Signed out, the
  Data card collapses to a Sign in row.
- **Content is hand-authored and ships with the app.** Help copy lives in
  `views/HelpView.tsx` (works offline, no CMS); the Credits list is
  `lib/credits.ts`, the audited what-we-actually-ship inventory — several data
  licenses require the page, so keep that file in sync with reality (its
  Typography section mirrors the `next/font` imports in `app/layout.tsx`).
- Built on the `--paper-*` ruled-list surface; `PaperCard` / `PAPER_GHOST`
  were promoted to `shared/components` when this screen became their second
  consumer.

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
  **Registration is disabled server-side** (403 before validation), so signup
  cannot succeed until that guard is removed.
- **Google / Apple are built and flagged off.** `components/SocialButtons.tsx`
  renders behind `SHOW_SOCIAL_AUTH = false` in `AuthForm`; there is no OAuth on
  the backend, and two prominent buttons that do nothing are worse than none.
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

- **Reader · Dictionary · Decks │ Home · Profile.** Settings lost its entry —
  pre-decided when settings was redesigned, and `/profile`'s Settings button is
  the way in. Sky briefly had one and lost it when the star map merged into
  `/decks`: the sky *is* the decks page now, and two entries to one destination
  is one too many.
- `next/link`, not `router.push` on a `<button>`, so middle-click and
  open-in-new-tab work and prefetch happens. Active state is
  `aria-current="page"` plus a `--dock-active` tile; `/` matches exactly, the
  rest match their subtree.
- **Labels always visible** (the hover tooltip went with the icon-only
  version), and **monochrome** — the per-item brand hexes were outgoing-system
  decoration. Profile renders the `--avatar` circle the TopBar pill uses rather
  than a glyph.
- Reads the **`--dock-*` token group**: the dock is near-black in both themes,
  a floating object over the page rather than a surface of it, so it can't use
  `--card` / `--muted` / `--ink`. Same justification as `--paper-*`. Its shadow
  and divider are hardcoded — the handoff gives both one value for both themes.
- Icons are inlined at the handoff's geometry; `shared/icons` is the outgoing
  lucide set and its shapes are not these. Pages reserve `pb-[140px]`.

### Sky engine (`features/sky`)

**There is no `/sky` route** — the star map is the `/decks` page (see the
Decks entry above). What remains here is the engine: `lib/` (pure TypeScript,
written to be copied to mobile — see `lib/README.md`), the web-binding hooks
(`useCamera`, `useSkyFrame`, `useSkySeed`), and the SVG renderer
(`SkyCanvas`/`SkyStars`/`SkyClouds`/`SkyFrames`). The barrel's production
surface is `SkyMap` (uuid-keyed focus/selection, `frameMeta`, `insets`) plus
`useSkySeed`; the demo harness `Sky.tsx` remains the unrouted reference. The
route's other former tenant — the study-stats tab screen — is also gone
(`features/study/stats` holds only `lib/statsApi.ts`, the `/api/stats`
fetchers the stage's ledger and the decks/home upgrade rows read).

- **Moving between tiers is a camera flight** (`useCamera.flyTo`, ~600ms,
  interruptible); the host selects after the flight via `onSettled`. Insets
  changes re-fit as the same flight.
- `sky_seed` (`users.sky_seed`, migration 025) is the account's one immutable
  16-hex seed; `useSkySeed` fetches it off the profile and caches per user.

---

## Conventions to know

- **`'use client'` everywhere a component uses hooks**. RSC opportunities exist (static layout shells) but haven't been pursued.
- **Domain types live in `lib/types/`**; `lib/<x>Api.ts` only contains fetch helpers.
- **`lib/util/cn.ts`** is the Tailwind class merger. shadcn's `components.json` aliases `utils` to `@/lib/util/cn` — this means new shadcn-generated code uses the right path.
- **No hex literals in components.** One acceptable exception: `JlptChip`'s per-level palette (5 hardcoded colors by design). Everything else reads the design tokens. A one-off value that exists to make a *single* component work may stay hardcoded there with a comment saying why it isn't a token — widening the palette every screen reads is the more expensive mistake.
- **No inline `borderRadius: <pixel>` on token-relevant surfaces.** Use Tailwind `rounded-*` (which reads `--radius-*`) or `style={{ borderRadius: 'var(--radius-md)' }}`. Pure decorative shapes (`'50%'`, `999`) are fine.
- **Document new features in the Features section above.** When a new app-level feature lands (something a user can name — "shortcuts", "highlights sync", "deck import", …), add a subsection: what it is, entry-point files, where state lives, any non-obvious behaviour. Keep entries terse; deep details belong in the source.

---

## Where each concern lives

| Concern | Files |
|---|---|
| **Design tokens** | `styles/ds-tokens.css` (colour, shape, type, page canvas — the whole palette) |
| **Token primitives** | `shared/components/` — React components, not CSS classes (`Button`, `Card`, `PaperCard`, `Chip`, `Eyebrow`, …) |
| **Auth flow** | `components/providers/AuthProvider.tsx`, `app/authenticate/page.tsx`, `lib/userApi.ts` |
| **Reader chrome** | `components/reader/*`, `components/views/ReaderView/*` |
| **Library / book sync** | `components/library/*`, `components/views/ReaderView/*`, `lib/booksApi.ts`, `lib/devicesApi.ts`, `components/books/utils/booksDb.ts` (sole `aogimi` IDB factory), `lib/epubIdentity.ts` |
| **Dictionary** | `app/dictionary/page.tsx` → `features/dictionary/` (`views/DictionaryView.tsx` owns the URL, `views/SearchView.tsx` is the rail + entry layout, `components/`, `hooks/useWordDetails.ts`, `lib/results.ts`, `lib/dictApi.ts`, `providers/DictionaryStateProvider.tsx`) |
| **Decks / study** | `app/decks/page.tsx`, `components/views/cards/*`, `lib/decksApi.ts` |
| **Reader bubbles (overlays)** | `components/page-bubbles/*`, `components/providers/BubbleProvider.tsx` |
| **Profile** | `app/profile/page.tsx`, `components/profile/*` |

---

## Common tasks → starting points

| Task | Start at |
|---|---|
| Change a primary button's look across the whole app | [shared/components/Button.tsx](../shared/components/Button.tsx) — `BASE` + the `VARIANTS` map. |
| Change a color across the whole app | Edit the token in [styles/ds-tokens.css](../styles/ds-tokens.css), in **both** the `light` and `dark` blocks. |
| Wire a new backend endpoint | Add types in [lib/types/](lib/types/), fetch helper in `lib/<domain>Api.ts`, update [backend-connections.txt](backend-connections.txt). |
| Add a new page route | New folder under `app/`, add `page.tsx`. Auth-gated routes hide naturally — `AppShell` redirects when there's no user. |
| Cancel an in-flight fetch | Pass an `AbortSignal` to the API call; clean up in `useEffect`. |

---

## Out of scope (for now)

Tracked in [DECISIONS.md](DECISIONS.md). Highlights:

- Reading-position persistence is **EPUB-only** (localStorage buffer + periodic/exit backend flush via `useProgressSync`); resume-where-you-left-off works across devices. PDF position is deferred (no backend column yet).
- Highlights / bookmarks / annotations removed entirely (UI, storage, and foliate wiring) — not currently a feature.
- Backend-backed theme storage deferred (theme is the single `default`, not persisted).
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
