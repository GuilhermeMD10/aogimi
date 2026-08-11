import { shownRank } from '../../lib/skyProjection';
import type { CardRecord, CardState } from '../types';

/** Ladder order, bottom tier first — the order the mix bar and its legend read in.
 *  Index is the sky's 0..3 rank, so `RANK_COLORS[i]` is this tier's colour. */
export const MIX_ORDER: readonly CardState[] = ['new', 'met', 'learned', 'mastered'];

export type MasteryMix = Record<CardState, number>;

/**
 * Cards per tier, counted off rows already in hand — no endpoint.
 *
 * Counts the **displayed** rank, not the raw `state` column. The stars on the
 * map are drawn from the displayed rank (a card that reached Learned keeps its
 * tier through a lapse), and a mix bar disagreeing with the sky it sits over
 * would simply look broken — the user can see both at once.
 *
 * Mirrors the web's `masteryMixOf`. The one difference is where `shownRank`
 * comes from: the web has a `rankProgress.ts` in this same folder, mobile keeps
 * it at the sky domain root in `skyProjection.ts`, because `map` and `study`
 * read it too and sub-features can't import each other.
 */
export function masteryMixOf(cards: readonly CardRecord[]): MasteryMix {
  const mix: MasteryMix = { new: 0, met: 0, learned: 0, mastered: 0 };
  for (const c of cards) mix[shownRank(c)]++;
  return mix;
}
