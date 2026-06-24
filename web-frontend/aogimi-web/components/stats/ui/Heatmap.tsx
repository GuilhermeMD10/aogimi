'use client';

import { useMemo } from 'react';

type DayCount = { date: string; count: number };

type Props = {
  perDay: DayCount[];
};

const WEEKS = 52;
const DAYS_PER_WEEK = 7;
const CELL = 12;
const GAP = 2;

// Year-long activity heatmap. 52 columns × 7 rows aligned to the most
// recent Sunday on the right. Horizontal scroll on narrow viewports.

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function intensityClass(count: number): string {
  if (count === 0) return 'bg-lgc-bg-sunken';
  if (count <= 3) return 'bg-lgc-success opacity-25';
  if (count <= 9) return 'bg-lgc-success opacity-60';
  return 'bg-lgc-success';
}

export function Heatmap({ perDay }: Props) {
  const columns = useMemo(() => {
    const dateToCount = new Map(perDay.map((d) => [d.date, d.count] as const));
    const today = startOfDay(new Date());
    const todayTs = today.getTime();

    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());

    const cols: { date: Date; count: number; isFuture: boolean }[][] = [];
    for (let c = WEEKS - 1; c >= 0; c--) {
      const weekStart = new Date(lastSunday);
      weekStart.setDate(lastSunday.getDate() - c * DAYS_PER_WEEK);
      const week: { date: Date; count: number; isFuture: boolean }[] = [];
      for (let r = 0; r < DAYS_PER_WEEK; r++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + r);
        const iso = isoDate(day);
        week.push({
          date: day,
          count: dateToCount.get(iso) ?? 0,
          isFuture: day.getTime() > todayTs,
        });
      }
      cols.push(week);
    }
    return cols;
  }, [perDay]);

  return (
    <div className="overflow-x-auto py-2">
      <div className="flex gap-[2px]">
        {columns.map((week, ci) => (
          <div key={ci} className="flex flex-col gap-[2px]">
            {week.map((cell, ri) => (
              <div
                key={ri}
                className={`rounded-sm ${cell.isFuture ? '' : intensityClass(cell.count)}`}
                style={{
                  width: CELL,
                  height: CELL,
                  visibility: cell.isFuture ? 'hidden' : 'visible',
                }}
                title={`${isoDate(cell.date)} — ${cell.count} reviews`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const _UNUSED_GAP = GAP; // keep token referenced for clarity
