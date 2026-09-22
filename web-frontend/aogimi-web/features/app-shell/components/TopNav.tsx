'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, User } from 'lucide-react';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { ACTIVE, Brand, Kbd, PANE_NAV, PRESS } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { NAV_ITEMS, type NavSection } from '../lib/frameForRoute';

type Props = {
  section: NavSection | null;
};

/** The 34px item inside either pill. */
const ITEM = cn(
  PRESS,
  'flex h-[34px] items-center rounded-full font-[family-name:var(--face-ui)] leading-none whitespace-nowrap',
  'transition-[background-color,color,transform] duration-120 ease-[ease]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
);

/** The 44px pill shell both groups sit in. */
const PILL = 'flex h-11 items-center rounded-full border border-(--hairline) bg-(--pane) px-[5px]';

/**
 * The top navigation bar (README → Shared shell → Top navigation bar): the
 * 64px floating pill with the brand on the left, the section pill in the
 * middle and the utility pill on the right. Replaces the bottom Dock and the
 * per-page TopBar (D2); renders on every signed-in page, an open book
 * included.
 *
 * - **Real links, not `router.push` on a `<button>`.** Middle-click and
 *   open-in-new-tab work, `next/link` prefetches, and a screen reader reads
 *   them as navigation.
 * - **`aria-current="page"`** carries the active state, not colour alone.
 * - **Search** goes to `/dictionary` — where `⌘K` already focuses the field.
 *   `AppFrame` wires the same key globally. Owner's call still open on whether
 *   it should open the dictionary `Modal` instead (BRIEF §4.6).
 * - **No streak chip.** It needs a streak computed from `/api/stats/activity`
 *   (PLAN §3 G14), which has no ruling; the slot is where the chip goes.
 * - **Avatar** → `/profile`. No avatar images exist, so it is the user icon.
 */
export function TopNav({ section }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <header
      className={cn(
        PANE_NAV,
        'flex h-16 items-center justify-between gap-4 rounded-full pr-2.5 pl-[22px]',
        'font-[family-name:var(--face-ui)] text-(--ink)',
      )}
    >
      {/* Brand */}
      <Link
        href="/"
        aria-label="Aogimi — library"
        className="flex items-center rounded-full transition-opacity duration-120 ease-[ease] hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
      >
        <Brand />
      </Link>

      {/* Section pill */}
      <nav aria-label="Sections" className={cn(PILL, 'gap-0.5')}>
        {NAV_ITEMS.map((item) => {
          const active = item.section === section;
          return (
            <Link
              key={item.section}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                ITEM,
                'px-[18px] text-[14px]',
                active ? cn(ACTIVE, 'font-bold') : 'font-medium text-(--ink-2) hover:bg-[rgb(var(--line-rgb)/0.04)]',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Utility pill */}
      <div className={cn(PILL, 'gap-2')}>
        <button
          type="button"
          onClick={() => router.push('/dictionary')}
          className={cn(ITEM, 'gap-2 pr-2.5 pl-3.5 text-[13px] font-medium text-(--ink-2) hover:bg-[rgb(var(--line-rgb)/0.04)]')}
        >
          <Search size={15} strokeWidth={2.2} aria-hidden />
          Search
          <Kbd>⌘K</Kbd>
        </button>

        <Link
          href="/profile"
          aria-label={user ? `Profile — ${user.username}` : 'Profile'}
          className={cn(
            PRESS,
            'flex size-[34px] items-center justify-center rounded-full bg-(--accent) text-(--on-accent)',
            'transition-[filter,transform] duration-120 ease-[ease] hover:brightness-[1.06]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)',
          )}
        >
          <User size={16} strokeWidth={2.2} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
