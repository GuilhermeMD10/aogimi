// Study-feature types. CardRecord lives in components/decks/types; this
// module only owns what's specific to a study session.

import type { CardRecord } from '../decks/types';

export type StudyOutcome = 'again' | 'hard' | 'easy';

export type StudyMode =
  | 'hardest'
  | 'random'
  | 'oldest_first'
  | 'oldest_only'
  | 'newest_only'
  | 'by_creation'
  | 'hardest_all_decks';

export type StudySessionConfig = {
  scope: 'deck' | 'all';
  deckIds?: string[];
  mode: StudyMode;
  limit?: number;
  /** Narrow the pool to cards due right now before `mode` orders them.
   *  `{ scope: 'all', dueOnly: true }` is the "study every due card across
   *  all decks" session. Omitted / false = every card in scope. */
  dueOnly?: boolean;
};

/** Due-card counts across every deck the user owns.
 *  Decks with nothing due are **absent** from `byDeck` — read a missing key
 *  as 0 rather than expecting an entry per deck. */
export type DueCounts = {
  total: number;
  byDeck: Record<string, number>;
};

// ── Display prefs ──────────────────────────────────────────────────────────

export type Preset = 'easy' | 'default' | 'hard' | 'production';

export type FrontPrefs = {
  reading: boolean;
  context: boolean;
  deckName: boolean;
};

export type BackPrefs = {
  exampleSentence: boolean;
};

export type DisplayPrefs = {
  preset: Preset;
  front: FrontPrefs;
  back: BackPrefs;
};

// ── Session summary ────────────────────────────────────────────────────────

export type CardSessionEntry = {
  card: CardRecord;
  startState: CardRecord['state'];
  endState: CardRecord['state'];
  outcomes: StudyOutcome[];
  finalDifficulty: number;
};

export type SessionSummary = {
  uniqueCards: number;
  reviewedTotal: number;
  perCard: CardSessionEntry[];
};
