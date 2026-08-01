import { cn } from '@/lib/util/cn';

type Props = {
  className?: string;
};

// Loading placeholder. Sized by the caller so each card can reserve its own
// real height and nothing shifts when the data lands.
//
// Static, not pulsing: the handoff allows exactly one transition on the page
// and says nothing else animates, so a shimmer would be the loudest thing on
// screen. Colour comes from --track, the same neutral the progress bars use.
export function Skeleton({ className }: Props) {
  return <div aria-hidden className={cn('rounded-[4px] bg-(--track)', className)} />;
}
