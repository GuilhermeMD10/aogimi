# Redesign — context for a fresh agent

**Read this before touching any screen.** It's the same for every page, so it's
written to be pasted at the start of a new chat and then forgotten about.

The web app is being rebuilt screen by screen from `design_handoff_aogimi_*`
bundles. **Home is done and is the reference implementation** — when in doubt
about a pattern, open `features/home/` and copy what's there.

Status:

| Screen | Route | State |
|---|---|---|
| Home | `/` | **Done** — reference implementation |
| Reader / library | `/reader` | Not started |
| Dictionary | `/dictionary` | **Done** — empty state + rail/entry split |
| Word detail | — | Folded into `/dictionary`; `/word/[id]` deleted |
| Decks | `/decks` | **Done** — list **and** detail (detail is still a state of `DecksView`, not a route) |
| Study runner | `/study` | Route extracted, visuals not started |
| Sky (study stats) | `/sky` | Not started |
| Profile | `/profile` | Not started |
| Settings / help / credits | `/settings`, `/help`, `/credits` | Not started |
| Auth | `/authenticate` | Not started |
| Bottom nav (dock) | — | **Deferred by the owner. Don't touch `WorkspaceNav`.** |

---

## 1. Read these first, in this order

1. **The page's handoff bundle** — `Aogimi - <Page>.dc.html` (the prototype;
   its theme object at the bottom is the source of truth for colour values),
   `Aogimi Design Language.dc.html` (palette, type, tone), and `README.md`
   (spec, tokens, states).
2. **`../../../CLAUDE.md`** — repo-wide rules. The design-tokens section is the
   short version of §2 below.
3. **`PROJECT_CONTEXT.md`** → the **Theming** section. Skip its directory tree;
   it's stale from before the feature refactor and still says `langecko-web/`.
4. **`DECISIONS.md`** → the last entry, "Redesign — home page + parallel token
   system". Every deviation home made and why.
5. **`AGENTS.md`** — house rules, including: **this is Next.js 16**, so read
   `node_modules/next/dist/docs/` before writing route/layout code rather than
   trusting training data.

### Who wins when sources disagree

- **The handoff wins on visuals** — colour, type, spacing, radii, states.
- **The repo wins on structure** — file placement, naming, barrels, layering.
  The handoff's suggested paths (`components/home/…`, `app/(app)/layout.tsx`)
  are generic scaffolding; its own README says to use the target codebase's
  patterns. Follow §4 instead.
- **The page prototype wins over the Design Language file.** They genuinely
  disagree — the Design Language shows an indigo-glass dock with JP+EN labels
  and Kinari paper, the prototypes are near-black chrome on `#f3f2ef`. Read the
  Design Language for intent, take values from the prototype.
- **The owner wins over everything.** Ask when a handoff instruction conflicts
  with something they've already decided.

---

## 2. Tokens — the part that bites

**Two token systems run in parallel.** New screens read the incoming set; screens
not yet redesigned keep reading the outgoing one. They coexist because no name is
shared. When the last screen migrates, the old files are *deleted* — that's why
this is a parallel build and not a sweep.

### Incoming — build on this: `styles/ds-tokens.css`

Two themes, `light` and `dark`, on `html[data-theme]`.

- Colour: `--ink` `--soft` `--muted` `--faint` · `--card` `--cardalt` `--bd` ·
  `--card-border` `--card-shadow` · `--btn` `--btn-ink` · `--track` `--fill` ·
  `--avatar` `--avatar-ink` · `--accent` `--accent-ink` (vermilion — used twice
  on the whole of home, don't spread it) · `--cover-1..4` + `-ink` `--covtrack`
  `--cover-shadow` · `--stage-new` `-recent` `-learned` `-mastered` ·
  `--sky-border` `--sky-shadow` · `--bg` `--page-base` `--page-stars`
  `--page-vignette`.
- Radii: `--radius-tile` `-cover` `-button` `-input` `-pill` `-card` `-panel`
  `-chip`.
- Type: **`--face-jp` / `--face-ui` / `--face-mono`**.

Write them with Tailwind v4's var shorthand: `text-(--ink)`, `bg-(--card)`,
`rounded-(--radius-card)`. Fonts need the long form:
`font-[family-name:var(--face-ui)]`.

### Four traps that cost real time on home

1. **Type tokens are `--face-*`, never `--font-*`.** `app/globals.css`'s
   `@theme` block already binds `--font-ui` / `--font-jp` / `--font-mono` to the
   *outgoing* faces. Declaring them again emits two competing values into one
   stylesheet and the winner is decided by Tailwind's output order. Verify with
   `grep -o -- "--face-ui:[^;]*" .next/static/chunks/*.css` — one declaration.
2. **Never register the new tokens in `@theme`.** shadcn already owns
   `--color-card`, `--color-muted`, `--color-accent`, `--color-border` there;
   re-registering `--card`/`--muted`/`--accent`/`--bd` as Tailwind colours
   silently repaints every un-migrated screen. Use the `(--var)` shorthand.
3. **`--card`, `--cardalt` and `--bd` are all `transparent` by design.** Shadow
   and layout separate surfaces, not fills. Consequence: **hairline dividers
   don't render** until someone fills `--bd`. That's the handoff's intent, so
   don't "fix" it — and don't reach for a hardcoded border instead.
4. **`shared/ui/button.tsx` exists and macOS is case-insensitive**, so
   `shared/ui/Button.tsx` would collide. New primitives go in
   `shared/components/`.

### Theming rules

- Components are **theme-agnostic**. Never write a light variant and a dark
  variant of a component — the palette swaps underneath it. `Button` has
  `primary`/`secondary` because that's a real distinction; it has no `dark`.
- Theme lives in `html[data-theme]`, persists in the `aogimi-theme` localStorage
  key, and is applied by a pre-paint `<script>` in `app/layout.tsx`. An effect
  can't do this — it fires after paint and flashes. The switch is in
  `TopBar`'s profile pill.
- **Un-migrated screens look wrong in dark mode** (light-only `--lgc-*` text on
  a themed canvas). Known and accepted; not a bug to chase.

### Outgoing — do not build on this

`--lgc-*` in `styles/themes/default.css` + `styles/shape-defaults.css`, the
`.lgc-card` / `.lgc-button` / `.lgc-chip` classes in `styles/primitives.css`,
and the old primitives in `shared/ui/` (`SectionCard`, `SectionHead`,
`ActionRow`, `InfoRow`, `Field`, `ReaderProgressBar`). Leave them alone on
screens you aren't redesigning; delete nothing until the last screen migrates.

---

## 3. General components — `shared/components/`

The primitive layer. All theme-agnostic, all token-driven.

`Button` (primary/secondary, icon slot, renders `<a>` when given `href` else
`<button>`) · `Card` (`card` | `panel`) · `CardHeader` (title + corner action) ·
`Chip` · `CoverTile` (cover colour + vertical title + progress strip) ·
`Eyebrow` (mono uppercase column label) · `MonoAction` (`VIEW ALL →`) ·
`ProgressTrack` · `Skeleton` · `StageDot` (+ `stageLabel`) · `coverPalette`.

**The bar for adding one: it's used twice.** A one-off stays in the feature that
uses it and gets promoted when a second screen wants it. A too-simple component
is correct; a clever one is not.

Before hand-rolling anything, check this folder — the whole point is that the
primitives stay coherent with each other, and that only works if each screen
extends the set instead of forking it.

Two things that live in `StageDot` and should stay there: the SRS ladder union
(`shared/` can't import from `features/`, so it's declared locally and mirrors
`cards.state`) and the fact that **`seen` displays as "Recent"**. The DB enum is
the source of truth — never rename the column to match the label.

---

## 4. Where code goes

Layers, one-way: `lib`/`shared` ← `features` ← `app`. Enforced by
`import/no-restricted-paths` in `eslint.config.mjs`.

- `app/` — routing only. A page is a thin wrapper rendering one feature view.
  Add `<Suspense>` if the view reads `useSearchParams`.
- `features/<feature>/` — `components/` (PascalCase), `hooks/` (`useFoo.ts`),
  `lib/` (camelCase: `fooApi.ts`, pure logic), `providers/`, `views/`,
  `types.ts`. **Only create a sub-folder that will hold a file.** Each feature
  has an `index.ts` barrel = its public API.
- Cross-feature imports go through the barrel (`@/features/foo`); a types-only
  borrow may hit `@/features/foo/types`. Inside a feature, relative imports.
- Providers and hooks are imported **by file path**, not via the barrel, to
  avoid barrel cycles.
- Domains with sub-features (`books`, `study`) nest them as siblings. **Sub-features
  don't import each other** — something needing two of them is an orchestrator
  view at the domain root (`features/study/views/StudyView.tsx`,
  `features/books/views/BooksView.tsx`).
- `shared/components` (new primitives) · `shared/icons` · `lib/` is
  feature-agnostic infra only (`api.ts`, `tokenStore.ts`, `useFetchWithAbort.ts`,
  `storage/_helpers.ts`, `util/`).

### Data

- Every card/section owns its own request via a hook in the feature's `hooks/`,
  so one slow query doesn't hold up the screen. The view composes and fetches
  nothing. Exception: two sections needing the *same* payload share one hook —
  see `features/home/hooks/useBooks.ts`, which serves both the continue-reading
  and library cards.
- Fetch helpers live in the feature's `lib/*Api.ts` and take an optional
  `AbortSignal`. `useFetchWithAbort` handles the abort dance.
- **Internal navigation is `next/link`, always.** A raw `<a href="/…">` is a full
  page reload, and a reload discards the in-memory access token — see §7.
- Every section needs three states: **loading** (a `Skeleton` reserving the real
  height, so nothing shifts), **empty**, and **error**. The rule: *the card
  stays, the shell stays, the content softens.* Never hide a section because its
  data is empty.

---

## 5. Data gaps you will hit again

The handoffs assume data the backend doesn't have. These recur across screens —
how home resolved them:

| Handoff assumes | Reality | Home did |
|---|---|---|
| Page numbers (`PAGE 142 / 412`) | EPUB position is a CFI + spine index; `page_count` is PDF-only | Percentage only |
| A Japanese spine title *and* an English heading | One `title` column | Same title in both |
| A stored cover-colour index | `cover_color` is an outgoing hex; decks have no colour column | `coverPalette(seed)` hashes a stable seed |
| POS + two glosses on a card | `CardRecord` has `front`/`reading`/`back` and **no `word_id`** | Dropped both |
| `studied N×` per deck | No such aggregate | Feature dropped |
| Recent lookups with reading + gloss + entry id | `dictionary_recent_searches` stores `{ query, at }` only | Term + age, links to `?q=` |
| A deck deep link (`/decks/{id}`) | `DecksView` picks its deck from local state; no param | Links to `/decks` |
| A deck's last-added word | Deck rows had `card_count` and nothing else | **Backend gained `last_card`** — the one gap so far worth a query change rather than a drop |
| Decks ordered by most recently studied | Nothing records it | `created_at DESC` |
| `SESSIONS 28×` on a deck | No session entity at all — `study_days` is per user, `card_reviews` per card | Dropped; three ledger figures, not four |
| Progress-to-next-rank per card | Not stored — **but the promotion rules are explicit in `cardSrsService.js`** | Derived client-side in `decks/lib/rankProgress.ts` from `last_outcomes` + `difficulty` |
| A card's part of speech, second meaning, JLPT level, or its context sentence's translation | None exist; `cards` has no `word_id` to reach the dictionary through | All four omitted, each degrading its own line |

When you find a new one: **name it to the owner, don't invent a schema.** They
have consistently chosen the simpler option.

---

## 6. Verify before reporting done

```bash
cd web-frontend/aogimi-web
npx tsc --noEmit                       # must be clean
npm run build                          # must compile
npm run lint                           # must stay at the baseline below
```

**Lint baseline: 13 errors, 8 warnings** (as of 2026-08-01). Don't add to it.
`git stash && npm run lint && git stash pop` to compare if unsure.

`react-hooks/set-state-in-effect` fires false positives on legitimate
"sync from an external system" effects — reading localStorage, for instance,
which can't happen during render. Disable it as a **block**
(`/* eslint-disable … */` … `/* eslint-enable … */`) with a comment saying why:
the rule reports on the `setState` call, not the `useEffect` line, so
`disable-next-line` misses it. See `features/home/hooks/useRecentSearches.ts`.

To check the app actually runs: `npm run dev`, wait for `Ready`, then
`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/<route>`. Give it
~10s after `Ready` — a cold Turbopack compile answers 307/404 until it's warm.

**You cannot verify the render this way.** `AppShell` returns `null` on the
server pass behind its auth gate, so no screen content appears in the SSR HTML.
Say so plainly when reporting: visual fidelity needs the owner's eyes in a
signed-in browser.

---

## 7. Environment trap: a page reload logs you out

Worth knowing before you debug a phantom auth bug.

The access token is in-memory only, re-minted on boot by a silent
`/api/auth/refresh`. That endpoint **403s any browser request whose `Origin`
isn't on the CORS allowlist** (CSRF guard, `backend/src/routes/auth.js`), and
`lib/api.ts` treats 403 like 401 → wipes the session. The allowlist does an
exact string match (`backend/src/app.js`), and `CORS_ORIGIN` in `backend/.env`
lists `http://localhost:3001` while the web dev server runs on **:3000**.

So in local dev, any full page load signs you out. It's a config mismatch, not
your code — but it's also why raw `<a>` tags are a real bug and not just a
style preference.

---

## 8. Don't

- **No git commits, pushes, or destructive DB operations.** The owner does those.
- **Don't touch `WorkspaceNav`** or build the handoff's bottom dock — deferred.
- **Prefer tokens over hex literals — but don't promote a one-off.** Anything
  that reads as palette goes in `ds-tokens.css`. A value that exists to make a
  single component work stays hardcoded in that component, with a comment saying
  why: a new token widens the palette every screen reads, which is the more
  expensive mistake. (`JlptChip` is the standing exception in the outgoing
  system.)
- **No inline `borderRadius: <px>`** on token-relevant surfaces — use a
  `--radius-*` token.
- **Don't sweep `--lgc-*`** out of screens you aren't redesigning.
- **Don't add to `shared/ui/`** — it's the outgoing set.

## 9. When the screen is done, update

- `PROJECT_CONTEXT.md` — the **Features** section: what it is, entry-point
  files, where state lives, anything non-obvious.
- `DECISIONS.md` — a short entry: decisions made, handoff details deliberately
  not built and why, what's still deferred.
- `backend-connections.txt` — any endpoint whose trigger changed or that gained
  a client helper.
- `../../../CLAUDE.md` — only if a repo-wide rule or the structure changed.
- `backend/API_ROUTES.md` + `backend/SCHEMA.md` — if the API or schema moved.
  A migration touching user data must also update
  `backend/migrations/reset_user_data.sql`.
