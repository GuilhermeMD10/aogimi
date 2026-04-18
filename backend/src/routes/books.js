const { Router } = require("express");
const bookService = require("../services/bookService");
const bookmarkService = require("../services/bookmarkService");

const router = Router();

// POST /api/books — register a new book for a user
router.post("/", async (req, res) => {
  const { userId, filename, title, author, coverColor, totalPages } = req.body;
  if (!userId || !filename || !title) {
    return res.status(400).json({ error: "userId, filename, and title are required" });
  }
  try {
    const book = await bookService.createBook(userId, { filename, title, author, coverColor, totalPages });
    res.json(book);
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

// PUT /api/books/:id/progress — update reading progress
router.put("/:id/progress", async (req, res) => {
  const { cfiPosition, progress } = req.body;
  try {
    const book = await bookService.updateProgress(req.params.id, { cfiPosition, progress });
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
