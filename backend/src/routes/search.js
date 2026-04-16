const { Router } = require("express");
const searchService = require("../services/searchService");

const router = Router();

// GET /api/search?q=食べる
router.get("/", async (req, res) => {
  const q = req.query.q;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }
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
});

module.exports = router;
