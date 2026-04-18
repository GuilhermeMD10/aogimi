const cardRepo = require("../repositories/cardRepository");

async function createCard(deckId, { front, reading, back, notes }) {
  return await cardRepo.create({ deckId, front, reading, back, notes });
}

async function getDeckCards(deckId) {
  return await cardRepo.findByDeck(deckId);
}

async function getCard(id) {
  const card = await cardRepo.findById(id);
  if (!card) throw new Error("Card not found");
  return card;
}

async function updateCard(id, { front, reading, back, notes, state }) {
  const card = await cardRepo.update(id, { front, reading, back, notes, state });
  if (!card) throw new Error("Card not found");
  return card;
}

async function reviewCard(id) {
  const card = await cardRepo.incrementReviewCount(id);
  if (!card) throw new Error("Card not found");
  return card;
}

async function deleteCard(id) {
  const success = await cardRepo.delete(id);
  if (!success) throw new Error("Card not found");
  return true;
}

module.exports = { createCard, getDeckCards, getCard, updateCard, reviewCard, deleteCard };
