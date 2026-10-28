// Express 4 does not catch a rejected promise from an async handler: the
// rejection is unhandled, the request hangs, and on Node 15+ the process
// exits. Most handlers already try/catch their service call, but anything
// awaited BEFORE the try (ownership checks, quota checks, body parsing) is
// uncovered — a pool timeout there is a crash, not a 500.
//
// Wrapping every async handler forwards the rejection to `next(err)`, which
// lands in the terminal error handler in app.js. Express 5 does this itself;
// this is the one-liner until then.

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
