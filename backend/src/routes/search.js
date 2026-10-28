const { Router } = require("express");
const searchService = require("../services/searchService");
const { asyncHandler } = require("../middleware/asyncHandler");
const { parseQuery } = require("../validation/_helpers");
const { searchQuerySchema } = require("../validation/dictionary");

const router = Router();

// GET /api/search?q=食べる
//
// `q` is validated as a single bounded string (validation/dictionary.js):
// `?q=a&q=b` arrives as an array and would throw on `.trim()`.
router.get("/", asyncHandler(async (req, res) => {
  const query = parseQuery(searchQuerySchema, req, res);
  if (!query) return;
  const { q } = query;
  try {
    const result = await searchService.search(q);
    res.json(result);
  } catch (err) {
    const status = err.status ?? 500;
    if (status === 500) {
      // Log the full error so 500s aren't silent in the dev terminal.
      console.error(`[search] q=${JSON.stringify(q)} →`, err);
    }
    const message = status === 500 ? "Internal server error" : err.message;
    res.status(status).json({ error: message });
  }
}));

module.exports = router;
