const { Router } = require("express");
const wordService = require("../services/wordService");
const searchService = require("../services/searchService");

const router = Router();

// GET /api/words/:id/details  — word + kanji breakdown for the detail page
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

// GET /api/words/meaning?q=eat[&lang=eng]
router.get("/meaning", async (req, res) => {
  const { q, lang } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter q is required" });
  try {
    res.json(await wordService.getByMeaning(q, lang));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/meaning/pos?q=study&pos=suru[&lang=eng]
router.get("/meaning/pos", async (req, res) => {
  const { q, pos, lang } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter q is required" });
  if (!pos) return res.status(400).json({ error: "Query parameter pos is required" });
  try {
    res.json(await wordService.getByMeaningAndPos(q, pos, lang));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/pos?pos=noun[&lang=eng]
router.get("/pos", async (req, res) => {
  const { pos, lang } = req.query;
  if (!pos) return res.status(400).json({ error: "Query parameter pos is required" });
  try {
    res.json(await wordService.getByPos(pos, lang));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/priority?marker=ichi1
router.get("/priority", async (req, res) => {
  const { marker } = req.query;
  if (!marker) return res.status(400).json({ error: "Query parameter marker is required" });
  try {
    res.json(await wordService.getByPriority(marker));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/kana-only[?limit=50]
router.get("/kana-only", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  try {
    res.json(await wordService.getKanaOnly(limit));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/kanji/:kanji[?common=true]
router.get("/kanji/:kanji", async (req, res) => {
  try {
    const results = req.query.common === "true"
      ? await wordService.getCommonByKanji(req.params.kanji)
      : await wordService.getByKanji(req.params.kanji);
    res.json(results);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/kana/:kana
router.get("/kana/:kana", async (req, res) => {
  try {
    res.json(await wordService.getByKana(req.params.kana));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/kana-prefix/:prefix[?limit=20]
router.get("/kana-prefix/:prefix", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  try {
    res.json(await wordService.getKanaPrefix(req.params.prefix, limit));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/:id/langs  — all translations across every language
router.get("/:id/langs", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    res.json(await wordService.getAllLangsById(id));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/words/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const result = await wordService.getById(id);
    if (!result) return res.status(404).json({ error: "Word not found" });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
