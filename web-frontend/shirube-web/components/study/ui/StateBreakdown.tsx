'use client';

export type StateCounts = {
  total: number;
  new: number;
  seen: number;
  learned: number;
  mastered: number;
};

type Props = {
  stats: StateCounts;
  variant?: 'inline' | 'expanded';
};

// Inline state counts row. Zero-count buckets vanish. Colors mirror
// the mobile palette: success green for learned/mastered, warning for
// seen, neutral subtle for new.
export function StateBreakdown({ stats, variant = 'inline' }: Props) {
  if (stats.total === 0) return null;

  const buckets: { label: string; count: number; cls: string }[] = [
    { label: 'mastered', count: stats.mastered, cls: 'text-lgc-success' },
    { label: 'learned',  count: stats.learned,  cls: 'text-lgc-success opacity-70' },
    { label: 'seen',     count: stats.seen,     cls: 'text-lgc-warning' },
    { label: 'new',      count: stats.new,      cls: 'text-lgc-fg-subtle' },
  ].filter((b) => b.count > 0);

  if (buckets.length === 0) return null;

  const sizeCls = variant === 'expanded' ? 'text-sm' : 'text-xs';

  return (
    <div className={`flex flex-wrap items-center gap-x-1 ${sizeCls}`}>
      {buckets.map((b, i) => (
        <span key={b.label} className={`${b.cls} font-mono tabular-nums`}>
          {b.count} {b.label}
          {i < buckets.length - 1 && (
            <span className="mx-1 text-lgc-fg-subtle"> · </span>
          )}
        </span>
      ))}
    </div>
  );
}
