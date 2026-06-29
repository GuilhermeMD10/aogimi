'use client';

import type { CardSessionEntry } from '../types';

type Props = {
  entries: CardSessionEntry[];
};

// Net per-card transitions for the session. Ping-pong (e.g. learned →
// seen → learned) collapses to "no change" because end matches start.
export function StateChangesList({ entries }: Props) {
  const counts = {
    firstReviewed: 0,
    advanced: 0,
    reachedMastered: 0,
    regressedToSeen: 0,
    regressedToLearned: 0,
  };

  for (const e of entries) {
    if (e.startState === e.endState) continue;
    if (e.startState === 'new'      && e.endState === 'seen')     counts.firstReviewed += 1;
    else if (e.startState === 'seen'     && e.endState === 'learned')  counts.advanced += 1;
    else if (e.startState === 'learned'  && e.endState === 'mastered') counts.reachedMastered += 1;
    else if (e.startState === 'learned'  && e.endState === 'seen')     counts.regressedToSeen += 1;
    else if (e.startState === 'mastered' && e.endState === 'learned')  counts.regressedToLearned += 1;
  }

  const rows: { positive: boolean; n: number; label: string }[] = [
    { positive: true,  n: counts.firstReviewed,      label: 'first reviewed' },
    { positive: true,  n: counts.advanced,           label: 'advanced to learned' },
    { positive: true,  n: counts.reachedMastered,    label: 'reached mastered' },
    { positive: false, n: counts.regressedToLearned, label: 'regressed to learned' },
    { positive: false, n: counts.regressedToSeen,    label: 'regressed to seen' },
  ].filter((r) => r.n > 0);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2.5 text-sm text-lgc-fg">
          <span
            className={`w-4 text-center font-bold ${
              r.positive ? 'text-lgc-success' : 'text-lgc-warning'
            }`}
          >
            {r.positive ? '→' : '↓'}
          </span>
          <span>
            {r.n} {r.label}
          </span>
        </div>
      ))}
    </div>
  );
}
