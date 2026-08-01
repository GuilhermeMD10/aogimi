'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Props = {
  children: ReactNode;
  /** Present → an anchor. Absent → a plain, non-interactive chip. */
  href?: string;
  className?: string;
};

// Rounded label — the deck chips under the due count. Renders as a link when
// it navigates and as a span when it doesn't, so a decorative chip isn't
// announced as an interactive element.
const BASE = cn(
  'inline-flex items-center rounded-(--radius-chip) px-[14px] py-2',
  'border border-(--bd) bg-(--cardalt)',
  'font-[family-name:var(--face-ui)] text-[13.5px] font-bold text-(--soft)',
);

export function Chip({ children, href, className }: Props) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          BASE,
          'transition-[opacity,border-color] duration-120 ease-[ease] hover:opacity-75',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          className,
        )}
      >
        {children}
      </Link>
    );
  }

  return <span className={cn(BASE, className)}>{children}</span>;
}
