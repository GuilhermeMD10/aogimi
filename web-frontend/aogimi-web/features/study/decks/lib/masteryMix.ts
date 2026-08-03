import type { CardRecord, CardState } from '../types';

/** Ladder order, bottom tier first — the order the mix bar and its legend read in. */
export const MIX_ORDER: readonly CardState[] = ['new', 'seen', 'learned', 'mastered'];

export type MasteryMix = Record<CardState, number>;

/** Cards per tier, counted off rows already in hand — no endpoint, the DeckLedger precedent. */
export function masteryMixOf(cards: readonly CardRecord[]): MasteryMix {
  const mix: MasteryMix = { new: 0, seen: 0, learned: 0, mastered: 0 };
  for (const c of cards) mix[c.state ?? 'new']++;
  return mix;
}
