import { shownRank } from './rankProgress';
import type { CardRecord, CardState } from '../types';

/** Ladder order, bottom tier first — the order the mix bar and its legend read in. */
export const MIX_ORDER: readonly CardState[] = ['new', 'met', 'learned', 'mastered'];

export type MasteryMix = Record<CardState, number>;

/**
 * Cards per tier, counted off rows already in hand — no endpoint, the
 * DeckLedger precedent.
 *
 * Counts the **displayed** rank, not the raw `state` column. The stars on the
 * map are drawn from the displayed rank (a card that reached Learned keeps its
 * tier through a lapse), and a mix bar disagreeing with the sky it sits over
 * would simply look broken — the user can see both at once.
 */
export function masteryMixOf(cards: readonly CardRecord[]): MasteryMix {
  const mix: MasteryMix = { new: 0, met: 0, learned: 0, mastered: 0 };
  for (const c of cards) {
    mix[shownRank({ state: c.state ?? 'new', peakRank: c.peak_rank })]++;
  }
  return mix;
}
