// Study-feature types. CardRecord lives with decks/types since cards
// are owned by decks; this module only defines what's specific to a
// study session (outcomes, modes, config, display prefs).

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
//
// Stored both locally (AsyncStorage cache) and on the backend
// (`user_study_prefs.display` JSONB). The backend value is the source
// of truth across devices; local cache is for offline + warm starts.

export type Preset = 'easy' | 'default' | 'hard' | 'production';

export type FrontPrefs = {
  /** Show the kana reading on the front card. */
  reading: boolean;
  /** Show the context sentence on the front (target word is clozed). */
  context: boolean;
  /** Show the deck name on the front. */
  deckName: boolean;
};

export type BackPrefs = {
  /** Show the context sentence on the back, un-clozed. */
  exampleSentence: boolean;
};

export type DisplayPrefs = {
  preset: Preset;
  front: FrontPrefs;
  back: BackPrefs;
};

// ── Session summary ────────────────────────────────────────────────────────
//
// Captured while the session runs and surfaced on the finish screen.
// One entry per unique card the user touched (multiple outcomes on the
// same card collapse into one entry's outcomes[] list).

export type CardSessionEntry = {
  /** Latest card snapshot — reflects post-final-submit SRS values. */
  card: CardRecord;
  /** State at the user's first encounter this session. */
  startState: CardRecord['state'];
  /** State after the most recent submit. */
  endState: CardRecord['state'];
  /** Every outcome the user submitted on this card, in order. */
  outcomes: StudyOutcome[];
  /** Difficulty after the most recent submit — used for the hardest list. */
  finalDifficulty: number;
};

export type SessionSummary = {
  /** Distinct cards the user actually saw + submitted on. */
  uniqueCards: number;
  /** Total submits — same as `reviewed`, included for symmetry. */
  reviewedTotal: number;
  perCard: CardSessionEntry[];
};
