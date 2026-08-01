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

router.get("/recent-upgrades", async (req, res) => {
  try {
    const payload = await statsService.getRecentUpgrades(req.user.userId);
    return res.json(payload);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

module.exports = router;
