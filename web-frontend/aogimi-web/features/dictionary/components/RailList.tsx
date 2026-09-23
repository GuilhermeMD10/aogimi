'use client';

import { PRESS, Skeleton } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { KanjiRow, WordRow } from './ResultRow';
import { sameSelection, type RailContents, type EntryScale } from '../lib';
import type { KanjiInfo, Selection, WordResult } from '../types';

const SKELETON_ROWS = 6;

/**
 * Every hit for one query, and the three ways that can go wrong — the part of
 * the results column that isn't furniture. Opens with the results caption
 * (`RESULTS · 8 FOR 「じしょ」`, pages 03/10).
 *
 * Deliberately owns **no** box: no width, no fill, no edge, no scroll and no
 * search field. Those belong to whatever is showing the list — the 316px
 * column on `/dictionary`, the modal, the docked column — and baking any of
 * them in here is what would make the second surface a copy instead of the
 * same list. It renders a fragment for the same reason: the caller's container
 * decides the flow.
 *
 * `scale` is the rows' size (see `ResultRow`): `compact` for the 316px column
 * and the docked column, `full` for the modal, where the first row is the
 * primary suggestion and its `+` is tinted.
 *
 * Names sit at the bottom, after the selectable rows, and are display-only:
 * there's no per-name detail endpoint, so there's nothing for a click to open.
 */
export function RailList({
  query,
  contents,
  selection,
  onSelect,
  onAddWord,
  onAddKanji,
  loading,
  error,
  onRetry,
  scale = 'full',
}: {
  /** The term the results belong to — not the field's live text. */
  query: string;
  contents: RailContents;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
  onAddWord: (word: WordResult) => void;
  onAddKanji: (kanji: KanjiInfo) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  scale?: EntryScale;
}) {
  const { kanjiEntries, words, names } = contents;
  const count = kanjiEntries.length + words.length;
  const settled = !loading && !error;
  // Page 10 tints the first result's `+` as the primary suggestion. Kanji
  // entries come first in the list, so the first row is whichever leads.
  const primaryIndex = scale === 'full' ? 0 : -1;

  return (
    <>
      <div className="flex items-baseline gap-1.5 px-1 pt-1.5 pb-2 font-[family-name:var(--face-ui)] text-[11px] leading-none">
        <span className="font-bold tracking-[0.14em] uppercase text-(--accent)">Results</span>
        {settled && (
          <>
            <span className="tracking-[0.06em] uppercase text-(--ink-3)">
              {count} for
            </span>
            <span className="font-[family-name:var(--face-jp)] font-medium text-(--ink)">「{query}」</span>
          </>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} className={cn('w-full rounded-(--radius-row)', scale === 'full' ? 'h-[104px]' : 'h-[92px]')} />
          ))}
        </div>
      )}

      {error && (
        <div className="px-1 py-3 font-[family-name:var(--face-ui)]">
          <p className="text-[13px] font-medium text-(--ink-2)">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              PRESS,
              'mt-2 cursor-pointer text-[12px] font-medium text-(--accent) underline underline-offset-4',
              // transform named alongside color, or the utility replaces
              // PRESS's transition list and the nudge snaps.
              'transition-[color,transform] duration-120 ease-[ease] hover:text-(--accent-hover)',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            )}
          >
            Retry
          </button>
        </div>
      )}

      {settled && count === 0 && (
        <div className="px-1 py-3 font-[family-name:var(--face-ui)]">
          <p className="text-[13px] font-medium text-(--ink-2)">Nothing found.</p>
          <p className="mt-1 text-[12px] text-(--ink-3)">Try the kana reading, or an English word.</p>
        </div>
      )}

      {settled && count > 0 && (
        <ul className="flex flex-col gap-2.5">
          {kanjiEntries.map((k, i) => (
            <KanjiRow
              key={`k-${k.literal}`}
              kanji={k}
              selected={sameSelection(selection, { kind: 'kanji', literal: k.literal })}
              onSelect={() => onSelect({ kind: 'kanji', literal: k.literal })}
              onAdd={() => onAddKanji(k)}
              scale={scale}
              primary={i === primaryIndex}
            />
          ))}

          {words.map((w, i) => (
            <WordRow
              key={`w-${w.id}`}
              word={w}
              query={query}
              selected={sameSelection(selection, { kind: 'word', id: w.id })}
              onSelect={() => onSelect({ kind: 'word', id: w.id })}
              onAdd={() => onAddWord(w)}
              scale={scale}
              primary={kanjiEntries.length + i === primaryIndex}
            />
          ))}
        </ul>
      )}

      {settled && names.length > 0 && (
        <section className="mt-6 border-t border-(--hairline) pt-4 font-[family-name:var(--face-ui)]">
          <div className="mb-2.5 px-1 text-[11px] leading-none font-bold tracking-[0.14em] uppercase text-(--ink-3)">Names</div>
          <ul className="flex flex-col">
            {names.slice(0, 10).map((n) => (
              <li key={n.id} className="px-1 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--face-jp)] text-[16px] font-bold text-(--ink)">{n.kanji ?? n.kana}</span>
                  {n.kanji && <span className="font-[family-name:var(--face-jp)] text-[12px] text-(--ink-3)">{n.kana}</span>}
                </div>
                {n.translations.length > 0 && (
                  <p className="mt-0.5 text-[12px] font-medium text-(--ink-2)">{n.translations.join('; ')}</p>
                )}
                {n.name_type.length > 0 && (
                  <p className="mt-0.5 text-[10px] tracking-[0.06em] uppercase text-(--ink-3)">{n.name_type.join(', ')}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
