/**
 * Public API of the dictionary feature.
 *
 * `DictionaryView` is the `/dictionary` route — one route with an empty state
 * and a rail-plus-entry state chosen by `?q=`.
 *
 * Everything below the route is exported because the reader's lookup surfaces
 * are built out of these pieces rather than out of copies of them: the docked
 * column in `features/books/reader/dict-sidebar/` and the bubble in
 * `features/books/reader/reader-bubble/` render the same rows and the same
 * entry (at `scale="compact"`), so the two screens can't drift apart. The rows,
 * the list and the entry panes are all fully controlled — a `selected` boolean
 * and callbacks — so a surface that keeps its selection in local state and one
 * that keeps it in the URL use them identically.
 *
 * Nothing here reads the retired `--lgc-*` palette any more. `DictionarySidekick`
 * and `WordDetailView` — the reader's old lookup column and its detail pane, the
 * last two files that did — are gone, replaced by the reader's own
 * `dict-sidebar/` built out of these pieces.
 */

// ── The route ───────────────────────────────────────────────────────────────
export { default as DictionaryView } from './views/DictionaryView';

// ── Shared state ────────────────────────────────────────────────────────────
export { DictionaryStateProvider, useDictionaryState } from './providers/DictionaryStateProvider';

// ── Results ─────────────────────────────────────────────────────────────────
export { RailList } from './components/RailList';
export {
  WordRow,
  KanjiRow,
  ClassPill,
  AddButton,
  ROW_SHELL,
  ROW_IDLE,
  ROW_SELECTED,
  ROW_FOCUS,
} from './components/ResultRow';

// ── The entry ───────────────────────────────────────────────────────────────
export { EntryDetail } from './components/EntryDetail';
export { KanjiEntryDetail } from './components/KanjiEntryDetail';
export { KanjiCard } from './components/KanjiCard';
export { SectionLabel } from './components/SectionLabel';
export { JlptChip } from './components/JlptChip';
export { PitchAccent } from './components/PitchAccent';
export { ENTRY_SCALE } from './lib/entryScale';
export type { EntryScale } from './lib/entryScale';

// ── Search input ────────────────────────────────────────────────────────────
export { SearchField } from './components/SearchField';

// ── Hooks ───────────────────────────────────────────────────────────────────
export { useWordDetails } from './hooks/useWordDetails';
export { useRecentSearches } from './hooks/useRecentSearches';
export { useSelectionKeys } from './hooks/useSelectionKeys';

// ── Pure helpers ────────────────────────────────────────────────────────────
export {
  EMPTY_RAIL,
  contextForEntry,
  railContents,
  resolveSelection,
  sameSelection,
  selectionOrder,
  selectionParam,
  surfaceEntry,
} from './lib/results';
export type { RailContents, SurfaceEntry } from './lib/results';
export { preferredHeadword } from './lib/headword';
export { inflectionNote } from './lib/inflection';
export { kanjiCardDraft, wordCardDraft } from './lib/cardDraft';
export type { CardDraft } from './lib/cardDraft';
export { getWordDetails, searchDictionary } from './lib/dictApi';
export { getRecentSearches } from './lib/storage';
export type { RecentSearchItem } from './lib/storage';

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  DetailsResponse,
  ExampleSentence,
  Inflection,
  KanjiInfo,
  NameResult,
  ReaderContext,
  SearchResponse,
  Selection,
  WordMeaning,
  WordReading,
  WordResult,
} from './types';
