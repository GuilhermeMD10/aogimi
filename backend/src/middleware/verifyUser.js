const userRepo = require("../repositories/userRepository");

/**
 * Guard helper for routes whose payload is meaningless when the user has
 * been deleted from the database (library list, book match, device list,
 * etc). Call near the top of the handler:
 *
 *   if (!(await ensureUserExists(res, req.params.userId))) return;
 *
 * On a missing/invalid id this writes the response (400 or 401) and
 * returns false — the caller must `return;` immediately.
 *
 * The 401 carries `{ error: "USER_NOT_FOUND" }`. The web frontend's
 * `lib/api.ts` interceptor watches for that exact status+code pair and
 * triggers a local session wipe + sign-out so a deleted account doesn't
 * keep operating against stale local state. Don't change the error
 * string without updating the frontend interceptor in lockstep.
 */
async function ensureUserExists(res, userId) {
  const id = Number.parseInt(userId, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid userId" });
    return false;
  }
  const exists = await userRepo.existsById(id);
  if (!exists) {
    res.status(401).json({ error: "USER_NOT_FOUND" });
    return false;
  }
  return true;
}

module.exports = { ensureUserExists };
