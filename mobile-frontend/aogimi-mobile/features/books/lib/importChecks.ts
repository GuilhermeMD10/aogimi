// The gate a file passes through before it becomes a book.
//
// There was no gate. The picker accepts `*/*` (it has to — EPUBs arrive with
// half a dozen different MIME types depending on where they came from), and
// whatever came back was copied into the books directory and hashed on the
// assumption it was a book. A .docx, a 2GB video or a truncated download all
// got that far, and the failure surfaced much later as a reader that would not
// open, with nothing left to explain why.
//
// Everything here runs BEFORE the file is committed to the books directory, so
// a rejected import leaves no trace on disk.

import { File } from 'expo-file-system';

/** Formats the reader can actually open. */
export const SUPPORTED_EXTENSIONS = ['epub', 'pdf'] as const;

/**
 * Ceiling on an imported file, in bytes.
 *
 * This is not a policy limit, it is a physical one: committing a file hashes it
 * with `source.bytes()`, which pulls the entire thing into JS memory at once.
 * A few hundred MB of Uint8Array on a phone is the point where the OS starts
 * killing the app instead of returning, and being told the file is too large is
 * a much better outcome than the app disappearing mid-import.
 *
 * 300 MB leaves room for the large image-heavy manga volumes this app is built
 * around while staying well inside that. Raising it means fixing the hashing to
 * stream first.
 */
export const MAX_IMPORT_BYTES = 300 * 1024 * 1024;

/** Enough bytes to recognise a container by its signature. */
const SIGNATURE_BYTES = 5;

export type ImportCheckFailure = {
  /** Stable identifier, for callers that want to branch rather than display. */
  code: 'unsupported-extension' | 'empty' | 'too-large' | 'unreadable' | 'wrong-format';
  /** Alert title, as an i18n key — this module has no `t()`; the caller translates. */
  title: string;
  /** Alert body, as an i18n key — written for the person who just picked the file. */
  message: string;
  /** Interpolation values for both keys. */
  params?: Record<string, string | number>;
};

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot < 0 ? '' : filename.slice(dot + 1).toLowerCase();
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

/** First bytes of the file, or null if it cannot be read at all. */
function readSignature(source: File): Uint8Array | null {
  let handle = null;
  try {
    handle = source.open();
    return handle.readBytes(SIGNATURE_BYTES);
  } catch {
    return null;
  } finally {
    try { handle?.close(); } catch { /* already gone */ }
  }
}

function startsWith(bytes: Uint8Array, ascii: string): boolean {
  if (bytes.length < ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (bytes[i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Check a picked file before anything is written for it.
 *
 * Returns null when the file is fine. Ordered cheapest-first, and each check is
 * definitive on its own: the extension is a string compare, the size is one
 * stat, and only the signature actually opens the file — for five bytes, not
 * for the whole thing.
 */
export function checkImportCandidate(source: File, filename: string): ImportCheckFailure | null {
  const ext = extensionOf(filename);

  if (!SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
    return {
      code: 'unsupported-extension',
      title: 'library.import.unsupportedTitle',
      message: ext ? 'library.import.unsupportedBody' : 'library.import.noExtensionBody',
      params: { ext },
    };
  }

  const size = source.size;

  if (size === 0) {
    return {
      code: 'empty',
      title: 'library.import.emptyTitle',
      message: 'library.import.emptyBody',
    };
  }

  if (size != null && size > MAX_IMPORT_BYTES) {
    return {
      code: 'too-large',
      title: 'library.import.tooLargeTitle',
      message: 'library.import.tooLargeBody',
      params: { size: formatMb(size), limit: formatMb(MAX_IMPORT_BYTES) },
    };
  }

  const signature = readSignature(source);
  if (!signature) {
    return {
      code: 'unreadable',
      title: 'library.import.unreadableTitle',
      message: 'library.import.unreadableBody',
    };
  }

  // An EPUB is a zip, and every zip starts "PK\x03\x04". A PDF starts "%PDF-".
  // This is what catches the file that is genuinely broken rather than merely
  // unexpected: a truncated download, an HTML error page saved with the wrong
  // name, a renamed .cbz.
  const looksRight = ext === 'pdf' ? startsWith(signature, '%PDF-') : startsWith(signature, 'PK\x03\x04');
  if (!looksRight) {
    return {
      code: 'wrong-format',
      title: 'library.import.invalidTitle',
      message: ext === 'pdf' ? 'library.import.invalidPdfBody' : 'library.import.invalidEpubBody',
      params: { ext, format: ext.toUpperCase() },
    };
  }

  return null;
}
