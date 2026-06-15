// /api/books/* — book metadata + reading progress + bookmarks.
//
// Mounted under `authenticateJWT`; `req.user.userId` is the only source
// of truth for who's calling. The `userId` field in request bodies is
// IGNORED — present-but-ignored is the safe default during the client
// rollout. Every route that takes a `:id` (or path under it) verifies
// `bookOwnedBy(req.user.userId, id)` before doing anything; mismatch
// returns 404 to avoid leaking which book ids exist.

const { Router } = require("express");
const bookService = require("../services/bookService");
const bookmarkService = require("../services/bookmarkService");
const { requireUserMatch } = require("../middleware/authorize");
const { bookOwnedBy, bookmarkOwnedBy } = require("../services/ownership");

const router = Router();

// POST /api/books — register a new book for the calling user.
router.post("/", async (req, res) => {
  const { filename, title, author, coverColor, fileHash, contentHash, pdfIdOriginal, pdfIdCurrent, pageCount, hasTextLayer, producer, xmpDocumentId, xmpOriginalId, pageHashes, textLength, detectedDoi, detectedIsbn, pagePhashes, fingerprintVersion, dcIdentifier, language, publisher } = req.body;
  if (!filename || !title) {
    return res.status(400).json({ error: "filename and title are required" });
  }
  try {
    const book = await bookService.createBook(req.user.userId, { filename, title, author, coverColor, fileHash, contentHash, pdfIdOriginal, pdfIdCurrent, pageCount, hasTextLayer, producer, xmpDocumentId, xmpOriginalId, pageHashes, textLength, detectedDoi, detectedIsbn, pagePhashes, fingerprintVersion, dcIdentifier, language, publisher });
    return res.json(book);
  } catch (err) {
    return res.status(500).json({ error: "Create failed" });
  }
});

// POST /api/books/match — match candidates against the caller's library.
// Must be before /:id to avoid "match" being captured as a book id.
router.post("/match", async (req, res) => {
  const { books } = req.body;
  if (!Array.isArray(books)) {
    return res.status(400).json({ error: "books array is required" });
  }
  try {
    const results = await bookService.matchBooks(req.user.userId, books);
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
  const { cfiPosition, progress, spineIndex, totalSpineItems } = req.body;
  try {
    const book = await bookService.updateProgress(req.params.id, {
      cfiPosition, progress, spineIndex, totalSpineItems,
    });
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
  const { title } = req.body;
  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }
  try {
    const book = await bookService.updateTitle(req.params.id, title.trim());
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
  const { fileHash, contentHash, pdfIdOriginal, pdfIdCurrent, pageCount, hasTextLayer, producer, xmpDocumentId, xmpOriginalId, pageHashes, textLength, detectedDoi, detectedIsbn, pagePhashes, fingerprintVersion, dcIdentifier, language, publisher } = req.body;
  try {
    const book = await bookService.updateIdentity(req.params.id, {
      fileHash, contentHash, pdfIdOriginal, pdfIdCurrent, pageCount, hasTextLayer, producer, xmpDocumentId, xmpOriginalId, pageHashes, textLength, detectedDoi, detectedIsbn, pagePhashes, fingerprintVersion, dcIdentifier, language, publisher,
    });
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
  const { cfi, label } = req.body;
  if (!cfi) return res.status(400).json({ error: "cfi is required" });
  try {
    const bookmark = await bookmarkService.createBookmark(req.params.id, { cfi, label });
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
