'use client';

import { useStatsActivity } from '../hooks/useStatsActivity';
import { Heatmap } from './Heatmap';
import { ReviewsPerDayChart } from './ReviewsPerDayChart';

export function ActivityTab() {
  const { data, loading, error } = useStatsActivity();

  if (loading) {
    return <div className="p-6 text-center text-sm text-lgc-fg-muted">Loading…</div>;
  }
  if (error) {
    return <div className="p-6 text-center text-sm text-lgc-fg-muted">{error}</div>;
  }

  return (
    <div className="space-y-8 px-4 pb-10 pt-4 @md:px-7">
      <div className="flex flex-col items-center py-4 text-center">
        <div className="font-display text-[56px] leading-none tracking-tight text-lgc-fg">
          {data.daysStudied}
        </div>
        <div className="mt-1 text-base text-lgc-fg-muted">days studied</div>
      </div>

      <Section label="Last year">
        <Heatmap perDay={data.perDay} />
      </Section>

      <Section label="Last 30 days">
        <ReviewsPerDayChart perDay={data.perDay} />
      </Section>
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
