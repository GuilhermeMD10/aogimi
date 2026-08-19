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

const router = Router();

// GET /api/words/:id/details — word + per-character kanji breakdown +
// example sentences containing any of the word's forms.
router.get("/:id/details", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
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
});

module.exports = router;
