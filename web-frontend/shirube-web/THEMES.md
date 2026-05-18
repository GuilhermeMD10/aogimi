# Langeco Web — Theme & Font Reference

[components/providers/ThemeProvider.tsx](components/providers/ThemeProvider.tsx)'s `THEMES` record is the **single source of truth** for which themes exist. `AppTheme`, the registry keys in [themes/index.ts](themes/index.ts), the storage validator, and the pre-hydration script in [app/layout.tsx](app/layout.tsx) are all derived from it. Adding a theme is one record entry + one CSS file.

Themes are exposed by setting a `data-theme="…"` attribute on `<html>`. A pre-hydration `<script>` in `app/layout.tsx` reads the persisted theme from localStorage and applies the attribute *before paint*, so there is no flash-of-default-theme on cold load.

The token system is two layers:
1. **Raw CSS variables** — `--lgc-bg`, `--lgc-fg`, … — defined per-theme inside `html[data-theme="…"]` blocks.
2. **Tailwind tokens** — `@theme inline { --color-lgc-bg: var(--lgc-bg); … }` in `globals.css` exposes them as Tailwind classes (`bg-lgc-bg`, `text-lgc-fg-muted`, `border-lgc-border`, etc).

Components use both forms: most surfaces use Tailwind classes (`className="bg-lgc-bg-elev text-lgc-fg"`); a few use raw CSS (`style={{ background: 'var(--lgc-bg)' }}`) — both resolve to the same source.

shadcn primitives ([components/ui/](components/ui/)) inherit automatically because `--color-card`, `--color-primary`, `--color-border`, etc. in the same `@theme inline` block re-point at `--lgc-*`. You don't need to retheme shadcn separately.

---

## Dispatch decision rule

When you need a component to look different under a theme, pick the *cheapest* option that works. Reach for the next level only when the current one can't express the variation.

| Variation | Mechanism | Where it lives |
|---|---|---|
| Color, font, font-size/weight, border, shadow, radius, padding, letter-spacing, text-transform | **Shape token** | `styles/shape-defaults.css` for the default value, `styles/themes/<theme>.css` to override |
| Surface (card, popover, modal frame), button, chip, section label | **Primitive class** that reads shape tokens | `styles/primitives.css` (`.lgc-card`, `.lgc-button`, `.lgc-button-secondary`, `.lgc-chip`, `.lgc-section-label`) |
| Decorative atoms a single theme adds (HankoSeal, Postmark, Denomination, …) | **Theme-decoration component**, conditionally rendered with `<ThemedDecoration theme="…">` | `components/theme-decorations/<theme>/<X>.tsx` |
| Whole layout / structural divergence (different page tree, different copy, different motion choreography) | **Registry slot** dispatched via `useThemedComponent` | `themes/<theme>/<…mirror of components path>/<X>.tsx`, registered in `themes/index.ts` |

If you find yourself forking a screen via the registry to change a card border or a button shadow, **stop**. That's a shape token (or a primitive that reads one). The registry is for cases where the visual tree itself diverges — different sections, different layout, different motion choreography. If two registry variants of the same component differ by 1–5 lines, the right move is to pull those lines into a shape token, refactor the default to read the token, and delete the variant.

Common shape-token axes:

- Surface: `--lgc-surface-*` (bg, border-color, border-width, border-style, radius, shadow)
- Primary button: `--lgc-button-*` (bg, fg, padding, font-family, font-size, font-weight, letter-spacing, text-transform, border-*, radius, shadow)
- Secondary button: `--lgc-button-secondary-*` (bg, fg, border-color, border-width, hover-bg)
- Chip: `--lgc-chip-*`
- Toolbar: `--lgc-toolbar-*` (bg, backdrop-filter, button-radius, button-tracking, button-text-transform, button-font-family)
- Pressable interaction: `--lgc-press-*` (transform-hover/active, shadow-hover/active)
- Section label / numerals: `--lgc-section-label-*`, `--lgc-section-num-*`, `--lgc-meaning-num-*`
- Dividers / readings: `--lgc-divider-style`, `--lgc-row-reading-*`, `--lgc-kanji-meanings-*`
- Form atoms: `--lgc-input-radius`, `--lgc-kbd-radius`, `--lgc-icon-button-radius`, `--lgc-pill-radius`
- Fonts: `--lgc-font-{display,ui,mono,jp,body}`

Adding a new shape axis = (1) declare it in `shape-defaults.css`, (2) consume it in the primitive or component, (3) override per-theme in `styles/themes/<theme>.css` only when the visual identity demands it.

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

1. **Add a record entry** in `THEMES` ([components/providers/ThemeProvider.tsx](components/providers/ThemeProvider.tsx)) with the picker label, description, premium flag, and a swatch. `AppTheme`, the storage validator, the pre-hydration script's allow-list, the registry's keys, and `ThemeSwitcher` all derive from this record — TypeScript will fail the build if anything else is out of sync.
2. **Drop a CSS file** at `styles/themes/<name>.css` with a single `html[data-theme="<name>"] { … }` block that declares every `--lgc-*` color token (and optionally any shape-token overrides). Import it in `app/globals.css` next to the existing themes. Tokens you don't override fall through to `shape-defaults.css`.
3. **Register a stamp in `themes/index.ts`** with an empty `{}` if the theme is colors-only. Add registry entries only when a screen needs a *whole-tree* override that shape tokens can't express (see the dispatch rule above).
4. **shadcn primitives** auto-inherit because the `--color-*` aliases in `@theme inline` chain through `--lgc-*`. No retheming needed.
5. **Verify** by toggling to the new theme and walking every screen. Components don't carry hex literals, so a complete palette is enough.
