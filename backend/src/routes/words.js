// /api/words/* — the dictionary detail payload.
//
// Public (no auth): dictionary data is shared across all users and carries no
// PII. Reads only; nothing here writes.
//
// `searchService.getDetails` reaches the word row via the search index's
// `hydrate`, so the detail page and the search list stay consistent about
// priority ordering and canonical forms.

const { Router } = require("express");
const searchService = require("../services/searchService");
const { asyncHandler } = require("../middleware/asyncHandler");
const { parseParams } = require("../validation/_helpers");
const { wordIdSchema } = require("../validation/dictionary");

const router = Router();

// GET /api/words/:id/details — word + per-character kanji breakdown +
// example sentences containing any of the word's forms.
//
// `:id` is range-checked against int4 (validation/dictionary.js) so an
// oversized id is a 400 here rather than a Postgres 22003 → 500.
router.get("/:id/details", asyncHandler(async (req, res) => {
  const params = parseParams(wordIdSchema, req, res);
  if (!params) return;
  const { id } = params;
  try {
    res.json(await searchService.getDetails(id));
  } catch (err) {
    const status = err.status ?? 500;
    if (status === 500) {
      console.error(`[words/${id}/details] →`, err);
    }
    const message = status === 500 ? "Internal server error" : err.message;
    res.status(status).json({ error: message });
  }
}));

module.exports = router;
