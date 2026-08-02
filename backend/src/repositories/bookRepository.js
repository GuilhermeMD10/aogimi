const pool = require("../db");

module.exports = {
  // ── book_progress ─────────────────────────────────────────────────────────

  createBook: async ({ userId, filename, title, author, coverColor, fileHash, contentHash, pdfIdOriginal, pdfIdCurrent, pageCount, hasTextLayer, producer, xmpDocumentId, xmpOriginalId, pageHashes, textLength, detectedDoi, detectedIsbn, pagePhashes, fingerprintVersion, dcIdentifier, language, publisher }) => {
    const result = await pool.query(
      `INSERT INTO book_progress (user_id, filename, title, author, cover_color, file_hash, content_hash, pdf_id_original, pdf_id_current, page_count, has_text_layer, producer, xmp_document_id, xmp_original_id, page_hashes, text_length, detected_doi, detected_isbn, page_phashes, fingerprint_version, dc_identifier, language, publisher)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, COALESCE($20, 1), $21, $22, $23)
       RETURNING *`,
      [userId, filename, title, author || "", coverColor || "#4A4038", fileHash || null, contentHash || null, pdfIdOriginal || null, pdfIdCurrent || null, pageCount ?? null, hasTextLayer ?? null, producer || null, xmpDocumentId || null, xmpOriginalId || null, pageHashes ?? null, textLength ?? null, detectedDoi || null, detectedIsbn || null, pagePhashes ?? null, fingerprintVersion ?? null, dcIdentifier || null, language || null, publisher || null]
    );
    return result.rows[0];
  },

  /** How many books this user has registered. Backs the per-user book
   *  quota — `book_progress` rows are wide (23 identity columns plus two
   *  text[] hash arrays), so counting in SQL rather than measuring
   *  findBooksByUser().length keeps the check cheap. */
  countBooksByUser: async (userId) => {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM book_progress WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0]?.count ?? 0;
  },

  findBooksByUser: async (userId) => {
    const result = await pool.query(
      `SELECT * FROM book_progress WHERE user_id = $1 ORDER BY last_read_at DESC`,
      [userId]
    );
    return result.rows;
  },

  findBookById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM book_progress WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  findBookByUserAndFilename: async (userId, filename) => {
    const result = await pool.query(
      `SELECT * FROM book_progress WHERE user_id = $1 AND filename = $2`,
      [userId, filename]
    );
    return result.rows[0];
  },

  updateBookProgress: async (id, { cfiPosition, progress, spineIndex, totalSpineItems }) => {
    const result = await pool.query(
      `UPDATE book_progress
       SET cfi_position      = COALESCE($2, cfi_position),
           progress           = COALESCE($3, progress),
           spine_index        = COALESCE($4, spine_index),
           total_spine_items  = COALESCE($5, total_spine_items),
           last_read_at       = now()
       WHERE id = $1
       RETURNING *`,
      [id, cfiPosition ?? null, progress ?? null, spineIndex ?? null, totalSpineItems ?? null]
    );
    return result.rows[0];
  },

  updateBookTitle: async (id, title) => {
    const result = await pool.query(
      `UPDATE book_progress SET title = $2 WHERE id = $1 RETURNING *`,
      [id, title]
    );
    return result.rows[0];
  },

  updateBookIdentity: async (id, { fileHash, contentHash, pdfIdOriginal, pdfIdCurrent, pageCount, hasTextLayer, producer, xmpDocumentId, xmpOriginalId, pageHashes, textLength, detectedDoi, detectedIsbn, pagePhashes, fingerprintVersion, dcIdentifier, language, publisher }) => {
    const result = await pool.query(
      `UPDATE book_progress
       SET file_hash           = COALESCE($2,  file_hash),
           content_hash        = COALESCE($3,  content_hash),
           pdf_id_original     = COALESCE($4,  pdf_id_original),
           pdf_id_current      = COALESCE($5,  pdf_id_current),
           page_count          = COALESCE($6,  page_count),
           has_text_layer      = COALESCE($7,  has_text_layer),
           producer            = COALESCE($8,  producer),
           xmp_document_id     = COALESCE($9,  xmp_document_id),
           xmp_original_id     = COALESCE($10, xmp_original_id),
           page_hashes         = COALESCE($11, page_hashes),
           text_length         = COALESCE($12, text_length),
           detected_doi        = COALESCE($13, detected_doi),
           detected_isbn       = COALESCE($14, detected_isbn),
           page_phashes        = COALESCE($15, page_phashes),
           fingerprint_version = COALESCE($16, fingerprint_version),
           dc_identifier       = COALESCE($17, dc_identifier),
           language            = COALESCE($18, language),
           publisher           = COALESCE($19, publisher)
       WHERE id = $1
       RETURNING *`,
      [id, fileHash ?? null, contentHash ?? null, pdfIdOriginal ?? null, pdfIdCurrent ?? null, pageCount ?? null, hasTextLayer ?? null, producer ?? null, xmpDocumentId ?? null, xmpOriginalId ?? null, pageHashes ?? null, textLength ?? null, detectedDoi ?? null, detectedIsbn ?? null, pagePhashes ?? null, fingerprintVersion ?? null, dcIdentifier ?? null, language ?? null, publisher ?? null]
    );
    return result.rows[0];
  },

  deleteBook: async (id) => {
    const result = await pool.query(
      `DELETE FROM book_progress WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0;
  },
};
