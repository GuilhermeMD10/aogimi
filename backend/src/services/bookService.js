const bookRepo = require("../repositories/bookRepository");

async function createBook(userId, { filename, title, author, coverColor, totalPages }) {
  // Check if user already has this book (by filename)
  const existing = await bookRepo.findBookByUserAndFilename(userId, filename);
  if (existing) {
    return existing;
  }
  return await bookRepo.createBook({ userId, filename, title, author, coverColor, totalPages });
}

async function getUserBooks(userId) {
  return await bookRepo.findBooksByUser(userId);
}

async function getBook(id) {
  return await bookRepo.findBookById(id);
}

async function updateProgress(id, { cfiPosition, progress }) {
  const book = await bookRepo.updateBookProgress(id, { cfiPosition, progress });
  if (!book) throw new Error("Book not found");
  return book;
}

async function deleteBook(id) {
  const success = await bookRepo.deleteBook(id);
  if (!success) throw new Error("Book not found");
  return true;
}

module.exports = { createBook, getUserBooks, getBook, updateProgress, deleteBook };
