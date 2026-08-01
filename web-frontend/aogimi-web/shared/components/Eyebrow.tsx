import { cn } from '@/lib/util/cn';

type Props = {
  children: string;
  className?: string;
};

// The mono uppercase label that opens a column ("RECENT DECKS", "RECENT
// UPGRADES", "WORD OF THE DAY"). Uppercases in CSS so callers pass normal
// prose and screen readers don't spell it out letter by letter.
export function Eyebrow({ children, className }: Props) {
  return (
    <div
      className={cn(
        'font-[family-name:var(--face-mono)] text-[11.5px] tracking-[0.14em] uppercase',
        'text-(--faint)',
        className,
      )}
    >
      {children}
    </div>
  );
}
