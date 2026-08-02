// Resource quotas + input length caps. One file so a limit change is one
// edit, and so the numbers are greppable when a 400/409 shows up in a log.
//
// WHY THESE EXIST: every user-supplied text column in this schema is
// Postgres `text` (unbounded), and no route counted rows before inserting.
// The only bound in the system was `express.json({ limit: "10kb" })`, which
// let a client write a 10 KB deck name and insert rows until the disk filled.
//
// The web client mirrors these numbers so the UI can disable a button
// instead of letting the user submit into a 400. Those mirrors live in
// `features/study/decks/lib/limits.ts` and `features/books/lib/limits.ts`
// — change a number here, change it there. The client copy is UX only;
// THIS file is the enforcement (a client limit is one `curl` away from
// being bypassed).

module.exports = {
  // ── Per-user resource quotas ───────────────────────────────────────────
  // Checked with a COUNT before every insert (see services/quotas.js).
  // Exceeding one returns 409 with a `code` the client can branch on.
  QUOTAS: {
    BOOKS_PER_USER: 50,
    DECKS_PER_USER: 50,
    CARDS_PER_DECK: 5000,
    BOOKMARKS_PER_BOOK: 500,
    DEVICES_PER_USER: 10,
  },

  // ── Text field lengths (characters, post-trim) ─────────────────────────
  TEXT: {
    DECK_NAME: 100,
    DECK_DESCRIPTION: 500,

    CARD_FRONT: 200,
    CARD_READING: 200,
    CARD_BACK: 2000,
    CARD_NOTES: 2000,
    CARD_CONTEXT: 2000,

    BOOK_TITLE: 500,
    BOOK_AUTHOR: 500,
    BOOK_FILENAME: 500,
    /** Hex colour or short token; the column default is '#4A4038'. */
    BOOK_COVER_COLOR: 32,
    /** CFI strings are the longest legitimate identity value we store. */
    BOOK_CFI: 2000,
    /** Hashes, PDF/XMP ids, DOI, ISBN, dc:identifier, language, publisher. */
    BOOK_IDENTITY_FIELD: 500,
    /** Free-text PDF /Producer — diagnostic only, but still user-supplied. */
    BOOK_PRODUCER: 500,

    BOOKMARK_LABEL: 100,

    DEVICE_ID: 128,
    DEVICE_NAME: 100,

    DISPLAY_NAME: 64,
    EMAIL: 254,
    /** BCP-47 tags are short; this is generous. */
    LANGUAGE: 16,
  },

  // ── Array bounds ───────────────────────────────────────────────────────
  ARRAYS: {
    /** `POST /api/books/match` candidates. Matching is O(candidates ×
     *  books × pages) on the event loop, so an unbounded array is a
     *  single-request stall. */
    MATCH_CANDIDATES: 200,
    /** `page_hashes` / `page_phashes` — one entry per (sampled) PDF page. */
    BOOK_PAGE_HASHES: 5000,
    /** Deck ids in a study-session request. */
    SESSION_DECK_IDS: 50,
  },

  // ── Numeric bounds ─────────────────────────────────────────────────────
  NUMBERS: {
    /** `avatar_index` indexes the kamon glyph set; the column is smallint. */
    AVATAR_INDEX_MAX: 999,
    /** `progress` is a 0–100 percentage (smallint column). */
    PROGRESS_MAX: 100,
    /** `spine_index` / `total_spine_items` are smallint columns. */
    SPINE_INDEX_MAX: 32767,
    /** PDF page count (int column) — well above any real book. */
    PAGE_COUNT_MAX: 100000,
    TEXT_LENGTH_MAX: 2147483647,
  },

  // ── Query `limit` clamps ───────────────────────────────────────────────
  // The dictionary routes did `parseInt(req.query.limit, 10) || 20` and
  // handed the result straight to `LIMIT $n`, so `?limit=999999999` on an
  // UNAUTHENTICATED endpoint returned the whole table. The pg pool defaults
  // to 10 connections; a handful of those requests exhausts it.
  LIMITS: {
    /** Max rows any public dictionary lookup will return. */
    DICTIONARY_RESULTS: 100,
    /** Max cards in one study session. Mirrors `MAX_SIZE` in the web
     *  client's SessionConfigSheet.tsx. */
    STUDY_SESSION: 200,
  },

  /** `cards.state` — the SRS ladder. Enforced by zod on write AND by a DB
   *  CHECK constraint (migration 024). Before both existed, a client could
   *  `PUT {state: "mastered"}` and skip the whole SRS progression, or write
   *  garbage that broke the stats aggregation and the web client's rank
   *  rendering. `lib/rankProgress.ts` and `cardSrsService.js` both assume
   *  the value is one of these four. */
  CARD_STATES: Object.freeze(["new", "seen", "learned", "mastered"]),
};
