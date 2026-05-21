import { stripControl } from '../sanitize';

/**
 * Resolve PDF literal-string escapes (\n \r \t \b \f \\ \( \) and octal
 * \ddd) into a byte array, then decode. The byte-then-decode split is what
 * lets us handle `/Title (\376\377...)` — UTF-16BE with BOM, byte by byte,
 * which a naïve "string out += chr" path mangles.
 */
export function decodeLiteralString(raw: string): string | null {
  const bytes: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch !== '\\') {
      bytes.push(ch.charCodeAt(0) & 0xff);
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) break;
    if (next >= '0' && next <= '7') {
      let digits = next;
      let j = i + 2;
      while (j < raw.length && j - (i + 1) < 3 && raw[j]! >= '0' && raw[j]! <= '7') {
        digits += raw[j];
        j++;
      }
      bytes.push(parseInt(digits, 8) & 0xff);
      i = j - 1;
      continue;
    }
    switch (next) {
      case 'n': bytes.push(0x0a); break;
      case 'r': bytes.push(0x0d); break;
      case 't': bytes.push(0x09); break;
      case 'b': bytes.push(0x08); break;
      case 'f': bytes.push(0x0c); break;
      case '\\': bytes.push(0x5c); break;
      case '(': bytes.push(0x28); break;
      case ')': bytes.push(0x29); break;
      default: bytes.push(next.charCodeAt(0) & 0xff);
    }
    i++;
  }
  return decodeBytes(new Uint8Array(bytes));
}

export function decodeHexString(hex: string): string | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return decodeBytes(bytes);
}

/**
 * Encoding sniffer. PDF strings can be:
 *   - UTF-16BE (BOM FE FF) — typical for CJK titles.
 *   - UTF-16LE (BOM FF FE) — rare but legitimate.
 *   - UTF-8 (BOM EF BB BF, or naked) — modern writers / PDF 2.0.
 *   - PDFDocEncoding — the PDF 1.x spec default. Approximated here as
 *     Latin-1; close enough for ASCII titles, and we only fall to it when
 *     valid UTF-8 doesn't parse.
 */
export function decodeBytes(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return null;
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return stripControl(decodeUtf16BE(bytes.subarray(2)));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return stripControl(decodeUtf16LE(bytes.subarray(2)));
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    const utf8 = tryUtf8(bytes.subarray(3), false);
    if (utf8 != null) return stripControl(utf8);
  }
  // No BOM: try strict UTF-8 first (catches naked UTF-8 in modern PDFs).
  // If the byte sequence isn't valid UTF-8, fall back to Latin-1.
  const strictUtf8 = tryUtf8(bytes, true);
  if (strictUtf8 != null) return stripControl(strictUtf8);
  return stripControl(bytesAsString(bytes));
}

function tryUtf8(bytes: Uint8Array, fatal: boolean): string | null {
  try {
    return new TextDecoder('utf-8', { fatal }).decode(bytes);
  } catch {
    return null;
  }
}

function decodeUtf16BE(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode((bytes[i]! << 8) | bytes[i + 1]!);
  }
  return out;
}

function decodeUtf16LE(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode(bytes[i]! | (bytes[i + 1]! << 8));
  }
  return out;
}

function bytesAsString(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]!);
  return out;
}
