'use client';

import Link from 'next/link';
import { GalleryVerticalEnd, Plus } from 'lucide-react';

type Props = {
  /** Total cards due across every deck. 0 flips the primary CTA to "Study ahead". */
  dueTotal: number;
  /** Hides the count pill until the figure has actually landed, so it can't
   *  flash "0" and then fill in. */
  dueLoading: boolean;
  onNewDeck: () => void;
  /** True once the user is at the deck quota. The list renders the
   *  explanatory line; this just stops the button being a dead end. */
  newDeckDisabled?: boolean;
};

// Buttons are local rather than the shared `Button`. This screen's pair sit at
// 11px/16px padding with 13.5px and 14px labels and a ghost variant that takes
// its edge from --paper-bd; `Button` is 20px/13px at 15px and borders --ink.
// Overriding nearly every value through className would leave a component whose
// own styles never apply, which is harder to read than the markup below.
const BUTTON_BASE =
  'inline-flex items-center rounded-(--radius-button) leading-none font-bold ' +
  'font-[family-name:var(--face-ui)] whitespace-nowrap ' +
  'transition-[transform,box-shadow,border-color,color] duration-[180ms] ease-[ease] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink) ' +
  'active:translate-y-0 active:opacity-[0.92] motion-reduce:transform-none';

const GHOST =
  `${BUTTON_BASE} gap-2 border border-(--paper-bd) bg-transparent px-4 py-[11px] ` +
  'text-[13.5px] text-(--soft) hover:border-(--btn) hover:bg-(--paper-tile) hover:text-(--btn)';

export function DecksHeader({ dueTotal, dueLoading, onNewDeck, newDeckDisabled }: Props) {
  const hasDue = dueTotal > 0;

  return (
    <div className="mb-7 flex flex-col items-start justify-between gap-6 min-[900px]:flex-row min-[900px]:items-end">
      <div className="flex items-center gap-[13px]">
        {/* Shares the deck card's shadow token rather than carrying its own
            lighter variant: one fewer name in the palette, and a hardcoded
            light-theme shadow would read as grey haze on the dark canvas. */}
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-(--radius-button) border border-(--paper-bd) bg-(--paper-tile) text-(--btn) shadow-(--paper-shadow)"
        >
          <GalleryVerticalEnd size={22} strokeWidth={1.7} />
        </span>
        <h1 className="m-0 font-[family-name:var(--face-jp)] text-[34px] leading-[1.05] font-bold tracking-[-0.01em] text-(--ink)">
          Decks
        </h1>
      </div>

      <div className="flex w-full items-center gap-3 min-[900px]:w-auto">
        <button
          type="button"
          onClick={onNewDeck}
          disabled={newDeckDisabled}
          className={`${GHOST} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-(--paper-bd) disabled:hover:bg-transparent disabled:hover:text-(--soft)`}
        >
          <Plus size={15} strokeWidth={2} />
          New deck
        </button>

        {/* With nothing due the primary collapses to the ghost style and the
            label changes: "Study all due" with no due cards would promise a
            session the backend can't fill. Bare `/study` is the all-decks
            hardest session; `?due=1` is the due-only one, so the two labels
            each link to the thing they actually name. */}
        {hasDue ? (
          <Link
            href="/study?due=1"
            className={`${BUTTON_BASE} gap-2.5 bg-(--btn) py-[11px] pr-[15px] pl-[18px] text-sm text-(--btn-ink) shadow-[0_8px_20px_rgba(33,56,92,.24)] hover:-translate-y-px hover:shadow-[0_12px_26px_rgba(33,56,92,.34)]`}
          >
            <PlayGlyph />
            Study all due
            {!dueLoading && (
              // Fixed colours: the handoff pins this pill in both themes, the
              // same way the night panel and the due badges are pinned.
              <span
                className="rounded-(--radius-chip) px-2 py-0.5 font-[family-name:var(--face-mono)] text-xs leading-[1.4] font-bold"
                style={{ background: '#f4dc82', color: '#3a2c0e' }}
              >
                {dueTotal.toLocaleString()}
              </span>
            )}
          </Link>
        ) : (
          <Link href="/study" className={`${GHOST} !text-(--soft)`}>
            <PlayGlyph />
            Study ahead
          </Link>
        )}
      </div>
    </div>
  );
}

// Filled triangle. lucide's `Play` strokes its outline by default and the
// handoff draws a solid glyph.
function PlayGlyph() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4.5l13 7.5-13 7.5z" />
    </svg>
  );
}
