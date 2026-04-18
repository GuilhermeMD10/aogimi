const deckRepo = require("../repositories/deckRepository");

async function createDeck(userId, { bookId, name, description }) {
  return await deckRepo.create({ userId, bookId, name, description });
}

async function getUserDecks(userId) {
  return await deckRepo.findByUser(userId);
}

async function getDeck(id) {
  const deck = await deckRepo.findById(id);
  if (!deck) throw new Error("Deck not found");
  return deck;
}

async function updateDeck(id, { name, description }) {
  const deck = await deckRepo.update(id, { name, description });
  if (!deck) throw new Error("Deck not found");
  return deck;
}

async function deleteDeck(id) {
  const success = await deckRepo.delete(id);
  if (!success) throw new Error("Deck not found");
  return true;
}

module.exports = { createDeck, getUserDecks, getDeck, updateDeck, deleteDeck };
