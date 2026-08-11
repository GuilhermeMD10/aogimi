/**
 * Deck + card limits, mirrored from `backend/src/config/limits.js`.
 * **Change one, change both** — the same arrangement the web app's
 * `features/sky/stage/lib/limits.ts` has.
 *
 * These are UX, not enforcement. The backend counts rows and validates every
 * field on write; a client-side cap is one `curl` away from being ignored.
 * What they buy is a button that goes disabled with "50 / 50" on it instead of
 * a form that submits into a 409.
 *
 * That matters more on mobile than on the web, because writes here are
 * **local-first**: `cardPush` accepts a card into local storage and pushes it
 * later. Without a client-side check, a card over quota is created, shown, and
 * only rejected on a sync that may be minutes away — by which point the user
 * has moved on and the failure is a silent `pendingOp` that never clears.
 */

/** Max decks one user can own. Backend: `QUOTAS.DECKS_PER_USER`. */
export const MAX_DECKS = 50;

/** Max cards in one deck. Backend: `QUOTAS.CARDS_PER_DECK`. */
export const MAX_CARDS_PER_DECK = 5000;

/** Text field caps, in characters (post-trim). Backend: `TEXT.*`. Apply as
 *  `maxLength` on the matching input so the keyboard stops the typing rather
 *  than the server rejecting the submit. */
export const MAX_DECK_NAME = 100;
export const MAX_DECK_DESCRIPTION = 500;
export const MAX_CARD_FRONT = 200;
export const MAX_CARD_READING = 200;
export const MAX_CARD_BACK = 2000;
export const MAX_CARD_NOTES = 2000;
export const MAX_CARD_CONTEXT = 2000;
/** Per-gloss cap for one entry of `cards.meanings`. Backend: `TEXT.CARD_MEANING`.
 *  A single English gloss longer than this isn't a gloss. */
export const MAX_CARD_MEANING = 200;

/**
 * Array-length cap on `cards.meanings`. Backend: `ARRAYS.CARD_MEANINGS`, and a
 * DB CHECK in migration 026.
 *
 * Distinct from the *authoring* choice of how many glosses to copy off a
 * dictionary entry — that one is a presentation call about what looks good on
 * a card back, this one is the API contract. They happen to be the same number
 * today; folding them together would mean a design tweak silently became a
 * contract change.
 */
export const MAX_CARD_MEANINGS = 3;

/** Max cards in one study session. Backend: `LIMITS.STUDY_SESSION`. */
export const MAX_SESSION_SIZE = 200;

/** Deck ids in one study-session request. Backend: `ARRAYS.SESSION_DECK_IDS`. */
export const MAX_SESSION_DECK_IDS = 50;

/** JLPT tier bounds when a level is present at all. Backend:
 *  `NUMBERS.JLPT_LEVEL_MIN` / `MAX`. Null stays legal and means "unknown". */
export const JLPT_LEVEL_MIN = 1;
export const JLPT_LEVEL_MAX = 5;
