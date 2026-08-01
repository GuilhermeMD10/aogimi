'use client';

import { CopyPlus } from 'lucide-react';
import { cn } from '@/lib/util/cn';
import { HAIRLINE } from '@/shared/components';
import { JlptChip } from './JlptChip';
import { preferredHeadword } from '../lib/headword';
import type { KanjiInfo, WordResult } from '../types';

/*
 * Row states, with only tokens to work from.
 *
 * `--bd` is transparent by design, so the handoff's "hover tints to --card,
 * selected borders in --accent" gives two states that look identical to a
 * third one that looks like nothing. Instead: selected takes the accent edge,
 * hover takes the same faint mix `HAIRLINE` uses (written out because that
 * constant isn't a variant), and the headword goes accent on hover as the
 * handoff also specifies. Three states, three distinct readings, no new token.
 */
const ROW_SHELL = cn(
  'group flex w-full items-start gap-2.5 rounded-(--radius-input) border px-3 py-[13px] text-left',
  'transition-[border-color,color] duration-120 ease-[ease]',
);

const ROW_IDLE =
  'border-transparent hover:[border-color:color-mix(in_srgb,var(--muted)_35%,transparent)]';

const ROW_SELECTED = 'border-(--accent)';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';

/** The class pill next to the JLPT chip. Bordered, never filled. */
function ClassPill({ children }: { children: string }) {
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

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
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
        FOCUS,
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

  return (
    <li className="flex items-start gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(ROW_SHELL, selected ? ROW_SELECTED : ROW_IDLE, FOCUS, 'cursor-pointer')}
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
              <span className="font-[family-name:var(--face-mono)] text-[11px] text-(--muted)">
                {reading}
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
        className={cn(ROW_SHELL, selected ? ROW_SELECTED : ROW_IDLE, FOCUS, 'cursor-pointer')}
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
