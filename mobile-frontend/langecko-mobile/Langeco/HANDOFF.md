# Langeco — Claude Code Handoff

**Purpose:** Replace the existing Langeco project UI with the designs in this canvas.
Visual source of truth: `Langeco Design Exploration.html` (open it locally).

**Scope of this doc:** v1 product scope, component inventory, architecture assumptions, and the list of features intentionally cut or stubbed.

---

## 1. Critical constraints

### 1.1 Use only the Default theme for v1
- Ship **only** the Default (neutral, free) theme.
- The Kanagawa / Sakura / Hanami themes in the canvas are **future work** — do not implement them now.
- **BUT**: architect the theming layer so switching is trivial later. Every color, font, border, shadow, and radius must come from CSS custom properties (design tokens), not hard-coded values. See §4.1.

### 1.2 Internationalization-ready UI
- All UI strings (labels, buttons, empty-states, errors, menu items) must go through an i18n layer from day one. No hard-coded English literals in components.
- Use a single `en.json` for v1. Structure keys by surface (e.g. `reader.toolbar.fontSize`, `decks.empty.title`).
- Content direction: the app already supports vertical RTL for the **book content** (縦書き) inside the reader. That is a reader-internal concern — it does **not** affect chrome direction.
- UI chrome stays LTR for v1. Do not wire `dir="rtl"` on the shell. But avoid CSS that would break if we did later — prefer logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`) over `margin-left` / `right` where practical.
- Leave room for variable-length translations: never truncate button text with fixed widths; use `min-width` + padding + flex, not fixed `width`. Japanese labels are typically 30–50% shorter than English; German/Portuguese ~20–40% longer. Layouts must flex.
- All Japanese display (book text, dictionary headwords, flashcard fronts) is **content**, not UI strings — it stays as-is regardless of UI language.

### 1.3 Keep the underlying components from the existing codebase
- Trash the old UI, but **reuse primitive components** where they exist (buttons, inputs, icons, modal shell, etc.). Match them to the tokens below.
- If the existing codebase has a design-system folder, migrate its primitives to the tokens in §4. Don't rewrite from scratch.

### 1.4 No backend work
- All data is local/mocked for v1. Use a simple in-memory store (Zustand / Context / whatever fits the existing codebase) seeded from a JSON fixture.
- Fixtures to seed: books, current book reader state, decks, cards, user profile, dictionary sample entries.
- EPUB import: accept an `.epub` file but just log it — don't actually parse.

---

## 2. v1 scope — per surface

Legend: ✅ ship · ⏸ defer (keep design, build later) · 🔧 dummy (UI present, action is a no-op / toast) · ❌ cut entirely

### 2.0 Themes
- ✅ Default theme only
- ❌ Kanagawa / Sakura / Hanami themes
- ✅ Theming architecture (CSS vars) so adding a theme later = ship a new token file

### 2.1 Library
- ✅ Grid of books (cover, title, author, progress bar, last-read date)
- ✅ "Import EPUB" primary action (🔧 dummy — accepts file, no parsing)
- ✅ Empty-state reserved area for future reading stats
- ✅ Per-book progress % on cover
- ❌ Search bar
- ❌ Filter chips
- ❌ Sort dropdown
- ✅ Book cover art (use placeholder art — see §3.3)

### 2.2 Reader
- ✅ Horizontal mode (default)
- ✅ Vertical RTL mode (縦) toggle — this is content direction, always available
- ✅ Floating bottom toolbar (collapsed by default)
- ✅ Expanded toolbar: font size, line height, font family, margin, 横/縦 toggle
- ✅ Tap word → selection highlight
- ✅ Selection context menu: Define, Flashcard, Copy, Highlight
- ✅ Highlighted words visible in-text
- ✅ Progress bar **at top** (not bottom — per user spec)
- ✅ Back to library
- ✅ Bookmark current position (🔧 dummy persistence — localStorage is fine)
- ⏸ Table of contents drawer
- ❌ Inline furigana (ruby) rendering for v1
- ❌ "Translate with DeepL" in selection menu
- ❌ Theme toggle in reader toolbar (no themes in v1)

### 2.3 Modular workspace
- ✅ Collapsible left icon-rail navbar (expand on hover/pin)
- ✅ Top pane bar with chips (one per live pane)
- ✅ Drag chip to reorder panes
- ✅ "+ Add pane" button
- ✅ 1 / 2 / 3 panes side-by-side
- ✅ Reader, Dictionary, Decks panes (compact versions of full-page surfaces)
- ✅ Save workspace button (🔧 dummy)
- ✅ Layouts preset button (🔧 dummy or cut — your call)
- ❌ Number badge on each chip (drop the "1", "2", "3")
- ❌ Green "live" dot indicator
- ✅ Keep the color dot per pane type (it's the chip's identity, not a status)
- ✅ ⇄ arrows between chips (as reorder affordance)

### 2.4 Dictionary
- ✅ Search input (Japanese / romaji / English)
- ✅ Result rows: JP term, reading, English gloss
- ✅ Highlighted query match in results
- ✅ Entry detail: large headword + reading
- ✅ Numbered meanings list
- ✅ Kanji breakdown cards (音 on-yomi, 訓 kun-yomi per kanji)
- ✅ "Add flashcard" button
- ❌ Filter sidebar (JLPT, POS, recents, saved) — defer; leave sidebar slot in layout but don't render it
- ❌ JLPT chip on result rows and detail header
- ❌ Audio pronunciation button
- ❌ Save/bookmark word
- ❌ Example sentence from book (context box in detail)
- ❌ "Translate with DeepL" button in dictionary

### 2.5 Decks overview
- ✅ **Option A — visual grid only** (per user choice)
- ✅ Card grid with cover gradient + large kanji glyph
- ✅ Deck name, description, card count
- ✅ "New deck" CTA
- ❌ Option B (hero + list) — REMOVED from canvas + decks.jsx (2026-04-18)
- ❌ Due-count badge per deck
- ❌ 3 mini-card previews per tile (simplify: cover + name + count only)

### 2.6 Deck detail
- ✅ Breadcrumb
- ✅ Deck header: cover, name, description, **total card count only**
- ✅ "Study now" primary CTA
- ✅ Card grid **or** list view (keep the toggle)
- ✅ Card state chips (new / learning / mastered) on cards
- ✅ Click card → edit modal
- ✅ Edit modal fields: **front (JP), reading, back (meaning), deck**
- ✅ Add card button
- ✅ Deck settings: rename, delete
- ❌ Info bar with "X new / Y learning / Z due today" breakdown
- ❌ Due-today surfacing anywhere
- ❌ Example sentence field in edit modal
- ❌ Tags field in edit modal
- ❌ Audio field in edit modal
- ❌ Card learning-level editing (can show the chip, can't change it from edit modal)
- ❌ Export deck option

### 2.7 Study session
- ✅ Progress bar (X/Y)
- ✅ Front card: JP, tap to reveal
- ✅ Context toggle (show sentence from book on/off) — keep the toggle; when off, no context box
- ✅ Context box (when toggled on): original sentence with word highlighted, source book + chapter
- ✅ Back card: reading, meaning, context
- ✅ Two-button rating: **Don't know it** / **I know it**
- ✅ Tap/click to flip (no keyboard shortcut labels shown)
- ✅ Session summary: cards reviewed, % known, "nice work" message
- ✅ "Study again" / "Back to deck" actions
- ❌ SRS scheduling (the app just cycles "don't know" cards back into the session; "I know" removes from current session)
- ❌ Time-spent metric on summary
- ❌ Streak messaging

### 2.8 Auth
- ✅ Split layout: form left, brand panel right (neutral art — no kamon in Default theme; use a simple brand mark)
- ✅ **Login:** username + password + sign in
- ✅ **Signup:** username + password + confirm
- ✅ "Continue with Google" button (🔧 dummy — no-op)
- ✅ "Continue with Apple" button (🔧 dummy — no-op)
- ❌ Email field (username-only for v1 per user spec)
- ❌ "Remember me" checkbox
- ❌ "Forgot password" link
- ❌ Native-language picker in signup
- ⏸ Theme-aware brand glyph (will matter once themes ship)

### 2.9 Profile
- ✅ Avatar (kamon monograms demo set — keep the 16-glyph picker as the v1 avatar source)
- ✅ Display name + handle
- ✅ Account section: username, language
- ✅ Currently reading section (cover + progress)
- ✅ Avatar picker modal (16-glyph grid)
- ✅ Edit profile button
- ✅ Sign out
- ❌ Level indicator
- ❌ Shared decks section (single-user only for v1)
- ❌ Streak
- ❌ Email in account section
- ❌ Theme selector in account section (no themes)

### 2.10 Cross-cutting
- ❌ Settings page (🔧 if a nav entry exists, it opens a "Coming soon" empty state)
- ❌ Keyboard shortcuts — defer to next iteration. Don't show kbd hints in the UI.
- ❌ Offline mode
- ❌ Sync
- ❌ Notifications

---

## 3. Architecture

### 3.1 Tech stack (preserve the existing project's choices unless blocking)
- React + TypeScript (assumed — adjust if existing project differs)
- Tailwind or CSS modules — whichever is already there
- State: Zustand or Context + reducer — whichever is already there
- Router: whatever is already there
- No new backend

### 3.2 Route map

```
/                     → Library (home)
/reader/:bookId       → Reader
/workspace            → Modular workspace (default panes: reader + dict)
/dictionary           → Full-page dictionary (search + detail)
/decks                → Decks overview
/decks/:deckId        → Deck detail
/decks/:deckId/study  → Study session
/profile              → Profile
/auth/login           → Login
/auth/signup          → Signup
/settings             → "Coming soon" placeholder
```

### 3.3 Asset strategy
- Book covers: render as CSS gradients + large kanji glyph (match the canvas — `linear-gradient(135deg, <color>, darker)` + 1 large char). No real cover images in v1.
- Kamon avatars: render as SVG monograms (16 in a fixture file). One canonical list.
- App brand mark in Default theme: a simple `語` glyph in a rounded square, accent color background. No cultural/thematic imagery.

### 3.4 Data model (fixtures)

```ts
// Seed these in /src/fixtures/*.ts

type Book = {
  id: string;
  title: string;          // Japanese title
  titleLatin?: string;    // optional romanization for display
  author: string;
  coverColor: string;     // hex, used for gradient
  coverGlyph: string;     // single CJK char
  totalPages: number;
  currentPage: number;
  lastReadAt: string;     // ISO
  chapters: { id: string; title: string; startPage: number }[];
  // Book text: keep as array of paragraphs (strings) per chapter.
  // For v1, seed one real excerpt (Kokoro Ch.1) + 2 stub books.
};

type Deck = {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  coverGlyph: string;
  cardIds: string[];
};

type Card = {
  id: string;
  deckId: string;
  front: string;          // JP headword
  reading: string;        // kana
  back: string;           // meaning, English
  state: 'new' | 'learning' | 'mastered';
  sourceBookId?: string;
  sourceChapterId?: string;
  sourceSentence?: string;  // used by study context toggle
};

type User = {
  username: string;
  displayName: string;
  handle: string;
  avatarId: string;         // references kamon fixture
  language: 'en' | 'ja';    // UI language
  currentBookId?: string;
};

type DictionaryEntry = {
  id: string;
  headword: string;
  reading: string;
  meanings: string[];       // plain strings, numbered in UI
  kanji: { char: string; on: string; kun: string }[];
};
```

### 3.5 Component inventory
Map each design file in the canvas to its runtime component:

| Canvas file         | Runtime component(s)                              |
|---------------------|---------------------------------------------------|
| `shell.jsx`         | `<LibraryShell>` (home / library page)            |
| `reader.jsx`        | `<Reader>`, `<ReaderToolbar>`, `<SelectionMenu>`  |
| `dictionary.jsx`    | `<DictionarySearch>`, `<DictionaryDetail>`        |
| `decks.jsx`         | `<DecksOverviewA>` (only A), `<DeckDetail>`, `<CardEditModal>` |
| `study.jsx`         | `<StudyFront>`, `<StudyBack>`, `<StudySummary>`   |
| `auth.jsx`          | `<LoginPage>`, `<SignupPage>`, `<AuthBrandPanel>` |
| `profile.jsx`       | `<ProfilePage>`, `<AvatarPickerModal>`            |
| `modular.jsx`       | `<ModularWorkspace>`, `<PaneBar>`, `<NavRail>`, `<ReaderPane>`, `<DictPane>`, `<DecksPane>` |
| `icons.jsx`         | Icon set — port as-is                             |
| `book-data.jsx`     | Seed fixture content                              |

---

## 4. Theming architecture (mandatory even though only Default ships)

### 4.1 Token layer
Define all visual properties as CSS custom properties on `:root` (Default) with a `[data-theme="X"]` override pattern ready:

```css
:root,
[data-theme="default"] {
  /* Backgrounds */
  --bg:            #FAFAF9;
  --bg-elev:       #FFFFFF;
  --bg-sunken:     #F2F1EE;

  /* Foregrounds */
  --fg:            #1A1918;
  --fg-muted:      #6B6966;
  --fg-subtle:    #A8A5A0;

  /* Borders */
  --border:        #E5E3DE;
  --border-strong: #D4D2CE;

  /* Accent (primary action) */
  --accent:        #D97757;
  --accent-soft:   rgba(217, 119, 87, 0.12);
  --accent-fg:     #FFFFFF;

  /* Type */
  --font-ui:      'Inter', system-ui, sans-serif;
  --font-display: 'Source Serif 4', 'Shippori Mincho', serif;  /* used for JP + titles */
  --font-reader:  'Source Serif 4', 'Shippori Mincho', serif;
  --font-mono:    'Geist Mono', ui-monospace, monospace;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.12);
}
```

### 4.2 Future themes (do not build, just reserve)
When themes ship later, each adds a block like:

```css
[data-theme="kanagawa"] {
  --bg: #EDE6D3;
  /* ...override any subset of the tokens... */
}
```

Theme is switched by setting `data-theme` on `<html>`. No component code changes.

### 4.3 Rules
- **No hex values in components.** Every color comes from a token.
- **No `font-family` literals in components.** Use tokens.
- **No pixel-value radii in components.** Use tokens.
- **Shadows and borders** also tokenized.
- If a one-off color is genuinely needed, add a new token to the Default theme and document why.

---

## 5. i18n architecture

### 5.1 Library
- Use `react-i18next` or `next-intl` depending on stack.
- Namespace per surface: `reader`, `library`, `decks`, `dict`, `study`, `auth`, `profile`, `common`.

### 5.2 String file shape
```json
{
  "common": {
    "back": "Back",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete"
  },
  "library": {
    "title": "Library",
    "importEpub": "Import EPUB",
    "emptyStats": "Reading stats · coming later"
  },
  "reader": {
    "toolbar": {
      "fontSize": "Size",
      "lineHeight": "Line height",
      "toggleVertical": "Vertical"
    }
  }
}
```

### 5.3 Rules
- Every string rendered in a component goes through `t('key')`.
- Japanese **content** (book text, dictionary headwords, kanji on/kun readings, flashcard fronts) is never translated — it's data, not UI.
- Dates: use the user's locale via `Intl.DateTimeFormat`.
- Numbers: use `Intl.NumberFormat`.
- Don't use English-assumption sentence construction. Bad: `{count} + " cards"`. Good: `t('decks.cardCount', { count })` with ICU plural.

### 5.4 Layout implications
- Every button, chip, and label uses flex + padding, not fixed width.
- Truncation only on long user-entered strings (book titles, deck names) via `text-overflow: ellipsis` with `title` attribute.
- Test every screen with a fake-long locale (German or Portuguese) before shipping.

---

## 6. What to do with the existing codebase

1. Keep: the build config (Vite/Next/etc.), the router setup, any existing primitives (`Button`, `Input`, `Modal`, `Icon`).
2. Migrate primitives to use the token layer in §4.1.
3. Delete: existing screens / pages / flows. Replace with the surfaces in §2.
4. Port: the canvas's `.jsx` component files as the basis for real components — but as TS, with the tokens, with i18n keys, and wired to the fixture store.
5. Fixtures in `/src/fixtures/` — one `.ts` file per entity (books, decks, cards, user, dictionary).

---

## 7. Definition of done for v1

- [ ] All surfaces in §2 ship with ✅ features, nothing more.
- [ ] Every color, font, radius, shadow comes from a CSS variable.
- [ ] `[data-theme="default"]` is set on `<html>`; swapping to another value doesn't crash (even though no other theme exists yet).
- [ ] Every UI string is keyed; `en.json` is complete.
- [ ] No English string hard-coded in a component.
- [ ] Japanese content renders with the correct fonts on all platforms.
- [ ] Vertical RTL reader mode works.
- [ ] All dummy buttons (Google/Apple auth, settings, import EPUB, save workspace) are wired to visible no-op feedback (toast or disabled state).
- [ ] Fixture data seeds on first load; state persists to localStorage within session.
- [ ] No console errors or warnings on any route.

---

## 8. Open questions for Claude Code

1. Does the existing project use Tailwind, CSS Modules, or vanilla CSS? The token layer works with all three — just wire it appropriately.
2. Current router (React Router / Next App Router / TanStack Router)?
3. Is there a design-primitive library already (shadcn/ui, etc.)? If so, retheme it via tokens instead of hand-rolling.
4. Should the fixture store persist to localStorage (so edits survive reload) or reset on every page load?

---

## 9. Source of truth

- **Visuals:** `Langeco Design Exploration.html` — every pane, state, and interaction is drawn there. When in doubt, match the canvas pixel-for-pixel **in the Default theme only**.
- **Scope:** this document.
- **Conflicts:** this document wins.
