const { Router } = require("express");
const nameService = require("../services/nameService");

const router = Router();

router.get("/kanji/:kanji", async (req, res) => {
  try {
    const results = await nameService.getByKanji(req.params.kanji);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/kana/:kana", async (req, res) => {
  try {
    const results = await nameService.getByKana(req.params.kana);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
