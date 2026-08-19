// /api/books/* — book metadata + reading progress + bookmarks.
//
// Mounted under `authenticateJWT`; `req.user.userId` is the only source
// of truth for who's calling. Any `userId` field in request bodies is
// IGNORED. Every route that takes a `:id` (or path under it) verifies
// `bookOwnedBy(req.user.userId, id)` before doing anything; mismatch
// returns 404 to avoid leaking which book ids exist.

const { Router } = require("express");
const bookService = require("../services/bookService");
const bookmarkService = require("../services/bookmarkService");
const { requireUserMatch } = require("../middleware/authorize");
const { bookOwnedBy, bookmarkOwnedBy } = require("../services/ownership");
const quotas = require("../services/quotas");
const { parseBody } = require("../validation/_helpers");
const {
  createBookSchema,
  updateIdentitySchema,
  updateTitleSchema,
  progressSchema,
  createBookmarkSchema,
  matchSchema,
} = require("../validation/books");

const router = Router();

// POST /api/books — register a new book for the calling user.
//
// The quota check sits AFTER `createBook`'s dedup would have run, so it's
// done here against the count: `bookService.createBook` returns the existing
// row when (user, filename) already exists, and re-registering a book the
// user already has must not be refused. `alreadyRegistered` asks that
// question first so an at-quota user can still re-sync their own library.
router.post("/", async (req, res) => {
  const body = parseBody(createBookSchema, req, res);
  if (!body) return;
  try {
    const existing = await bookService.findByFilename(req.user.userId, body.filename);
    if (!existing && !(await quotas.enforce(res, quotas.bookQuota, req.user.userId))) {
      return;
    }
    const book = await bookService.createBook(req.user.userId, body);
    return res.json(book);
  } catch (err) {
    return res.status(500).json({ error: "Create failed" });
  }
});

// POST /api/books/match — match candidates against the caller's library.
// Must be before /:id to avoid "match" being captured as a book id.
//
// The array is length-capped by the schema: matching is a hamming-distance
// loop per candidate × per stored book × per sampled page, run synchronously,
// so an unbounded array stalls the event loop for every other request.
router.post("/match", async (req, res) => {
  const body = parseBody(matchSchema, req, res);
  if (!body) return;
  try {
    const results = await bookService.matchBooks(req.user.userId, body.books);
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: "Match failed" });
  }
});

// GET /api/books/user/:userId — list books for a user. The token user
// can only list their own books.
router.get(
  "/user/:userId",
  requireUserMatch({ from: "params", key: "userId" }),
  async (req, res) => {
    try {
      const books = await bookService.getUserBooks(req.user.userId);
      return res.json(books);
    } catch (err) {
      return res.status(500).json({ error: "List failed" });
    }
  },
);

// GET /api/books/:id — get a single book (only if it belongs to the caller).
router.get("/:id", async (req, res) => {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const book = await bookService.getBook(req.params.id);
    if (!book) return res.status(404).json({ error: "Not found" });
    return res.json(book);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

// PUT/POST /api/books/:id/progress — update reading progress.
async function handleProgressUpdate(req, res) {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  const body = parseBody(progressSchema, req, res);
  if (!body) return;
  try {
    const book = await bookService.updateProgress(req.params.id, body);
    return res.json(book);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
}
router.put("/:id/progress", handleProgressUpdate);
router.post("/:id/progress", handleProgressUpdate);

// PATCH /api/books/:id — update editable book metadata.
router.patch("/:id", async (req, res) => {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  const body = parseBody(updateTitleSchema, req, res);
  if (!body) return;
  try {
    const book = await bookService.updateTitle(req.params.id, body.title);
    return res.json(book);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

// PUT /api/books/:id/identity — update hash/metadata identity fields.
router.put("/:id/identity", async (req, res) => {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  const body = parseBody(updateIdentitySchema, req, res);
  if (!body) return;
  try {
    const book = await bookService.updateIdentity(req.params.id, body);
    return res.json(book);
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

// DELETE /api/books/:id
router.delete("/:id", async (req, res) => {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    await bookService.deleteBook(req.params.id);
    return res.json({ message: "Book deleted" });
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

// ── Bookmarks (nested under book) ───────────────────────────────────────────

router.post("/:id/bookmarks", async (req, res) => {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  const body = parseBody(createBookmarkSchema, req, res);
  if (!body) return;
  if (!(await quotas.enforce(res, quotas.bookmarkQuota, req.params.id))) return;
  try {
    const bookmark = await bookmarkService.createBookmark(req.params.id, body);
    return res.json(bookmark);
  } catch (err) {
    return res.status(500).json({ error: "Create failed" });
  }
});

router.get("/:id/bookmarks", async (req, res) => {
  if (!(await bookOwnedBy(req.user.userId, req.params.id))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const bookmarks = await bookmarkService.getBookmarks(req.params.id);
    return res.json(bookmarks);
  } catch (err) {
    return res.status(500).json({ error: "Read failed" });
  }
});

router.delete("/bookmarks/:bookmarkId", async (req, res) => {
  if (!(await bookmarkOwnedBy(req.user.userId, req.params.bookmarkId))) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    await bookmarkService.deleteBookmark(req.params.bookmarkId);
    return res.json({ message: "Bookmark deleted" });
  } catch (err) {
    return res.status(404).json({ error: "Not found" });
  }
});

module.exports = router;
