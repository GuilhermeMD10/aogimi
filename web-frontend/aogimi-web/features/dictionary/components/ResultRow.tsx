'use client';

import { CopyPlus } from 'lucide-react';
import { cn } from '@/lib/util/cn';
import { GLASS_ACTIVE, GLASS_BUTTON, GLASS_PRESS, GLASS_ROW, HAIRLINE, JlptChip } from '@/shared/components';
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
 * ── Row states ──────────────────────────────────────────────────────────────
 * **A row is not a pane.** `GLASS_ROW` carries the glass hover fill and nothing
 * at rest — no fill, no border, no blur, no specular edge — and `ROW_LIST` rules
 * a hairline between rows, so the rail reads as one running column. It spent a
 * pass as a full `GLASS_BUTTON` and that was the wrong read: forty results as
 * forty little frosted cards makes the eye count cards instead of scanning down
 * the list, and the rail is a list.
 *
 * The interactions are still the app's: hover brightens the fill, `GLASS_PRESS`
 * gives the same nudge as every other button, and the selected row is
 * `GLASS_ACTIVE` — the `--active` tint, which is what "this is the selected one"
 * means everywhere from the dock's pill to the library's filter chips. What is
 * gone for good is the bespoke set: a transparent border that grew a `--muted`
 * 35% mix on hover, an `--accent` edge when selected, and the headword turning
 * `--accent` on hover.
 *
 * **The lit row flips every ink.** `--ink`/`--soft`/`--muted`/`--faint` are all
 * light-on-dark at night, so on a pale tint they would disappear one after the
 * other. `ROW_INK` is the two sets; take it with `rowInk(selected)` and read
 * `.strong` / `.soft` / `.muted` / `.faint` off it. The dark side is
 * `--active-ink` at four densities through `color-mix`, because Tailwind's
 * slash-opacity can't apply to an arbitrary `var()` colour. `JlptChip` needs
 * nothing — it is a solid pill with its own near-black ink, legible on anything.
 */
export const ROW_SHELL = cn(
  GLASS_ROW,
  GLASS_PRESS,
  // No `group` any more — it existed only for the `group-hover:` accent swap on
  // the headword, and the fill is the hover now.
  'flex w-full items-start gap-2.5 rounded-(--radius-input) px-3 py-[13px] text-left',
);

/**
 * The list the rows sit in: no gap, and a hairline under every row but the last,
 * which is what makes them read as connected rather than stacked.
 *
 * The colour is written out instead of composing `HAIRLINE`, and the rule is a
 * child selector instead of `divide-y`, for one reason each. Tailwind scans
 * source text for class names, so a template-interpolated
 * `` `[&>li…]:${HAIRLINE}` `` is a class it never sees and never generates. And
 * `border-color` is not inherited — globals' `*` rule gives every element its
 * own `--color-border` — so setting the colour on the `<ul>` would leave the
 * children's rules painted in the default instead.
 */
export const ROW_LIST = cn('flex flex-col gap-2');

/** There is no `ROW_IDLE` any more: an idle row is a plain `GLASS_ROW` and the
 *  hover lives in that recipe, so the constant had nothing left to hold. */
export const ROW_SELECTED = GLASS_ACTIVE;

export const ROW_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';

/** Where `AddButton` sits: over the row's right edge, outside its `<button>`.
 *  `ROW_ADD_GUTTER` is the padding the row gives up so its content can't run
 *  under the affordance (size-8 button + the 8px inset + a little air). */
const ROW_ADD_SLOT = 'absolute top-2.5 right-2';
const ROW_ADD_GUTTER = 'pr-12';

const ROW_INK = {
  idle: {
    strong: 'text-(--ink)',
    soft: 'text-(--soft)',
    muted: 'text-(--muted)',
    faint: 'text-(--faint)',
  },
  selected: {
    strong: 'text-(--active-ink)',
    soft: '[color:color-mix(in_srgb,var(--active-ink)_78%,transparent)]',
    muted: '[color:color-mix(in_srgb,var(--active-ink)_62%,transparent)]',
    faint: '[color:color-mix(in_srgb,var(--active-ink)_45%,transparent)]',
  },
} as const;

const rowInk = (selected: boolean) => (selected ? ROW_INK.selected : ROW_INK.idle);

/** Hairline that survives the lit fill — `HAIRLINE` is a white mix and vanishes
 *  on it, so a selected row's edges are drawn in the dark ink instead. */
const EDGE_SELECTED = '[border-color:color-mix(in_srgb,var(--active-ink)_26%,transparent)]';

/** The class pill next to the JLPT chip. Bordered, never filled — so it needs
 *  both its ink and its edge flipped on a lit row. */
export function ClassPill({ children, selected = false }: { children: string; selected?: boolean }) {
  const ink = rowInk(selected);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-(--radius-chip) border px-[9px] py-0.5',
        'font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.04em] uppercase',
        ink.muted,
        selected ? EDGE_SELECTED : HAIRLINE,
      )}
    >
      {children}
    </span>
  );
}

/** The add-to-deck affordance every row carries. Glass on glass, like the
 *  library hero's CTA. Vermilion ink works here because it is legible on both
 *  the idle glass and the lit tint.
 *
 *  **It is never a child of the row's button** — nesting one `<button>` inside
 *  another is invalid HTML and React fails hydration on it. It sits absolutely
 *  over the row instead (`ROW_ADD_SLOT`), which keeps the glass fill running the
 *  full width underneath it while staying a sibling in the DOM. */
export function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        GLASS_BUTTON,
        GLASS_PRESS,
        'flex size-8 shrink-0 items-center justify-center rounded-(--radius-button) text-(--accent)',
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
  const ink = rowInk(selected);

  return (
    <li className="relative flex items-start">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(ROW_SHELL, ROW_ADD_GUTTER, selected && ROW_SELECTED, ROW_FOCUS, 'cursor-pointer')}
      >
        <span className="min-w-0 flex-1">
          <span className="block">
            <span className="flex items-baseline gap-[9px]">
              <span className={cn('font-[family-name:var(--face-jp)] text-[26px] leading-none', ink.strong)}>
                {headword}
              </span>
              {reading && (
                <span className={cn('font-[family-name:var(--face-mono)] text-[16px]', ink.muted)}>{reading}</span>
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
                  className={cn('min-w-0 shrink truncate font-[family-name:var(--face-mono)] text-[10px]', ink.faint)}
                >
                  ← {note}
                </span>
              )}
            </span>

            {gloss && (
              <span
                className={cn('mt-1.5 block font-[family-name:var(--face-ui)] text-[14px] leading-[1.4]', ink.soft)}
              >
                {gloss}
              </span>
            )}

            {(word.jlpt_level != null || pos) && (
              <span className="mt-[9px] flex flex-wrap items-center gap-1.5">
                <JlptChip level={word.jlpt_level} />
                {pos && <ClassPill selected={selected}>{pos}</ClassPill>}
              </span>
            )}
          </span>
        </span>
      </button>

      <span className={ROW_ADD_SLOT}>
        <AddButton onClick={onAdd} label={`Add ${headword} to a deck`} />
      </span>
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
  const ink = rowInk(selected);

  return (
    <li className="relative flex items-start">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={cn(ROW_SHELL, ROW_ADD_GUTTER, selected && ROW_SELECTED, ROW_FOCUS, 'cursor-pointer')}
      >
        <span
          className={cn(
            'flex size-11.5 shrink-0 items-center justify-center rounded-(--radius-tile) border',
            'font-(family-name:--face-jp) text-[30px] leading-none',
            ink.strong,
            selected ? EDGE_SELECTED : HAIRLINE,
          )}
        >
          {kanji.literal}
        </span>

        <span className="min-w-0 flex-1">
          <span className="font-(family-name:--face-mono) text-[9.5px] tracking-[0.14em] uppercase text-(--accent)">
            Kanji
          </span>

          {kanji.meanings.length > 0 && (
            <span className={cn('mt-0.5 block font-(family-name:--face-ui) text-[12.5px] leading-[1.4]', ink.soft)}>
              {kanji.meanings.slice(0, 3).join(', ')}
            </span>
          )}

          <span className="mt-[9px] flex flex-wrap items-center gap-1.5">
            <JlptChip level={kanji.jlpt_level} />
            {kanji.stroke_count != null && <ClassPill selected={selected}>{`${kanji.stroke_count} strokes`}</ClassPill>}
          </span>
        </span>
      </button>

      <span className={ROW_ADD_SLOT}>
        <AddButton onClick={onAdd} label={`Add ${kanji.literal} to a deck`} />
      </span>
    </li>
  );
}
