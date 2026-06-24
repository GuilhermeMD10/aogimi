const bookmarkRepo = require("../repositories/bookmarkRepository");

async function createBookmark(bookId, { cfi, label }) {
  return await bookmarkRepo.create({ bookId, cfi, label });
}

async function getBookmarks(bookId) {
  return await bookmarkRepo.findByBook(bookId);
}

async function deleteBookmark(id) {
  const success = await bookmarkRepo.delete(id);
  if (!success) throw new Error("Bookmark not found");
  return true;
}

module.exports = { createBookmark, getBookmarks, deleteBookmark };
