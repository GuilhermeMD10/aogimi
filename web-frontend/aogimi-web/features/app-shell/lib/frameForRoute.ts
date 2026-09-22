/**
 * What the app frame draws around each route (PLAN §0's table, per page):
 * the content gutter, which footer, and which nav section lights up.
 *
 * One table, by route, so a page's session changes its row here rather than
 * threading props through `AppShell`. `/authenticate` has no frame at all —
 * it is the signed-out screen and `AppShell` renders it bare.
 *
 * Known limit: the dictionary's lookup (page 02: 96px gutter, variant footer)
 * and result (page 03: 40px, no footer) states share `/dictionary` and differ
 * by `?q=`. This is route-only, so the row below is the lookup page's; the
 * dictionary session decides how the result state overrides it.
 */

export type Gutter = 'wide' | 'content';
export type FooterKind = 'none' | 'standard' | 'dictionary';
export type NavSection = 'dictionary' | 'reader' | 'sky';
/** `fill`: the frame is viewport-high and the page scrolls inside itself (the
 *  reader's engines, the sky field). `page`: the document scrolls and the
 *  footer follows the content (the library). */
export type Flow = 'fill' | 'page';

export type FrameConfig = {
  gutter: Gutter;
  footer: FooterKind;
  /** Which section pill item is `aria-current="page"`; `null` for none. */
  section: NavSection | null;
  flow: Flow;
  /** Whether the top nav renders. An open book drops it: the reader's own bar
   *  takes the nav's slot and material so the page gets the height back
   *  (owner's call, 2026-09-22 — a deliberate exception to D2). */
  nav: boolean;
};

/** The section pill, in render order. Reader points at `/` (D2). */
export const NAV_ITEMS: { section: NavSection; label: string; href: string }[] = [
  { section: 'dictionary', label: 'Dictionary', href: '/dictionary' },
  { section: 'reader', label: 'Reader', href: '/' },
  { section: 'sky', label: 'Sky', href: '/sky' },
];

const CONTENT_NONE: FrameConfig = { gutter: 'content', footer: 'none', section: null, flow: 'fill', nav: true };

export function frameForRoute(pathname: string): FrameConfig {
  if (pathname === '/') return { gutter: 'content', footer: 'standard', section: 'reader', flow: 'page', nav: true };
  // A prefix, not equality: `/reader` has no page of its own (only the
  // `[bookId]` segment), so this can never match the bare segment.
  if (pathname.startsWith('/reader/')) return { gutter: 'wide', footer: 'none', section: 'reader', flow: 'fill', nav: false };
  if (pathname === '/dictionary') return { gutter: 'content', footer: 'dictionary', section: 'dictionary', flow: 'fill', nav: true };
  if (pathname === '/sky') return { gutter: 'wide', footer: 'none', section: 'sky', flow: 'fill', nav: true };
  if (pathname === '/study') return { gutter: 'content', footer: 'none', section: 'sky', flow: 'fill', nav: true };
  return CONTENT_NONE;
}
