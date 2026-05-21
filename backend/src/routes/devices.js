const { Router } = require("express");
const deviceService = require("../services/deviceService");
const { ensureUserExists } = require("../middleware/verifyUser");

const router = Router();

// POST /api/devices — register or update a device
router.post("/", async (req, res) => {
  const { userId, deviceId, name } = req.body;
  if (!userId || !deviceId) {
    return res.status(400).json({ error: "userId and deviceId are required" });
  }
  try {
    const device = await deviceService.registerDevice(userId, deviceId, name);
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devices/user/:userId — list all devices for a user
router.get("/user/:userId", async (req, res) => {
  if (!(await ensureUserExists(res, req.params.userId))) return;
  try {
    const devices = await deviceService.getUserDevices(parseInt(req.params.userId, 10));
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/devices/:deviceId — rename a device
router.put("/:deviceId", async (req, res) => {
  const { userId, name } = req.body;
  if (!userId || !name) {
    return res.status(400).json({ error: "userId and name are required" });
  }
  try {
    const device = await deviceService.renameDevice(req.params.deviceId, userId, name);
    res.json(device);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// DELETE /api/devices/:deviceId — remove a device
router.delete("/:deviceId", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId query param is required" });
  }
  try {
    await deviceService.removeDevice(req.params.deviceId, parseInt(userId, 10));
    res.json({ message: "Device removed" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/devices/:deviceId/books/:bookId/available — mark book available on device
router.post("/:deviceId/books/:bookId/available", async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  try {
    const row = await deviceService.markBookAvailable(userId, req.params.deviceId, req.params.bookId);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devices/:deviceId/books/:bookId/available — remove book availability
router.delete("/:deviceId/books/:bookId/available", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId query param is required" });
  }
  try {
    await deviceService.removeBookAvailability(parseInt(userId, 10), req.params.deviceId, req.params.bookId);
    res.json({ message: "Availability removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devices/:deviceId/books — get all user books with availability flag
router.get("/:deviceId/books", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId query param is required" });
  }
  if (!(await ensureUserExists(res, userId))) return;
  try {
    const books = await deviceService.getDeviceBooks(parseInt(userId, 10), req.params.deviceId);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
