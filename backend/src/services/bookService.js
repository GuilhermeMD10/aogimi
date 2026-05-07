const bookRepo = require("../repositories/bookRepository");

async function createBook(userId, { filename, title, author, coverColor, fileHash, contentHash, dcIdentifier, language, publisher }) {
  // Check if user already has this book (by filename)
  const existing = await bookRepo.findBookByUserAndFilename(userId, filename);
  if (existing) {
    return existing;
  }
  return await bookRepo.createBook({ userId, filename, title, author, coverColor, fileHash, contentHash, dcIdentifier, language, publisher });
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

async function updateTitle(id, title) {
  const book = await bookRepo.updateBookTitle(id, title);
  if (!book) throw new Error("Book not found");
  return book;
}

async function updateIdentity(id, { fileHash, contentHash, dcIdentifier, language, publisher }) {
  const book = await bookRepo.updateBookIdentity(id, { fileHash, contentHash, dcIdentifier, language, publisher });
  if (!book) throw new Error("Book not found");
  return book;
}

async function matchBooks(userId, candidates) {
  // Fetch all books for this user in one query
  const allBooks = await bookRepo.findBooksByUser(userId);

  return candidates.map((candidate) => {
    // Priority 1: exact file_hash
    if (candidate.file_hash) {
      const match = allBooks.find((b) => b.file_hash && b.file_hash === candidate.file_hash);
      if (match) return { match, match_type: "file_hash" };
    }
    // Priority 2: exact content_hash
    if (candidate.content_hash) {
      const match = allBooks.find((b) => b.content_hash && b.content_hash === candidate.content_hash);
      if (match) return { match, match_type: "content" };
    }
    // Priority 3: dc_identifier
    const meta = candidate.metadata;
    if (meta) {
      if (meta.dc_identifier) {
        const match = allBooks.find((b) => b.dc_identifier && b.dc_identifier === meta.dc_identifier);
        if (match) return { match, match_type: "metadata" };
      }
      // Priority 4: title + author (case-insensitive)
      if (meta.title && meta.author) {
        const match = allBooks.find(
          (b) =>
            b.title.toLowerCase() === meta.title.toLowerCase() &&
            b.author.toLowerCase() === meta.author.toLowerCase()
        );
        if (match) return { match, match_type: "metadata" };
      }
      // Priority 5: filename
      if (meta.filename) {
        const match = allBooks.find((b) => b.filename === meta.filename);
        if (match) return { match, match_type: "filename" };
      }
    }
    return null;
  });
}

async function deleteBook(id) {
  const success = await bookRepo.deleteBook(id);
  if (!success) throw new Error("Book not found");
  return true;
}

module.exports = { createBook, getUserBooks, getBook, updateProgress, updateTitle, updateIdentity, matchBooks, deleteBook };
