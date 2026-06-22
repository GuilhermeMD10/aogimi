'use client';

import { useStatsCards } from '../hooks/useStatsCards';
import type { CardRecord } from '@/components/decks/types';

const STATE_LABELS: Record<'new' | 'seen' | 'learned' | 'mastered', string> = {
  new: 'new',
  seen: 'seen',
  learned: 'learned',
  mastered: 'mastered',
};

const STATE_COLORS: Record<'new' | 'seen' | 'learned' | 'mastered', string> = {
  new: 'text-lgc-fg-subtle',
  seen: 'text-lgc-warning',
  learned: 'text-lgc-success opacity-70',
  mastered: 'text-lgc-success',
};

export function CardsTab() {
  const { data, loading, error } = useStatsCards();

  if (loading) {
    return <div className="p-6 text-center text-sm text-lgc-fg-muted">Loading…</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-sm text-lgc-fg-muted">{error}</div>;
  }

  const states: ('new' | 'seen' | 'learned' | 'mastered')[] = ['new', 'seen', 'learned', 'mastered'];

  return (
    <div className="space-y-8 px-4 pb-10 pt-4 @md:px-7">
      <Section label="Distribution">
        <div className="overflow-hidden rounded-md border border-lgc-border">
          {states.map((s, i) => (
            <div
              key={s}
              className={`flex items-center justify-between px-4 py-3 ${
                i > 0 ? 'border-t border-lgc-border' : ''
              }`}
            >
              <span className={`text-sm capitalize ${STATE_COLORS[s]}`}>
                {STATE_LABELS[s]}
              </span>
              <span className="font-mono tabular-nums text-base text-lgc-fg">
                {data.byState[s]}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t-2 border-lgc-border-strong px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
              Total
            </span>
            <span className="font-mono tabular-nums text-base font-semibold text-lgc-fg">
              {data.total}
            </span>
          </div>
        </div>
      </Section>

      <Section label="Hardest cards">
        {data.hardest.length === 0 ? (
          <p className="text-center text-sm text-lgc-fg-subtle">Nothing has struggled yet</p>
        ) : (
          <div className="space-y-1.5">
            {data.hardest.map((card) => (
              <HardCardRow key={card.id} card={card} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function HardCardRow({ card }: { card: CardRecord }) {
  const agains = (card.last_outcomes.match(/A/g) || []).length;
  return (
    <div className="flex items-center gap-3 rounded-md border border-lgc-border bg-lgc-bg-elev px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate font-jp text-base font-medium text-lgc-fg">
          {card.front}
        </div>
        {card.back.length > 0 && (
          <div className="truncate text-xs text-lgc-fg-muted">{card.back}</div>
        )}
      </div>
      <div className="flex flex-col items-end font-mono tabular-nums">
        <span className="text-xs font-bold text-lgc-warning">
          D {(card.difficulty * 100).toFixed(0)}
        </span>
        {agains > 0 && (
          <span className="text-xs text-lgc-fg-muted">{agains}A</span>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-lgc-fg-muted">
        {label}
      </div>
      {children}
    </div>
  );
}
