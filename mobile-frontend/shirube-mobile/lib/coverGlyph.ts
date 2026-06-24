// Pick a single display glyph for a book cover.
// Prefer the first CJK character in the title; fall back to the first
// non-whitespace character, uppercased.
export function coverGlyphFor(title: string, fallback = '本'): string {
  if (!title) return fallback;
  for (const ch of title) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    // CJK Unified Ideographs + Extension A + Hiragana + Katakana
    const isCjk =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff);
    if (isCjk) return ch;
  }
  const first = title.trim().charAt(0);
  return first ? first.toUpperCase() : fallback;
}
