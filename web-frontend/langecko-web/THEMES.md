# Langeco Web — Theme & Font Reference

Source of truth: [app/globals.css](app/globals.css). Themes are exposed by setting a `data-theme="…"` attribute on `<html>` (see [app/layout.tsx](app/layout.tsx) for the default, and [components/providers/ThemeProvider.tsx](components/providers/ThemeProvider.tsx) for the runtime switcher).

The token system is two layers:
1. **Raw CSS variables** — `--lgc-bg`, `--lgc-fg`, … — defined per-theme inside `:root`/`html[data-theme="…"]` blocks.
2. **Tailwind tokens** — `@theme inline { --color-lgc-bg: var(--lgc-bg); … }` in `globals.css` exposes them as Tailwind classes (`bg-lgc-bg`, `text-lgc-fg-muted`, `border-lgc-border`, etc).

Components use both forms: most surfaces use Tailwind classes (`className="bg-lgc-bg-elev text-lgc-fg"`); a few use raw CSS (`style={{ background: 'var(--lgc-bg)' }}`) — both resolve to the same source.

shadcn primitives ([components/ui/](components/ui/)) inherit automatically because `--color-card`, `--color-primary`, `--color-border`, etc. in the same `@theme inline` block re-point at `--lgc-*`. You don't need to retheme shadcn separately.

---

## Theme palettes

### Default — `data-theme="default"` · light · neutral

The only theme that ships in v1; the others are designed for premium tiers.

| Token | Value | Role |
|---|---|---|
| `--lgc-bg`            | `#FAFAF9` | Page background |
| `--lgc-bg-elev`       | `#FFFFFF` | Elevated surfaces — cards, popovers, inputs |
| `--lgc-bg-sunken`     | `#F2F1EE` | Recessed surfaces — sidebar, chips, hover bg, sunken inputs |
| `--lgc-fg`            | `#1A1918` | Primary text |
| `--lgc-fg-muted`      | `#6B6966` | Secondary text |
| `--lgc-fg-subtle`     | `#A8A5A0` | Tertiary text — placeholders, captions |
| `--lgc-border`        | `#E5E3DE` | Hairline dividers |
| `--lgc-border-strong` | `#D4D2CE` | Stronger borders — buttons, inputs |
| `--lgc-accent`        | `#1A1918` | Primary action (in Default = same as `fg`) |
| `--lgc-accent-soft`   | `rgba(26,25,24,0.08)` | Tinted accent — selected states, hover |
| `--lgc-accent-fg`     | `#FFFFFF` | Text/icon riding on accent fill |
| `--lgc-success`       | `#3B7A40` | Success state |
| `--lgc-warning`       | `#B8802A` | Warning state |
| `--lgc-error`         | `#A04040` | Error state |

### Sakura — `data-theme="sakura"` · light · cherry blossoms

| Token | Value | Notes vs Default |
|---|---|---|
| `--lgc-bg`            | `#FBF4F2` | Pink-tinted page |
| `--lgc-bg-elev`       | `#FFFBFA` | Near-white, slightly cream |
| `--lgc-bg-sunken`     | `#F3E7E5` | Soft petal pink |
| `--lgc-fg`            | `#3E2A2F` | Dark mauve replaces neutral ink |
| `--lgc-fg-muted`      | `#7A5A5F` |  |
| `--lgc-fg-subtle`     | `#B09599` |  |
| `--lgc-border`        | `rgba(62,42,47,0.08)` |  |
| `--lgc-border-strong` | `rgba(62,42,47,0.16)` |  |
| `--lgc-accent`        | `#D47A8C` | **Pink — the only theme where `accent !== fg`** |
| `--lgc-accent-soft`   | `#F7DCE0` | Sakura mist |
| `--lgc-accent-fg`     | `#FFFFFF` |  |
| `--lgc-success`       | `#3B7A40` |  |
| `--lgc-warning`       | `#B8802A` |  |
| `--lgc-error`         | `#A04040` |  |

The other two themes (`kanagawa`, `hanami`) follow the same shape; full values in [app/globals.css](app/globals.css). `hanami` is the only dark theme.

---

## Where each color is used

For each token, every file path below applies one of: `bg-lgc-<token>`, `text-lgc-<token>`, `border-lgc-<token>`, `ring-lgc-<token>`, or the raw `var(--lgc-<token>)` form. Touching the value in `globals.css` propagates everywhere here.

### `bg`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/WorkspaceNav.tsx](components/WorkspaceNav.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ProfileBubble.tsx](components/page-bubbles/ProfileBubble.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/readerConstants.ts](components/reader/readerConstants.ts)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)

### `bg-elev`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ProfileBubble.tsx](components/page-bubbles/ProfileBubble.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)

### `bg-sunken`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/WorkspaceNav.tsx](components/WorkspaceNav.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/readerConstants.ts](components/reader/readerConstants.ts)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)

### `fg`
Primary text + active fills. The most-used token by far (~340 occurrences).

- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/WorkspaceNav.tsx](components/WorkspaceNav.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/AnnotationsPanel.tsx](components/reader/AnnotationsPanel.tsx)
- [components/reader/EpubReader.tsx](components/reader/EpubReader.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TocPanel.tsx](components/reader/TocPanel.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/readerConstants.ts](components/reader/readerConstants.ts)
- [components/ui/ThemeSwitcher.tsx](components/ui/ThemeSwitcher.tsx)
- [components/views/CardDeckView.tsx](components/views/CardDeckView.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)
- [components/views/cards/types.ts](components/views/cards/types.ts)

### `fg-muted`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/AnnotationsPanel.tsx](components/reader/AnnotationsPanel.tsx)
- [components/reader/EpubReader.tsx](components/reader/EpubReader.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TocPanel.tsx](components/reader/TocPanel.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/readerConstants.ts](components/reader/readerConstants.ts)
- [components/ui/ThemeSwitcher.tsx](components/ui/ThemeSwitcher.tsx)
- [components/views/CardDeckView.tsx](components/views/CardDeckView.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)

### `fg-subtle`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)

### `border`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/WorkspaceNav.tsx](components/WorkspaceNav.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ProfileBubble.tsx](components/page-bubbles/ProfileBubble.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/AnnotationsPanel.tsx](components/reader/AnnotationsPanel.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TocPanel.tsx](components/reader/TocPanel.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)
- [components/views/cards/types.ts](components/views/cards/types.ts)

### `border-strong`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckForm.tsx](components/views/cards/DeckForm.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)

### `accent`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/MainWorkspace.tsx](components/MainWorkspace.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/AnnotationsPanel.tsx](components/reader/AnnotationsPanel.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextContextMenu.tsx](components/reader/TextContextMenu.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/reader/TocPanel.tsx](components/reader/TocPanel.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/readerConstants.ts](components/reader/readerConstants.ts)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)
- [components/views/cards/types.ts](components/views/cards/types.ts)

### `accent-soft`
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/DeepLTranslationPopup.tsx](components/DeepLTranslationPopup.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/AnnotationsPanel.tsx](components/reader/AnnotationsPanel.tsx)
- [components/reader/TocPanel.tsx](components/reader/TocPanel.tsx)
- [components/reader/readerConstants.ts](components/reader/readerConstants.ts)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/PendingCardOverlay.tsx](components/views/cards/PendingCardOverlay.tsx)
- [components/views/cards/types.ts](components/views/cards/types.ts)

### `accent-fg`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/library/FsAccessBanner.tsx](components/library/FsAccessBanner.tsx)
- [components/library/RestoreLibrary.tsx](components/library/RestoreLibrary.tsx)
- [components/onboarding/OnboardingExplainer.tsx](components/onboarding/OnboardingExplainer.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/ReaderView.tsx](components/views/ReaderView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)
- [components/views/cards/StudyView.tsx](components/views/cards/StudyView.tsx)
- [components/views/cards/types.ts](components/views/cards/types.ts)

### `error`
- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/reader/AnnotationsPanel.tsx](components/reader/AnnotationsPanel.tsx)
- [components/reader/EpubReader.tsx](components/reader/EpubReader.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx)
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx)
- [components/views/DictionaryView.tsx](components/views/DictionaryView.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)
- [components/views/cards/DeckDetail.tsx](components/views/cards/DeckDetail.tsx)
- [components/views/cards/DeckList.tsx](components/views/cards/DeckList.tsx)

---

## Currently UNUSED color tokens

Declared in `globals.css` but not referenced by any component class or `var(...)` call:

- `--lgc-success` — declared per-theme but no `bg-lgc-success` / `text-lgc-success` usages found
- `--lgc-warning` — same

If you want these to actually surface, wire them into a feedback banner / form-validation component. Otherwise feel free to drop them.

---

## Shared utility classes

Defined in `globals.css` (the **SHARED PRIMITIVES** section). These are theme-aware (they read the same `--lgc-*` variables).

| Class | Defined in | Used by |
|---|---|---|
| `.lgc-card`           | globals.css:261 | `app/authenticate/page.tsx`, `app/profile/page.tsx`, `components/MainWorkspace.tsx`, `components/home/HomeView.tsx`, `components/page-bubbles/ReaderBubble.tsx`, `components/views/DictionaryView.tsx`, `components/views/ReaderView.tsx`, `components/views/WordDetailView.tsx`, `components/views/cards/DeckDetail.tsx`, `components/views/cards/DeckList.tsx`, `components/views/cards/StudyView.tsx` |
| `.lgc-chip`           | globals.css:269 | (same set) |
| `.lgc-section-label`  | globals.css:283 | (same set) |
| `.lgc-panebar`        | globals.css:292 | `components/MainWorkspace.tsx` (workspace pane bar) |
| `.lgc-panechip` (+ `.lgc-panechip-dot/-idx/-live/-ghost`) | globals.css:301 | `components/MainWorkspace.tsx` |
| `.lgc-panearrow`      | globals.css:355 | `components/MainWorkspace.tsx` |
| `.lgc-scroll`         | globals.css:388 | Custom scrollbar — opt-in |
| `.vtxt`               | globals.css:379 | Vertical Japanese text — `writing-mode: vertical-rl` |
| `.hl-1` / `.hl-2` / `.hl-3` | globals.css:368 | Reader text highlights (yellow / green / pink) |
| `.word-hover`         | globals.css:371 | Reader word-hover affordance |

---

## Fonts

Loaded via `next/font/google` in [app/layout.tsx](app/layout.tsx):

```ts
Inter            → --font-inter        (UI sans)
Source Serif 4   → --font-source-serif (display + reader serif)
Geist Mono       → --font-geist-mono   (monospace, tabular numerics)
```

Tailwind families in [globals.css](app/globals.css):

```css
--font-sans:    var(--font-inter)         → fallback to system-ui
--font-ui:      var(--font-inter)         → alias for body / chrome
--font-serif:   var(--font-source-serif)  → general serif
--font-display: var(--font-source-serif)  → headlines, hero copy
--font-reader:  var(--font-source-serif)  → reader body (alias)
--font-mono:    var(--font-geist-mono)    → tabular numerics, code-y bits
```

Fallbacks include `var(--font-shippori, 'Shippori Mincho')` for serifs, but **Shippori Mincho is not actually loaded** (no `next/font/google` import) — it only kicks in on systems that have the font installed, otherwise the chain falls through to Source Serif 4 / Georgia.

Base layer ([globals.css:412-443](app/globals.css#L412-L443)) sets:

```css
html              { font-family: var(--font-ui); }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); }
button, input, select, textarea, nav { font-family: var(--font-ui); }
body              { @apply bg-background text-foreground; }
```

So most components don't need to set a font explicitly — they get `--font-ui` (Inter) by default and `--font-display` (Source Serif 4) on headings.

### `var(--font-display)` — Source Serif 4
Explicit overrides where a serif headline is needed off the default heading tags.

- [app/authenticate/page.tsx](app/authenticate/page.tsx) — auth title, headlines
- [app/profile/page.tsx](app/profile/page.tsx) — profile titles
- [components/home/HomeView.tsx](components/home/HomeView.tsx) — hero, deck names
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx) — JP-rendered display

### `var(--font-mono)` — Geist Mono
Tabular numerics — page numbers, percentages, version strings.

- [app/authenticate/page.tsx](app/authenticate/page.tsx)
- [app/profile/page.tsx](app/profile/page.tsx)
- [components/reader/MangaReader.tsx](components/reader/MangaReader.tsx) — page indicator
- [components/reader/TextReader.tsx](components/reader/TextReader.tsx) — page indicator
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx) — font-size readout
- [components/page-bubbles/ReaderBubble.tsx](components/page-bubbles/ReaderBubble.tsx)
- [components/home/HomeView.tsx](components/home/HomeView.tsx)
- [components/library/BookList.tsx](components/library/BookList.tsx)
- [components/views/WordDetailView.tsx](components/views/WordDetailView.tsx)

### `var(--font-ui)` — Inter
Most components inherit this implicitly. Explicit references:

- [components/home/HomeView.tsx](components/home/HomeView.tsx) (lines 487, 828)

### Currently UNUSED font tokens

Declared as Tailwind tokens in `@theme inline` but no component references the `var(--font-*)` directly (they get Inter / Source Serif 4 via the base layer instead):

- `--font-sans` — alias for `--font-inter`; baked into Tailwind's default sans family
- `--font-serif` — alias for `--font-source-serif`
- `--font-reader` — alias for `--font-source-serif`; was intended for reader body but the EPUB reader injects its own font stack via `FONT_STACKS` in [components/reader/useBookStorage.ts](components/reader/useBookStorage.ts)

Drop these aliases or wire them in — they're harmless either way.

---

## Adding a new theme — checklist

1. In [app/globals.css](app/globals.css), add a new block:
   ```css
   html[data-theme="<name>"] {
     --lgc-bg:            #...;
     --lgc-bg-elev:       #...;
     /* ... every token defined in :root ... */
   }
   ```
   Don't leave any token undefined — it'll fall through to `:root` (Default) and you'll get visual mismatches.
2. Add `<name>` to the theme set used by [components/providers/ThemeProvider.tsx](components/providers/ThemeProvider.tsx) and [components/ui/ThemeSwitcher.tsx](components/ui/ThemeSwitcher.tsx).
3. shadcn primitives auto-inherit because the `--color-*` aliases in `@theme inline` chain through `--lgc-*`.
4. Verify by toggling to the new theme and walking through every screen — components shouldn't have hex literals, so a complete palette is enough.
