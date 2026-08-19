'use client';

import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button, PAPER_GHOST } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import type { SessionSummary } from '../types';
import { BreakdownBar } from './BreakdownBar';
import { HardestInSessionList } from './HardestInSessionList';
import { StateChangesList } from './StateChangesList';

type Props = {
  summary: SessionSummary;
  /** The deck's name, or the scope's ("All decks", "Due today"). */
  label: string;
  /** The deck's cover glyph. Absent on a cross-deck session, which has none. */
  kamon?: string;
  onStudyAgain: () => void;
  onBackToDeck: () => void;
};

/* The banner is this deep purple in both themes, so its three stops and its two
   inks are hardcoded rather than tokenised — the same call `shared/components/
   SkyBar` makes and for the same reason: there is one value per slot, and a
   token would only add a name that always resolves to the same colour.
   The inks are light-on-dark even in "Ink on paper", so `--soft` / `--muted`
   would be exactly backwards here.

   Starless on purpose: fake stars would be the one sky in the app that isn't
   the real map, and the empty-sky convention on home and the deck card is to
   wait for it rather than draw a stand-in. */
const BANNER = 'radial-gradient(130% 175% at 50% -12%, #06081E 15%, #1A1556 56%, #3A2A8C 108%)';
const BANNER_INK = '#B9BCE8';
const BANNER_INK_DIM = '#8A8FD0';

/**
 * The round is over: the night banner, what got studied, and the two ways out.
 *
 * Four sections under the count: TIER PROGRESS (promotions *and* demotions),
 * the session mix, and the hardest cards. The mix bar carries the grade
 * breakdown.
 */
export function FinishScreen({
  summary,
  label,
  kamon,
  onStudyAgain,
  onBackToDeck,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-[720px] py-1.5">
      <section className="overflow-hidden rounded-(--radius-panel) border border-(--paper-bd) bg-(--paper) shadow-(--paper-shadow-hover)">
        <div
          className="flex h-[158px] flex-col items-center justify-center gap-1.75"
          style={{ background: BANNER }}
        >
          <div
            className="font-[family-name:var(--face-mono)] text-[11px] tracking-[0.2em] uppercase"
            style={{ color: BANNER_INK }}
          >
            Session complete
          </div>
          <div
            className="max-w-[80%] truncate font-[family-name:var(--face-mono)] text-[10.5px] tracking-[0.08em]"
            style={{ color: BANNER_INK_DIM }}
          >
            {kamon ? `${kamon} · ${label}` : label}
          </div>
        </div>

        <div className="px-8.5 pt-6.5 pb-7.5">
          <div className="flex items-baseline gap-3">
            <span className="font-[family-name:var(--face-ui)] text-[52px] leading-none font-bold text-(--ink) tabular-nums">
              {summary.uniqueCards}
            </span>
            <span className="font-[family-name:var(--face-ui)] text-[15px] text-(--muted)">
              {summary.uniqueCards === 1 ? 'card studied' : 'cards studied'}
            </span>
          </div>

          <StateChangesList entries={summary.perCard} />
          <BreakdownBar entries={summary.perCard} />
          <HardestInSessionList entries={summary.perCard} />

          <div className="mt-6.5 flex gap-3">
            <button
              type="button"
              onClick={onBackToDeck}
              className={cn(PAPER_GHOST, 'w-auto flex-1 justify-center py-[13px]')}
            >
              <ArrowLeft size={14} strokeWidth={1.8} aria-hidden />
              Back to deck
            </button>
            <Button
              onClick={onStudyAgain}
              icon={<RotateCcw size={15} strokeWidth={1.8} aria-hidden />}
              className="w-auto flex-1 justify-center py-[14px] shadow-[0_8px_20px_rgba(33,56,92,.24)]"
            >
              Study again
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
