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
