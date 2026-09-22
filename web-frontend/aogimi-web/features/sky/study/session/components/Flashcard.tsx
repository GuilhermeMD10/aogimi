'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/util/cn';
import type { CardRecord } from '@/features/sky/stage/types';
import type { DisplayPrefs } from '../types';
import { useFlip } from '../hooks/useFlip';
import type { StudySide } from '../hooks/useStudySession';
import { CardBody } from './CardBody';

type Props = {
  card: CardRecord;
  side: StudySide;
  prefs: DisplayPrefs;
  /** Clicking the card toggles its side (D10 — the current behaviour). */
  onFlip: () => void;
  /** The top-right magnifier: open the dictionary for this word. */
  onLookup: () => void;
};

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)';

/**
 * The flashcard (pages 06 / 07): 760 wide, R36, the hero fill (`--pane-hero`,
 * glass-strength on Night), `--pane-bd` edge, `--shadow-hero`. **One size on
 * both faces — 460 tall, whatever is printed on it** (owner, 2026-09-22): the
 * handoff's "height grows to fit the back" is not built, so the shelf under
 * the card never moves between a reveal and the next front. A face that has
 * more than fits scrolls inside the card (`CardBody`). The turn between the
 * faces is `useFlip`'s two half-turns.
 *
 * Two controls, side by side in the DOM rather than nested: the card itself
 * is the flip button, and the 40px magnifier circle floats over its top-right
 * corner as a sibling — a button inside a button isn't HTML.
 *
 * The handoff blurs the card; panes on the light themes don't blur (BRIEF §7
 * trap 3), so this one doesn't either.
 */
export function Flashcard({ card, side, prefs, onFlip, onLookup }: Props) {
  const { shown, phase, onAnimationEnd } = useFlip(card.id, side);

  return (
    <div className="relative w-full max-w-[760px]">
      <button
        type="button"
        onClick={onFlip}
        aria-label={shown === 'front' ? 'Reveal the answer' : 'Back to the question'}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) onAnimationEnd();
        }}
        className={cn(
          'relative flex w-full flex-col rounded-(--radius-flashcard) border border-(--pane-bd) text-left shadow-(--shadow-hero)',
          'font-[family-name:var(--face-ui)] text-(--ink)',
          FOCUS_RING,
          'h-[460px] p-12',
          phase === 'out' && 'animate-[flip-out_ease-in_both] motion-reduce:animate-[fade-out_ease-in_both]',
          phase === 'in' && 'animate-[flip-in_ease-out_both] motion-reduce:animate-[fade-in_ease-out_both]',
        )}
        style={{ background: 'var(--pane-hero)', animationDuration: 'calc(var(--flip-anim) / 2)' }}
      >
        <CardBody card={card} prefs={prefs} side={shown} />
      </button>

      <button
        type="button"
        onClick={onLookup}
        aria-label={`Look up ${card.front} in the dictionary`}
        title="Look up in the dictionary"
        className={cn(
          'absolute top-5 right-5 grid size-10 place-items-center rounded-full border border-[rgb(var(--line-rgb)/0.08)] bg-(--pane-strong) text-(--accent)',
          'transition-[background-color,color] duration-120 ease-[ease] hover:text-(--accent-hover)',
          FOCUS_RING,
        )}
      >
        <Search size={16} strokeWidth={2.2} aria-hidden />
      </button>
    </div>
  );
}
