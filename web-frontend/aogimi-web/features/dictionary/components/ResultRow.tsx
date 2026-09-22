'use client';

import { Plus } from 'lucide-react';
import { cn } from '@/lib/util/cn';
import { Chip, JlptChip, PRESS } from '@/shared/components';
import { preferredHeadword } from '../lib/headword';
import { inflectionNote } from '../lib/inflection';
import type { EntryScale } from '../lib/entryScale';
import type { KanjiInfo, WordResult } from '../types';

/*
 * One result card, in the only two kinds the search returns.
 *
 * Everything here is fully controlled — `selected` is a boolean and the two
 * callbacks are the only way out — so the same row renders on `/dictionary`
 * (selection lives in the URL), in the reader's modal and in its docked column
 * (selection is local state) without knowing which it is. The two surfaces
 * should be the same list, not two lists that look alike.
 *
 * ── Two scales ──────────────────────────────────────────────────────────────
 * `compact` is the 316px results column (page 03) and the docked column:
 * kanji 18 · reading 12 · gloss 12, a 30px `+` in the `good` family. `full`
 * is the reader's modal (page 10): kanji 24 · reading 14 · gloss 13, a 40px
 * `+`; there the first row is the "primary suggestion" and its `+` is tinted
 * in the soft accent while the rest stay white.
 *
 * ── Selected ────────────────────────────────────────────────────────────────
 * The page spec's treatment (D7): the card stays white and gains a `good` edge
 * with a soft `good` ring. Not the `--selected` wash — that is the nav's and
 * the segmented control's, and a tinted card would fight the `+` circle and the
 * JLPT chip sitting on it.
 */

const ROW_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';

const CARD = cn(
  PRESS,
  'flex w-full cursor-pointer items-start rounded-(--radius-row) border text-left',
  'transition-[transform,background-color,border-color,box-shadow] duration-120 ease-[ease]',
  ROW_FOCUS,
);

const CARD_IDLE = 'border-(--hairline) bg-(--pane) shadow-(--shadow-pill) hover:bg-(--pane-strong)';

/** `good` at .55 for the edge, `GOOD_TINT` at .18 for the 3px ring, over the
 *  pill shadow. `color-mix` because `--good` is a hex with no `-rgb` twin. */
const CARD_SELECTED = cn(
  'bg-(--pane-strong) [border-color:color-mix(in_srgb,var(--good)_55%,transparent)]',
  '[box-shadow:0_0_0_3px_rgb(var(--good-tint-rgb)/0.18),var(--shadow-pill)]',
);

const SCALE: Record<
  EntryScale,
  {
    pad: string;
    /** Room on the right for the `+`, which sits over the card as a sibling. */
    gutter: string;
    headword: string;
    reading: string;
    gloss: string;
    note: string;
    /** The framed glyph on a kanji row. */
    glyph: string;
    /** The `+` circle and where it sits. */
    add: string;
    addSlot: string;
    addIcon: number;
  }
> = {
  compact: {
    pad: 'gap-2.5 px-4 py-3.5',
    gutter: 'pr-14',
    headword: 'text-[18px]',
    reading: 'text-[12px]',
    gloss: 'text-[12px]',
    note: 'text-[10px]',
    glyph: 'size-11 text-[26px]',
    add: 'size-[30px]',
    addSlot: 'right-4',
    addIcon: 14,
  },
  full: {
    pad: 'gap-3 px-[18px] py-4',
    gutter: 'pr-[72px]',
    headword: 'text-[24px]',
    reading: 'text-[14px]',
    gloss: 'text-[13px]',
    note: 'text-[11px]',
    glyph: 'size-[52px] text-[32px]',
    add: 'size-10',
    addSlot: 'right-[18px]',
    addIcon: 16,
  },
};

/**
 * The add-to-deck circle every row carries.
 *
 * **It is never a child of the row's button** — nesting one `<button>` inside
 * another is invalid HTML and React fails hydration on it. It sits absolutely
 * over the card instead, vertically centred, which keeps the card's hover
 * running the full width underneath it while staying a sibling in the DOM.
 *
 * `primary` is page 10's first result: soft-accent fill and edge, accent glyph.
 * At `compact` the circle is the `good` family (page 03); at `full` the rest
 * are white with an ink glyph.
 */
function AddButton({
  onClick,
  label,
  scale,
  primary,
}: {
  onClick: () => void;
  label: string;
  scale: EntryScale;
  primary: boolean;
}) {
  const s = SCALE[scale];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        PRESS,
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full border',
        'transition-[transform,background-color,filter] duration-120 ease-[ease] hover:brightness-[1.04]',
        s.add,
        primary
          ? 'border-[rgb(var(--accent-soft-rgb)/0.6)] bg-[rgb(var(--accent-soft-rgb)/0.25)] text-(--accent)'
          : scale === 'compact'
            ? '[background:color-mix(in_srgb,var(--good)_10%,transparent)] [border-color:color-mix(in_srgb,var(--good)_45%,transparent)] text-(--good)'
            : 'border-[rgb(var(--line-rgb)/0.08)] bg-(--pane-strong) text-(--ink)',
        ROW_FOCUS,
      )}
    >
      <Plus size={s.addIcon} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

type RowProps = {
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
  scale: EntryScale;
  /** Page 10's first result — tints the `+`. Only `RailList` decides this. */
  primary?: boolean;
};

// ── Word row ────────────────────────────────────────────────────────────────

export function WordRow({
  word,
  query,
  selected,
  onSelect,
  onAdd,
  scale,
  primary = false,
}: RowProps & { word: WordResult; query: string }) {
  const s = SCALE[scale];
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
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(CARD, s.pad, s.gutter, selected ? CARD_SELECTED : CARD_IDLE)}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className={cn('font-[family-name:var(--face-jp)] leading-none font-bold text-(--ink)', s.headword)}>
              {headword}
            </span>
            {reading && (
              <span className={cn('font-[family-name:var(--face-jp)] leading-none text-(--ink-3)', s.reading)}>
                {reading}
              </span>
            )}
            {/* Why an entry you didn't type is in the list: 食べた → 食べる. The
                reader needs this most — a lookup there is almost always the
                inflected form as it appears on the page — but it belongs on the
                row rather than the entry pane, because it explains the *match*.
                Truncates instead of wrapping so a long path can't add a line. */}
            {note && (
              <span
                title={`Matched by deinflection: ${note}`}
                className={cn('min-w-0 shrink truncate font-[family-name:var(--face-mono)] text-(--ink-3)', s.note)}
              >
                ← {note}
              </span>
            )}
          </span>

          {gloss && (
            <span className={cn('font-[family-name:var(--face-ui)] leading-[1.4] font-medium text-(--ink-2)', s.gloss)}>
              {gloss}
            </span>
          )}

          {(word.jlpt_level != null || pos) && (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              <JlptChip level={word.jlpt_level} />
              {pos && <Chip>{pos}</Chip>}
            </span>
          )}
        </span>
      </button>

      <span className={cn('absolute top-1/2 -translate-y-1/2', s.addSlot)}>
        <AddButton onClick={onAdd} label={`Add ${headword} to a deck`} scale={scale} primary={primary} />
      </span>
    </li>
  );
}

// ── Kanji row ───────────────────────────────────────────────────────────────

/**
 * A character, not a word. Same card so the list reads as one list, but the
 * glyph sits in a frame and a small `Kanji` caption names the kind — enough to
 * tell it apart at a glance without breaking the rhythm of the column. The
 * handoff draws no kanji rows; this keeps today's structure in the new card.
 */
export function KanjiRow({
  kanji,
  selected,
  onSelect,
  onAdd,
  scale,
  primary = false,
}: RowProps & { kanji: KanjiInfo }) {
  const s = SCALE[scale];

  return (
    <li className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(CARD, s.pad, s.gutter, selected ? CARD_SELECTED : CARD_IDLE)}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-(--radius-control) border border-(--hairline) bg-(--pane-strong)',
            'font-[family-name:var(--face-jp)] leading-none font-bold text-(--ink)',
            s.glyph,
          )}
        >
          {kanji.literal}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <span className="font-[family-name:var(--face-ui)] text-[10px] leading-none font-bold tracking-[0.14em] uppercase text-(--accent)">
            Kanji
          </span>

          {kanji.meanings.length > 0 && (
            <span className={cn('font-[family-name:var(--face-ui)] leading-[1.4] font-medium text-(--ink-2)', s.gloss)}>
              {kanji.meanings.slice(0, 3).join(', ')}
            </span>
          )}

          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <JlptChip level={kanji.jlpt_level} />
            {kanji.stroke_count != null && <Chip>{`${kanji.stroke_count} strokes`}</Chip>}
          </span>
        </span>
      </button>

      <span className={cn('absolute top-1/2 -translate-y-1/2', s.addSlot)}>
        <AddButton onClick={onAdd} label={`Add ${kanji.literal} to a deck`} scale={scale} primary={primary} />
      </span>
    </li>
  );
}
