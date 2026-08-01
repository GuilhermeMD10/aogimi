/**
 * Public API of the dictionary feature.
 *
 * `DictionaryView` is the `/dictionary` route — the redesigned surface, one
 * route with an empty state and a rail-plus-entry state chosen by `?q=`.
 * `DictionarySidekick` and `WordDetailView` are the reader's docked lookup and
 * its detail pane; they still read the outgoing `--lgc-*` palette and go when
 * the reader is redesigned.
 */
export { default as DictionaryView } from './views/DictionaryView';
export { DictionarySidekick } from './views/DictionarySidekick';
export { default as WordDetailView } from './views/WordDetailView';
export { DictionaryStateProvider, useDictionaryState } from './providers/DictionaryStateProvider';
export { preferredHeadword } from './lib/headword';
export { getWordDetails } from './lib/dictApi';
export { getRecentSearches } from './lib/storage';
export type { RecentSearchItem } from './lib/storage';
