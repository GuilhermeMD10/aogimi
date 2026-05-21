const bookRepo = require("../repositories/bookRepository");

// Page-count tolerance for the ISBN match layer. The same ISBN re-issued
// with reformatted page numbering rarely shifts by more than a few percent.
const PAGE_COUNT_TOLERANCE = 0.05;

// Looser page-count tolerance for the visual match layer. Two visually
// similar PDFs of the same content can drift further (e.g. different page
// sizes adding extra blank pages), so this is more generous than the
// ISBN tolerance.
const VISUAL_PAGE_COUNT_TOLERANCE = 0.10;

// Maximum average hamming distance for the visual match layer. The 64-bit
// dHash + per-pair distance gives 0–64 per page; averaged across pages.
// 8 is the threshold the spec calls for — below it the images are
// definitely the same scene, above it they're either different content
// or a rendering pipeline that's drifted enough to be unreliable.
const VISUAL_MAX_HAMMING_DIST = 8;

async function createBook(userId, fields) {
  // Check if user already has this book (by filename)
  const existing = await bookRepo.findBookByUserAndFilename(userId, fields.filename);
  if (existing) {
    return existing;
  }
  return await bookRepo.createBook({ userId, ...fields });
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

async function updateIdentity(id, fields) {
  const book = await bookRepo.updateBookIdentity(id, fields);
  if (!book) throw new Error("Book not found");
  return book;
}

function withinPageCountTolerance(a, b, tolerance = PAGE_COUNT_TOLERANCE) {
  if (a == null || b == null) return false;
  const max = Math.max(a, b);
  if (max === 0) return false;
  return Math.abs(a - b) / max <= tolerance;
}

// 64-bit hamming distance over two hex-encoded phashes. Returns
// Number.MAX_SAFE_INTEGER for mismatched lengths so the average
// computation safely excludes garbage.
function hammingDistanceHex(hexA, hexB) {
  if (!hexA || !hexB || hexA.length !== hexB.length) return Number.MAX_SAFE_INTEGER;
  let dist = 0;
  for (let i = 0; i < hexA.length; i += 2) {
    const a = parseInt(hexA.slice(i, i + 2), 16);
    const b = parseInt(hexB.slice(i, i + 2), 16);
    if (Number.isNaN(a) || Number.isNaN(b)) return Number.MAX_SAFE_INTEGER;
    let xor = a ^ b;
    while (xor) {
      dist += xor & 1;
      xor >>>= 1;
    }
  }
  return dist;
}

// Pairwise average hamming distance, comparing first min(a, b) phashes.
// Different sampling lengths (different page counts) still yield a usable
// signal because the sampling is deterministic from page index 0 forward.
function averagePhashDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return Number.MAX_SAFE_INTEGER;
  const n = Math.min(a.length, b.length);
  if (n === 0) return Number.MAX_SAFE_INTEGER;
  let total = 0;
  for (let i = 0; i < n; i++) {
    total += hammingDistanceHex(a[i], b[i]);
  }
  return total / n;
}

async function matchBooks(userId, candidates) {
  // Fetch all books for this user in one query.
  const allBooks = await bookRepo.findBooksByUser(userId);

  return candidates.map((candidate) => {
    // Priority 1: exact file_hash — strongest possible match (same bytes).
    if (candidate.file_hash) {
      const match = allBooks.find((b) => b.file_hash && b.file_hash === candidate.file_hash);
      if (match) return { match, match_type: "file_hash" };
    }
    // Priority 2: XMP OriginalDocumentID — stable across exports/re-saves.
    // PDFs only (EPUBs leave this null).
    if (candidate.xmp_original_id) {
      const match = allBooks.find((b) => b.xmp_original_id && b.xmp_original_id === candidate.xmp_original_id);
      if (match) return { match, match_type: "xmp_original_id" };
    }
    // Priority 3: PDF trailer /ID[0] — survives metadata edits and most
    // resaves. PDFs only.
    if (candidate.pdf_id_original) {
      const match = allBooks.find((b) => b.pdf_id_original && b.pdf_id_original === candidate.pdf_id_original);
      if (match) return { match, match_type: "pdf_trailer_id" };
    }
    // Priority 4: DOI scraped from the first ~3 pages. PDFs only.
    if (candidate.detected_doi) {
      const match = allBooks.find((b) => b.detected_doi && b.detected_doi === candidate.detected_doi);
      if (match) return { match, match_type: "doi" };
    }
    // Priority 5: ISBN + page_count ±5%. Two ISBNs that match but with
    // wildly different page counts are likely two editions of the same
    // book — close enough to be the same content, distant enough that
    // the user's progress on one doesn't map cleanly to the other.
    if (candidate.detected_isbn && candidate.page_count != null) {
      const match = allBooks.find(
        (b) =>
          b.detected_isbn &&
          b.detected_isbn === candidate.detected_isbn &&
          withinPageCountTolerance(b.page_count, candidate.page_count)
      );
      if (match) return { match, match_type: "isbn" };
    }
    // Priority 6: content_hash —
    //   EPUB: spine-text SHA (survives repack noise).
    //   PDF:  SHA-256 of normalized extracted text (survives reformat,
    //         re-save, OCR variation; nulled for image-only PDFs).
    if (candidate.content_hash) {
      const match = allBooks.find((b) => b.content_hash && b.content_hash === candidate.content_hash);
      if (match) return { match, match_type: "content" };
    }
    // Priority 7: visual (perceptual hash). PDFs only. Last resort before
    // metadata falls back to title/filename matching — catches scanned PDFs
    // re-OCRed with different text layers and image-only documents that
    // none of the text-derived layers can fingerprint.
    if (
      Array.isArray(candidate.page_phashes) &&
      candidate.page_phashes.length > 0 &&
      candidate.page_count != null
    ) {
      const visualMatch = allBooks.find((b) => {
        if (!Array.isArray(b.page_phashes) || b.page_phashes.length === 0) return false;
        if (!withinPageCountTolerance(b.page_count, candidate.page_count, VISUAL_PAGE_COUNT_TOLERANCE)) {
          return false;
        }
        return averagePhashDistance(b.page_phashes, candidate.page_phashes) <= VISUAL_MAX_HAMMING_DIST;
      });
      if (visualMatch) return { match: visualMatch, match_type: "visual" };
    }
    // Priority 8–10: metadata fallbacks.
    const meta = candidate.metadata;
    if (meta) {
      if (meta.dc_identifier) {
        const match = allBooks.find((b) => b.dc_identifier && b.dc_identifier === meta.dc_identifier);
        if (match) return { match, match_type: "metadata" };
      }
      if (meta.title && meta.author) {
        const match = allBooks.find(
          (b) =>
            b.title.toLowerCase() === meta.title.toLowerCase() &&
            b.author.toLowerCase() === meta.author.toLowerCase()
        );
        if (match) return { match, match_type: "metadata" };
      }
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
