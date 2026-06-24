const { Router } = require("express");
const nameService = require("../services/nameService");

const router = Router();

// GET /api/names/kanji/:kanji
router.get("/kanji/:kanji", async (req, res) => {
  try {
    res.json(await nameService.getByKanji(req.params.kanji));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/names/kana/:kana
router.get("/kana/:kana", async (req, res) => {
  try {
    res.json(await nameService.getByKana(req.params.kana));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/names/kana-prefix/:prefix[?limit=20]
router.get("/kana-prefix/:prefix", async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  try {
    res.json(await nameService.getByKanaPrefix(req.params.prefix, limit));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/names/type/:type  — e.g. surname, place, masc, fem
router.get("/type/:type", async (req, res) => {
  try {
    res.json(await nameService.getByType(req.params.type));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/names/meaning?q=yamada
router.get("/meaning", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Query parameter q is required" });
  try {
    res.json(await nameService.getByMeaning(q));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
