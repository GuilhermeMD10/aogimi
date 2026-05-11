// Domain types — the source of truth for backend payload shapes.
//
// API call helpers live in `lib/<domain>Api.ts` and import the types from
// here. Components should also import from here so they don't pull in the
// fetch layer transitively.

export type {
  BookProgressRecord,
  ProgressPayload,
  MatchCandidate,
  MatchType,
  MatchResult,
} from './book';

export type {
  DeckRecord,
  CardRecord,
  CardState,
} from './deck';

export type {
  WordMeaning,
  WordResult,
  KanjiInfo,
  NameResult,
  SearchResponse,
  DetailsResponse,
} from './dict';

export type {
  AuthUser,
  UserProfile,
  ProfileUpdate,
} from './user';

export type {
  DeviceRecord,
  DeviceBookRecord,
} from './device';

export type {
  TranslationResult,
} from './translate';

// `lib/types/epubjs.ts` is module-augmentation only (no exports), kept
// separate from this barrel.
