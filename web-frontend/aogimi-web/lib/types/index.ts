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
