// Study-feature types. CardRecord lives with decks/types since cards
// are owned by decks; this module only defines what's specific to a
// study session (outcomes, modes, config, display prefs).

import type { CardRecord } from '../stage/types';
import type { Outcome } from '../lib/fsrs';

/**
 * The four FSRS grades: Again 1 · Hard 2 · Good 3 · Easy 4.
 *
 * **Good was missing until the FSRS-6 port.** With three buttons there is no
 * neutral success, so the third one stood in for it and emitted Easy on every
 * correct answer — applying the `w16` bonus each time and pinning difficulty at
 * its floor. That is the `all Easy` ladder in `scripts/verify-fsrs.mts`:
 * 8 → 66 → 397 → 1875 days. Correct arithmetic on the wrong grade.
 *
 * Aliased to `fsrs.Outcome` rather than re-declared so the vocabulary can't
 * drift from the one the maths and the API speak. The local name stays because
 * it reads better at the call sites that already use it.
 */
export type StudyOutcome = Outcome;

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
  /**
   * Narrow the candidate **pool** to cards due right now — never reviewed, or
   * past `next_due_at` — *before* `mode` orders it. A filter, not a mode, so it
   * composes with all seven.
   *
   * **This should be `true` for any session whose grades are meant to count.**
   * Since the FSRS-6 port, grading a card that isn't due changes nothing at all
   * (see the due gate in `lib/srs.ts`), so an unfiltered session hands the user
   * cards that can't earn anything — the work looks identical and vanishes.
   *
   * Combining it with a mode that also filters (`oldest_only`, `newest_only`)
   * intersects both and can legitimately return fewer than `limit` cards, or
   * none.
   */
  dueOnly?: boolean;
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
  /**
   * Difficulty after the most recent submit — what the hardest-cards list
   * sorts on.
   *
   * **Nullable**, for two reasons that both trace to FSRS-6: difficulty is
   * null until a card's first review, and a grade on a not-due card leaves it
   * null because nothing was applied. Consumers rank a null last rather than
   * coercing it to a number — a card with no measured difficulty is not the
   * same as an easy one.
   */
  finalDifficulty: number | null;
};

export type SessionSummary = {
  /** Distinct cards the user actually saw + submitted on. */
  uniqueCards: number;
  /** Total submits — same as `reviewed`, included for symmetry. */
  reviewedTotal: number;
  perCard: CardSessionEntry[];
};
