// Lightweight PDF metadata + identity probe for mobile.
//
// React Native has no pdf.js runtime, so this can't fully parse a PDF.
// Instead we read the last chunk of the file (where the trailer + cross-
// reference table live) and scrape:
//
//   - /Title (…) from the /Info dictionary  →  human-readable title
//   - /ID [<hex> <hex>]                       →  document fingerprint
//
// This covers the overwhelmingly common case of well-formed PDFs with the
// trailer near the end. Linearized or unusual PDFs may put the info dict
// further forward; we accept the miss and fall back to filename.

import { File } from 'expo-file-system';
import { sha256 } from 'js-sha256';
import { bookFilePath } from './bookFiles';

export type PdfProbe = {
  /** Title from /Info /Title, decoded. Null when absent or unparseable. */
  title: string | null;
  /** SHA-256 of the raw PDF bytes. Same field name the backend matcher uses. */
  fileHash: string | null;
  /** First entry of the PDF /ID array (lowercase hex). Survives most
   *  metadata edits and resaves — equivalent to EPUB's dc_identifier. */
  contentHash: string | null;
};

// Read up to this many bytes from the end of the file. Most PDFs have the
// trailer + xref within the last 16–64 KB, even for large files.
const TAIL_BYTES = 128 * 1024;

/**
 * Probe a stored PDF for title + fingerprint. Best-effort: any failure
 * yields nulls, never throws.
 */
export async function probePdfFile(filename: string): Promise<PdfProbe> {
  try {
    const file = new File(bookFilePath(filename));
    if (!file.exists) return { title: null, fileHash: null, contentHash: null };

    // Read the whole file once: sha256 of the bytes is the `fileHash`,
    // and the trailing chunk is what carries the trailer /Info + /ID we
    // scrape for title and contentHash.
    const buf = await file.bytes();
    const fileHash = sha256(buf);
    const start = Math.max(0, buf.length - TAIL_BYTES);
    const tail = buf.subarray(start);
    const tailStr = bytesToLatin1(tail);

    return {
      title: extractTitle(tailStr),
      fileHash,
      contentHash: extractId(tailStr),
    };
  } catch {
    return { title: null, fileHash: null, contentHash: null };
  }
}

/** Convert bytes to a Latin-1 string. PDF tokens are ASCII; string contents
 *  may be UTF-16BE-with-BOM or PDFDocEncoding — we decode those separately. */
function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

/**
 * Pull `/ID [<hex> <hex>]` out of the trailer text and return the first
 * entry, lowercased. Whitespace inside the hex blocks (PDFs sometimes wrap)
 * is stripped.
 */
function extractId(s: string): string | null {
  // Greedy-match the bracketed ID array. `[\s\S]*?` keeps it line-agnostic.
  const m = /\/ID\s*\[\s*<([\s\S]*?)>\s*<([\s\S]*?)>\s*\]/.exec(s);
  if (!m) return null;
  const hex = m[1]!.replace(/\s+/g, '').toLowerCase();
  return /^[0-9a-f]+$/.test(hex) ? hex : null;
}

/**
 * Pull `/Title (...)` from the /Info dict. Returns the decoded title or
 * null. Handles two encodings:
 *   1. Literal strings `/Title (Hello World)` — PDFDocEncoding (≈ Latin-1).
 *   2. Hex strings `/Title <FEFF00480065006C006C006F>` — UTF-16BE w/ BOM.
 */
function extractTitle(s: string): string | null {
  // Hex form first — wrapped in <…>, optionally starting with FEFF (UTF-16
  // BE BOM). Many JP-language PDFs use this.
  const hexMatch = /\/Title\s*<\s*([0-9A-Fa-f\s]+)\s*>/.exec(s);
  if (hexMatch) {
    const hex = hexMatch[1]!.replace(/\s+/g, '');
    const decoded = decodeHexString(hex);
    if (decoded) return decoded;
  }
  // Literal form — parentheses, possibly with balanced inner parens and
  // backslash escapes.
  const litMatch = /\/Title\s*\(((?:[^()\\]|\\[\s\S]|\([^)]*\))*?)\)/.exec(s);
  if (litMatch) {
    const decoded = decodeLiteralString(litMatch[1]!);
    if (decoded) return decoded;
  }
  return null;
}

function decodeHexString(hex: string): string | null {
  if (hex.length % 2 !== 0) return null;
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  // UTF-16BE with optional BOM.
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = '';
    for (let i = 2; i < bytes.length - 1; i += 2) {
      out += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
    }
    return out.trim() || null;
  }
  // PDFDocEncoding ≈ Latin-1 for our purposes.
  return bytes
    .map((b) => String.fromCharCode(b))
    .join('')
    .trim() || null;
}

function decodeLiteralString(raw: string): string | null {
  // Resolve standard PDF escape sequences: \n \r \t \b \f \\ \( \) and \ddd.
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) break;
    if (next >= '0' && next <= '7') {
      // Octal escape, up to 3 digits.
      let digits = next;
      let j = i + 2;
      while (j < raw.length && j - (i + 1) < 3 && raw[j]! >= '0' && raw[j]! <= '7') {
        digits += raw[j];
        j++;
      }
      out += String.fromCharCode(parseInt(digits, 8));
      i = j - 1;
      continue;
    }
    switch (next) {
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 't': out += '\t'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case '\\': out += '\\'; break;
      case '(': out += '('; break;
      case ')': out += ')'; break;
      default: out += next;
    }
    i++;
  }
  return out.trim() || null;
}
