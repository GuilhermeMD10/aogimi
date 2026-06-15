// Minimal per-request logger.
//
// Format:  HH:MM:SS  METHOD PATH                 → STATUS  DURATIONms  [user:N]
//
// Only logs the request line — never bodies, headers, query strings,
// or the Authorization token. That keeps the log file safe to share
// (no credentials, no PII) while still giving enough signal to answer
// "did my request reach the server?" and "is this 401 my client or
// my server?".
//
// Colours only when stdout is a TTY (skipped when piped to a file or
// captured by a log collector). Severity by status class: 2xx green,
// 3xx cyan, 4xx yellow, 5xx red.

const useColor = process.stdout.isTTY;
const dim = (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);
const colorForStatus = (status) => {
  if (!useColor) return (s) => s;
  if (status >= 500) return (s) => `\x1b[31m${s}\x1b[0m`;
  if (status >= 400) return (s) => `\x1b[33m${s}\x1b[0m`;
  if (status >= 300) return (s) => `\x1b[36m${s}\x1b[0m`;
  return (s) => `\x1b[32m${s}\x1b[0m`;
};

function timestamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  // `finish` fires after the response is fully written (after any
  // error handler too). `close` covers client-aborted connections.
  // Use the first to land so a single request always logs exactly once.
  let logged = false;
  function done() {
    if (logged) return;
    logged = true;
    const ns = Number(process.hrtime.bigint() - start);
    const ms = (ns / 1e6).toFixed(0).padStart(4, " ");
    const status = res.statusCode;
    const colored = colorForStatus(status);
    // `req.user` is set by authenticateJWT for protected routes.
    // Public endpoints (auth, dictionary) don't have it.
    const userTag = req.user?.userId ? dim(` [user:${req.user.userId}]`) : "";
    const method = req.method.padEnd(6, " ");
    const path = req.originalUrl;
    // eslint-disable-next-line no-console
    console.log(
      `${dim(timestamp())}  ${method} ${path.padEnd(40, " ")} ${colored(`→ ${status}`)}  ${ms}ms${userTag}`,
    );
  }
  res.on("finish", done);
  res.on("close", done);
  next();
}

module.exports = { requestLogger };
