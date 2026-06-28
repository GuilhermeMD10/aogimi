// Re-export shim. Implementation lives in `lib/fingerprint/epub/identity.ts`.
// Keeping this path stable means existing imports (importBookWithMatch,
// locateAndAttachFile, bookStore, etc.) don't need to move.
export {
  extractEpubData,
  computeEpubIdentity,
  type EpubData,
  type EpubIdentity,
} from './fingerprint/epub/identity';
