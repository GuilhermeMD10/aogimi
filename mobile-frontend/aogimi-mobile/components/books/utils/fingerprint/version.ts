/**
 * Version of the fingerprinting algorithm produced by this codebase.
 *
 * Bump this **AND** document the breaking change here whenever any of
 * these surface-level outputs change in a way that produces different
 * hashes / detected_* values for the same input:
 *
 *   - hash.ts                          (sha256 inputs / encoding)
 *   - sanitize.ts                      (strip rules)
 *   - pdf/trailerScan.ts               (regex extraction)
 *   - pdf/decode.ts                    (PDF string decoder)
 *   - pdf/xmp.ts                       (XMP scrape regex)
 *   - epub/identity.ts + epub/opf.ts   (spine concatenation / OPF parse)
 *
 * Backend stores the version per book_progress row. Old rows keep their
 * original version so direct matches stay valid; future matcher revisions
 * can require version equality on the layers whose semantics actually
 * changed without invalidating earlier imports.
 *
 * Mirror this constant on the web side at
 * `web-frontend/aogimi-web/lib/fingerprint/version.ts` — both platforms
 * must agree on the version they produce for the same input.
 *
 * Version history:
 *   v1 — initial algorithm (phases 0-4 in the PDF identification rework).
 *        Mobile contributes file_hash + /ID + producer + XMP + EPUB
 *        identity; text-derived and visual fields stay null until a
 *        native PDF extractor is added.
 */
export const FINGERPRINT_VERSION = 1;
