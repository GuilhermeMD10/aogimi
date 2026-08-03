'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { DOCK_PRIMARY, DOCK_SECONDARY, type DockKey } from './Dock.types';

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
 * The dock is near-black in both themes and reads the `--dock-*` group for it.
 * The shadow and the divider are hardcoded: the handoff gives both the same
 * value in either theme, so a token would add a name that never varies.
 *
 * Pages reserve `pb-[140px]` for it. The icons are inlined at the handoff's
 * geometry rather than taken from `shared/icons` (lucide) — that set is the
 * outgoing one and its shapes are not these.
 */

const SHELL_SHADOW = '0 16px 36px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)';
const DIVIDER = '#ffffff24';

const ITEM = [
  'flex items-center gap-[9px] rounded-(--radius-pill) px-[15px] py-2.5',
  'font-[family-name:var(--face-ui)] text-[13px] font-bold whitespace-nowrap',
  'transition-colors duration-120 ease-[ease]',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--dock-hover)',
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
  sky: (
    <Glyph>
      <path d="M12 3l2.3 5.2 5.7.6-4.3 3.8 1.2 5.6-4.9-2.9-4.9 2.9 1.2-5.6L3 8.8l5.7-.6z" />
    </Glyph>
  ),
  home: (
    <Glyph>
      <path d="M4 11l8-6.5 8 6.5" />
      <path d="M6.2 9.8V19.5h11.6V9.8" />
    </Glyph>
  ),
};

/** Routes with no dock entry of their own, mapped to the entry that stays lit.
 *  A study session is entered from Decks and exits back to it, so Decks owns it. */
const ADOPTED_BY: Record<string, string> = { '/study': '/decks' };

export default function Dock() {
  const pathname = usePathname();
  const { user } = useAuth();

  const name = user?.username ?? '';
  const initial = name.charAt(0).toUpperCase();

  // `/` has to match exactly or Home would light up on every route. The others
  // match their subtree, so `/reader/…` keeps Reader active.
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (ADOPTED_BY[pathname] === path) return true;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const renderItem = ({ key, label, path }: { key: DockKey; label: string; path: string }) => {
    const active = isActive(path);
    return (
      <Link
        key={key}
        href={path}
        aria-current={active ? 'page' : undefined}
        className={`${ITEM} ${active ? 'text-(--dock-active-ink)' : 'text-(--dock-dim) hover:text-(--dock-hover)'}`}
        style={active ? { background: 'var(--dock-active)' } : undefined}
      >
        {ICONS[key]}
        <span>{label}</span>
      </Link>
    );
  };

  const profileActive = isActive('/profile');

  return (
    <nav
      aria-label="Main"
      className={[
        'fixed bottom-[22px] left-1/2 z-60 -translate-x-1/2',
        'flex max-w-[calc(100vw-32px)] items-center gap-1 overflow-x-auto',
        'rounded-(--radius-panel) border border-(--dock-bd) px-2.5 py-2',
      ].join(' ')}
      style={{ background: 'var(--dock)', boxShadow: SHELL_SHADOW }}
    >
      {DOCK_PRIMARY.map(renderItem)}

      <span
        aria-hidden
        className="mx-1.5 h-8 w-px shrink-0"
        style={{ background: DIVIDER }}
      />

      {DOCK_SECONDARY.map(renderItem)}

      {/* Profile is an avatar, not a glyph — the same --avatar pair the TopBar
          pill uses, so the two chrome elements agree on what "you" looks like.
          Padding drops to 7px vertically because the 26px circle is taller
          than a 20px icon. */}
      <Link
        href="/profile"
        aria-current={profileActive ? 'page' : undefined}
        className={`${ITEM} py-[7px] ${profileActive ? 'text-(--dock-active-ink)' : 'text-(--dock-dim) hover:text-(--dock-hover)'}`}
        style={profileActive ? { background: 'var(--dock-active)' } : undefined}
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
