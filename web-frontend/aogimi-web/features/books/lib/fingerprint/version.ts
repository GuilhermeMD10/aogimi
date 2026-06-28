/**
 * Version of the fingerprinting algorithm produced by this codebase.
 *
 * Bump this **AND** document the breaking change here whenever any of
 * these surface-level outputs change in a way that produces different
 * hashes / detected_* values for the same input:
 *
 *   - hash.ts                          (sha256 inputs / encoding)
 *   - sanitize.ts                      (strip rules)
 *   - pdf/normalize.ts                 (NFC / case / punctuation /
 *                                      whitespace / header-footer logic)
 *   - pdf/detect.ts                    (DOI / ISBN regex + validation)
 *   - pdf/phash.ts                     (sampling / downsample / dHash)
 *   - pdf/identity.ts                  (line reconstruction, grayscale
 *                                      conversion, render width)
 *   - pdf/trailerScan.ts (mobile)      (regex extraction)
 *   - pdf/decode.ts (mobile)           (PDF string decoder)
 *   - pdf/xmp.ts                       (XMP scrape regex)
 *   - epub/identity.ts + epub/opf.ts   (spine concatenation / OPF parse)
 *
 * Backend stores the version per book_progress row. Old rows keep their
 * original version so direct matches stay valid; future matcher revisions
 * can require version equality on the layers whose semantics actually
 * changed (e.g. "content_hash matching only fires within the same
 * fingerprint_version") without invalidating earlier imports.
 *
 * Mirror this constant on the mobile side at
 * `mobile-frontend/aogimi-mobile/lib/fingerprint/version.ts` — both
 * platforms must agree on the version they produce for the same input.
 *
 * Version history:
 *   v1 — initial algorithm (phases 0-4 in the PDF identification rework).
 */
export const FINGERPRINT_VERSION = 1;
