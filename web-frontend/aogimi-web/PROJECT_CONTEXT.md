# Aogimi Web — Project Context

A primer for new contributors and agents. Read this first; specialised docs ([THEMES.md](THEMES.md), [THEME_AUTHORING.md](THEME_AUTHORING.md), [DECISIONS.md](DECISIONS.md), [backend-connections.txt](backend-connections.txt)) drill into specific surfaces.

---

## What this is

Aogimi is a **Japanese reading + vocabulary app**. Users import EPUBs / PDFs, read in-app, look up words against JMdict / KANJIDIC2, and build flashcard decks for spaced study. Reading progress, decks, and devices sync to a Postgres backend; the actual book files live per-device (IndexedDB) and are reconciled by hash on demand.

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
| Storage | localStorage (auth, prefs) + IndexedDB via `idb` (book blobs) |
| Bundle helpers | `clsx`, `tailwind-merge`, `tw-animate-css`, `class-variance-authority` |

No state library (Redux/Zustand/Jotai). State lives in **React Context providers**.

No CSS-in-JS. Themed surfaces use either Tailwind classes that resolve to `--lgc-*` tokens, or raw `style={{ background: 'var(--lgc-bg)' }}`. Both go through the same source.

---

## Top-level layout

```
web-frontend/langecko-web/
├── app/                          Next.js App Router routes + global CSS
│   ├── layout.tsx                Root layout: fonts, pre-hydration theme script, providers
│   ├── page.tsx                  / (landing/redirect)
│   ├── globals.css               Imports theme files + primitives + utilities; declares Tailwind @theme aliases
│   ├── authenticate/page.tsx     /authenticate (login/signup)
│   ├── reader/page.tsx           /reader (library + active-book reader)
│   ├── dictionary/page.tsx       /dictionary
│   ├── decks/page.tsx            /decks
│   ├── profile/page.tsx          /profile
│   ├── word/[id]/page.tsx        /word/<id> (deep link to a dictionary entry)
│   └── api/                      Server routes (DeepL proxy, PDF reader, dictionary index)
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
│   ├── icons/                    Theme-aware icon sets (Stamp has a few overrides)
│   ├── ui/                       shadcn primitives (button, sheet, sidebar, …)
│   ├── theme-decorations/        Stamp-specific atoms (HankoSeal, Postmark, …) + ThemedDecoration
│   ├── DeepLTranslationPopup/    Reader text translation
│   ├── AvatarPickerModal/        Profile avatar grid
│   ├── OnboardingExplainerModal/ Auth-flow explainer wrapper
│   └── providers/                Auth, Reader state, Bubble routing, Dictionary, Theme
│
├── themes/                       Theme registry + per-theme whole-screen swaps
│   ├── index.ts                  ThemeComponentMap + themeComponentRegistry
│   ├── useThemedComponent.ts     Resolver hook
│   └── stamp/                    Stamp's screen variants (mirrors components/ paths)
│
├── styles/                       Theme-system CSS
│   ├── themes/                   One file per theme: default.css, kanagawa.css, sakura.css, hanami.css, stamp.css
│   ├── shape-defaults.css        Default values for shape tokens (themes inherit unless they override)
│   ├── primitives.css            .lgc-card, .lgc-button, .lgc-button-secondary, .lgc-chip, .lgc-section-label, …
│   └── utilities.css             Reader highlights, vertical text, custom scrollbar, selection
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
│   ├── translateApi.ts           DeepL proxy fetch
│   ├── types/                    Domain types (book, deck, dict, user, device, translate, epubjs)
│   ├── storage/                  localStorage adapters per concern
│   ├── config/                   limits.ts, deckVisuals.ts
│   ├── util/                     cn (Tailwind class merge), deviceName
│   ├── bookStore.ts              IndexedDB wrapper for local book blobs
│   ├── epubIdentity.ts           Hashing + metadata extraction for EPUB matching
│   ├── fsAccess.ts               File System Access API helpers
│   └── japanese.ts               Tiny utilities (kana classifiers, etc.)
│
├── hooks/use-mobile.ts           Width-based mobile breakpoint detector
│
└── public/, aogimi-DS/          Static assets + design canvas reference
```

---

## Run-of-show: a request hits the app

1. Browser loads `/` → Next.js renders `app/layout.tsx` (RSC) → root `<html>` ships with `data-theme="default"`.
2. Pre-hydration `<script>` (top of `<head>`) reads `localStorage.getItem('app-theme')` and overwrites `data-theme` *before* paint. No flash.
3. React hydrates. `ThemeProvider` initialises `useState` from `document.documentElement.dataset.theme` synchronously, so React state matches what's painted.
4. `AuthProvider` reads `auth-user` from localStorage; if absent and not on `/authenticate`, `AppShell` redirects.
5. `ReaderStateProvider`, `DictionaryStateProvider`, `BubbleProvider` mount.
6. The current route's component renders inside `AppShell`, alongside the floating `WorkspaceNav` and any active page-bubble (Profile / Reader).

---

## Theme system in 30 seconds

Three layers, single attribute.

1. **`<html data-theme="…">`** — flipped at runtime by `ThemeProvider.setTheme()` and persisted to localStorage.
2. **`--lgc-*` color tokens** + optional shape-token overrides (`--lgc-surface-*`, `--lgc-button-*`, `--lgc-chip-*`, `--lgc-toolbar-*`, `--lgc-meaning-num-*`, …) declared per theme in `styles/themes/<name>.css`. Inherited from `styles/shape-defaults.css` otherwise.
3. **Optional whole-screen swaps** via `themes/index.ts` registry — only when the visual *tree* genuinely diverges (Stamp's home/reader/bubble layouts).

Single source of truth: the `THEMES` record in `components/providers/ThemeProvider.tsx`. `AppTheme = keyof typeof THEMES`. The registry, the storage validator, the pre-hydration script, and `ThemeSwitcher` all derive from it. **You can't add a theme without TypeScript forcing every related file to be in sync.**

For the full inventory and how-to, read [THEMES.md](THEMES.md) and [THEME_AUTHORING.md](THEME_AUTHORING.md).

---

## State architecture

All state is in **React Context providers**, mounted by `AppShell`. Nothing in localStorage / IndexedDB is read directly from a component — every adapter lives in `lib/storage/`.

| Provider | What it owns | localStorage key(s) |
|---|---|---|
| `AuthProvider` | Current user, login/signup/logout flows. JWT access + refresh tokens via [`lib/auth/tokenStore.ts`](lib/auth/tokenStore.ts); session-invalidation hook in [`lib/api.ts`](lib/api.ts) auto-signs-out on unrecoverable 401. See [`../../docs/AUTH.md`](../../docs/AUTH.md). | `auth_user`, `aogimi_access_token`, `aogimi_refresh_token` |
| `ThemeProvider` | Active theme + setter | `app-theme` |
| `ShortcutsProvider` | Global keydown dispatcher + cheatsheet open state | (in-memory only) |
| `ReaderStateProvider` | Active book session, sidekick toggle, progress sync (record/flush/beacon on exit), and the three cross-route pending signals (`pendingDictSearch`, `pendingCard`, `pendingBookOpen`) | `reader_progress_<filename>` (one per book) |
| `DictionaryStateProvider` | Search query/results, recent searches, active word | `dictionary-state` |
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
- `sendProgressBeacon(id, payload)` — uses `navigator.sendBeacon` for fire-and-forget on tab close

All accept an optional `AbortSignal`. Pair with `useEffect` cleanup to cancel in-flight fetches when components unmount.

Server-only proxies live under `app/api/`:
- `/api/translate` — DeepL passthrough
- `/api/pdf-reader` — server-side PDF text extraction
- `/api/dictionary` — local dictionary index endpoint

---

## Persistence model

| Where | What | Notes |
|---|---|---|
| **Backend (Postgres)** | Users, books metadata + reading progress, decks, cards, devices, JMdict/KANJIDIC2 | Everything that should sync across devices |
| **IndexedDB** (`aogimi-books`) | EPUB / PDF blobs + per-file metadata | Per-device — files don't leave the browser |
| **localStorage** | Auth user, theme, reader session, dictionary state, avatar, onboarding flag, device-id, reader prefs | Per-device, low-stakes |

Library mount reconciles all three: load local IndexedDB → register device → fetch backend records → call `POST /api/books/match` to resolve unidentified local files against existing user books → backfill identity (`PUT /api/books/{id}/identity`) where needed → call `POST /api/devices/{deviceId}/books/{bookId}/available` for files present locally. See [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx) for the reconciliation flow.

---

## Features

App-level features that ride on top of the architecture above. Document new features here as they land — describe what the feature is, the entry points, where state lives, and any non-obvious behaviour. Keep entries terse; details belong in the source.

### Keyboard shortcuts

A typed registry + cheatsheet. One source of truth for every shortcut in the app; adding a new shortcut is one row + one `useShortcut()` call.

- **Registry**: [lib/shortcuts/registry.ts](lib/shortcuts/registry.ts). Each entry is `{ id, keys, scope, description, group }`. `keys` accepts multiple bindings per id (so `→ / ↓` for "next page" is one entry, not two). `ShortcutId` is a literal-union derived from the array — calling `useShortcut('does-not-exist', …)` is a compile error.
- **Matcher / formatter**: [lib/shortcuts/match.ts](lib/shortcuts/match.ts). `defMatches(e, def)` for the dispatcher, `formatDef(def)` for the cheatsheet UI (turns `{ alt:true, key:'h' }` into `Alt + H`, arrow keys into `→ ↓` glyphs).
- **Runtime**: [components/providers/ShortcutsProvider.tsx](components/providers/ShortcutsProvider.tsx). One `keydown` listener at the app root. Skips all shortcuts when the event target is `<input>` / `<textarea>` / `<select>` / `[contenteditable]`. Handler refs are kept fresh via `useLayoutEffect` so passing a new closure on every render doesn't re-bind.
- **Hook**: `useShortcut(id, handler, enabled?)` from `@/components/providers/ShortcutsProvider`. Returns nothing. Handler may return `false` to opt out of `preventDefault` (useful when a shortcut is conditional — e.g. `reader:highlight-yellow` is a no-op without a selection and shouldn't suppress the browser default).
- **Cheatsheet**: [components/ui/ShortcutsCheatsheet.tsx](components/ui/ShortcutsCheatsheet.tsx). Modal opened by `Shift + ?`, closed by `Esc` or backdrop click. Reads the registry, groups by `def.group`, renders one row per definition. Themable through `.lgc-card`.

**Currently registered shortcuts** (see registry for canonical list):

| ID | Keys | Scope | Action |
|---|---|---|---|
| `global:show-cheatsheet` | `Shift + ?` | global | Toggle the cheatsheet modal |
| `reader:highlight-yellow` | `Alt + H` | reader | Apply yellow highlight to the current selection (toggle on re-press) |
| `reader:bookmark` | `B` | reader | Bookmark current page (pre-existing) |
| `reader:tts-toggle` | `T` | reader | Toggle text-to-speech (pre-existing) |
| `reader:page-next` | `→` / `↓` | reader | Next page |
| `reader:page-prev` | `←` / `↑` | reader | Previous page |

**Adding a new shortcut**: append to `SHORTCUTS` in the registry; call `useShortcut('your-id', () => …)` in the component that owns the action. The cheatsheet picks it up automatically. Convention is `Alt + <key>` for newly-introduced bindings (existing plain-key bindings kept for back-compat).

---

## Conventions to know

- **`'use client'` everywhere a component uses hooks**. RSC opportunities exist (static layout shells) but haven't been pursued.
- **Domain types live in `lib/types/`**; `lib/<x>Api.ts` only contains fetch helpers.
- **`lib/util/cn.ts`** is the Tailwind class merger. shadcn's `components.json` aliases `utils` to `@/lib/util/cn` — this means new shadcn-generated code uses the right path.
- **No hex literals in components.** Two acceptable exceptions: `JlptChip`'s per-level palette (5 hardcoded colors by design) and theme decoration atoms in `components/theme-decorations/<theme>/` (theme-bound by definition).
- **No inline `borderRadius: <pixel>` on theme-relevant surfaces.** Use Tailwind `rounded-*` (which reads `--radius-*`) or `style={{ borderRadius: 'var(--radius-md)' }}`. Pure decorative shapes (`'50%'`, `999`) are fine.
- **No `if (theme === 'stamp')` inside components.** Either move the variation to a shape token (`--lgc-…`) or fork via the registry.
- **Edits to `THEMES` cascade.** Add an entry → TypeScript forces a registry slot, the storage validator includes it, the pre-hydration script's allow-list extends, the picker shows it.
- **Document new features in the Features section above.** When a new app-level feature lands (something a user can name — "shortcuts", "highlights sync", "deck import", …), add a subsection: what it is, entry-point files, where state lives, any non-obvious behaviour. Keep entries terse; deep details belong in the source.

---

## Where each concern lives

| Concern | Files |
|---|---|
| **Theme tokens** | `styles/themes/*.css`, `styles/shape-defaults.css` |
| **Theme primitives** | `styles/primitives.css` (`.lgc-card`, `.lgc-button`, `.lgc-button-secondary`, `.lgc-chip`, …) |
| **Theme dispatch** | `themes/index.ts` (registry), `themes/useThemedComponent.ts` (hook), `components/<X>/index.tsx` (resolvers) |
| **Theme decorations** | `components/theme-decorations/<theme>/*.tsx`, `<ThemedDecoration>` |
| **Auth flow** | `components/providers/AuthProvider.tsx`, `app/authenticate/page.tsx`, `lib/userApi.ts` |
| **Reader chrome** | `components/reader/*` (default), `themes/stamp/reader/*` (stamp), `components/views/ReaderView/*` |
| **Library / book sync** | `components/library/*`, `components/views/ReaderView/*`, `lib/booksApi.ts`, `lib/devicesApi.ts`, `lib/bookStore.ts`, `lib/epubIdentity.ts` |
| **Dictionary** | `app/dictionary/page.tsx`, `components/views/DictionaryView/*`, `components/views/WordDetailView/*`, `lib/dictApi.ts`, `components/providers/DictionaryStateProvider.tsx` |
| **Decks / study** | `app/decks/page.tsx`, `components/views/cards/*`, `lib/decksApi.ts` |
| **Reader bubbles (overlays)** | `components/page-bubbles/*`, `components/providers/BubbleProvider.tsx` |
| **Profile** | `app/profile/page.tsx`, `components/profile/*` |

---

## Common tasks → starting points

| Task | Start at |
|---|---|
| Change a primary button's look across the whole app | [styles/primitives.css](styles/primitives.css) `.lgc-button` + tokens in [styles/shape-defaults.css](styles/shape-defaults.css) |
| Add a new theme | Read [THEME_AUTHORING.md](THEME_AUTHORING.md). Edit `THEMES` in [components/providers/ThemeProvider.tsx](components/providers/ThemeProvider.tsx), drop a CSS file in [styles/themes/](styles/themes/), import in [app/globals.css](app/globals.css), register `{}` in [themes/index.ts](themes/index.ts). |
| Wire a new backend endpoint | Add types in [lib/types/](lib/types/), fetch helper in `lib/<domain>Api.ts`, update [backend-connections.txt](backend-connections.txt). |
| Add a new page route | New folder under `app/`, add `page.tsx`. Auth-gated routes hide naturally — `AppShell` redirects when there's no user. |
| Add a new themed screen | Read [THEME_AUTHORING.md](THEME_AUTHORING.md) "When you actually need to override a screen". |
| Debug "the theme didn't change here" | Grep the file for hex literals, inline `borderRadius`/`boxShadow`, hand-rolled `bg-lgc-bg-elev … border-lgc-border` chains where it should be `lgc-card`. |
| Cancel an in-flight fetch | Pass an `AbortSignal` to the API call; clean up in `useEffect`. |

---

## Out of scope (for now)

Tracked in [DECISIONS.md](DECISIONS.md). Highlights:

- Reading-position persistence currently localStorage-per-device; eventual move to Postgres `user_books`.
- Highlights / bookmarks / annotations not yet synced.
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

- [THEMES.md](THEMES.md) — token inventory + per-token consumer list + dispatch decision rule
- [THEME_AUTHORING.md](THEME_AUTHORING.md) — step-by-step for adding a new theme
- [backend-connections.txt](backend-connections.txt) — endpoint catalog + payload shapes
- [DECISIONS.md](DECISIONS.md) — scope & deferred work
- [AGENTS.md](AGENTS.md) — Next.js version warning
