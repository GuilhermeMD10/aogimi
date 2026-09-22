'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { StarField } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { useTheme } from '../providers/ThemeProvider';
import { useFrameOverrideValue } from '../providers/FrameOverrideProvider';
import { TopNav } from './TopNav';
import { frameForRoute } from '../lib/frameForRoute';

/**
 * The page frame every signed-in screen renders inside (BRIEF §3.4/§3.5):
 * nav → content, on the canvas `globals.css` paints. Night mounts the
 * procedural `StarField` under everything. There is no footer — the owner
 * removed it from every page (2026-09-22).
 *
 * Layout: the nav sits `20px 40px 0`; content takes the route's gutter —
 * `wide` is a 1280px column with 40px gutters (Sky, Dictionary result,
 * Reader), `content` is 96px gutters (Library, Dictionary lookup, Study) in a
 * column capped at 1980px (owner's call, 2026-09-22 — the handoff's fluid
 * pages had no ceiling). Which one is `frameForRoute`'s table, unless the page
 * overrides it (`FrameOverrideProvider`).
 *
 * `flow` (per route) decides who scrolls. `fill`: the frame is viewport-high
 * and content is `flex-1 min-h-0`, so a screen that scrolls inside itself
 * keeps working and the reader's fixed-height engines fit under the nav.
 * `page`: the frame is only `min-h-full` and the document scrolls — the
 * library. There is no bottom reserve anymore.
 *
 * `⌘K` anywhere goes to `/dictionary` (README → Behaviour). It stays out of
 * the way on `/dictionary`, where the field owns the key, and inside a book,
 * whose lookup surfaces own their own.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  // The route's row, corrected by whatever the mounted page says about itself
  // (`useFrameOverride` — the dictionary's result state widens its gutter).
  const override = useFrameOverrideValue();
  const { gutter, section, flow, nav } = { ...frameForRoute(pathname), ...override };

  useEffect(() => {
    if (pathname === '/dictionary' || pathname.startsWith('/reader/')) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.defaultPrevented) {
        e.preventDefault();
        router.push('/dictionary');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pathname, router]);

  const wide = gutter === 'wide';
  const page = flow === 'page';

  return (
    <div className={cn('flex w-full flex-col', page ? 'min-h-full' : 'h-full min-h-0')}>
      {theme === 'night' && <StarField />}

      {/* An open book has no nav: the reader's bar takes this slot (its
          `frameForRoute` row says `nav: false`).
          The pill is capped at 1280px on every page, whatever the content's
          gutter — it must not change size between the dictionary's two states
          (owner's call, 2026-09-22). */}
      {nav && (
        <div className="mx-auto w-full max-w-[1280px] shrink-0 px-10 pt-5">
          <TopNav section={section} />
        </div>
      )}

      <main
        className={cn(
          'mx-auto flex min-h-0 w-full flex-1 flex-col',
          wide ? 'max-w-[1280px] px-10' : 'max-w-[1980px] px-24',
        )}
      >
        {children}
      </main>
    </div>
  );
}
