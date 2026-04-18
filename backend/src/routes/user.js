
const { Router } = require("express");
const userService = require("../services/userService");

const router = Router();

// POST /api/user/create
router.post("/create", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const user = await userService.createUser(username, password);
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/info
router.post("/info", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const user = await userService.getUserInfo(username, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/update
router.post("/update", async (req, res) => {
  const { username, password, updates } = req.body;
  if (!username || !password || !updates) {
    return res.status(400).json({ error: "Username, password, and updates are required" });
  }
  try {
    const user = await userService.updateUser(username, password, updates);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    res.json({ id: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/delete
router.post("/delete", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }
  try {
    const success = await userService.deleteUser(username, password);
    if (!success) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;