import { cn } from '@/lib/util/cn';

type Props = {
  className?: string;
};

// Loading placeholder. Sized by the caller so each card can reserve its own
// real height and nothing shifts when the data lands. Static, not pulsing —
// the shell stays, the content softens. The neutral is the kbd chip's wash.
export function Skeleton({ className }: Props) {
  return <div aria-hidden className={cn('rounded-full bg-[rgb(var(--line-rgb)/0.06)]', className)} />;
}
