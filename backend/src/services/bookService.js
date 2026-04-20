const bookRepo = require("../repositories/bookRepository");

async function createBook(userId, { filename, title, author, coverColor }) {
  // Check if user already has this book (by filename)
  const existing = await bookRepo.findBookByUserAndFilename(userId, filename);
  if (existing) {
    return existing;
  }
  return await bookRepo.createBook({ userId, filename, title, author, coverColor });
}

async function getUserBooks(userId) {
  const userBooks = await bookRepo.findBooksByUser(userId);
  if (!userBooks) throw new Error("User not found");
  if(userBooks.length === 0) return [];
  return userBooks;
}

async function getBook(id) {
  return await bookRepo.findBookById(id);
}

async function updateProgress(id, { cfiPosition, progress, spineIndex, totalSpineItems }) {
  const book = await bookRepo.updateBookProgress(id, { cfiPosition, progress, spineIndex, totalSpineItems });
  if (!book) throw new Error("Book not found");
  return book;
}

async function deleteBook(id) {
  const success = await bookRepo.deleteBook(id);
  if (!success) throw new Error("Book not found");
  return true;
}

module.exports = { createBook, getUserBooks, getBook, updateProgress, deleteBook };
