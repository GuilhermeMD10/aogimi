require("dotenv").config();
const app = require("./src/app");
const refreshTokenRepo = require("./src/repositories/refreshTokenRepository");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`jp-dict API listening on port ${PORT}`);
});

// ── Daily refresh-token cleanup ─────────────────────────────────────────────
// A new refresh_tokens row is inserted on every login and every rotation, so
// the table grows without bound. Expired or revoked rows can never authenticate
// again, so we hard-delete them once a day. This is one indexed DELETE per day —
// not a poll: the timer sits idle in the event loop between fires and costs
// nothing, and .unref() keeps it from holding the process open on its own.
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // once per day
const SWEEP_BOOT_DELAY_MS = 10 * 1000; // let startup settle, then clear backlog

async function sweepRefreshTokens() {
  try {
    const removed = await refreshTokenRepo.deleteExpiredAndRevoked();
    if (removed > 0) console.log(`[sweep] removed ${removed} dead refresh tokens`);
  } catch (err) {
    // Non-critical: a failed sweep just means rows linger until the next run.
    console.error("[sweep] refresh-token cleanup failed:", err.message);
  }
}

setTimeout(sweepRefreshTokens, SWEEP_BOOT_DELAY_MS).unref();
setInterval(sweepRefreshTokens, SWEEP_INTERVAL_MS).unref();
