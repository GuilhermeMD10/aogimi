// /api/devices/* — per-device book availability tracking.
//
// All ownership flows through `req.user.userId`. `userId` in body /
// query is ignored. Device + availability rows are scoped by user_id
// at the (deviceId, userId) compound primary key, so a stale-id
// request from user A targeting user B's device just returns 404.

const { Router } = require("express");
const deviceService = require("../services/deviceService");
const { deviceOwnedBy, bookOwnedBy } = require("../services/ownership");
const quotas = require("../services/quotas");
const { parseBody } = require("../validation/_helpers");
const {
  registerDeviceSchema,
  renameDeviceSchema,
} = require("../validation/devices");

const router = Router();

// POST /api/devices — register or update a device for the calling user.
//
// `deviceId` is client-generated, so the schema constrains its charset as
// well as its length — it travels in URLs and in the book_availability FK.
// The quota is a no-op for a device the user already has (registration is an
// upsert, and every app boot calls it).
router.post("/", async (req, res) => {
  const body = parseBody(registerDeviceSchema, req, res);
  if (!body) return;
  if (!(await quotas.enforce(res, quotas.deviceQuota, req.user.userId, body.deviceId))) {
    return;
  }
  try {
    const device = await deviceService.registerDevice(req.user.userId, body.deviceId, body.name);
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
  const body = parseBody(renameDeviceSchema, req, res);
  if (!body) return;
  try {
    const device = await deviceService.renameDevice(req.params.deviceId, req.user.userId, body.name);
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
