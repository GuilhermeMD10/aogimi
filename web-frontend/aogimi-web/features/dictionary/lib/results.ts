import type {
  KanjiInfo,
  NameResult,
  ReaderContext,
  SearchResponse,
  Selection,
  WordResult,
} from '../types';

/**
 * The search rail's contents, flattened out of the four shapes `/api/search`
 * can return.
 *
 * The backend answers with a different object per query kind — a single kanji
 * entry for `type: 'kanji'`, a *list* of them for `type: 'kana'`, neither for
 * `word` / `meaning` — and only some kinds carry names. Normalising once here
 * means the rail renders one structure and nothing downstream has to know
 * which branch it came from.
 *
 * Word order is the backend's ranking (exact-match tier → single-kanji
 * privilege → JLPT → grade → length → SQL score). Never re-sort it.
 */
export type RailContents = {
  /** Kanji entries, shown above the words and selectable in their own right. */
  kanjiEntries: KanjiInfo[];
  words: WordResult[];
  /** Display-only: there is no per-name detail endpoint, so these don't select. */
  names: NameResult[];
};

export const EMPTY_RAIL: RailContents = { kanjiEntries: [], words: [], names: [] };

export function railContents(result: SearchResponse | null): RailContents {
  if (!result) return EMPTY_RAIL;

  const kanjiEntries =
    result.type === 'kanji'
      ? result.kanji
        ? [result.kanji]
        : []
      : result.type === 'kana'
        ? result.kanjis
        : [];

  return {
    kanjiEntries,
    words: result.words,
    names: 'names' in result ? result.names : [],
  };
}

/** Every selectable row, top to bottom — the order ↑/↓ walks. */
export function selectionOrder(c: RailContents): Selection[] {
  return [
    ...c.kanjiEntries.map((k): Selection => ({ kind: 'kanji', literal: k.literal })),
    ...c.words.map((w): Selection => ({ kind: 'word', id: w.id })),
  ];
}

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === 'kanji' && b.kind === 'kanji' ? a.literal === b.literal : a.kind === 'word' && b.kind === 'word' && a.id === b.id;
}

/**
 * Which row the detail pane shows.
 *
 * The URL params are a *request*, not the answer: a stale `?id=` left over
 * from a previous query would otherwise point the pane at an entry that isn't
 * in the rail. Anything that doesn't resolve against the current contents
 * falls through to the first row, which is what "the first result fills the
 * page" means.
 */
export function resolveSelection(
  c: RailContents,
  kanjiParam: string | null,
  idParam: string | null,
): Selection | null {
  if (kanjiParam && c.kanjiEntries.some((k) => k.literal === kanjiParam)) {
    return { kind: 'kanji', literal: kanjiParam };
  }
  if (idParam) {
    const id = Number(idParam);
    if (Number.isFinite(id) && c.words.some((w) => w.id === id)) return { kind: 'word', id };
  }
  return selectionOrder(c)[0] ?? null;
}

/** An entry resolved from a surface string, ready to draft a card from. */
export type SurfaceEntry =
  | { kind: 'word'; word: WordResult }
  | { kind: 'kanji'; kanji: KanjiInfo };

/**
 * The entry that *is* this string.
 *
 * For flows that start from a surface form instead of a click on a row — the
 * reader's "add card" straight from a highlight, which never opens the rail.
 *
 * **Word order is a ranking, not an identity test.** A search for 背 legitimately
 * ranks 背広 first: it's a better *results list*, because the bare 背 is a rarer
 * word than the compounds built on it. But a card fronted 背 whose back reads
 * `せびろ / 1. suit` is simply wrong, so this flow can't take `words[0]` the way
 * a rail can. It has to find the entry that actually carries the string, by the
 * same exact-form test `preferredHeadword` uses to pick a title.
 *
 * An inflected selection has no exact match *by design* — 食べました is not one of
 * 食べる's listed forms — and that is what the fallback is for: there the
 * deinflected top hit is the right answer, and it's also the row the rail would
 * have opened. So the fallback is `selectionOrder`'s first row rather than
 * `words[0]`, which keeps this agreeing with what the dictionary shows.
 */
export function surfaceEntry(c: RailContents, surface: string): SurfaceEntry | null {
  const s = surface.trim();

  if (s) {
    const word = c.words.find((w) => w.kanji.includes(s) || w.readings.some((r) => r.form === s));
    if (word) return { kind: 'word', word };

    const kanji = c.kanjiEntries.find((k) => k.literal === s);
    if (kanji) return { kind: 'kanji', kanji };
  }

  // Kanji entries before words — the same order `selectionOrder` walks, so the
  // fallback lands on the row the rail would have opened.
  const kanji = c.kanjiEntries[0];
  if (kanji) return { kind: 'kanji', kanji };

  const word = c.words[0];
  return word ? { kind: 'word', word } : null;
}

/** Every surface form an entry is written with — what to look for in a sentence. */
function entryForms(e: SurfaceEntry): string[] {
  return e.kind === 'kanji'
    ? [e.kanji.literal]
    : [...e.word.kanji, ...e.word.readings.map((r) => r.form)];
}

function sameEntry(a: SurfaceEntry, b: SurfaceEntry): boolean {
  if (a.kind === 'kanji' && b.kind === 'kanji') return a.kanji.literal === b.kanji.literal;
  if (a.kind === 'word' && b.kind === 'word') return a.word.id === b.word.id;
  return false;
}

/**
 * The context sentence a card for `entry` should carry.
 *
 * A sentence mined from the book is context for **one** word — the one that was
 * tapped. The reader's lookup shows the whole result list though, so from a tap
 * on 道 the user can reach 道路, 鉄道, 道具; attaching 道's sentence to a card for
 * 鉄道 states that the word appears in a sentence it may be absent from. Quietly
 * plausible, and wrong.
 *
 * Two ways a sentence earns the attachment:
 *
 *  1. **It's the tapped word's own entry.** Identity, not string equality — a tap
 *     on 食べました resolves to 食べる, whose listed forms contain neither the tapped
 *     string nor anything in the sentence. String matching would reject the one
 *     case this feature exists for, so the anchor is resolved through
 *     `surfaceEntry`, the same way the card's back side is.
 *  2. **The sentence contains it anyway.** Tap 道 in 「鉄道の道は長い」 and add 鉄道:
 *     the sentence really is that word's context, and refusing it would be
 *     pedantry.
 *
 * Anything else falls back — normally to the entry's own first example sentence,
 * which is a true statement about the word and was previously being *overwritten*
 * by the reader's sentence.
 */
export function contextForEntry(
  entry: SurfaceEntry,
  reader: ReaderContext | undefined,
  contents: RailContents,
  fallback?: string,
): string | undefined {
  if (!reader) return fallback;

  const anchor = surfaceEntry(contents, reader.word);
  if (anchor && sameEntry(anchor, entry)) return reader.sentence;

  if (entryForms(entry).some((f) => reader.sentence.includes(f))) return reader.sentence;

  return fallback;
}

/** The query-string fragment that pins a selection, for building URLs. */
export function selectionParam(sel: Selection): [key: string, value: string] {
  return sel.kind === 'kanji' ? ['kanji', sel.literal] : ['id', String(sel.id)];
}
