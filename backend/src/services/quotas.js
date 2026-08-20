// Per-user resource quotas. Same shape as services/ownership.js: each helper
// answers one question about the caller's data, routes call it before doing
// work, and the answer decides the status code.
//
// WHY: without these, a signed-in client — or anything holding a valid
// token — could create decks, cards and books without bound.
// The global limiter (100 req/min) caps the RATE, not the total: that's
// ~144k rows/day per IP.
//
// These checks are the real enforcement. The web client mirrors the same
// numbers to disable buttons and show "49/50", but that's presentation — a
// client-side cap is one `curl` away from being ignored.
//
// STATUS CODE: 409 Conflict, not 403. The request is well-formed and the
// caller is authorised; it conflicts with the current state of their account.
// 403 would read as "you may not do this", which is wrong — they may, once
// they delete something. Each error carries a machine-readable `code` plus
// `limit`/`current` so the client can render an exact message without
// parsing prose.

const { QUOTAS } = require("../config/limits");
const deckRepo = require("../repositories/deckRepository");
const cardRepo = require("../repositories/cardRepository");
const bookRepo = require("../repositories/bookRepository");

/** Build the error a route turns into a 409. */
function quotaError(code, message, limit, current) {
  const err = new Error(message);
  err.code = code;
  err.quota = { limit, current };
  return err;
}

/**
 * Express helper: run a quota check and, if it fails, write the 409 and
 * return false. Returns true when the caller is under quota and the route
 * should continue.
 *
 * Routes read as:
 *   if (!(await quotas.enforce(res, quotas.deckQuota, userId))) return;
 *
 * which keeps the "check then 409" pair in one place rather than repeating a
 * try/catch around every insert.
 */
async function enforce(res, check, ...args) {
  try {
    await check(...args);
    return true;
  } catch (err) {
    if (err && err.quota) {
      res.status(409).json({
        error: err.message,
        code: err.code,
        limit: err.quota.limit,
        current: err.quota.current,
      });
      return false;
    }
    throw err;
  }
}

async function deckQuota(userId) {
  const current = await deckRepo.countByUser(userId);
  if (current >= QUOTAS.DECKS_PER_USER) {
    throw quotaError(
      "DECK_QUOTA_EXCEEDED",
      `Deck limit reached (${QUOTAS.DECKS_PER_USER}). Delete a deck to make room.`,
      QUOTAS.DECKS_PER_USER,
      current,
    );
  }
}

async function cardQuota(deckId) {
  const current = await cardRepo.countByDeck(deckId);
  if (current >= QUOTAS.CARDS_PER_DECK) {
    throw quotaError(
      "CARD_QUOTA_EXCEEDED",
      `Card limit reached for this deck (${QUOTAS.CARDS_PER_DECK}). Delete a card or use another deck.`,
      QUOTAS.CARDS_PER_DECK,
      current,
    );
  }
}

async function bookQuota(userId) {
  const current = await bookRepo.countBooksByUser(userId);
  if (current >= QUOTAS.BOOKS_PER_USER) {
    throw quotaError(
      "BOOK_QUOTA_EXCEEDED",
      `Library limit reached (${QUOTAS.BOOKS_PER_USER} books). Remove a book to make room.`,
      QUOTAS.BOOKS_PER_USER,
      current,
    );
  }
}

module.exports = {
  enforce,
  deckQuota,
  cardQuota,
  bookQuota,
};
