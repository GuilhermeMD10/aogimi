const cardRepo = require("../repositories/cardRepository");
const cardReviewRepo = require("../repositories/cardReviewRepository");
const studyDayRepo = require("../repositories/studyDayRepository");
const srs = require("./cardSrsService");

async function createCard(deckId, { front, reading, back, notes, contextSentence }) {
  return await cardRepo.create({ deckId, front, reading, back, notes, contextSentence });
}

async function getDeckCards(deckId) {
  return await cardRepo.findByDeck(deckId);
}

async function getCard(id) {
  const card = await cardRepo.findById(id);
  if (!card) throw new Error("Card not found");
  return card;
}

async function updateCard(id, { front, reading, back, notes, state, contextSentence }) {
  const card = await cardRepo.update(id, { front, reading, back, notes, state, contextSentence });
  if (!card) throw new Error("Card not found");
  return card;
}

/**
 * Apply an SRS outcome to a card. Updates the card's SRS columns,
 * appends an event to card_reviews, and bumps the user's study_days
 * counter. Not transactional: if a later write fails we'd rather have
 * the card state correct (user-facing) than refuse the whole review.
 */
async function reviewCard(userId, cardId, outcome) {
  const card = await cardRepo.findById(cardId);
  if (!card) throw new Error("Card not found");

  const { next, event } = srs.applyOutcome(card, outcome);

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

module.exports = { createCard, getDeckCards, getCard, updateCard, reviewCard, deleteCard };
