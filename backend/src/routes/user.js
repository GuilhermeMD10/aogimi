// /api/user/* — profile read/update/delete.
//
// Mounted under `authenticateJWT`, so `req.user.userId` is guaranteed
// present on every handler here. No route accepts a userId in the body
// or query — the token IS the identity. Where a `:id` path param
// appears, `requireUserMatch` cross-checks it against `req.user.userId`
// to prevent token-holder-A from reading or mutating token-holder-B's
// profile.

const { Router } = require("express");
const userService = require("../services/userService");
const authService = require("../services/authService");
const { requireUserMatch } = require("../middleware/authorize");
const { parseBody } = require("../validation/_helpers");
const { patchUserSchema } = require("../validation/user");

const router = Router();

// GET /api/user/:id — get a user's public profile. The token owner can
// only read their own profile; in the future this could be relaxed for
// public profile pages, but until then keep it locked down.
router.get("/:id", requireUserMatch({ from: "params", key: "id" }), async (req, res) => {
  try {
    const user = await userService.getProfile(req.user.userId);
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

// PATCH /api/user — update editable profile fields (display_name,
// email, language, avatar_index). The zod schema bounds every value and
// rejects unknown keys; the service layer's allow-list stays as defence in
// depth so a future caller that skips validation still can't write
// `password_hash` or `username`.
//
// The email unique index (`users_email_lower_idx`) makes a duplicate a
// legitimate client error, so 23505 is mapped to 409 rather than surfacing
// as the generic 500 it used to.
router.patch("/", async (req, res) => {
  const body = parseBody(patchUserSchema, req, res);
  if (!body) return;
  try {
    const user = await userService.updateProfile(req.user.userId, body.updates);
    return res.json(user);
  } catch (err) {
    if (err?.code === "EMAIL_TAKEN") {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: "Update failed" });
  }
});

// PUT /api/user/onboarding — mark onboarding complete for the current user.
router.put("/onboarding", async (req, res) => {
  const completed = !!req.body?.completed;
  try {
    await userService.setOnboardingCompleted(req.user.userId, completed);
    return res.json({ message: "OK" });
  } catch (err) {
    return res.status(500).json({ error: "Update failed" });
  }
});

// DELETE /api/user — delete the calling user's account (cascades to
// every user-data table via FK). Revokes all refresh tokens so any
// other open session is invalidated immediately.
router.delete("/", async (req, res) => {
  try {
    await authService.revokeAllSessions(req.user.userId);
    const ok = await userService.deleteUser(req.user.userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    return res.json({ message: "Account deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Delete failed" });
  }
});

module.exports = router;
