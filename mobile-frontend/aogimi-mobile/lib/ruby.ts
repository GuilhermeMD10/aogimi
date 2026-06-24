// Lightweight parser for the <ruby> furigana markup that ships with our
// imported example sentences. Input shape (Kanjium-style):
//
//   <ruby><rb>BASE</rb><rp>(</rp><rt>FURIGANA</rt><rp>)</rp></ruby>
//
// Anything outside <ruby>…</ruby> is emitted as a plain segment. The parser
// is intentionally permissive — it only understands the tags Kanjium emits
// and treats anything else as literal text.

export type RubySegment = {
  /** The base text. For non-ruby runs this is plain Japanese; for ruby runs
   *  it's the kanji form. */
  base: string;
  /** Furigana over the base. Null for non-ruby runs. */
  furigana: string | null;
};

const RUBY_RE = /<ruby[^>]*>([\s\S]*?)<\/ruby>/g;
const RB_RE = /<rb[^>]*>([\s\S]*?)<\/rb>/;
const RT_RE = /<rt[^>]*>([\s\S]*?)<\/rt>/;

/** Decode the tiny set of HTML entities Kanjium produces. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseRuby(html: string | null | undefined): RubySegment[] {
  if (!html) return [];
  const segments: RubySegment[] = [];
  let cursor = 0;
  RUBY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RUBY_RE.exec(html)) !== null) {
    if (match.index > cursor) {
      segments.push({
        base: decodeEntities(html.slice(cursor, match.index)),
        furigana: null,
      });
    }
    const inner = match[1] ?? '';
    const rb = RB_RE.exec(inner);
    const rt = RT_RE.exec(inner);
    if (rb && rt) {
      segments.push({
        base: decodeEntities(rb[1] ?? ''),
        furigana: decodeEntities(rt[1] ?? ''),
      });
    } else {
      // Tag soup we don't recognise — strip tags and emit as plain text.
      segments.push({
        base: decodeEntities(inner.replace(/<[^>]+>/g, '')),
        furigana: null,
      });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < html.length) {
    segments.push({
      base: decodeEntities(html.slice(cursor)),
      furigana: null,
    });
  }
  return segments;
}
