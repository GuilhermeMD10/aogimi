export { default as DictionaryView } from './views/DictionaryView';
export { DictionarySidekick } from './views/DictionarySidekick';
export { default as WordDetailView, preferredHeadword } from './views/WordDetailView';
export { DictionaryStateProvider, useDictionaryState } from './providers/DictionaryStateProvider';
export { getWordDetails } from './lib/dictApi';
export { getRecentSearches } from './lib/storage';
export type { RecentSearchItem } from './lib/storage';
