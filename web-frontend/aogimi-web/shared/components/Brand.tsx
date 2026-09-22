import { cn } from '@/lib/util/cn';

type Props = {
  className?: string;
};

/**
 * The brand cluster (README → Shared shell → Top navigation bar → Brand): the
 * 38px soft-accent circle with 仰 in the accent, 12px gap, the wordmark at
 * 21/700 −0.01em. Drawn by the top nav on every signed-in page and by the
 * auth screen's bar; neither owns a link here — `TopNav` wraps it in one, the
 * auth screen has nowhere to send it.
 */
export function Brand({ className }: Props) {
  return (
    <span className={cn('flex items-center gap-3 font-[family-name:var(--face-ui)] text-(--ink)', className)}>
      <span
        aria-hidden
        className="flex size-[38px] items-center justify-center rounded-full bg-[rgb(var(--accent-soft-rgb)/0.5)] font-[family-name:var(--face-jp)] text-[17px] font-bold text-(--accent)"
      >
        仰
      </span>
      <span className="text-[21px] font-bold tracking-[-0.01em]">Aogimi</span>
    </span>
  );
}
