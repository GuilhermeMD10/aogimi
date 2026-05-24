import { decodeHexString, decodeLiteralString } from './decode';

/** Convert bytes to a Latin-1 string. PDF tokens are ASCII; string contents
 *  may be UTF-16BE-with-BOM or PDFDocEncoding — those are decoded separately
 *  by `decodeBytes`. */
export function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

/**
 * Pull `/ID [<hex> <hex>]` out of trailer text. Returns both entries
 * (lowercase hex) when present.
 *
 * - `original` is /ID[0] — assigned when the PDF was first created;
 *   stable across modifications. Used as the strong cross-device match key.
 * - `current` is /ID[1] — recomputed on each save; useful for forensics
 *   and detecting whether a file has been modified, not for matching.
 *
 * Whitespace inside the hex blocks is stripped.
 */
export function extractIds(s: string): {
  original: string | null;
  current: string | null;
} {
  // Greedy-match the bracketed ID array. `[\s\S]*?` keeps it line-agnostic.
  const m = /\/ID\s*\[\s*<([\s\S]*?)>\s*<([\s\S]*?)>\s*\]/.exec(s);
  if (!m) return { original: null, current: null };
  const hex0 = m[1]!.replace(/\s+/g, '').toLowerCase();
  const hex1 = m[2]!.replace(/\s+/g, '').toLowerCase();
  return {
    original: /^[0-9a-f]+$/.test(hex0) ? hex0 : null,
    current: /^[0-9a-f]+$/.test(hex1) ? hex1 : null,
  };
}

/**
 * Pull a PDF string-valued /Info field like `/Title (...)` or `/Producer (...)`
 * out of the trailer/info region. Both hex (`<...>`) and literal (`(...)`)
 * serializations are accepted; encoding (UTF-16BE-with-BOM, naked UTF-8,
 * PDFDocEncoding) is sniffed at the byte level by `decodeBytes`.
 */
export function extractStringField(s: string, fieldName: string): string | null {
  const hexRe = new RegExp(`\\/${fieldName}\\s*<\\s*([0-9A-Fa-f\\s]+)\\s*>`);
  const hexMatch = hexRe.exec(s);
  if (hexMatch) {
    const decoded = decodeHexString(hexMatch[1]!.replace(/\s+/g, ''));
    if (decoded) return decoded;
  }
  const litRe = new RegExp(
    `\\/${fieldName}\\s*\\(((?:[^()\\\\]|\\\\[\\s\\S]|\\([^)]*\\))*?)\\)`,
  );
  const litMatch = litRe.exec(s);
  if (litMatch) {
    const decoded = decodeLiteralString(litMatch[1]!);
    if (decoded) return decoded;
  }
  return null;
}

/** Pull `/Title (...)` from the /Info dict. */
export function extractTitle(s: string): string | null {
  return extractStringField(s, 'Title');
}

/** Pull `/Producer (...)` from the /Info dict. Diagnostic only — not
 *  used in matching. Helpful for understanding why two seemingly-identical
 *  PDFs fingerprint differently (e.g. one re-saved through Preview). */
export function extractProducer(s: string): string | null {
  return extractStringField(s, 'Producer');
}
