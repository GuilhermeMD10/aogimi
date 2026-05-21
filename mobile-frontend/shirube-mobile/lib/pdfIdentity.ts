// Re-export shim. Implementation lives in `lib/fingerprint/pdf/identity.ts`.
// Keeping this path stable means existing imports (bookFiles, HomeScreen
// import flow) don't need to move.
export { probePdfFile, type PdfProbe } from './fingerprint/pdf/identity';
