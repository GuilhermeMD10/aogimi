'use client';

import { RotateCcw } from 'lucide-react';
import { Button, HeroCard, ProgressBar, SectionCard, StatTile } from '@/shared/components';
import type { SessionDeck, SessionSummary } from '../types';
import { gradeTotals, tierChanges } from '../lib/sessionStats';
import { BreakdownBar } from './BreakdownBar';
import { HardestInSessionList } from './HardestInSessionList';
import { SessionHeader } from './SessionHeader';
import { StateChangesList } from './StateChangesList';

type Props = {
  summary: SessionSummary;
  /** Cards the session started with — the hero's `N / N`. */
  total: number;
  deck: SessionDeck | null;
  /** The scope's name when there's no deck ("Due today", "Study ahead"). */
  scopeLabel?: string;
  onStudyAgain: () => void;
  onBack: () => void;
};

const MONO = 'font-[family-name:var(--face-mono)] text-[11px] leading-none tracking-[0.04em] uppercase text-(--ink-3) tabular-nums';

/**
 * The round is over (page 08): header, the summary hero with its two stat
 * tiles, then Hardest cards and Tier changes side by side, then the mix.
 *
 * `Study again` sits beside the back control (owner, 2026-09-21) — the hero
 * carries figures, not actions. Not drawn: the session minutes (G8, cut) and
 * the footer (D11).
 */
export function FinishScreen({ summary, total, deck, scopeLabel, onStudyAgain, onBack }: Props) {
  const { correct, missed, missedCards, total: grades } = gradeTotals(summary.perCard);
  const correctPct = grades > 0 ? Math.round((correct / grades) * 100) : 0;
  const percent = total > 0 ? Math.round((summary.uniqueCards / total) * 100) : 0;

  const changes = tierChanges(summary.perCard);
  const ups = changes.filter((c) => c.up).length;
  const downs = changes.length - ups;

  const label = deck?.name ?? scopeLabel ?? 'Study session';

  return (
    <div className="flex flex-col gap-7">
      <SessionHeader
        kicker={
          deck ? (
            <span className="font-[family-name:var(--face-jp)] font-medium tracking-[0.04em] normal-case">{deck.name}</span>
          ) : (
            label
          )
        }
        title="Session complete"
        size="page"
        onBack={onBack}
        backLabel="Back to the sky"
        end={
          <Button onClick={onStudyAgain} icon={<RotateCcw size={15} strokeWidth={2.2} aria-hidden />}>
            Study again
          </Button>
        }
      />

      <HeroCard className="flex flex-wrap items-center gap-x-10 gap-y-6">
        <div className="flex min-w-[260px] flex-1 flex-col gap-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[32px] leading-[1.1] font-bold tracking-[-0.02em] text-(--ink)">
              {summary.uniqueCards} {summary.uniqueCards === 1 ? 'card' : 'cards'} reviewed
            </span>
            <span className="text-[12px] leading-none font-bold text-(--accent) tabular-nums">{percent}%</span>
          </div>
          <ProgressBar percent={percent} />
          <span className={MONO}>
            {label} · {grades} {grades === 1 ? 'grade' : 'grades'} · {summary.uniqueCards} / {total}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <StatTile
            label="Correct"
            value={correct}
            color="var(--grade-good)"
            meta={`${correctPct}% · good/easy`}
          />
          <StatTile
            label="Missed"
            value={missed}
            color="var(--grade-again)"
            meta={`again · ${missedCards} ${missedCards === 1 ? 'card' : 'cards'}`}
          />
        </div>
      </HeroCard>

      <div className="grid grid-cols-2 items-start gap-[18px] max-lg:grid-cols-1">
        <SectionCard title="Hardest cards" meta="This session">
          <HardestInSessionList entries={summary.perCard} />
        </SectionCard>
        <SectionCard title="Tier changes" meta={tierMeta(ups, downs)}>
          <StateChangesList entries={summary.perCard} />
        </SectionCard>
      </div>

      <SectionCard title="Session mix" meta="Where the cards stand">
        <BreakdownBar entries={summary.perCard} />
      </SectionCard>
    </div>
  );
}

/** The tier card's caption — the spec's `5 stars brighter`, honest about
 *  demotions: `2 brighter · 1 dimmer` when both happened. */
function tierMeta(ups: number, downs: number): string {
  if (ups === 0 && downs === 0) return 'No change';
  const parts: string[] = [];
  if (ups > 0) parts.push(`${ups} ${ups === 1 ? 'star' : 'stars'} brighter`);
  if (downs > 0) parts.push(`${downs} ${downs === 1 ? 'star' : 'stars'} dimmer`);
  return parts.join(' · ');
}
