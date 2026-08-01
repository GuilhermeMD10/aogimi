// /api/stats/* — read-only aggregations for the global stats screen.
// Token identity only; queries are scoped to req.user.userId via the
// underlying repositories.

const { Router } = require("express");
const statsService = require("../services/statsService");

const router = Router();

router.get("/activity", async (req, res) => {
  try {
    const payload = await statsService.getActivity(req.user.userId);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

router.get("/cards", async (req, res) => {
  try {
    const payload = await statsService.getCards(req.user.userId);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

// `?deckId=` narrows the list to one deck. Validated here rather than left to
// Postgres: an unparseable uuid would reach the ::uuid cast and surface as a
// 500, which reads as a server fault for what is a bad request.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get("/recent-upgrades", async (req, res) => {
  const { deckId } = req.query;
  if (deckId !== undefined && !UUID_RE.test(String(deckId))) {
    return res.status(400).json({ error: "deckId must be a uuid" });
  }
  try {
    const payload = await statsService.getRecentUpgrades(
      req.user.userId,
      deckId === undefined ? null : String(deckId),
    );
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

module.exports = router;
