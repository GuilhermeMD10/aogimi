const { Router } = require("express");
const kanjiService = require("../services/kanjiService");

const router = Router();

router.get("/", async (req, res) => {
  const { grade, strokes } = req.query;

  if (grade !== undefined) {
    const g = parseInt(grade, 10);
    if (isNaN(g) || g < 1 || g > 8) {
      return res.status(400).json({ error: "grade must be an integer between 1 and 8" });
    }
    try {
      const results = await kanjiService.getByGrade(g);
      return res.json(results);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (strokes !== undefined) {
    const s = parseInt(strokes, 10);
    if (isNaN(s) || s < 1) {
      return res.status(400).json({ error: "strokes must be a positive integer" });
    }
    try {
      const results = await kanjiService.getByStrokeCount(s);
      return res.json(results);
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.status(400).json({ error: "Provide grade or strokes query parameter" });
});

router.get("/:literal", async (req, res) => {
  try {
    const result = await kanjiService.getByLiteral(req.params.literal);
    if (!result) {
      return res.status(404).json({ error: "Kanji not found" });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
