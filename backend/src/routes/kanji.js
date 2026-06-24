const { Router } = require("express");
const kanjiService = require("../services/kanjiService");

const router = Router();

// GET /api/kanji?grade=2
// GET /api/kanji?grade=1-6        (elementary range)
// GET /api/kanji?strokes=9
// GET /api/kanji?strokes=8-12     (range)
// GET /api/kanji?radical=72
// GET /api/kanji?meaning=water
// GET /api/kanji?on=ショク
// GET /api/kanji?kun=た.べ
router.get("/", async (req, res) => {
  const { grade, strokes, radical, meaning, on, kun } = req.query;

  try {
    if (grade !== undefined) {
      if (grade.includes("-")) {
        const [a, b] = grade.split("-").map(Number);
        if (isNaN(a) || isNaN(b) || a < 1 || b > 10 || a > b)
          return res.status(400).json({ error: "grade range must be two integers between 1 and 10" });
        return res.json(await kanjiService.getByGradeRange(a, b));
      }
      const g = parseInt(grade, 10);
      if (isNaN(g) || g < 1 || g > 10)
        return res.status(400).json({ error: "grade must be an integer between 1 and 10" });
      return res.json(await kanjiService.getByGrade(g));
    }

    if (strokes !== undefined) {
      if (strokes.includes("-")) {
        const [a, b] = strokes.split("-").map(Number);
        if (isNaN(a) || isNaN(b) || a < 1 || a > b)
          return res.status(400).json({ error: "strokes range must be two positive integers" });
        return res.json(await kanjiService.getByStrokeRange(a, b));
      }
      const s = parseInt(strokes, 10);
      if (isNaN(s) || s < 1)
        return res.status(400).json({ error: "strokes must be a positive integer" });
      return res.json(await kanjiService.getByStrokeCount(s));
    }

    if (radical !== undefined) {
      const r = parseInt(radical, 10);
      if (isNaN(r) || r < 1)
        return res.status(400).json({ error: "radical must be a positive integer" });
      return res.json(await kanjiService.getByRadical(r));
    }

    if (meaning !== undefined) {
      if (!meaning.trim()) return res.status(400).json({ error: "meaning must not be empty" });
      return res.json(await kanjiService.getByMeaning(meaning));
    }

    if (on !== undefined) {
      if (!on.trim()) return res.status(400).json({ error: "on must not be empty" });
      return res.json(await kanjiService.getByOnReading(on));
    }

    if (kun !== undefined) {
      if (!kun.trim()) return res.status(400).json({ error: "kun must not be empty" });
      return res.json(await kanjiService.getByKunReading(kun));
    }

    res.status(400).json({ error: "Provide one of: grade, strokes, radical, meaning, on, kun" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/kanji/:literal
router.get("/:literal", async (req, res) => {
  try {
    const result = await kanjiService.getByLiteral(req.params.literal);
    if (!result) return res.status(404).json({ error: "Kanji not found" });
    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
