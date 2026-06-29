/**
 * Extract DOI and ISBN identifiers from extracted PDF text. Used to
 * populate the matcher's `detected_doi` (very_high) and `detected_isbn`
 * (high, paired with page_count tolerance) layers.
 *
 * Both extractors run on raw extracted text — no normalization first —
 * because the punctuation and casing are part of the identifier.
 */

// DOI per RFC: starts with "10." followed by 4-9 digits, slash, then the
// suffix. Suffix is permissive — any non-whitespace until we trim trailing
// closing punctuation that's almost always part of the surrounding prose.
const DOI_RE = /\b10\.\d{4,9}\/\S+/i;
const DOI_TAIL_PUNCT = /[).,;:>\]'"]+$/;

export function extractDoi(text: string): string | null {
  const m = DOI_RE.exec(text);
  if (!m) return null;
  return m[0].replace(DOI_TAIL_PUNCT, '');
}

// ISBN — allow optional "ISBN" / "ISBN-13" / "ISBN-10" prefix, optional
// colon, then 10–17 chars of digits, hyphens, spaces, terminating in a
// digit or X. Checksum-validated below; bare digit strings that don't
// validate are rejected (avoids false positives on phone numbers, dates,
// etc.).
const ISBN_RE = /ISBN(?:-?1[03])?:?\s*([\d][\d\-\s]{8,16}[\dXx])/g;

export function extractIsbn(text: string): string | null {
  let match: RegExpExecArray | null;
  ISBN_RE.lastIndex = 0;
  while ((match = ISBN_RE.exec(text)) !== null) {
    const digits = match[1]!.replace(/[\s\-]/g, '').toUpperCase();
    if (digits.length === 10 && isValidIsbn10(digits)) return digits;
    if (digits.length === 13 && isValidIsbn13(digits)) return digits;
  }
  return null;
}

function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s[i]!, 10) * (10 - i);
  sum += s[9] === 'X' ? 10 : parseInt(s[9]!, 10);
  return sum % 11 === 0;
}

function isValidIsbn13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const d = parseInt(s[i]!, 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return sum % 10 === 0;
}
