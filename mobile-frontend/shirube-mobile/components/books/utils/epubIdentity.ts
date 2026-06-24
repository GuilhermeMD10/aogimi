// Re-export shim. Implementation lives in `lib/fingerprint/epub/identity.ts`.
// Keeping this path stable means existing imports (bookFiles, HomeScreen
// import flow) don't need to move.
export {
  probeEpubFile,
  type EpubIdentity,
  type EpubProbe,
} from './fingerprint/epub/identity';
