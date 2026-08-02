/**
 * Deck + card limits, mirrored from `backend/src/config/limits.js`.
 * **Change one, change both** — same convention as `rankProgress.ts` ↔
 * `cardSrsService.js`.
 *
 * These are UX, not enforcement. The backend counts rows and validates every
 * field on write; a client-side cap is one `curl` away from being ignored.
 * What they buy is a button that goes disabled with "50 / 50" on it instead
 * of a form that submits into a 409.
 *
 * Kept separate from `cardLimits.ts`, which holds a presentation choice
 * (how many meanings look good on a card back) rather than a backend contract.
 */

/** Max decks one user can own. Backend: `QUOTAS.DECKS_PER_USER`. */
export const MAX_DECKS = 50;

/** Max cards in one deck. Backend: `QUOTAS.CARDS_PER_DECK`. */
export const MAX_CARDS_PER_DECK = 5000;

/** Text field caps, in characters. Backend: `TEXT.*`. Applied as `maxLength`
 *  on the matching input so the browser stops the typing rather than the
 *  server rejecting the submit. */
export const MAX_DECK_NAME = 100;
export const MAX_CARD_FRONT = 200;
export const MAX_CARD_READING = 200;
export const MAX_CARD_BACK = 2000;
export const MAX_CARD_NOTES = 2000;
export const MAX_CARD_CONTEXT = 2000;

/** The four SRS states. Backend: `CARD_STATES` + the `cards_state_check`
 *  DB constraint added in migration 024. */
export const CARD_STATES = ['new', 'seen', 'learned', 'mastered'] as const;
export type CardState = (typeof CARD_STATES)[number];

/** Message shown when a create action is blocked by a quota. Written here so
 *  the deck list, the reader bubble and the pending-card overlay can't drift
 *  into three different phrasings of the same limit. */
export function deckQuotaMessage(current: number): string {
  return `Deck limit reached (${current} / ${MAX_DECKS}). Delete a deck to make room.`;
}

export function cardQuotaMessage(current: number): string {
  return `This deck is full (${current.toLocaleString()} / ${MAX_CARDS_PER_DECK.toLocaleString()} cards).`;
}
