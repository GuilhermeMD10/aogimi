import type { KanjiInfo, NameResult, SearchResponse, Selection, WordResult } from '../types';

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

/** The query-string fragment that pins a selection, for building URLs. */
export function selectionParam(sel: Selection): [key: string, value: string] {
  return sel.kind === 'kanji' ? ['kanji', sel.literal] : ['id', String(sel.id)];
}
