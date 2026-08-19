// Authorization helpers — assume `authenticateJWT` already attached
// `req.user.userId`. The middleware below cross-checks that against
// whatever userId the route is operating on (path param, body, or
// query) and 403s on mismatch.
//
// Without this, a valid token holder could read or mutate any other
// user's data by changing the `:userId` in the URL — the JWT identity
// check would still pass. This is the difference between auth-N and
// auth-Z.

function requireUserMatch({ from = "params", key = "userId" } = {}) {
  return (req, res, next) => {
    if (!req.user || typeof req.user.userId !== "number") {
      // Should never happen if authenticateJWT ran first — fail
      // closed if a route forgot to chain.
      return res.status(401).json({ error: "Authentication required" });
    }
    const raw = req[from]?.[key];
    const requested = typeof raw === "string" ? parseInt(raw, 10) : raw;
    if (!Number.isFinite(requested)) {
      return res.status(400).json({ error: `Missing ${key}` });
    }
    if (requested !== req.user.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

module.exports = { requireUserMatch };
