'use client';

import { CopyPlus } from 'lucide-react';
import { cn } from '@/lib/util/cn';
import { HAIRLINE, JlptChip } from '@/shared/components';
import { preferredHeadword } from '../lib/headword';
import { inflectionNote } from '../lib/inflection';
import type { KanjiInfo, WordResult } from '../types';

/*
 * One result, in the only two kinds the search returns.
 *
 * Everything here is fully controlled — `selected` is a boolean and the two
 * callbacks are the only way out — so the same row renders on `/dictionary`
 * (selection lives in the URL) and in the reader's docked column (selection is
 * local state) without either knowing which it is. That's the point: the two
 * surfaces should be the same list, not two lists that look alike.
 *
 * Row states, with only tokens to work from.
 *
 * `--bd` is transparent by design, so the handoff's "hover tints to --card,
 * selected borders in --accent" gives two states that look identical to a
 * third one that looks like nothing. Instead: selected takes the accent edge,
 * hover takes the same faint mix `HAIRLINE` uses (written out because that
 * constant isn't a variant), and the headword goes accent on hover as the
 * handoff also specifies. Three states, three distinct readings, no new token.
 */
export const ROW_SHELL = cn(
  'group flex w-full items-start gap-2.5 rounded-(--radius-input) border px-3 py-[13px] text-left',
  'transition-[border-color,color] duration-120 ease-[ease]',
);

export const ROW_IDLE = 'border-transparent hover:[border-color:color-mix(in_srgb,var(--muted)_35%,transparent)]';

export const ROW_SELECTED = 'border-(--accent)';

export const ROW_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';

/** The class pill next to the JLPT chip. Bordered, never filled. */
export function ClassPill({ children }: { children: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-(--radius-chip) border px-[9px] py-0.5',
        'font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.04em] uppercase text-(--muted)',
        HAIRLINE,
      )}
    >
      {children}
    </span>
  );
}

/** The add-to-deck affordance every row carries, and the one place the button
 *  fills on hover — a row is otherwise never filled. */
export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-(--radius-button) border bg-(--card) text-(--accent)',
        'transition-[background-color,color,transform] duration-120 ease-[ease]',
        'hover:scale-105 hover:bg-(--btn) hover:text-(--btn-ink)',
        HAIRLINE,
        ROW_FOCUS,
      )}
    >
      <CopyPlus size={16} strokeWidth={1.8} />
    </button>
  );
}

// ── Word row ────────────────────────────────────────────────────────────────

export function WordRow({
  word,
  query,
  selected,
  onSelect,
  onAdd,
}: {
  word: WordResult;
  query: string;
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const headword = preferredHeadword(word, query);
  // Only worth showing when it differs from the headword — a kana-only entry
  // would otherwise print the same string twice.
  const reading = word.kanji.length > 0 ? (word.readings[0]?.form ?? null) : null;
  const gloss = word.meanings
    .filter((m) => m.lang === 'eng')
    .slice(0, 3)
    .map((m) => m.meaning)
    .join('; ');
  const pos = word.meanings[0]?.pos;
  // Only set when the query didn't match this entry directly — see Inflection.
  const note = inflectionNote(word.inflection);

  return (
    <li className="flex items-start gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(ROW_SHELL, selected ? ROW_SELECTED : ROW_IDLE, ROW_FOCUS, 'cursor-pointer')}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-[9px]">
            <span
              className={cn(
                'font-[family-name:var(--face-jp)] text-[21px] leading-none text-(--ink)',
                !selected && 'group-hover:text-(--accent)',
              )}
            >
              {headword}
            </span>
            {reading && (
              <span className="font-[family-name:var(--face-mono)] text-[11px] text-(--muted)">{reading}</span>
            )}

            {/* Why an entry you didn't type is in the list: 食べた → 食べる. The
                reader needs this most — a lookup there is almost always the
                inflected form as it appears on the page — but it belongs on the
                row rather than the entry pane, because it explains the *match*.
                Truncates instead of wrapping so a long path can't add a line
                and change the height of one row in the column. */}
            {note && (
              <span
                title={`Matched by deinflection: ${note}`}
                className="min-w-0 shrink truncate font-[family-name:var(--face-mono)] text-[10px] text-(--faint)"
              >
                ← {note}
              </span>
            )}
          </span>

          {gloss && (
            <span className="mt-1.5 block font-[family-name:var(--face-ui)] text-[12.5px] leading-[1.4] text-(--soft)">
              {gloss}
            </span>
          )}

          {(word.jlpt_level != null || pos) && (
            <span className="mt-[9px] flex flex-wrap items-center gap-1.5">
              <JlptChip level={word.jlpt_level} />
              {pos && <ClassPill>{pos}</ClassPill>}
            </span>
          )}
        </span>
      </button>

      {/* A sibling of the row button, never a child of it — `AddButton` is a
          `<button>`, and a button inside a button is invalid HTML that React
          reports as a hydration error, with the nested control's click
          behaviour left to the browser. Matches `KanjiRow`, which already had
          it this way; the two rows share one list and now share one structure.
          The `<li>`'s flex is what puts them side by side. */}
      <AddButton onClick={onAdd} label={`Add ${headword} to a deck`} />
    </li>
  );
}

// ── Kanji row ───────────────────────────────────────────────────────────────

/**
 * A character, not a word. Same shell so the rail reads as one list, but the
 * glyph is set large and a mono tag names the kind — enough to tell it apart
 * at a glance without breaking the rhythm of the column.
 */
export function KanjiRow({
  kanji,
  selected,
  onSelect,
  onAdd,
}: {
  kanji: KanjiInfo;
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-start gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(ROW_SHELL, selected ? ROW_SELECTED : ROW_IDLE, ROW_FOCUS, 'cursor-pointer')}
      >
        <span
          className={cn(
            'flex size-[46px] shrink-0 items-center justify-center rounded-(--radius-tile) border bg-(--card)',
            'font-[family-name:var(--face-jp)] text-[30px] leading-none text-(--ink)',
            HAIRLINE,
          )}
        >
          {kanji.literal}
        </span>

        <span className="min-w-0 flex-1">
          <span className="font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.14em] uppercase text-(--accent)">
            Kanji
          </span>

          {kanji.meanings.length > 0 && (
            <span
              className={cn(
                'mt-0.5 block font-[family-name:var(--face-ui)] text-[12.5px] leading-[1.4] text-(--soft)',
                !selected && 'group-hover:text-(--accent)',
              )}
            >
              {kanji.meanings.slice(0, 3).join(', ')}
            </span>
          )}

          <span className="mt-[9px] flex flex-wrap items-center gap-1.5">
            <JlptChip level={kanji.jlpt_level} />
            {kanji.stroke_count != null && <ClassPill>{`${kanji.stroke_count} strokes`}</ClassPill>}
          </span>
        </span>
      </button>

      <AddButton onClick={onAdd} label={`Add ${kanji.literal} to a deck`} />
    </li>
  );
}
