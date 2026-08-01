import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  title: string;
  /** Usually a `<MonoAction>`. Sits hard right on the baseline. */
  action?: ReactNode;
  /** Set when the parent `<Card>` points its `aria-labelledby` here. */
  id?: string;
  className?: string;
};

// Card title plus its corner action. Carries no vertical margin of its own —
// the gap below a header differs per card (18px on Library, 14px on
// Dictionary), so spacing stays with the caller rather than becoming a prop
// that only ever holds two values.
export function CardHeader({ title, action, id, className }: Props) {
  return (
    <div className={cn('flex items-baseline gap-[9px]', className)}>
      <h2
        id={id}
        className="font-[family-name:var(--face-ui)] text-2xl font-bold text-(--ink)"
      >
        {title}
      </h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}
