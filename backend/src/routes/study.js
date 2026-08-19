// /api/study/* — session resolution and per-user prefs.
//
// Identity comes from the token only; no body `userId`. Session selection
// validates deck ownership inside `studyService.fetchSessionCards` (unowned
// IDs are silently dropped; no info leak about which IDs exist).

const { Router } = require("express");
const studyService = require("../services/studyService");
const prefsRepo = require("../repositories/userStudyPrefsRepository");
const { parseBody } = require("../validation/_helpers");
const { sessionSchema, prefsSchema } = require("../validation/study");

const router = Router();

const DEFAULT_DISPLAY = Object.freeze({
  preset: 'default',
  front: { reading: false, context: true, jlpt: true, deckName: true },
  back: { exampleSentence: true },
});

// ── Session ────────────────────────────────────────────────────────────────

// Validated by validation/study.js: `limit` has a ceiling and `deckIds`
// has a length cap and a uuid-per-entry check.
router.post("/session", async (req, res) => {
  const body = parseBody(sessionSchema, req, res);
  if (!body) return;

  try {
    const cards = await studyService.fetchSessionCards(req.user.userId, body);
    return res.json({ cards });
  } catch (err) {
    return res.status(500).json({ error: "Session resolution failed" });
  }
});

// ── Due ──────────────────────────────────────────────────────────────────────
// Identity from the token; ownership is implicit (only the caller's own decks
// are pooled).

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

// Both documents are stored as JSONB. The schema bounds shape, key count and
// value types — otherwise the column becomes arbitrary user-controlled storage
// up to the body cap — while staying open enough for new display toggles
// (SCHEMA.md documents `display` as deliberately schema-free).
router.put("/prefs", async (req, res) => {
  const body = parseBody(prefsSchema, req, res);
  if (!body) return;
  const { display, deckOverrides } = body;
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
