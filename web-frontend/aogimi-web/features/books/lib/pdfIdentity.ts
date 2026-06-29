// Re-export shim. Implementation lives in `lib/fingerprint/pdf/identity.ts`.
// Keeping this path stable means existing imports (importBookWithMatch,
// locateAndAttachFile, RestoreBooks, etc.) don't need to move.
export {
  extractPdfData,
  computePdfIdentity,
  type PdfData,
  type PdfIdentity,
} from './fingerprint/pdf/identity';
