// Zod schemas for /api/books/* (book metadata, progress, identity,
// and the match endpoint).
//
// The identity payloads are wide (23 fields). Most are hashes and ids
// produced by the client's fingerprinting pipeline, so they have a natural
// shape — capping them costs nothing and stops the columns being used as
// free storage.

const { z } = require("zod");
const { TEXT, ARRAYS, NUMBERS } = require("../config/limits");
const { requiredText, optionalText, nullableText } = require("./_helpers");

const identityField = (label) => nullableText(label, TEXT.BOOK_IDENTITY_FIELD);

const boundedInt = (label, max) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be an integer`)
    .min(0, `${label} must not be negative`)
    .max(max, `${label} must be at most ${max}`)
    .nullable()
    .optional();

// Per-page hash arrays. Bounded on both axes: array length (one entry per
// page) and per-entry length, so a 10 KB body can't become a wide row of
// long strings.
const hashArray = (label) =>
  z
    .array(z.string().max(TEXT.BOOK_IDENTITY_FIELD))
    .max(ARRAYS.BOOK_PAGE_HASHES, `${label} must have at most ${ARRAYS.BOOK_PAGE_HASHES} entries`)
    .nullable()
    .optional();

/** The identity/fingerprint half of a book payload — shared by POST /books
 *  and PUT /books/:id/identity, which take the same field set. */
const identityFields = {
  fileHash: identityField("fileHash"),
  contentHash: identityField("contentHash"),
  pdfIdOriginal: identityField("pdfIdOriginal"),
  pdfIdCurrent: identityField("pdfIdCurrent"),
  pageCount: boundedInt("pageCount", NUMBERS.PAGE_COUNT_MAX),
  hasTextLayer: z.boolean().nullable().optional(),
  producer: nullableText("producer", TEXT.BOOK_PRODUCER),
  xmpDocumentId: identityField("xmpDocumentId"),
  xmpOriginalId: identityField("xmpOriginalId"),
  pageHashes: hashArray("pageHashes"),
  textLength: boundedInt("textLength", NUMBERS.TEXT_LENGTH_MAX),
  detectedDoi: identityField("detectedDoi"),
  detectedIsbn: identityField("detectedIsbn"),
  pagePhashes: hashArray("pagePhashes"),
  fingerprintVersion: boundedInt("fingerprintVersion", 1000),
  dcIdentifier: identityField("dcIdentifier"),
  language: nullableText("language", TEXT.LANGUAGE),
  publisher: identityField("publisher"),
};

const createBookSchema = z.object({
  filename: requiredText("filename", TEXT.BOOK_FILENAME),
  title: requiredText("title", TEXT.BOOK_TITLE),
  author: optionalText("author", TEXT.BOOK_AUTHOR),
  coverColor: optionalText("coverColor", TEXT.BOOK_COVER_COLOR),
  ...identityFields,
});

const updateIdentitySchema = z.object(identityFields);

const updateTitleSchema = z.object({
  title: requiredText("title", TEXT.BOOK_TITLE),
});

// All four fields optional — the reader flushes partial payloads (a CFI
// without a percent, a "mark finished" that is only `{ progress: 100 }`) and
// the repository COALESCEs the rest.
const progressSchema = z
  .object({
    cfiPosition: nullableText("cfiPosition", TEXT.BOOK_CFI),
    progress: boundedInt("progress", NUMBERS.PROGRESS_MAX),
    spineIndex: boundedInt("spineIndex", NUMBERS.SPINE_INDEX_MAX),
    totalSpineItems: boundedInt("totalSpineItems", NUMBERS.SPINE_INDEX_MAX),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one progress field",
  });

// The match endpoint takes client-side fingerprints of files the user is
// importing. Candidate shape is snake_case (it mirrors the DB row the client
// compares against) and is deliberately permissive on unknown keys — the
// service reads only the fields it knows. The cap that matters is the array
// length: matching runs a hamming-distance loop per candidate × per stored
// book × per page, synchronously, so an unbounded array stalls the process.
const matchCandidateSchema = z
  .object({
    file_hash: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
    content_hash: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
    pdf_id_original: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
    xmp_original_id: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
    detected_doi: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
    detected_isbn: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
    page_count: z.number().int().min(0).max(NUMBERS.PAGE_COUNT_MAX).nullish(),
    page_phashes: z
      .array(z.string().max(TEXT.BOOK_IDENTITY_FIELD))
      .max(ARRAYS.BOOK_PAGE_HASHES)
      .nullish(),
    metadata: z
      .object({
        title: z.string().max(TEXT.BOOK_TITLE).nullish(),
        author: z.string().max(TEXT.BOOK_AUTHOR).nullish(),
        dc_identifier: z.string().max(TEXT.BOOK_IDENTITY_FIELD).nullish(),
        filename: z.string().max(TEXT.BOOK_FILENAME).nullish(),
      })
      .nullish(),
  })
  .loose();

const matchSchema = z.object({
  books: z
    .array(matchCandidateSchema, { error: "books array is required" })
    .max(
      ARRAYS.MATCH_CANDIDATES,
      `books must have at most ${ARRAYS.MATCH_CANDIDATES} entries`,
    ),
});

module.exports = {
  createBookSchema,
  updateIdentitySchema,
  updateTitleSchema,
  progressSchema,
  matchSchema,
};
