// /api/devices/* — per-device book availability tracking.
//
// All ownership flows through `req.user.userId`. `userId` in body /
// query is ignored. Device + availability rows are scoped by user_id
// at the (deviceId, userId) compound primary key, so a stale-id
// request from user A targeting user B's device just returns 404.

const { Router } = require("express");
const deviceService = require("../services/deviceService");
const { deviceOwnedBy, bookOwnedBy } = require("../services/ownership");

const router = Router();

// POST /api/devices — register or update a device for the calling user.
router.post("/", async (req, res) => {
  const { deviceId, name } = req.body;
  if (!deviceId) return res.status(400).json({ error: "deviceId is required" });
  try {
    const device = await deviceService.registerDevice(req.user.userId, deviceId, name);
    return res.json(device);
  } catch (err) {
    return res.status(500).json({ error: "Register failed" });
  }
});

router.get("/user/:userId", async (req, res) => {
  const requested = parseInt(req.params.userId, 10);
  if (!Number.isFinite(requested) || requested !== req.user.userId) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const devices = await deviceService.getUserDevices(req.user.userId);
    return res.json(devices);
  } catch (err) {
    return res.status(500).json({ error: "List failed" });
  }
});

router.put("/:deviceId", async (req, res) => {
  if (!(await deviceOwnedBy(req.user.userId, req.params.deviceId))) {
    return res.status(404).json({ error: "Not found" });
  }
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const device = await deviceService.renameDevice(req.params.deviceId, req.user.userId, name);
    return res.json(device);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

router.delete("/:deviceId", async (req, res) => {
  if (!(await deviceOwnedBy(req.user.userId, req.params.deviceId))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    await deviceService.removeDevice(req.params.deviceId, req.user.userId);
    return res.json({ message: "Device removed" });
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

// ── Per-device book availability ────────────────────────────────────────────

router.post("/:deviceId/books/:bookId/available", async (req, res) => {
  if (!(await deviceOwnedBy(req.user.userId, req.params.deviceId))) {
    return res.status(404).json({ error: "Not found" });
  }
  if (!(await bookOwnedBy(req.user.userId, req.params.bookId))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const row = await deviceService.markBookAvailable(req.user.userId, req.params.deviceId, req.params.bookId);
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ error: "Mark failed" });
  }
});

router.delete("/:deviceId/books/:bookId/available", async (req, res) => {
  if (!(await deviceOwnedBy(req.user.userId, req.params.deviceId))) {
    return res.status(404).json({ error: "Not found" });
  }
  if (!(await bookOwnedBy(req.user.userId, req.params.bookId))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    await deviceService.removeBookAvailability(req.user.userId, req.params.deviceId, req.params.bookId);
    return res.json({ message: "Availability removed" });
  } catch (err) {
    return res.status(500).json({ error: "Remove failed" });
  }
});

router.get("/:deviceId/books", async (req, res) => {
  if (!(await deviceOwnedBy(req.user.userId, req.params.deviceId))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const books = await deviceService.getDeviceBooks(req.user.userId, req.params.deviceId);
    return res.json(books);
  } catch (err) {
    return res.status(500).json({ error: "List failed" });
  }
});

module.exports = router;
