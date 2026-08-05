'use client';

import { Eyebrow, GLASS_PRESS, HAIRLINE, Skeleton } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { KanjiRow, ROW_LIST, WordRow } from './ResultRow';
import { sameSelection } from '../lib/results';
import type { RailContents } from '../lib/results';
import type { KanjiInfo, Selection, WordResult } from '../types';

const SKELETON_ROWS = 6;

/**
 * Every hit for one query, and the three ways that can go wrong — the part of
 * the results column that isn't furniture.
 *
 * Deliberately owns **no** box: no width, no fill, no edge, no scroll, no
 * bottom padding, no brand mark and no search field. Those belong to whatever
 * is showing the list — a 380px column on `/dictionary`, a narrower docked one
 * in the reader — and baking any of them in here is what would make the second
 * surface a copy instead of the same list.
 *
 * For the same reason it renders a fragment rather than a wrapping element: the
 * caller's container decides the flow, and `/dictionary`'s DOM is unchanged by
 * the extraction. The blocks space themselves with their own margins, so a
 * plain block container works as well as a flex column.
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
}) {
  const { kanjiEntries, words, names } = contents;
  const count = kanjiEntries.length + words.length;
  const settled = !loading && !error;

  return (
    <>
      <div className="mt-5.5 mb-2.5 flex items-baseline gap-2 px-1">
        {/* Not `<Eyebrow className="text-(--accent)">`: tailwind-merge can't
            tell whether `text-(--var)` is a colour or a size, so the override
            and the primitive's own `text-(--faint)` would both survive and
            stylesheet order would pick the winner. */}
        <span className="font-(family-name:--face-mono) text-[14px] tracking-[0.14em] uppercase text-(--accent)">
          Results
        </span>
        {settled && (
          <span className="font-(family-name:--face-ui) text-[16px] text-muted-foreground">
            {count} for <span className="font-(family-name:--face-jp) text-[16px] text-(--ink)">「{query}」</span>
          </span>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-1">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="px-1 py-3">
          <p className="font-(family-name:--face-ui) text-[16px] text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className={cn(
              GLASS_PRESS,
              'mt-2 cursor-pointer font-(family-name:--face-mono) text-[14px] text-(--ink)',
              // transform named alongside opacity, or the utility replaces
              // GLASS_PRESS's transition list and the nudge snaps.
              'underline underline-offset-4 transition-[opacity,transform] duration-120 hover:opacity-75',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
            )}
          >
            RETRY
          </button>
        </div>
      )}

      {settled && count === 0 && (
        <div className="px-1 py-3">
          <p className="font-(family-name:--face-ui) text-[16px] text-muted-foreground">Nothing found.</p>
          <p className="mt-1 font-(family-name:--face-ui) text-[14px] text-(--faint)">
            Try the kana reading, or an English word.
          </p>
        </div>
      )}

      {settled && count > 0 && (
        <ul className={ROW_LIST}>
          {kanjiEntries.map((k) => (
            <KanjiRow
              key={`k-${k.literal}`}
              kanji={k}
              selected={sameSelection(selection, { kind: 'kanji', literal: k.literal })}
              onSelect={() => onSelect({ kind: 'kanji', literal: k.literal })}
              onAdd={() => onAddKanji(k)}
            />
          ))}

          {words.map((w) => (
            <WordRow
              key={`w-${w.id}`}
              word={w}
              query={query}
              selected={sameSelection(selection, { kind: 'word', id: w.id })}
              onSelect={() => onSelect({ kind: 'word', id: w.id })}
              onAdd={() => onAddWord(w)}
            />
          ))}
        </ul>
      )}

      {settled && names.length > 0 && (
        <section className={cn('mt-6 border-t pt-4', HAIRLINE)}>
          <Eyebrow className="mb-2.5 px-1">Names</Eyebrow>
          <ul className="flex flex-col">
            {names.slice(0, 10).map((n) => (
              <li key={n.id} className="px-1 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-(family-name:--face-jp) text-[17px] text-(--ink)">{n.kanji ?? n.kana}</span>
                  {n.kanji && (
                    <span className="font-(family-name:--face-mono) text-[14px] text-muted-foreground">{n.kana}</span>
                  )}
                </div>
                {n.translations.length > 0 && (
                  <p className="mt-0.5 font-(family-name:--face-ui) text-[16px] text-(--soft)">
                    {n.translations.join('; ')}
                  </p>
                )}
                {n.name_type.length > 0 && (
                  <p className="mt-0.5 font-(family-name:--face-mono) text-[14px] tracking-[0.04em] uppercase text-(--faint)">
                    {n.name_type.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
