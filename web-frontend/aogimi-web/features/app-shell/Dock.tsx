'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { DOCK_PRIMARY, type DockKey } from './Dock.types';

/**
 * The bottom dock — app chrome on every signed-in screen. Replaces
 * `WorkspaceNav`, whose "don't touch" deferral the owner lifted for this pass.
 *
 * What changed from the nav it replaces:
 *  - **Real links, not `router.push` on a `<button>`.** Middle-click and
 *    open-in-new-tab work, `next/link` prefetches, and a screen reader reads
 *    them as navigation. (A raw `<a>` would be worse than either — a full
 *    reload discards the in-memory access token.)
 *  - **Labels are always visible**, so the hover tooltip is gone with them.
 *  - **Monochrome.** The per-item brand hexes (`#D97757`, `#4B7AA3`, …) were
 *    outgoing-system decoration; the dock is one dim ink that brightens on
 *    hover, and the active route gets a tile instead of a 5px dot.
 *  - **`aria-current="page"`** carries the active state, not colour alone.
 *
 * **It is glass now, not a near-black slab.** The "Aogimi — Dock Bar" handoff
 * replaced the `--dock-*` group with a white-tinted frosted shell and a lit
 * lavender pill that *slides* between entries. Everything the look depends on
 * lives in `styles/glass.css` as the `--dock-glass-*` block and the three
 * `.glass-dock*` classes — this file owns geometry and the measurement, not
 * colour. `aria-current="page"` is now load-bearing twice over: it is the
 * accessible state, the CSS hook for the active ink, and what the measurement
 * queries for.
 *
 * Pages reserve `pb-[140px]` for it. The icons are inlined at the handoff's
 * geometry rather than taken from `shared/icons` (lucide) — that set is the
 * outgoing one and its shapes are not these.
 */

/* Hairline between the two groups. Not a token: it is one value used once, and
   the dock is white-on-dark in both themes so it never varies. */
const DIVIDER = '#ffffff24';

/* Vertical inset of the pill, and the shell padding that has to match it — the
   pill is positioned against the shell's padding box, so `top/bottom: PAD` puts
   its edges exactly on the items' edges. Change one, change the other. */
const PAD = 8;

const ITEM = [
  // The press nudge is the app-wide one (`GLASS_PRESS`), not a dock-local copy.
  'glass-dock-item glass-press',
  'flex items-center gap-[9px] rounded-(--radius-pill) px-[15px] py-2.5',
  'font-[family-name:var(--face-ui)] text-[13px] font-bold whitespace-nowrap',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dock-glass-ink-hover)',
].join(' ');

// 20px, stroke 1.6, round caps — one shared shape for every dock glyph.
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const ICONS: Record<DockKey, React.ReactNode> = {
  reader: (
    <Glyph>
      <path d="M12 6.6C10.4 5.4 7.5 4.9 4.5 5.3V18.3C7.5 17.9 10.4 18.4 12 19.6" />
      <path d="M12 6.6C13.6 5.4 16.5 4.9 19.5 5.3V18.3C16.5 17.9 13.6 18.4 12 19.6" />
    </Glyph>
  ),
  dictionary: (
    <Glyph>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M16.5 16.5 20 20" />
    </Glyph>
  ),
  decks: (
    <Glyph>
      <rect x="4" y="8" width="11" height="12" rx="2" />
      <path d="M8 5h8a2 2 0 0 1 2 2v9" />
    </Glyph>
  ),
};

/** Routes with no dock entry of their own, mapped to the entry that stays lit.
 *  A study session is entered from Decks and exits back to it, so Decks owns it. */
const ADOPTED_BY: Record<string, string> = { '/study': '/decks' };

type PillBox = { left: number; width: number };

export default function Dock() {
  const pathname = usePathname();
  const { user } = useAuth();

  const name = user?.username ?? '';
  const initial = name.charAt(0).toUpperCase();

  /* ── The sliding pill ─────────────────────────────────────────────────────
     The indicator is one absolutely-positioned element whose `left`/`width` are
     the active item's measured box, so the browser tweens between two positions
     instead of us cross-fading two tiles. `offsetLeft`/`offsetWidth` are read
     rather than `getBoundingClientRect()` on purpose: both are relative to the
     shell's padding box, which is also what `left` resolves against, so the two
     agree even though the shell is `translate`d and horizontally scrollable.

     The active item is found by querying `aria-current` rather than kept in a
     ref map — the attribute is already the single source of truth for which
     entry is lit, and a second one could drift from it. */
  const shellRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<PillBox | null>(null);

  const measure = useCallback(() => {
    const active = shellRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) {
      setPill(null);
      return;
    }
    const { offsetLeft: left, offsetWidth: width } = active;
    // Bail on an unchanged box: the ResizeObserver below fires on attach and on
    // every reflow, and a fresh object each time would re-render for nothing.
    setPill((prev) => (prev && prev.left === left && prev.width === width ? prev : { left, width }));
  }, []);

  // Before paint, so the pill never shows for a frame at the outgoing route's
  // position. `pathname` is the trigger — a click is a navigation, not an event
  // we handle here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(measure, [measure, pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Re-measure on anything that can move the items under a stationary route:
  // the shell resizing (viewport, scrollbar, a longer username in the avatar
  // pill) and the UI face landing after first paint.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure]);

  // `/` has to match exactly or Reader — which owns the root now that the
  // shelf is the landing page — would light up on every route. It loses
  // nothing by not matching its subtree: `/reader/<bookId>` is an open book,
  // and the dock isn't rendered there at all. The others match their subtree.
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (ADOPTED_BY[pathname] === path) return true;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const renderItem = ({ key, label, path }: { key: DockKey; label: string; path: string }) => (
    <Link key={key} href={path} aria-current={isActive(path) ? 'page' : undefined} className={ITEM}>
      {ICONS[key]}
      <span>{label}</span>
    </Link>
  );

  const profileActive = isActive('/profile');

  return (
    <nav
      aria-label="Main"
      ref={shellRef}
      className={[
        'glass-dock',
        'fixed bottom-[22px] left-1/2 z-60 -translate-x-1/2',
        'flex max-w-[calc(100vw-32px)] items-center gap-1 overflow-x-auto',
        'rounded-(--radius-panel) px-2.5',
      ].join(' ')}
      style={{ paddingBlock: PAD }}
    >
      {/* Kept mounted at all times so its `left`/`width` can tween. Until the
          first measurement (and on a route with no dock entry) it is a
          zero-width invisible box with transitions off, so it can't slide in
          from the shell's left edge on the way to its first real position. */}
      <span
        aria-hidden
        className="glass-dock-pill rounded-(--radius-pill)"
        style={
          pill
            ? { top: PAD, bottom: PAD, left: pill.left, width: pill.width }
            : { top: PAD, bottom: PAD, left: 0, width: 0, opacity: 0, transition: 'none' }
        }
      />

      {DOCK_PRIMARY.map(renderItem)}

      <span
        aria-hidden
        className="mx-1.5 h-8 w-px shrink-0"
        style={{ background: DIVIDER }}
      />

      {/* Profile is an avatar, not a glyph — the same --avatar pair the TopBar
          pill uses, so the two chrome elements agree on what "you" looks like.
          Padding drops to 7px vertically because the 26px circle is taller
          than a 20px icon. */}
      <Link
        href="/profile"
        aria-current={profileActive ? 'page' : undefined}
        className={`${ITEM} py-[7px]`}
      >
        <span
          aria-hidden
          className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-(--avatar) text-[11.5px] font-bold text-(--avatar-ink)"
        >
          {initial}
        </span>
        <span>Profile</span>
      </Link>
    </nav>
  );
}
