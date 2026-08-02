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

No CSS-in-JS. Themed surfaces use either Tailwind classes that resolve to `--lgc-*` tokens, or raw `style={{ background: 'var(--lgc-bg)' }}`. Both go through the same source.

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
├── styles/                       Design-token CSS
│   ├── themes/                   default.css — the sole color-token palette
│   ├── shape-defaults.css        Shape tokens (borders, shadows, radii, fonts)
│   ├── primitives.css            .lgc-card, .lgc-button, .lgc-button-secondary, .lgc-chip, .lgc-section-label, …
│   └── utilities.css             Vertical text, custom scrollbar, selection
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

**A redesign is landing screen by screen, so two token systems run in parallel.** They never collide because no name is shared — a screen reads one set or the other, and the old one is deleted when the last screen has migrated.

### Incoming — the redesign (`styles/ds-tokens.css`)

Two themes, `light` ("Ink on paper") and `dark` ("Midnight"), selected by `html[data-theme]`.

- **Colour + shape tokens**: `--ink`, `--soft`, `--muted`, `--faint`, `--card`, `--cardalt`, `--bd`, `--btn`, `--track`/`--fill`, `--cover-1..4`, `--stage-new`/`-recent`/`-learned`/`-mastered`, `--radius-*`. Read them as `text-(--ink)`, `bg-(--card)`.
- **Type**: `--face-jp`, `--face-ui`, `--face-mono`. Named `--face-*`, *not* `--font-*`, because `globals.css`'s `@theme` block already defines `--font-ui`/`--font-jp`/`--font-mono` for the outgoing faces — declaring them twice emitted two competing values into one stylesheet.
- **Not registered in Tailwind's `@theme`**: shadcn already owns `--color-card`, `--color-muted`, `--color-accent` and `--color-border` there, so registering `--card`/`--muted`/`--accent`/`--bd` as Tailwind colours would overwrite the outgoing bridge and break every un-migrated screen.
- **Cards are transparent by design** — shadow and layout separate surfaces, not a fill. `--bd` is transparent too, so hairline dividers are invisible until you fill it. Filling `--card`/`--cardalt`/`--bd` switches the whole app to filled cards with no markup change.
- **Primitives are React components**, not CSS classes: `shared/components/` (`Button`, `Card`, `CardHeader`, `Chip`, `CoverTile`, `Eyebrow`, `MonoAction`, `ProgressTrack`, `Skeleton`, `StageDot`). They read tokens and know nothing about the theme — there is never a light and a dark variant of a component, because the palette swaps underneath it.
- **Page canvas** is app-wide chrome, set in `globals.css`: base gradient on `<html>`, star tiles on `<body>`. Split across two elements because a single 43-layer `background` would need a 43-entry `background-size` list (a shorter list gets cycled by the spec).

Theme choice persists in the `aogimi-theme` localStorage key, applied by a pre-paint `<script>` in `app/layout.tsx` — an effect would fire after paint and flash. Falls back to `prefers-color-scheme`. It moves to a `users.theme` column later. The switch itself lives in `TopBar`'s profile pill.

**Un-migrated screens look wrong in dark mode.** They read the light-only `--lgc-*` palette while the canvas follows the theme. That's the accepted cost of migrating screen by screen.

### Outgoing — `--lgc-*` (delete when the last screen migrates)

1. **`--lgc-*` colour tokens** in `styles/themes/default.css` (`:root` + `html[data-theme="default"]`, which no longer matches anything since the attribute is now `light`/`dark`; the `:root` binding is what keeps it alive).
2. **Shape tokens** in `styles/shape-defaults.css`.
3. **Primitive classes** `.lgc-card`, `.lgc-button`, `.lgc-chip`, `.lgc-section-label` in `styles/primitives.css`, plus the old primitives in `shared/ui/`.

Don't build anything new on these. The teardown is: point the `@theme` colour aliases at the new tokens, delete those three CSS files and the stranded `shared/ui` primitives.

---

## State architecture

All state is in **React Context providers**, mounted by `AppShell`. Nothing in localStorage / IndexedDB is read directly from a component — every adapter lives in `lib/storage/`.

| Provider | What it owns | localStorage key(s) |
|---|---|---|
| `AuthProvider` | Current user, login/signup/logout flows. **Token storage = "memory + httpOnly cookie"**: the access token lives in-memory only ([`lib/auth/tokenStore.ts`](lib/auth/tokenStore.ts)), the refresh token is an httpOnly cookie set by the backend (never readable by JS). On boot, a silent `/api/auth/refresh` re-mints the access token from the cookie. Session-invalidation hook in [`lib/api.ts`](lib/api.ts) auto-signs-out on unrecoverable 401/403. See [`../../docs/AUTH.md`](../../docs/AUTH.md). | `auth_user` only (tokens are no longer in localStorage) |
| `ThemeProvider` | The single `default` theme (no setter that persists; kept as plumbing for a future redesign) | (none — no longer persisted) |
| `ReaderStateProvider` | Active book session (`{ activeBook, fileUrl, backendBookId?, initialCfi?, initialSpineIndex? }`), sidekick toggle, and the three cross-route pending signals (`pendingDictSearch`, `pendingCard`, `pendingBookOpen`). Reading-position sync itself lives in `ReaderView/useProgressSync` (the session just carries the backend id + restore anchor). | (none) |
| `DictionaryStateProvider` | Search query/results + the reader sidekick's selected word. Nothing is persisted: `/dictionary` keeps its query and selection in the URL, and holding a second copy in localStorage gave two sources of truth that drifted. | `dictionary_recent_searches` (written by `pushRecentSearch`, not by the provider's state) |
| `BubbleProvider` | Which page-bubble (Profile/Reader) is active | (in-memory only) |

The reader/dictionary/bubbles talk via **transient pending fields**: when the reader wants to look up a word, it sets `pendingDictSearch` on `ReaderStateProvider`; `AppShell` watches it, dispatches `dict.runSearch()`, then nulls the field. Same shape for `pendingCard`. Both effects guard against double-fire with a `useRef` of "last seen" — see [components/AppShell.tsx](components/AppShell.tsx).

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
- Reader surfaces (`DictionarySidekick`, the reader bubble, `WordDetailView`) still read the outgoing `--lgc-*` palette and are untouched. They share `DictionaryStateProvider` and `preferredHeadword` with this screen, nothing else.

### Decks (`features/study/decks`)

**`/decks` is the deck shelf; the deck *detail* is still the same route's other
half.** `DecksView` switches on local `screen` state between
`components/DeckList.tsx` (the redesigned grid) and `components/DeckDetail.tsx`
(un-migrated, still `--lgc-*`). There is no `/decks/{id}`.

- **`DeckList` is the page**, not a list: it owns the 1300 px column, renders
  `TopBar` itself the way home does, and composes `DecksHeader` + a
  `minmax(330px, 1fr)` auto-fill grid of `DeckCard`s. Order is the backend's
  `created_at DESC`.
- **The deck card has its own surface tokens** (`--deck-paper`, `--deck-bd`,
  `--deck-sky`, …) rather than the app-wide `--card` / `--bd`, which are
  transparent. It's the one component that needs a real fill and edge, because
  it's a single clipped object with a dark panel over paper. Don't "unify" these
  back into the shared tokens — that repaints home and the dictionary. Full
  reasoning in `DECISIONS.md`.
- **The sky panel is deliberately empty**, exactly like home's sky bubble. The
  star map is a separate component with separate data.
- **The card is one stretched target.** The deck name is the only control; its
  `::after` covers the card so any dead space opens the deck too. The `...`
  menu sits above that overlay at `z-10` — nesting it *inside* the target would
  swallow its clicks. The due badge is display-only for the same reason.
- **Due counts are one request for the whole screen.**
  `hooks/useDeckDueCounts.ts` wraps `/api/study/due/counts`, which returns the
  header total and the per-deck map together. A deck missing from `byDeck` has
  nothing due — that's why the hook exposes `loading` separately.
- **`last_card` comes from the backend**, not from fetching cards. The deck row
  carries the most recently added card; see `backend-connections.txt`.
- **Deck descriptions don't exist on the web** — dropped with the redesign. The
  column and the mobile app still have the feature.

**Deck detail** (`components/DeckDetail.tsx`, still the other half of `/decks`)
is the card list beside an empty sky panel, with a ledger below.

- **Nothing on it talks to a star map.** The handoff binds the list and the map
  together — hover bubbles, star↔row hover mirroring, a collapse control that
  hides the list to reveal the map. All deferred with the map: it would be
  interaction with a blank rectangle. `DeckCardPanel` takes
  `selectedId`/`onSelect`, so the map plugs into the existing selection model
  without the panel changing.
- **`lib/rankProgress.ts` mirrors the backend's promotion rules.**
  `backend/src/services/cardSrsService.js` owns them; that file is a client
  copy, and retuning the thresholds there means changing both. It exists
  because `last_outcomes` and `difficulty` already ride along in the cards
  payload. Each promotion has a streak gate *and* a difficulty gate, and the
  bar shows the lower of the two so it can't read 100% on a card the server
  won't promote.
- **The ledger counts in memory.** Card totals and the four-tier mix bar come
  from the `cards` array the page already has — no `deck/stats` endpoint,
  because it would return figures we're holding. Only the upgrades panel
  fetches, and only because its limit has to be applied server-side.
- **Two sorts, not three.** Added and Mastery. JLPT is impossible rather than
  unwanted: `cards` has no `word_id`, so a card can't reach a JLPT level.
- **Add card, rename and session settings survive** in the header even though
  the handoff treats this page as read-only apart from its two deletes — they
  were existing capability and the only route to either.

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

- **Reader · Dictionary · Decks │ Sky · Home · Profile.** Sky gained an entry
  (`/sky` existed as a route with no nav item); Settings lost one — pre-decided
  when settings was redesigned, and `/profile`'s Settings button is the way in.
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

---

## Conventions to know

- **`'use client'` everywhere a component uses hooks**. RSC opportunities exist (static layout shells) but haven't been pursued.
- **Domain types live in `lib/types/`**; `lib/<x>Api.ts` only contains fetch helpers.
- **`lib/util/cn.ts`** is the Tailwind class merger. shadcn's `components.json` aliases `utils` to `@/lib/util/cn` — this means new shadcn-generated code uses the right path.
- **No hex literals in components.** One acceptable exception: `JlptChip`'s per-level palette (5 hardcoded colors by design). Everything else reads `--lgc-*` tokens.
- **No inline `borderRadius: <pixel>` on token-relevant surfaces.** Use Tailwind `rounded-*` (which reads `--radius-*`) or `style={{ borderRadius: 'var(--radius-md)' }}`. Pure decorative shapes (`'50%'`, `999`) are fine.
- **Document new features in the Features section above.** When a new app-level feature lands (something a user can name — "shortcuts", "highlights sync", "deck import", …), add a subsection: what it is, entry-point files, where state lives, any non-obvious behaviour. Keep entries terse; deep details belong in the source.

---

## Where each concern lives

| Concern | Files |
|---|---|
| **Design tokens** | `styles/themes/default.css` (colors), `styles/shape-defaults.css` (shape) |
| **Token primitives** | `styles/primitives.css` (`.lgc-card`, `.lgc-button`, `.lgc-button-secondary`, `.lgc-chip`, …) |
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
| Change a primary button's look across the whole app | [styles/primitives.css](styles/primitives.css) `.lgc-button` + tokens in [styles/shape-defaults.css](styles/shape-defaults.css) |
| Change a color across the whole app | Edit the `--lgc-*` token in [styles/themes/default.css](styles/themes/default.css). |
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
