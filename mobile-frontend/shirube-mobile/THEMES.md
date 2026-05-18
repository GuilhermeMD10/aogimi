# Langeco Mobile — Theme & Font Reference

Source of truth: [theme/tokens.ts](theme/tokens.ts) (palettes, radius, spacing, fontSize, fontFamily). Themes are exposed via `useColors()` / `useTheme()` from [theme/ThemeContext.tsx](theme/ThemeContext.tsx) and the active theme name is persisted as `langeco_theme_name` in AsyncStorage. Every component reads colors through `useColors()` — there are **no hex literals in components** other than highlight colors and a few hardcoded blacks (documented at the bottom).

To add a new theme: copy a `PALETTES.<name>` block in `tokens.ts`, change every value, then add the new name to `THEME_NAMES`. Nothing else needs to change.

---

## Theme palettes

### Default — `default` · light · neutral

```ts
meta: { name: 'default', label: 'Default', glyph: '語', isDark: false }
```

| Token | Value | Role |
|---|---|---|
| `bg`           | `#FAFAF9` | Page / screen background |
| `bgElev`       | `#FFFFFF` | Elevated surfaces — cards, sheets, popovers |
| `bgSunken`     | `#F2F1EE` | Recessed surfaces — input bg, progress tracks, tag chips |
| `fg`           | `#1A1918` | Primary text + active fills |
| `fgMuted`      | `#6B6966` | Secondary text — labels, helpers, inactive items |
| `fgSubtle`     | `#A8A5A0` | Tertiary text — placeholders, faint metadata |
| `border`       | `rgba(26,25,24,0.08)` | Hairline dividers + card outlines |
| `borderStrong` | `rgba(26,25,24,0.14)` | Stronger outlines — toggles, button borders |
| `accent`       | `#1A1918` | Primary brand action (in Default = same as `fg`) |
| `accentSoft`   | `rgba(26,25,24,0.06)` | Tinted accent — selected chip bg, soft hover |
| `accentFg`     | `#FFFFFF` | Text/icon on top of accent fill |
| `highlight`    | `#F5E3A9` | _declared, currently unused_ |
| `success`      | `#3B7A40` | Success state |
| `warning`      | `#B8862B` | Warning state |
| `error`        | `#B84238` | Error state |
| `backdrop`     | `rgba(26,25,24,0.45)` | _declared, currently unused_ |
| `shadow`       | `rgba(26,25,24,0.08)` | _declared, currently unused_ |

### Sakura — `sakura` · light · cherry blossoms

```ts
meta: { name: 'sakura', label: 'Sakura', glyph: '桜', isDark: false }
```

| Token | Value | Notes vs Default |
|---|---|---|
| `bg`           | `#FBF4F2` | Pink-tinted page |
| `bgElev`       | `#FFFBFA` | Near-white elevated, slightly warm |
| `bgSunken`     | `#F3E7E5` | Soft petal pink |
| `fg`           | `#3E2A2F` | Dark mauve replaces deep neutral ink |
| `fgMuted`      | `#7A5A5F` | Muted mauve |
| `fgSubtle`     | `#B09599` | Faint pink-gray |
| `border`       | `rgba(62,42,47,0.08)` |  |
| `borderStrong` | `rgba(62,42,47,0.16)` |  |
| `accent`       | `#D47A8C` | **Pink — the only theme where `accent !== fg`** |
| `accentSoft`   | `#F7DCE0` | Sakura mist |
| `accentFg`     | `#FFFFFF` |  |
| `highlight`    | `#F7DCE0` |  |
| `success`      | `#5B7A5E` |  |
| `warning`      | `#C4842A` |  |
| `error`        | `#A04040` |  |
| `backdrop`     | `rgba(62,42,47,0.40)` |  |
| `shadow`       | `rgba(62,42,47,0.10)` |  |

The other two themes (`kanagawa`, `hanami`) follow the same shape and live in [theme/tokens.ts](theme/tokens.ts). `hanami` is the only dark theme (`meta.isDark = true`); components that need to flip behaviour for dark mode (e.g. [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) bg) read `useTheme().theme.meta.isDark`.

---

## Where each color is used

Every file path below is a place that reads the token via `useColors()` (or `useTheme().colors`). Touching the token in `tokens.ts` propagates everywhere here.

### `bg`
- [app/index.tsx](app/index.tsx) — splash loader
- [components/ui/Screen.tsx](components/ui/Screen.tsx) — base SafeAreaView used by every tab
- [components/placeholder/PlaceholderScreen.tsx](components/placeholder/PlaceholderScreen.tsx)
- [components/reader/ReaderScreen.tsx](components/reader/ReaderScreen.tsx) — reader root (loading / error / main)
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx)
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx)
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx)
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx)
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx) — gradient swatch in theme tile

### `bgElev`
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx)
- [components/ui/BottomSheet.tsx](components/ui/BottomSheet.tsx) — sheet body
- [components/ui/Button.tsx](components/ui/Button.tsx) — secondary variant
- [components/ui/TextField.tsx](components/ui/TextField.tsx)
- [components/reader/ReaderTopBar.tsx](components/reader/ReaderTopBar.tsx)
- [components/reader/ReaderToolbar.tsx](components/reader/ReaderToolbar.tsx) — pill toolbar
- [components/reader/readers/MangaReader.tsx](components/reader/readers/MangaReader.tsx) — manga toolbar
- [components/home/HomeScreen.tsx](components/home/HomeScreen.tsx) — import button
- [components/home/BookGridItem.tsx](components/home/BookGridItem.tsx) — missing-file badge
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx)
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx) — toggle, card surface
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx) — stat cards
- [components/decks/DecksListScreen.tsx](components/decks/DecksListScreen.tsx)
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx)
- [components/decks/DeckGridItem.tsx](components/decks/DeckGridItem.tsx)
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx)
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx)
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx)
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx)
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx)

> **Note:** [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) bypasses this token — its capsule uses a hardcoded `rgba(255,255,255,1)` / `rgba(30,24,20,1)` switched on `theme.meta.isDark`. If you want themes to control the nav fill directly, swap in `colors.bgElev`.

### `bgSunken`
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx)
- [components/reader/ReaderTopBar.tsx](components/reader/ReaderTopBar.tsx) — progress track
- [components/reader/TocSheet.tsx](components/reader/TocSheet.tsx) — pressed row bg
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx) — inactive tile bg
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx) — original-text panel
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx) — progress track
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx)
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx) — input bg
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx)
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx) — input bg
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — chip bg, mini progress track
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx) — gradient swatch
- [components/profile/AvatarPickerSheet.tsx](components/profile/AvatarPickerSheet.tsx)
- [components/dictionary/DictEntry.tsx](components/dictionary/DictEntry.tsx) — kanji card
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx) — pressed state

### `fg`
Used everywhere for primary text + active accent fills. Files:

- [app/index.tsx](app/index.tsx)
- [app/(auth)/welcome.tsx](app/\(auth\)/welcome.tsx)
- [app/(auth)/signin.tsx](app/\(auth\)/signin.tsx)
- [app/(auth)/signup.tsx](app/\(auth\)/signup.tsx)
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx)
- [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) — active pill bg fill
- [components/reader/ReaderScreen.tsx](components/reader/ReaderScreen.tsx)
- [components/reader/ReaderTopBar.tsx](components/reader/ReaderTopBar.tsx)
- [components/reader/ReaderToolbar.tsx](components/reader/ReaderToolbar.tsx)
- [components/reader/AnnotationsSheet.tsx](components/reader/AnnotationsSheet.tsx)
- [components/reader/TocSheet.tsx](components/reader/TocSheet.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx)
- [components/reader/readers/MangaReader.tsx](components/reader/readers/MangaReader.tsx)
- [components/ui/TextField.tsx](components/ui/TextField.tsx)
- [components/ui/Button.tsx](components/ui/Button.tsx)
- [components/home/HomeScreen.tsx](components/home/HomeScreen.tsx)
- [components/home/BookGridItem.tsx](components/home/BookGridItem.tsx)
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx)
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx)
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx)
- [components/decks/DecksListScreen.tsx](components/decks/DecksListScreen.tsx)
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx)
- [components/decks/DeckGridItem.tsx](components/decks/DeckGridItem.tsx)
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx)
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx)
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx)
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx)
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx)
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx)
- [components/profile/AvatarPickerSheet.tsx](components/profile/AvatarPickerSheet.tsx)
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx)
- [components/dictionary/DictDrawer.tsx](components/dictionary/DictDrawer.tsx)
- [components/dictionary/DictEntry.tsx](components/dictionary/DictEntry.tsx)
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx)
- [components/placeholder/PlaceholderScreen.tsx](components/placeholder/PlaceholderScreen.tsx)

### `fgMuted`
Secondary text. Files:

- [app/(auth)/welcome.tsx](app/\(auth\)/welcome.tsx)
- [app/(auth)/signin.tsx](app/\(auth\)/signin.tsx)
- [app/(auth)/signup.tsx](app/\(auth\)/signup.tsx)
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx)
- [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) — inactive icon color
- [components/reader/ReaderScreen.tsx](components/reader/ReaderScreen.tsx)
- [components/reader/AnnotationsSheet.tsx](components/reader/AnnotationsSheet.tsx)
- [components/reader/TocSheet.tsx](components/reader/TocSheet.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx)
- [components/ui/TextField.tsx](components/ui/TextField.tsx) — label, password toggle
- [components/home/HomeScreen.tsx](components/home/HomeScreen.tsx)
- [components/home/BookGridItem.tsx](components/home/BookGridItem.tsx) — meta line, badge
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx)
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx)
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx)
- [components/decks/DecksListScreen.tsx](components/decks/DecksListScreen.tsx)
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx)
- [components/decks/DeckGridItem.tsx](components/decks/DeckGridItem.tsx)
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx)
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx)
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx)
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx)
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx)
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx)
- [components/profile/AvatarPickerSheet.tsx](components/profile/AvatarPickerSheet.tsx)
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx)
- [components/dictionary/DictDrawer.tsx](components/dictionary/DictDrawer.tsx)
- [components/dictionary/DictEntry.tsx](components/dictionary/DictEntry.tsx)
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx)
- [components/placeholder/PlaceholderScreen.tsx](components/placeholder/PlaceholderScreen.tsx)

### `fgSubtle`
Tertiary text — placeholders, captions. Files:

- [components/reader/ReaderTopBar.tsx](components/reader/ReaderTopBar.tsx)
- [components/ui/TextField.tsx](components/ui/TextField.tsx) — placeholder
- [components/home/BookGridItem.tsx](components/home/BookGridItem.tsx) — "Not on this device"
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx) — progress label
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx)
- [components/decks/DeckGridItem.tsx](components/decks/DeckGridItem.tsx)
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx) — disabled save
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx) — placeholder
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx) — placeholders
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — section subtitles
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx) — placeholder
- [components/dictionary/DictEntry.tsx](components/dictionary/DictEntry.tsx) — meaning numbers, kanji meanings

### `border`
Hairline dividers and card outlines. Files:

- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx)
- [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx)
- [components/reader/AnnotationsSheet.tsx](components/reader/AnnotationsSheet.tsx)
- [components/reader/ReaderToolbar.tsx](components/reader/ReaderToolbar.tsx) — divider
- [components/reader/TocSheet.tsx](components/reader/TocSheet.tsx)
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx)
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx)
- [components/reader/readers/MangaReader.tsx](components/reader/readers/MangaReader.tsx)
- [components/ui/TextField.tsx](components/ui/TextField.tsx)
- [components/home/HomeScreen.tsx](components/home/HomeScreen.tsx)
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx)
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx)
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx)
- [components/decks/DecksListScreen.tsx](components/decks/DecksListScreen.tsx)
- [components/decks/DeckGridItem.tsx](components/decks/DeckGridItem.tsx)
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx)
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx)
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx)
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx)
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx)
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx)
- [components/profile/AvatarPickerSheet.tsx](components/profile/AvatarPickerSheet.tsx)
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx)
- [components/dictionary/DictDrawer.tsx](components/dictionary/DictDrawer.tsx)
- [components/dictionary/DictEntry.tsx](components/dictionary/DictEntry.tsx)
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx)

### `borderStrong`
Outlines that need to be visible (toggles, button strokes). Files:

- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx) — find button
- [components/ui/BottomSheet.tsx](components/ui/BottomSheet.tsx) — drag handle
- [components/ui/Button.tsx](components/ui/Button.tsx) — secondary border
- [components/reader/ReaderToolbar.tsx](components/reader/ReaderToolbar.tsx) — pill border
- [components/reader/readers/MangaReader.tsx](components/reader/readers/MangaReader.tsx)
- [components/home/BookGridItem.tsx](components/home/BookGridItem.tsx) — missing-file badge
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx) — toggle off state
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx)

### `accent`
The brand accent. In Default it equals `fg`; in Sakura/Hanami it diverges.

- [components/reader/ReaderTopBar.tsx](components/reader/ReaderTopBar.tsx) — bookmarked indicator
- [components/reader/ReaderToolbar.tsx](components/reader/ReaderToolbar.tsx) — active button label
- [components/reader/AnnotationsSheet.tsx](components/reader/AnnotationsSheet.tsx) — active tab underline
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx) — selected theme tile border
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx) — language tag
- [components/reader/readers/MangaReader.tsx](components/reader/readers/MangaReader.tsx) — active button label
- [components/ui/Button.tsx](components/ui/Button.tsx) — primary bg
- [components/ui/BrandGlyph.tsx](components/ui/BrandGlyph.tsx) — logo background
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — avatar edit pip
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx) — active theme border
- [components/profile/AvatarPickerSheet.tsx](components/profile/AvatarPickerSheet.tsx) — selected glyph border + glow
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx) — search-match highlight color

### `accentSoft`
Tinted accent for selected/hover states.

- [components/reader/ReaderToolbar.tsx](components/reader/ReaderToolbar.tsx) — active button bg
- [components/reader/readers/MangaReader.tsx](components/reader/readers/MangaReader.tsx)
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx) — language tag bg
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx) — check circle bg
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx) — "due" state bg
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — joined-date chip

### `accentFg`
Text/icon riding on top of accent fill.

- [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) — active tab icon + label
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx) — selected font/lh tile text
- [components/ui/Button.tsx](components/ui/Button.tsx) — primary label
- [components/ui/BrandGlyph.tsx](components/ui/BrandGlyph.tsx) — logo glyph
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx) — selected deck chip
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — avatar glyph + JLPT chip

### `success`
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx) — file-found checkmark
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx) — "mastered" state

### `warning`
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx) — "learning" state

### `error`
- [app/(auth)/signin.tsx](app/\(auth\)/signin.tsx) / [signup.tsx](app/\(auth\)/signup.tsx) — auth errors
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx)
- [components/home/HomeScreen.tsx](components/home/HomeScreen.tsx)
- [components/decks/DecksListScreen.tsx](components/decks/DecksListScreen.tsx)
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx)
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx)
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx)
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx)
- [components/dictionary/DictDrawer.tsx](components/dictionary/DictDrawer.tsx)

---

## Currently UNUSED color tokens

These are declared in `theme/tokens.ts` but no component reads them. Either wire them in or drop them from `ThemeColors`:

| Token | Current substitute |
|---|---|
| `highlight` | Reader uses its own `HIGHLIGHT_COLORS` map in [lib/readerStorage.ts](lib/readerStorage.ts) (yellow/green/blue) |
| `backdrop`  | [components/ui/BottomSheet.tsx](components/ui/BottomSheet.tsx) hardcodes `'rgba(0,0,0,0.35)'` |
| `shadow`    | Every component uses `'#000'` for `shadowColor` |

---

## Fonts

Loaded in [app/_layout.tsx](app/_layout.tsx) via `useFonts` from `@expo-google-fonts/lora`. JP system stacks are picked at runtime in [theme/tokens.ts](theme/tokens.ts) via `Platform.select(...)`.

### `fontFamily.ui`
`System` (iOS) · `Roboto` (Android) · `System` (web) — the OS-native UI sans.

- [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) — pill tab labels
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx) — system-font preview tile
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx) — header action labels
- [components/decks/NewDeckSheet.tsx](components/decks/NewDeckSheet.tsx)
- [components/decks/DeckGridItem.tsx](components/decks/DeckGridItem.tsx)

### `fontFamily.display` → `Lora_600SemiBold`
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx)
- [components/placeholder/PlaceholderScreen.tsx](components/placeholder/PlaceholderScreen.tsx)

### `fontFamily.displayBold` → `Lora_700Bold`
The big serif page titles ("Reader", "Dictionary", deck names, hero copy).

- [app/(auth)/welcome.tsx](app/\(auth\)/welcome.tsx) — welcome headline
- [app/(auth)/signin.tsx](app/\(auth\)/signin.tsx) — title
- [app/(auth)/signup.tsx](app/\(auth\)/signup.tsx) — title
- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx) — hero
- [components/home/HomeScreen.tsx](components/home/HomeScreen.tsx) — "Reader" tab heading
- [components/decks/DecksListScreen.tsx](components/decks/DecksListScreen.tsx) — "Decks" heading
- [components/decks/DeckDetailScreen.tsx](components/decks/DeckDetailScreen.tsx) — deck title
- [components/dictionary/DictionaryScreen.tsx](components/dictionary/DictionaryScreen.tsx) — title
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — display name
- [components/study/StudySummary.tsx](components/study/StudySummary.tsx) — summary headline + stat values

### `fontFamily.jp` → `Hiragino Mincho ProN` (iOS) · `NotoSerifJP-Regular` (Android)
Japanese mincho serif — used wherever real JP content is shown for a literary feel.

- [app/(auth)/onboarding.tsx](app/\(auth\)/onboarding.tsx) — book row title
- [components/ui/BrandGlyph.tsx](components/ui/BrandGlyph.tsx) — brand glyph
- [components/reader/DeepLPopup.tsx](components/reader/DeepLPopup.tsx) — original-text panel
- [components/reader/TypographyPanel.tsx](components/reader/TypographyPanel.tsx) — JP-font preview tiles
- [components/home/BookCover.tsx](components/home/BookCover.tsx) — cover glyph fallback
- [components/home/BookGridItem.tsx](components/home/BookGridItem.tsx) — book titles
- [components/home/ContinueReadingCard.tsx](components/home/ContinueReadingCard.tsx) — book title
- [components/study/StudyScreen.tsx](components/study/StudyScreen.tsx) — front, reading, back
- [components/decks/CardEditSheet.tsx](components/decks/CardEditSheet.tsx) — JP inputs (front, reading)
- [components/decks/CardGridItem.tsx](components/decks/CardGridItem.tsx) — front, reading
- [components/decks/DeckCover.tsx](components/decks/DeckCover.tsx) — deck cover glyph
- [components/flashcards/FlashcardDrawer.tsx](components/flashcards/FlashcardDrawer.tsx) — JP inputs
- [components/profile/ProfileScreen.tsx](components/profile/ProfileScreen.tsx) — avatar glyph, currently-reading title
- [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx) — theme glyph
- [components/profile/AvatarPickerSheet.tsx](components/profile/AvatarPickerSheet.tsx) — kamon glyph
- [components/dictionary/DictDrawer.tsx](components/dictionary/DictDrawer.tsx) — term header
- [components/dictionary/DictEntry.tsx](components/dictionary/DictEntry.tsx) — headword, reading, kanji
- [components/dictionary/DictResultRow.tsx](components/dictionary/DictResultRow.tsx) — headword, reading

### Currently UNUSED font tokens

| Token | Resolves to | Notes |
|---|---|---|
| `fontFamily.reader`       | `Lora_400Regular`         | Intended for reader body, but the EPUB reader passes its own font stack via `READER_FONT_STACKS` in [lib/readerStorage.ts](lib/readerStorage.ts) |
| `fontFamily.readerItalic` | `Lora_400Regular_Italic`  | Same — ride along if you wire up reader-body italics |
| `fontFamily.jpSans`       | `Hiragino Sans` / `NotoSansJP-Regular` | Declared but no component requests sans-serif JP yet |

---

## Adding a new theme — checklist

1. Open [theme/tokens.ts](theme/tokens.ts) and add a new entry under `PALETTES`. Copy any existing palette as a starting point; replace **every** value (don't leave a token blank — `useColors()` will return `undefined` and crash).
2. Add the new name to `THEME_NAMES` (export array).
3. If the theme is dark, set `meta.isDark = true` so [components/navigation/PillNav.tsx](components/navigation/PillNav.tsx) flips its capsule tint.
4. Optionally set a `meta.glyph` (single kanji shown in the theme picker tile).
5. The theme automatically appears in [components/profile/ThemePicker.tsx](components/profile/ThemePicker.tsx) (it iterates `listThemes()`).
6. Verify by switching to the new theme and walking through every screen — there are no hex literals in components except those documented under "Currently UNUSED" above, so a complete palette is enough.
