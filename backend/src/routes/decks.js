// /api/decks/* — decks + nested cards.
//
// Same ownership pattern as books.js: token is the only identity
// source, every `:id` is cross-checked via deckOwnedBy / cardOwnedBy
// (cards owned via deck FK), 404 on mismatch.
//
// Bodies are validated by zod (validation/decks.js) — length caps on every
// text field and an enum on `state`, which used to accept any string and let
// a client skip the SRS ladder. Inserts are gated by the per-user deck and
// per-deck card quotas (services/quotas.js), which answer 409.

const { Router } = require("express");
const deckService = require("../services/deckService");
const cardService = require("../services/cardService");
const { requireUserMatch } = require("../middleware/authorize");
const { deckOwnedBy, cardOwnedBy } = require("../services/ownership");
const quotas = require("../services/quotas");
const { parseBody } = require("../validation/_helpers");
const {
  createDeckSchema,
  updateDeckSchema,
  createCardSchema,
  updateCardSchema,
  reviewCardSchema,
} = require("../validation/decks");

const router = Router();

// ── Decks ───────────────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  const body = parseBody(createDeckSchema, req, res);
  if (!body) return;
  if (!(await quotas.enforce(res, quotas.deckQuota, req.user.userId))) return;
  try {
    const deck = await deckService.createDeck(req.user.userId, body);
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

// Every deck with its full card list in one response — feeds the /sky page,
// which needs all cards across all decks and would otherwise do a per-deck
// GET /:id/cards fan-out. Bounded by the per-user card quota, so no paging.
router.get(
  "/user/:userId/cards",
  requireUserMatch({ from: "params", key: "userId" }),
  async (req, res) => {
    try {
      const decks = await deckService.getUserDecksWithCards(req.user.userId);
      return res.json({ decks });
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
  const body = parseBody(updateDeckSchema, req, res);
  if (!body) return;
  try {
    const deck = await deckService.updateDeck(req.params.id, body);
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
  const body = parseBody(createCardSchema, req, res);
  if (!body) return;
  if (!(await quotas.enforce(res, quotas.cardQuota, req.params.id))) return;
  try {
    const card = await cardService.createCard(req.params.id, body);
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

// Just the due count for this deck — for a badge that would otherwise pull
// every due card row to call `.length` on it.
//
// There was a `GET /:id/cards/due` beside this returning the rows themselves.
// Nothing called it: clients build a session from `POST /api/study/session`
// (which applies mode, ordering and a size cap) and only ever want the bare
// integer here. Removed along with `cardService.getDueDeckCards`.
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
  const body = parseBody(updateCardSchema, req, res);
  if (!body) return;
  try {
    const card = await cardService.updateCard(req.params.cardId, body);
    return res.json(card);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

router.post("/cards/:cardId/review", async (req, res) => {
  if (!(await cardOwnedBy(req.user.userId, req.params.cardId))) {
    return res.status(404).json({ error: "Not found" });
  }
  const body = parseBody(reviewCardSchema, req, res);
  if (!body) return;
  try {
    const card = await cardService.reviewCard(req.user.userId, req.params.cardId, body.outcome);
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
