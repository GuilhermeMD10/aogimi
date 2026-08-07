const cardRepo = require("../repositories/cardRepository");
const cardReviewRepo = require("../repositories/cardReviewRepository");
const studyDayRepo = require("../repositories/studyDayRepository");
const srs = require("./cardSrsService");

// NOTE: this and `updateCard` re-destructure the validated body field by field,
// which means a field added to the zod schema but not listed here passes
// validation, is dropped silently, and lands in the DB as the column default —
// no error anywhere. Add new card fields in BOTH functions (and in the
// repository) or they don't persist.
async function createCard(deckId, { front, reading, back, notes, contextSentence, jlptLevel, meanings }) {
  return await cardRepo.create({ deckId, front, reading, back, notes, contextSentence, jlptLevel, meanings });
}

async function getDeckCards(deckId) {
  return await cardRepo.findByDeck(deckId);
}

// Cards in this deck that are due for review right now (never-reviewed or
// past their scheduled next_due_at), most-overdue first.
async function getDueDeckCards(deckId) {
  return await cardRepo.findDueByDeck(deckId);
}

// Just the count, for deck badges that don't need the cards themselves.
async function getDueDeckCardCount(deckId) {
  return await cardRepo.countDueByDeck(deckId);
}

async function getCard(id) {
  const card = await cardRepo.findById(id);
  if (!card) throw new Error("Card not found");
  return card;
}

// See the note on `createCard`: every field has to be named here too.
async function updateCard(id, { front, reading, back, notes, state, contextSentence, jlptLevel, meanings }) {
  const card = await cardRepo.update(id, { front, reading, back, notes, state, contextSentence, jlptLevel, meanings });
  if (!card) throw new Error("Card not found");
  return card;
}

/**
 * Apply an SRS outcome to a card. Updates the card's SRS columns,
 * appends an event to card_reviews, and bumps the user's study_days
 * counter. Not transactional: if a later write fails we'd rather have
 * the card state correct (user-facing) than refuse the whole review.
 *
 * **Grading a card that isn't due does nothing.** No memory update, no
 * `card_reviews` row, no `reviewed_times`, no `study_days` bump — the card
 * comes back exactly as it was found. Studying ahead is practice, and practice
 * moves neither direction: it can't earn stability and it can't lose it.
 *
 * This is the *authoritative* check. Clients run the same rule locally so the
 * UI doesn't promise a rank change the server won't make, and skip the request
 * entirely for a card they can see isn't due — but that is an optimisation over
 * this, never a substitute. A client with a skewed clock (or an old build, or
 * curl) still can't grade its way to a free stability increase.
 */
async function reviewCard(userId, cardId, outcome) {
  const card = await cardRepo.findById(cardId);
  if (!card) throw new Error("Card not found");

  // One clock for the whole call, so the due check and the review timestamp
  // can't straddle a boundary — a card due in 3ms must not be judged "not due"
  // here and then reviewed "on time" a line later.
  const now = new Date();
  if (!srs.isDue(card, now)) return card;

  const { next, event } = srs.applyOutcome(card, outcome, now);

  const updated = await cardRepo.applySrsUpdate(cardId, next);

  await cardReviewRepo.create({
    cardId,
    userId,
    reviewedAt:       event.reviewed_at,
    outcome:          event.outcome,
    difficultyBefore: event.difficulty_before,
    difficultyAfter:  event.difficulty_after,
    stabilityBefore:  event.stability_before,
    stabilityAfter:   event.stability_after,
    stateBefore:      event.state_before,
    stateAfter:       event.state_after,
    elapsedDays:      event.elapsed_days,
  });

  await studyDayRepo.bumpForToday(userId, event.reviewed_at);

  return updated;
}

async function deleteCard(id) {
  const success = await cardRepo.delete(id);
  if (!success) throw new Error("Card not found");
  return true;
}

module.exports = { createCard, getDeckCards, getDueDeckCards, getDueDeckCardCount, getCard, updateCard, reviewCard, deleteCard };
