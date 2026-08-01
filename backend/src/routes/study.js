// /api/study/* — session resolution and per-user prefs.
//
// Identity comes from the token only; no body `userId`. Session selection
// validates deck ownership inside `studyService.fetchSessionCards` (unowned
// IDs are silently dropped; no info leak about which IDs exist).

const { Router } = require("express");
const studyService = require("../services/studyService");
const prefsRepo = require("../repositories/userStudyPrefsRepository");

const router = Router();

const DEFAULT_DISPLAY = Object.freeze({
  preset: 'default',
  front: { reading: false, context: true, jlpt: true, deckName: true },
  back: { exampleSentence: true },
});

// ── Session ────────────────────────────────────────────────────────────────

router.post("/session", async (req, res) => {
  const { scope, deckIds, mode, limit, dueOnly } = req.body || {};

  if (scope !== 'all' && scope !== 'deck') {
    return res.status(400).json({ error: "scope must be 'all' or 'deck'" });
  }
  if (!studyService.VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of ${studyService.VALID_MODES.join(', ')}` });
  }
  if (scope === 'deck' && (!Array.isArray(deckIds) || deckIds.length === 0)) {
    return res.status(400).json({ error: "deckIds required when scope is 'deck'" });
  }
  if (dueOnly !== undefined && typeof dueOnly !== 'boolean') {
    return res.status(400).json({ error: "dueOnly must be a boolean" });
  }

  try {
    const cards = await studyService.fetchSessionCards(req.user.userId, {
      scope,
      deckIds,
      mode,
      limit,
      dueOnly,
    });
    return res.json({ cards });
  } catch (err) {
    return res.status(500).json({ error: "Session resolution failed" });
  }
});

// ── Due ──────────────────────────────────────────────────────────────────────
// Every card due right now across all the user's decks. Identity from the
// token; ownership is implicit (only the caller's own decks are pooled).

router.get("/due", async (req, res) => {
  try {
    const cards = await studyService.fetchDueCards(req.user.userId);
    return res.json({ cards });
  } catch (err) {
    return res.status(500).json({ error: "Due resolution failed" });
  }
});

// Due counts across every deck the user owns. Serves a "N cards due" figure
// plus per-deck chips from one request; decks with nothing due are omitted
// from `byDeck`.
router.get("/due/counts", async (req, res) => {
  try {
    const payload = await studyService.fetchDueCounts(req.user.userId);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Due resolution failed" });
  }
});

// One random due card — the single-card "study something now" entry point.
// `card` is null when nothing is due; that's a 200, not a 404, because having
// nothing due is a normal state rather than a missing resource.
router.get("/due/random", async (req, res) => {
  try {
    const card = await studyService.fetchRandomDueCard(req.user.userId);
    return res.json({ card });
  } catch (err) {
    return res.status(500).json({ error: "Due resolution failed" });
  }
});

// ── Prefs ──────────────────────────────────────────────────────────────────

router.get("/prefs", async (req, res) => {
  try {
    const row = await prefsRepo.findByUser(req.user.userId);
    if (!row) {
      // No row yet → return defaults; the row is only created on first PUT.
      return res.json({ display: DEFAULT_DISPLAY, deckOverrides: {} });
    }
    return res.json({
      display: row.display,
      deckOverrides: row.deck_overrides,
    });
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

router.put("/prefs", async (req, res) => {
  const { display, deckOverrides } = req.body || {};
  if (display === undefined && deckOverrides === undefined) {
    return res.status(400).json({ error: "Provide display and/or deckOverrides" });
  }
  try {
    const row = await prefsRepo.upsert(req.user.userId, { display, deckOverrides });
    return res.json({
      display: row.display,
      deckOverrides: row.deck_overrides,
    });
  } catch (err) {
    return res.status(500).json({ error: "Write failed" });
  }
});

module.exports = router;
