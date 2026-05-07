const { Router } = require("express");
const bookService = require("../services/bookService");
const bookmarkService = require("../services/bookmarkService");

const router = Router();

// POST /api/books — register a new book for a user
router.post("/", async (req, res) => {
  const { userId, filename, title, author, coverColor, fileHash, contentHash, dcIdentifier, language, publisher } = req.body;
  if (!userId || !filename || !title) {
    return res.status(400).json({ error: "userId, filename, and title are required" });
  }
  try {
    const book = await bookService.createBook(userId, { filename, title, author, coverColor, fileHash, contentHash, dcIdentifier, language, publisher });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/books/match — match an array of books by hash/metadata
// Must be before /:id to avoid "match" being captured as a book ID
router.post("/match", async (req, res) => {
  const { userId, books } = req.body;
  if (!userId || !Array.isArray(books)) {
    return res.status(400).json({ error: "userId and books array are required" });
  }
  try {
    const results = await bookService.matchBooks(userId, books);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/user/:userId — list all books for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const books = await bookService.getUserBooks(parseInt(req.params.userId, 10));
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/:id — get a single book
router.get("/:id", async (req, res) => {
  try {
    const book = await bookService.getBook(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT/POST /api/books/:id/progress — update reading progress
// POST supported for navigator.sendBeacon() compatibility
async function handleProgressUpdate(req, res) {
  const { cfiPosition, progress, spineIndex, totalSpineItems } = req.body;
  try {
    const book = await bookService.updateProgress(req.params.id, {
      cfiPosition, progress, spineIndex, totalSpineItems,
    });
    res.json(book);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}
router.put("/:id/progress", handleProgressUpdate);
router.post("/:id/progress", handleProgressUpdate);

// PATCH /api/books/:id — update editable book metadata (currently: title)
router.patch("/:id", async (req, res) => {
  const { title } = req.body;
  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }
  try {
    const book = await bookService.updateTitle(req.params.id, title.trim());
    res.json(book);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// PUT /api/books/:id/identity — update hash/metadata identity fields
router.put("/:id/identity", async (req, res) => {
  const { fileHash, contentHash, dcIdentifier, language, publisher } = req.body;
  try {
    const book = await bookService.updateIdentity(req.params.id, {
      fileHash, contentHash, dcIdentifier, language, publisher,
    });
    res.json(book);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// DELETE /api/books/:id — delete a book
router.delete("/:id", async (req, res) => {
  try {
    await bookService.deleteBook(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ── Bookmarks (nested under book) ───────────────────────────────────────────

// POST /api/books/:id/bookmarks — create bookmark
router.post("/:id/bookmarks", async (req, res) => {
  const { cfi, label } = req.body;
  if (!cfi) {
    return res.status(400).json({ error: "cfi is required" });
  }
  try {
    const bookmark = await bookmarkService.createBookmark(req.params.id, { cfi, label });
    res.json(bookmark);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/books/:id/bookmarks — list bookmarks for a book
router.get("/:id/bookmarks", async (req, res) => {
  try {
    const bookmarks = await bookmarkService.getBookmarks(req.params.id);
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/books/bookmarks/:bookmarkId — delete a bookmark
router.delete("/bookmarks/:bookmarkId", async (req, res) => {
  try {
    await bookmarkService.deleteBookmark(req.params.bookmarkId);
    res.json({ message: "Bookmark deleted" });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
