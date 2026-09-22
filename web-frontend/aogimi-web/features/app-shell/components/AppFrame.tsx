'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Footer, StarField } from '@/shared/components';
import { cn } from '@/lib/util/cn';
import { THEMES, useTheme } from '../providers/ThemeProvider';
import { TopNav } from './TopNav';
import { frameForRoute } from '../lib/frameForRoute';

/**
 * The page frame every signed-in screen renders inside (BRIEF §3.4/§3.5):
 * nav → content → optional footer, on the canvas `globals.css` paints. Night
 * mounts the procedural `StarField` under everything.
 *
 * Layout: the nav sits `20px 40px 0`; content takes the route's gutter —
 * `wide` is a 1280px column with 40px gutters (Sky, Dictionary result,
 * Reader), `content` is 96px gutters (Library, Dictionary lookup, Study) in a
 * column capped at 1980px (owner's call, 2026-09-22 — the handoff's fluid
 * pages had no ceiling). Which one, and which footer, is `frameForRoute`'s
 * table.
 *
 * `flow` (per route) decides who scrolls. `fill`: the frame is viewport-high
 * and content is `flex-1 min-h-0`, so a screen that scrolls inside itself
 * keeps working and the reader's fixed-height engines fit under the nav.
 * `page`: the frame is only `min-h-full`, the document scrolls and the footer
 * follows the content — the library. There is no bottom reserve anymore.
 *
 * `⌘K` anywhere goes to `/dictionary` (README → Behaviour). It stays out of
 * the way on `/dictionary`, where the field owns the key, and inside a book,
 * whose lookup surfaces own their own.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { gutter, footer, section, flow, nav } = frameForRoute(pathname);

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
          `frameForRoute` row says `nav: false`). */}
      {nav && (
        <div className={cn('mx-auto w-full shrink-0 px-10 pt-5', wide ? 'max-w-[1280px]' : 'max-w-[1980px]')}>
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

      {footer !== 'none' && <Footer variant={footer} themeName={THEMES[theme].name} />}
    </div>
  );
}
