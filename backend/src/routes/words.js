const { Router } = require("express");
const wordService = require("../services/wordService");

const router = Router();

router.get("/meaning", async (req, res) => {
  const q = req.query.q;
  if (!q) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }
  try {
    const results = await wordService.getByMeaning(q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/kanji/:kanji", async (req, res) => {
  try {
    const results = await wordService.getByKanji(req.params.kanji);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/kana/:kana", async (req, res) => {
  try {
    const results = await wordService.getByKana(req.params.kana);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  try {
    const result = await wordService.getById(id);
    if (!result) {
      return res.status(404).json({ error: "Word not found" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
