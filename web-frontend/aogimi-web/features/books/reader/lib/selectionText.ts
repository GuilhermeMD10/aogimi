// Reading a `Selection` the way a Japanese book wants it read: ruby dropped,
// parenthesised readings dropped, and the sentence around the selection
// recovered for card context.
//
// Engine-agnostic on purpose. The flowing EPUB reader selects inside foliate's
// per-chapter iframes and the PDF reader selects in pdf.js's text layer in the
// top document — different `Document`s, same two questions ("what was
// selected" / "what sentence was it in"), so the answers live here rather than
// in either engine.

const PAREN_READING_RE =
  /[(（][぀-ゟ゠-ヿ・ー]+[)）]/g;

function stripParenReadings(text: string): string {
  return text.replace(PAREN_READING_RE, '');
}

function cleanElementText(el: Element): string {
  const cloned = el.cloneNode(true) as Element;
  cloned.querySelectorAll('rt, rp').forEach((node) => node.remove());
  return stripParenReadings(cloned.textContent ?? '');
}

/** The selected text with furigana stripped — `<rt>`/`<rp>` removed from the
 *  cloned range, then bracketed kana readings removed from what's left. */
export function cleanSelectionText(sel: Selection): string {
  try {
    if (sel.rangeCount === 0) return '';
    const range = sel.getRangeAt(0);
    const frag = range.cloneContents();
    frag.querySelectorAll('rt, rp').forEach((el) => el.remove());
    return stripParenReadings(frag.textContent ?? '').trim();
  } catch {
    return stripParenReadings(sel.toString()).trim();
  }
}

/** The sentence the selection sits in, for a card's context field. Best-effort:
 *  the enclosing block's text split on Japanese terminators, and the first
 *  piece that contains the selection. A block with no terminator answers with
 *  itself only while it's short enough to read as one sentence. */
export function extractSentenceFromSelection(sel: Selection): string | undefined {
  const node = sel.anchorNode;
  if (!node) return undefined;

  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return undefined;

  const block = el.closest('p, div, li, td, h1, h2, h3, h4, h5, h6') ?? el;
  const fullText = cleanElementText(block).trim();
  if (!fullText) return undefined;

  const word = cleanSelectionText(sel);
  if (!word) return undefined;

  const sentences = fullText.split(/(?<=[。!?\n])/);
  for (const s of sentences) {
    if (s.includes(word)) return s.trim();
  }

  return fullText.length <= 200 ? fullText : undefined;
}
