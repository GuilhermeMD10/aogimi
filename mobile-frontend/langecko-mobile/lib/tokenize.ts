// Lightweight token splitter used by the reader for tap-to-select.
// Not a real JP tokenizer — groups consecutive chars of the same script
// so taps land on meaningful spans instead of single characters. A proper
// tokenizer (kuromoji, backend mecab) will replace this later.

export type Token = {
  text: string;
  /** Byte offset within the paragraph (char index, not byte). */
  start: number;
  end: number;
  kind: 'kanji' | 'hiragana' | 'katakana' | 'latin' | 'digit' | 'space' | 'punct' | 'other';
  selectable: boolean;
};

function classify(ch: string): Token['kind'] {
  const code = ch.codePointAt(0);
  if (code === undefined) return 'other';
  if (code >= 0x4e00 && code <= 0x9fff) return 'kanji';
  if (code >= 0x3400 && code <= 0x4dbf) return 'kanji';
  if (code >= 0x3040 && code <= 0x309f) return 'hiragana';
  if (code >= 0x30a0 && code <= 0x30ff) return 'katakana';
  if (/[a-zA-Z]/.test(ch)) return 'latin';
  if (/[0-9]/.test(ch)) return 'digit';
  if (/\s/.test(ch)) return 'space';
  return 'punct';
}

export function tokenize(paragraph: string): Token[] {
  if (!paragraph) return [];
  const chars = Array.from(paragraph);
  const out: Token[] = [];
  let start = 0;
  let curKind: Token['kind'] | null = null;
  let buf = '';

  const flush = (endIndex: number) => {
    if (!buf) return;
    const kind = curKind ?? 'other';
    out.push({
      text: buf,
      start,
      end: endIndex,
      kind,
      selectable: kind === 'kanji' || kind === 'hiragana' || kind === 'katakana' || kind === 'latin',
    });
    buf = '';
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const k = classify(ch);
    // Group: kanji runs together; kana runs together; latin runs together;
    // everything else is a 1-char token.
    const shouldExtend =
      buf.length > 0 &&
      curKind === k &&
      (k === 'kanji' || k === 'hiragana' || k === 'katakana' || k === 'latin' || k === 'digit');
    if (!shouldExtend) {
      flush(i);
      start = i;
      curKind = k;
    }
    buf += ch;
  }
  flush(chars.length);
  return out;
}
