const { Router } = require("express");
const deckService = require("../services/deckService");
const cardService = require("../services/cardService");

const router = Router();

// ── Decks ───────────────────────────────────────────────────────────────────

// POST /api/decks — create a deck
router.post("/", async (req, res) => {
  const { userId, name, description } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: "userId and name are required" });
  }
  try {
    const deck = await deckService.createDeck(userId, { name, description });
    res.json(deck);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/decks/user/:userId — list decks for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const decks = await deckService.getUserDecks(parseInt(req.params.userId, 10));
    res.json(decks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/decks/:id — get a single deck
router.get("/:id", async (req, res) => {
  try {
    const deck = await deckService.getDeck(req.params.id);
    res.json(deck);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// PUT /api/decks/:id — update deck name/description
router.put("/:id", async (req, res) => {
  const { name, description } = req.body;
  try {
    const deck = await deckService.updateDeck(req.params.id, { name, description });
    res.json(deck);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// DELETE /api/decks/:id — delete a deck (cascades to cards)
router.delete("/:id", async (req, res) => {
  try {
    await deckService.deleteDeck(req.params.id);
    res.json({ message: "Deck deleted" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── Cards (nested under deck) ───────────────────────────────────────────────

// POST /api/decks/:id/cards — add a card to a deck
router.post("/:id/cards", async (req, res) => {
  const { front, reading, back, notes } = req.body;
  if (!front || !back) {
    return res.status(400).json({ error: "front and back are required" });
  }
  try {
    const card = await cardService.createCard(req.params.id, { front, reading, back, notes });
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/decks/:id/cards — list cards in a deck
router.get("/:id/cards", async (req, res) => {
  try {
    const cards = await cardService.getDeckCards(req.params.id);
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/decks/cards/:cardId — update a card
router.put("/cards/:cardId", async (req, res) => {
  const { front, reading, back, notes, state } = req.body;
  try {
    const card = await cardService.updateCard(req.params.cardId, { front, reading, back, notes, state });
    res.json(card);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/decks/cards/:cardId/review — increment review count
router.post("/cards/:cardId/review", async (req, res) => {
  try {
    const card = await cardService.reviewCard(req.params.cardId);
    res.json(card);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// DELETE /api/decks/cards/:cardId — delete a card
router.delete("/cards/:cardId", async (req, res) => {
  try {
    await cardService.deleteCard(req.params.cardId);
    res.json({ message: "Card deleted" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
