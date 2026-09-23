/**
 * Public API of the dictionary feature.
 *
 * `DictionaryView` is the `/dictionary` route — one route with an empty state
 * and a rail-plus-entry state chosen by `?q=`.
 *
 * Everything below the route is exported because the reader's lookup surfaces
 * are built out of these pieces rather than out of copies of them: the docked
 * column in `features/books/reader/dict-sidebar/` and the modal in
 * `features/books/reader/reader-modal/` render the same rows and the same
 * entry (the modal at `scale="full"`, the column at `"compact"`), so the two
 * screens can't drift apart. The rows,
 * the list and the entry panes are all fully controlled — a `selected` boolean
 * and callbacks — so a surface that keeps its selection in local state and one
 * that keeps it in the URL use them identically.
 */

// ── The route ───────────────────────────────────────────────────────────────
export { default as DictionaryView } from './views/DictionaryView';

// ── Shared state ────────────────────────────────────────────────────────────
export { DictionaryStateProvider, useDictionaryState } from './providers/DictionaryStateProvider';

// ── Results ─────────────────────────────────────────────────────────────────
export { RailList } from './components';
// The rows themselves (`WordRow`, `KanjiRow`) are `RailList`'s to render; no
// surface composes them directly, so they stay inside the feature.

// ── The entry ───────────────────────────────────────────────────────────────
export { EntryDetail } from './components';
export { KanjiEntryDetail } from './components';
export { KanjiCard } from './components';
export { SectionLabel } from './components';
// `JlptChip` moved to `shared/components` — study is the second consumer domain
// now that cards carry `jlpt_level`. Import it from there, not from here.
export { PitchAccent } from './components';
export { ENTRY_SCALE } from './lib';
export type { EntryScale } from './lib';

// ── Search input ────────────────────────────────────────────────────────────
export { SearchField } from './components';

// ── Hooks ───────────────────────────────────────────────────────────────────
export { useWordDetails } from './hooks';
export { useRecentSearches } from './hooks';
export { useSelectionKeys } from './hooks';

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
} from './lib';
export type { RailContents, SurfaceEntry } from './lib';
export { preferredHeadword } from './lib';
export { inflectionNote } from './lib';
// The builders live here; the `CardDraft` type they produce belongs to
// `features/sky/stage`, which is where its consumer chain ends. `cardBack` is
// the one place a draft becomes the flattened `cards.back` string.
export { cardBack, kanjiCardDraft, wordCardDraft } from './lib';
export { getWordDetails, searchDictionary } from './lib';
export { getRecentSearches } from './lib';
export type { RecentSearchItem } from './lib';

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
