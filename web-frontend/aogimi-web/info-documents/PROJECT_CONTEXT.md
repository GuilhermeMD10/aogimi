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
| Storage | localStorage (auth user, dictionary state, device id) + single `aogimi` IndexedDB via `idb` (book blobs + metadata + FS directory handle) |
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
│   └── word/[id]/page.tsx        /word/<id> (deep link to a dictionary entry)
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
6. The current route's component renders inside `AppShell`, alongside the floating `WorkspaceNav` and any active page-bubble (Profile / Reader).

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
| `DictionaryStateProvider` | Search query/results, recent searches, active word | `dictionary_state`, `dictionary_recent_searches` |
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
| **localStorage** | `auth_user`, `dictionary_state`, `dictionary_recent_searches`, device-id (`lgc_device_id`) | Per-device, low-stakes. No theme / reader / study / avatar / onboarding keys anymore. |

Library mount reconciles all three: load local IndexedDB → register device → fetch backend records → call `POST /api/books/match` to resolve unidentified local files against existing user books → backfill identity (`PUT /api/books/{id}/identity`) where needed → call `POST /api/devices/{deviceId}/books/{bookId}/available` for files present locally. See [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx) for the reconciliation flow.

---

## Features

App-level features that ride on top of the architecture above. Document new features here as they land — describe what the feature is, the entry points, where state lives, and any non-obvious behaviour. Keep entries terse; details belong in the source.

_No app-level features are currently documented._

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
| **Dictionary** | `app/dictionary/page.tsx`, `components/views/DictionaryView/*`, `components/views/WordDetailView/*`, `lib/dictApi.ts`, `components/providers/DictionaryStateProvider.tsx` |
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
