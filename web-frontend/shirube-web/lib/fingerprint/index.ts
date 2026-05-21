// Public surface of the fingerprinting layer. Web side.
//
// Pure helpers (hash, sanitize) and format-specific identity entry points
// (PDF, EPUB). Designed to be mirrored on the mobile side so the matching
// surface stays identical across platforms — see
// `mobile-frontend/shirube-mobile/lib/fingerprint/`.

export { sha256Hex } from './hash';
export { stripControl } from './sanitize';
export { FINGERPRINT_VERSION } from './version';
export {
  extractPdfData,
  computePdfIdentity,
  type PdfData,
  type PdfIdentity,
} from './pdf/identity';
export {
  extractEpubData,
  computeEpubIdentity,
  type EpubData,
  type EpubIdentity,
} from './epub/identity';
