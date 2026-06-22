'use client';

import { useMemo } from 'react';

type DayCount = { date: string; count: number };

type Props = {
  perDay: DayCount[];
  windowDays?: number;
};

// Trailing-window bar chart. Bars scaled to the max in the window.
export function ReviewsPerDayChart({ perDay, windowDays = 30 }: Props) {
  const series = useMemo(() => {
    const dateToCount = new Map(perDay.map((d) => [d.date, d.count] as const));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: { iso: string; count: number }[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ iso, count: dateToCount.get(iso) ?? 0 });
    }
    return out;
  }, [perDay, windowDays]);

  const max = series.reduce((m, x) => Math.max(m, x.count), 1);

  return (
    <div>
      <div className="flex h-20 items-end gap-[2px] rounded-md border border-lgc-border px-1">
        {series.map((d) => {
          const heightPct = max > 0 ? (d.count / max) * 100 : 0;
          return (
            <div key={d.iso} className="flex h-full flex-1 items-end">
              <div
                className={`w-full rounded-sm ${d.count > 0 ? 'bg-lgc-success' : ''}`}
                style={{
                  height: `${d.count > 0 ? Math.max(heightPct, 4) : 0}%`,
                }}
                title={`${d.iso} — ${d.count} reviews`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[11px] font-mono tabular-nums text-lgc-fg-subtle">
        <span>{series[0]?.iso.slice(5) ?? ''}</span>
        <span>{series[series.length - 1]?.iso.slice(5) ?? ''}</span>
      </div>
    </div>
  );
}
