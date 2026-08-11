// Public surface of the fingerprinting layer. Mobile side.
//
// Pure helpers (hash, sanitize, pdf/decode, pdf/trailerScan) and
// format-specific probe entry points (PDF, EPUB). The pure helpers are
// byte-identical to the web side (`web-frontend/aogimi-web/lib/fingerprint/`)
// — keep them in sync manually so matching results agree across platforms.

export { sha256Hex } from './hash';
export { stripControl } from './sanitize';
export { FINGERPRINT_VERSION } from './version';
export {
  probePdfFile,
  type PdfProbe,
} from './pdf/identity';
export {
  probeEpubFile,
  type EpubIdentity,
  type EpubProbe,
} from './epub/identity';
