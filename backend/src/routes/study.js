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
  const { scope, deckIds, mode, limit } = req.body || {};

  if (scope !== 'all' && scope !== 'deck') {
    return res.status(400).json({ error: "scope must be 'all' or 'deck'" });
  }
  if (!studyService.VALID_MODES.includes(mode)) {
    return res.status(400).json({ error: `mode must be one of ${studyService.VALID_MODES.join(', ')}` });
  }
  if (scope === 'deck' && (!Array.isArray(deckIds) || deckIds.length === 0)) {
    return res.status(400).json({ error: "deckIds required when scope is 'deck'" });
  }

  try {
    const cards = await studyService.fetchSessionCards(req.user.userId, {
      scope,
      deckIds,
      mode,
      limit,
    });
    return res.json({ cards });
  } catch (err) {
    return res.status(500).json({ error: "Session resolution failed" });
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
