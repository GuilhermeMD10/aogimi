// TypeScript mirror of backend/src/services/cardSrsService.js. Same
// rules, same constants, same state machine — kept paste-and-adapt
// rather than shared because the runtime (RN vs Node) differs and
// neither side benefits from a wire-shared package.
//
// Used in two places:
//   1. Local-first review submission — apply the algorithm immediately
//      on the user's device, then POST to the backend in the
//      background.
//   2. Offline / signed-out session ordering — when the backend session
//      endpoint isn't available, we sort locally with hardestSortKey.
//
// Keep these constants in sync with the JS file. If you change one
// side, change the other.

import type { CardRecord } from '../../decks/types';
import type { StudyOutcome } from '../types';

const RULES: Record<StudyOutcome, { dDelta: number; sFactor: number }> = {
  again: { dDelta: +0.15, sFactor: 0.2 },
  hard:  { dDelta: +0.04, sFactor: 1.2 },
  easy:  { dDelta: -0.10, sFactor: 3.0 },
};

const DIFFICULTY_MIN = 0.05;
const DIFFICULTY_MAX = 0.95;
const STABILITY_FLOOR = 0.1;
const MAX_OUTCOME_HISTORY = 5;
const MS_PER_DAY = 86_400_000;

const SORT_WEIGHT_FADING = 0.30;
const SORT_FAILURE_BOOST: Record<string, number> = { A: 0.30, H: 0.10, E: 0 };
const SORT_STATE_BIAS: Record<CardRecord['state'], number> = {
  mastered: -0.40,
  learned:  -0.20,
  seen:      0,
  new:      +0.05,
};
const SORT_JITTER = 0.10;

function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}

function outcomeChar(outcome: StudyOutcome): 'A' | 'H' | 'E' {
  return outcome === 'again' ? 'A' : outcome === 'hard' ? 'H' : 'E';
}

function appendOutcome(history: string, outcome: StudyOutcome): string {
  const next = (history || '') + outcomeChar(outcome);
  return next.length <= MAX_OUTCOME_HISTORY
    ? next
    : next.slice(-MAX_OUTCOME_HISTORY);
}

function elapsedDays(card: CardRecord, now: Date): number {
  if (!card.last_reviewed_at) return 0;
  const elapsed = now.getTime() - new Date(card.last_reviewed_at).getTime();
  return Math.max(0, elapsed / MS_PER_DAY);
}

/**
 * R = exp(-elapsedDays / stability). Returns 1 for never-reviewed
 * cards (treat as freshly known). Clamped to (0, 1].
 */
export function computeRetrievability(card: CardRecord, now: Date = new Date()): number {
  if (!card.last_reviewed_at) return 1.0;
  const t = elapsedDays(card, now);
  const s = Math.max(STABILITY_FLOOR, card.stability ?? STABILITY_FLOOR);
  return Math.exp(-t / s);
}

/**
 * State transition after applying a single outcome. Promotion is
 * gated on outcome-history length + difficulty; regression is
 * unconditional on Again.
 */
export function transitionState(
  prevState: CardRecord['state'],
  lastOutcomes: string,
  difficulty: number,
  outcome: StudyOutcome,
): CardRecord['state'] {
  if (prevState === 'new') return 'seen';

  if (outcome === 'again') {
    if (prevState === 'mastered') return 'learned';
    if (prevState === 'learned')  return 'seen';
    return prevState;
  }

  if (prevState === 'seen') {
    const last3 = lastOutcomes.slice(-3);
    if (last3.length === 3 && !last3.includes('A') && difficulty < 0.40) {
      return 'learned';
    }
  }

  if (prevState === 'learned') {
    const last5 = lastOutcomes.slice(-5);
    if (
      last5.length === 5
      && last5.split('').every((c) => c === 'E')
      && difficulty < 0.20
    ) {
      return 'mastered';
    }
  }

  return prevState;
}

export type SrsApplyResult = {
  next: {
    difficulty: number;
    stability: number;
    last_outcomes: string;
    last_reviewed_at: string;     // ISO timestamp
    state: CardRecord['state'];
  };
  /** Snapshot of the card BEFORE the outcome — for Undo. */
  prior: {
    difficulty: number;
    stability: number;
    last_outcomes: string;
    last_reviewed_at: string | null;
    state: CardRecord['state'];
    reviewed_times: number;
  };
};

/**
 * Pure: apply an outcome to a card. Returns the next SRS field values
 * plus a "prior" snapshot suitable for Undo. Doesn't mutate the input.
 */
export function applyOutcome(
  card: CardRecord,
  outcome: StudyOutcome,
  now: Date = new Date(),
): SrsApplyResult {
  const rule = RULES[outcome];

  const prevDifficulty = card.difficulty ?? 0.30;
  const prevStability  = card.stability  ?? 2.0;
  const prevState      = card.state      ?? 'new';
  const prevOutcomes   = card.last_outcomes ?? '';

  const nextDifficulty = clamp(prevDifficulty + rule.dDelta, DIFFICULTY_MIN, DIFFICULTY_MAX);
  const nextStability  = Math.max(STABILITY_FLOOR, prevStability * rule.sFactor);
  const nextOutcomes   = appendOutcome(prevOutcomes, outcome);
  const nextState      = transitionState(prevState, nextOutcomes, nextDifficulty, outcome);

  return {
    next: {
      difficulty:       nextDifficulty,
      stability:        nextStability,
      last_outcomes:    nextOutcomes,
      last_reviewed_at: now.toISOString(),
      state:            nextState,
    },
    prior: {
      difficulty:       prevDifficulty,
      stability:        prevStability,
      last_outcomes:    prevOutcomes,
      last_reviewed_at: card.last_reviewed_at,
      state:            prevState,
      reviewed_times:   card.reviewed_times,
    },
  };
}

/**
 * Sort key for the local "hardest" ordering. Higher = surface sooner.
 * Used when the backend session endpoint isn't reachable (signed-out
 * or offline) — kept in lockstep with backend hardestSortKey.
 */
export function hardestSortKey(card: CardRecord, now: Date = new Date()): number {
  const R = computeRetrievability(card, now);
  const lastChar = (card.last_outcomes ?? '').slice(-1);
  const failureBoost = SORT_FAILURE_BOOST[lastChar] ?? 0;
  const stateBias = SORT_STATE_BIAS[card.state] ?? 0;
  const jitter = (Math.random() * 2 - 1) * SORT_JITTER;
  return (card.difficulty ?? 0.30)
       + (1 - R) * SORT_WEIGHT_FADING
       + failureBoost
       + stateBias
       + jitter;
}
