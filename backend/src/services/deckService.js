const deckRepo = require("../repositories/deckRepository");

// Every deck response has one shape. `create` and `update` return the raw
// mutated row, which carries neither of the derived fields (`card_count`,
// `last_card`), so both re-read through `findById` — one extra indexed query on
// a rare write path, in exchange for a client that can trust the shape without
// checking which endpoint produced it.
async function createDeck(userId, { name, description }) {
  const created = await deckRepo.create({ userId, name, description });
  return await deckRepo.findById(created.id);
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
  const updated = await deckRepo.update(id, { name, description });
  if (!updated) throw new Error("Deck not found");
  return await deckRepo.findById(id);
}

async function deleteDeck(id) {
  const success = await deckRepo.delete(id);
  if (!success) throw new Error("Deck not found");
  return true;
}

module.exports = { createDeck, getUserDecks, getDeck, updateDeck, deleteDeck };
