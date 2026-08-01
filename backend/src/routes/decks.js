// /api/decks/* — decks + nested cards.
//
// Same ownership pattern as books.js: token is the only identity
// source, every `:id` is cross-checked via deckOwnedBy / cardOwnedBy
// (cards owned via deck FK), 404 on mismatch.

const { Router } = require("express");
const deckService = require("../services/deckService");
const cardService = require("../services/cardService");
const { requireUserMatch } = require("../middleware/authorize");
const { deckOwnedBy, cardOwnedBy } = require("../services/ownership");

const router = Router();

// ── Decks ───────────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const deck = await deckService.createDeck(req.user.userId, { name, description });
    return res.json(deck);
  } catch (err) {
    return res.status(500).json({ error: "Create failed" });
  }
});

router.get(
  "/user/:userId",
  requireUserMatch({ from: "params", key: "userId" }),
  async (req, res) => {
    try {
      const decks = await deckService.getUserDecks(req.user.userId);
      return res.json(decks);
    } catch (err) {
      return res.status(500).json({ error: "List failed" });
    }
  },
);

router.get("/:id", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const deck = await deckService.getDeck(req.params.id);
    return res.json(deck);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

router.put("/:id", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  const { name, description } = req.body;
  try {
    const deck = await deckService.updateDeck(req.params.id, { name, description });
    return res.json(deck);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    await deckService.deleteDeck(req.params.id);
    return res.json({ message: "Deck deleted" });
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

// ── Cards (nested under deck) ───────────────────────────────────────────────

router.post("/:id/cards", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  const { front, reading, back, notes, contextSentence } = req.body;
  if (!front || !back) {
    return res.status(400).json({ error: "front and back are required" });
  }
  try {
    const card = await cardService.createCard(req.params.id, { front, reading, back, notes, contextSentence });
    return res.json(card);
  } catch (err) {
    return res.status(500).json({ error: "Create failed" });
  }
});

router.get("/:id/cards", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const cards = await cardService.getDeckCards(req.params.id);
    return res.json(cards);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

// Due cards in this deck only (never-reviewed or past next_due_at).
router.get("/:id/cards/due", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const cards = await cardService.getDueDeckCards(req.params.id);
    return res.json(cards);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

// Just the due count for this deck — for a badge that would otherwise pull
// every due card row to call `.length` on it.
router.get("/:id/cards/due/count", async (req, res) => {
  if (!(await deckOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const count = await cardService.getDueDeckCardCount(req.params.id);
    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

router.put("/cards/:cardId", async (req, res) => {
  if (!(await cardOwnedBy(req.user.userId, req.params.cardId))) {
    return res.status(404).json({ error: "Not found" });
  }
  const { front, reading, back, notes, state, contextSentence } = req.body;
  try {
    const card = await cardService.updateCard(req.params.cardId, { front, reading, back, notes, state, contextSentence });
    return res.json(card);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

router.post("/cards/:cardId/review", async (req, res) => {
  if (!(await cardOwnedBy(req.user.userId, req.params.cardId))) {
    return res.status(404).json({ error: "Not found" });
  }
  const { outcome } = req.body;
  if (!["again", "hard", "easy"].includes(outcome)) {
    return res.status(400).json({ error: "outcome must be 'again', 'hard', or 'easy'" });
  }
  try {
    const card = await cardService.reviewCard(req.user.userId, req.params.cardId, outcome);
    return res.json(card);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

router.delete("/cards/:cardId", async (req, res) => {
  if (!(await cardOwnedBy(req.user.userId, req.params.cardId))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    await cardService.deleteCard(req.params.cardId);
    return res.json({ message: "Card deleted" });
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

module.exports = router;
