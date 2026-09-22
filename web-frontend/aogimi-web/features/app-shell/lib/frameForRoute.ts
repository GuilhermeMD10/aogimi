/**
 * What the app frame draws around each route (PLAN §0's table, per page):
 * the content gutter and which nav section lights up.
 *
 * One table, by route, so a page's session changes its row here rather than
 * threading props through `AppShell`. `/authenticate` has no frame at all —
 * it is the signed-out screen and `AppShell` renders it bare.
 *
 * There is no footer: the owner removed it from every page (2026-09-22), so
 * the handoff's footer rows and the G13 link destinations are moot.
 *
 * The dictionary's lookup (page 02: 96px gutter) and result (page 03: 40px)
 * states share `/dictionary`. The row below is the lookup page's; the result
 * state widens it through `FrameOverrideProvider` while it is mounted.
 */

export type Gutter = 'wide' | 'content';
export type NavSection = 'dictionary' | 'reader' | 'sky';
/** `fill`: the frame is viewport-high and the page scrolls inside itself (the
 *  reader's engines, the sky field). `page`: the document scrolls (the
 *  library). */
export type Flow = 'fill' | 'page';

export type FrameConfig = {
  gutter: Gutter;
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

const CONTENT_NONE: FrameConfig = { gutter: 'content', section: null, flow: 'fill', nav: true };

export function frameForRoute(pathname: string): FrameConfig {
  if (pathname === '/') return { gutter: 'content', section: 'reader', flow: 'page', nav: true };
  // A prefix, not equality: `/reader` has no page of its own (only the
  // `[bookId]` segment), so this can never match the bare segment.
  if (pathname.startsWith('/reader/')) return { gutter: 'wide', section: 'reader', flow: 'fill', nav: false };
  if (pathname === '/dictionary') return { gutter: 'content', section: 'dictionary', flow: 'fill', nav: true };
  // The Sky field fills the viewport beside the card list column, which
  // scrolls inside itself (owner's layout, 2026-09-22 — pages 04/05 drew the
  // list below a 960px field on a scrolling page).
  if (pathname === '/sky') return { gutter: 'wide', section: 'sky', flow: 'fill', nav: true };
  if (pathname === '/study') return { gutter: 'content', section: 'sky', flow: 'fill', nav: true };
  return CONTENT_NONE;
}
