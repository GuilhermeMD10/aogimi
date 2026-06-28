'use client';

import { ArrowLeft, RotateCcw } from 'lucide-react';
import type { SessionSummary } from '../types';
import { BreakdownBar } from './BreakdownBar';
import { StateChangesList } from './StateChangesList';
import { HardestInSessionList } from './HardestInSessionList';

type Props = {
  summary: SessionSummary;
  onStudyAgain: () => void;
  onBackToDeck: () => void;
};

// End-of-session summary. Same five blocks as mobile: hero count,
// breakdown bar, state-changes list, hardest list, CTAs.
export function FinishScreen({ summary, onStudyAgain, onBackToDeck }: Props) {
  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="flex flex-1 flex-col items-center overflow-y-auto p-6 @md:p-10">
        <div className="w-full max-w-155 space-y-6">
          <div className="flex flex-col items-center pt-6 text-center">
            <div className="font-display text-[64px] leading-none tracking-tight text-lgc-fg">
              {summary.uniqueCards}
            </div>
            <div className="mt-1 text-base text-lgc-fg-muted">cards reviewed</div>
          </div>

          <BreakdownBar entries={summary.perCard} />

          <SectionLabel>Progression</SectionLabel>
          <StateChangesList entries={summary.perCard} />

          <SectionLabel>Hardest this session</SectionLabel>
          <HardestInSessionList entries={summary.perCard} />
        </div>
      </div>

      <div className="flex w-full justify-center border-t border-lgc-border p-4">
        <div className="flex w-full max-w-155 gap-2.5">
          <button
            type="button"
            onClick={onStudyAgain}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-lgc-accent px-3 py-3 text-sm font-medium text-lgc-accent-fg transition-opacity hover:opacity-90"
          >
            <RotateCcw size={14} /> Study again
          </button>
          <button
            type="button"
            onClick={onBackToDeck}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-lgc-border px-3 py-3 text-sm font-medium text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
          >
            <ArrowLeft size={14} /> Back to deck
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-fg-muted">
      {children}
    </div>
  );
}
