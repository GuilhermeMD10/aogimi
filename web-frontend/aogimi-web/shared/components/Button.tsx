'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';

type Variant = 'primary' | 'secondary';

type Props = {
  children: ReactNode;
  /** Leading glyph, rendered at 15px. Omit for a text-only button. */
  icon?: ReactNode;
  variant?: Variant;
  /** Present → renders an anchor. Absent → a real <button>. */
  href?: string;
  onClick?: () => void;
  /** Ignored when `href` is set — a link has no form semantics. `submit` lets
   *  a form's primary action be this component instead of a hand-rolled one. */
  type?: 'button' | 'submit';
  /** Ignored when `href` is set. Pointer events and the hover lift go with it,
   *  so a pending button doesn't invite a second click. */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
};

// The one shared button. Both of home's CTAs ("Resume reading", "Study now")
// are this component with a different glyph and label, and the empty states
// swap in the secondary variant.
//
// `href` decides the element: a navigation must be an anchor so it prefetches,
// opens in a new tab on middle-click, and reads as a link to a screen reader.
// Anything that has to run code first (seeding a pending book open, flipping a
// theme) is a button. One component, correct semantics either way.
const BASE = cn(
  'inline-flex w-fit items-center gap-2 leading-none',
  'rounded-(--radius-button) px-5 py-[13px] text-[15px] font-bold',
  'font-[family-name:var(--face-ui)]',
  // Deliberately the only motion on the page.
  'transition-[transform,opacity,border-color] duration-120 ease-[ease]',
  'hover:-translate-y-px active:translate-y-0 active:opacity-[0.92]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);

// Secondary takes its border from --ink rather than --bd: --bd is transparent
// by design (shadow separates surfaces), so a secondary button drawn with it
// would have no visible edge at all.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-(--btn) text-(--btn-ink)',
  secondary: 'border border-(--ink) bg-transparent text-(--ink)',
};

export function Button({
  children,
  icon,
  variant = 'primary',
  href,
  onClick,
  type = 'button',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const classes = cn(
    BASE,
    VARIANTS[variant],
    disabled && 'pointer-events-none opacity-60 hover:translate-y-0',
    className,
  );

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
    >
      {content}
    </button>
  );
}
