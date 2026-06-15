// Verifies the `Authorization: Bearer <jwt>` header on every protected
// route. On success, attaches `req.user = { userId, username }` and
// hands off to the next middleware. On any failure (missing, malformed,
// expired, bad signature) returns 401 with a uniform body so the
// client's refresh-on-401 interceptor can react identically.

const jwt = require("jsonwebtoken");
const { ACCESS_SECRET } = require("../config/auth");

function authenticateJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    if (typeof payload !== "object" || !payload || typeof payload.userId !== "number") {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { userId: payload.userId, username: payload.username };
    return next();
  } catch (err) {
    // jwt.TokenExpiredError vs JsonWebTokenError — same response, the
    // client decides whether to attempt a /auth/refresh based on this
    // 401 either way. Surfacing the distinction would leak which case
    // hit without buying the client anything actionable.
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { authenticateJWT };
