'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { ThemeToggle } from './ThemeToggle';

/**
 * Page chrome: brand mark on the left, profile pill on the right. Not a card,
 * not sticky, no blur, no bottom border — it scrolls away with the page.
 *
 * The pill is a plain container rather than one big link. The design draws it
 * as a single tappable pill, but it now holds the theme switch too, and a
 * `<button>` nested inside an `<a>` is invalid HTML with genuinely broken click
 * behaviour. Two siblings instead: the switch, and a link wrapping the name and
 * avatar. Visually identical, and each target does only its own job.
 *
 * The name comes from `username` — the auth context carries only `{ id,
 * username }`, so rendering `display_name` would mean a profile request from
 * every consumer that wants a name until there's a profile provider to share.
 */
export function TopBar() {
  const { user } = useAuth();
  const name = user?.username ?? '';
  const initial = name.charAt(0).toUpperCase();

  return (
    <header className="mb-[34px] flex items-center justify-between gap-6">
      <Link
        href="/"
        aria-label="Aogimi home"
        className="flex items-center gap-[11px] transition-opacity duration-120 ease-[ease] hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
      >
        {/* The only vermilion in the chrome. */}
        <span
          aria-hidden
          className="flex size-[34px] items-center justify-center rounded-(--radius-cover) bg-(--accent) font-[family-name:var(--face-jp)] text-[19px] text-(--accent-ink)"
        >
          仰
        </span>
        <span className="font-[family-name:var(--face-ui)] text-[21px] font-bold text-(--ink)">
          aogimi
        </span>
      </Link>

      <div className="flex items-center gap-[9px] rounded-(--radius-pill) border border-(--bd) bg-(--cardalt) py-2 pr-2.5 pl-[18px] transition-colors duration-120 ease-[ease] hover:border-(--ink)">
        <ThemeToggle />

        <Link
          href="/profile"
          className="flex items-center gap-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          <span className="flex flex-col text-right leading-[1.15]">
            <span className="font-[family-name:var(--face-ui)] text-[13.5px] font-bold text-(--ink)">
              {name}
            </span>
            <span className="font-[family-name:var(--face-mono)] text-[9px] tracking-[0.12em] text-(--faint)">
              PROFILE
            </span>
          </span>
          {/* No avatar images exist yet, so this is always the initial. */}
          <span
            aria-hidden
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-(--avatar) font-[family-name:var(--face-ui)] text-sm font-bold text-(--avatar-ink)"
          >
            {initial}
          </span>
        </Link>
      </div>
    </header>
  );
}
