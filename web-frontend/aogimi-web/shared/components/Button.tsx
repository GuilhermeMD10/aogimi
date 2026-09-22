'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/util/cn';
import { BackIcon, CloseIcon, MoreIcon } from '@/shared/icons';
import { PANE, PRESS } from './glass';
import { Kbd } from './Kbd';

type Variant = 'primary' | 'white' | 'icon' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  children?: ReactNode;
  /** Leading glyph (15–22px, `currentColor`). Omit for a text-only button. */
  icon?: ReactNode;
  /** The trailing keyboard hint a primary button carries (`SPACE`, `28 DUE`,
   *  `->`). Primary only; a drawn hint must be a working key. */
  kbd?: ReactNode;
  variant?: Variant;
  /** `primary` / `white`: 44 · 48 · 52 tall. `icon`: 44 · 44 · 52 circle. */
  size?: Size;
  /** `icon` variant only — one of the three built-in glyphs, in place of
   *  `children`. */
  glyph?: 'back' | 'more' | 'close';
  /** Present → renders an anchor. Absent → a real <button>. */
  href?: string;
  onClick?: () => void;
  /** Ignored when `href` is set — a link has no form semantics. */
  type?: 'button' | 'submit';
  /** Ignored when `href` is set. */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  title?: string;
};

/**
 * The one shared button (README → Reusable components).
 *
 * - `primary` — accent pill with the glow, white label, optional leading icon
 *   and trailing `Kbd` pill. Hover brightens (`filter: brightness(1.06)`).
 * - `white` — the white pill: `.pane`, ink label, hover → `--pane-strong`.
 * - `icon` — the 44px (52px `lg`) white circle. `glyph` gives it `back`,
 *   `more` or `close`; anything else goes in `children`.
 * - `danger` — the one destructive affordance: an outline pill in `--danger`
 *   (`DANGER` .35 edge, .12 fill on hover). Delete book, delete account.
 *
 * `href` decides the element: a navigation must be an anchor so it prefetches,
 * opens in a new tab on middle-click, and reads as a link to a screen reader.
 * Anything that has to run code first is a button.
 */
const BASE = cn(
  PRESS,
  'inline-flex shrink-0 items-center justify-center leading-none whitespace-nowrap',
  'font-[family-name:var(--face-ui)] font-bold',
  // `.press` owns transform; the colour/filter properties are added here so
  // the nudge keeps easing (BRIEF §7 trap 4).
  'transition-[transform,background-color,color,filter,opacity] duration-120 ease-[ease]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
  'disabled:pointer-events-none disabled:opacity-60',
);

const PILL_HEIGHT: Record<Size, string> = {
  sm: 'h-11 text-[14px]',
  md: 'h-12 text-[15px]',
  lg: 'h-[52px] text-[15px]',
};

const CIRCLE_SIZE: Record<Size, string> = {
  sm: 'size-11',
  md: 'size-11',
  lg: 'size-[52px]',
};

const GLYPHS = {
  back: <BackIcon />,
  more: <MoreIcon />,
  close: <CloseIcon />,
} as const;

export function Button({
  children,
  icon,
  kbd,
  variant = 'primary',
  size = 'md',
  glyph,
  href,
  onClick,
  type = 'button',
  disabled = false,
  className,
  title,
  'aria-label': ariaLabel,
  'aria-pressed': ariaPressed,
}: Props) {
  const classes =
    variant === 'icon'
      ? cn(BASE, PANE, 'rounded-full text-(--ink) hover:bg-(--pane-strong)', CIRCLE_SIZE[size], className)
      : variant === 'white'
        ? cn(BASE, PANE, 'gap-2 rounded-full px-[22px] text-(--ink) hover:bg-(--pane-strong)', PILL_HEIGHT[size], className)
        : variant === 'danger'
          ? cn(
              BASE,
              'gap-2 rounded-full border border-[rgb(var(--danger-rgb)/0.35)] px-[22px] text-(--danger)',
              'hover:bg-[rgb(var(--danger-rgb)/0.12)]',
              PILL_HEIGHT[size],
              className,
            )
        : cn(
            BASE,
            'rounded-full bg-(--accent) text-(--on-accent) shadow-[0_10px_24px_rgb(var(--accent-rgb)/0.3)]',
            'hover:brightness-[1.06]',
            kbd ? 'gap-3 pr-2 pl-[22px]' : 'gap-2.5 px-6',
            PILL_HEIGHT[size],
            className,
          );

  const content =
    variant === 'icon' ? (
      <>{glyph ? GLYPHS[glyph] : children}</>
    ) : (
      <>
        {icon}
        {children}
        {kbd && (
          <Kbd onAccent>{kbd}</Kbd>
        )}
      </>
    );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={classes} aria-label={ariaLabel} title={title}>
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
      aria-pressed={ariaPressed}
      title={title}
    >
      {content}
    </button>
  );
}
