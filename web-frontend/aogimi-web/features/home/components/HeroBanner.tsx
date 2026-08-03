'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/providers/AuthProvider';

/**
 * Row 1 — the greeting and the sky shortcut, as one banner.
 *
 * The sky panel is **empty on purpose**. The star map is its own component with
 * its own data and isn't mounted here yet; this is the outlined, clickable
 * bubble it will eventually fill edge to edge. No placeholder text, no icon,
 * no label — anything put here now would have to be taken out again.
 *
 * `/decks` is where the sky lives now — the whole-sky stage the /sky route
 * merged into.
 */
export function HeroBanner() {
  const { user } = useAuth();
  const name = user?.username ?? '';

  return (
    <div className="mb-[26px] grid items-stretch gap-9 lg:grid-cols-[1.25fr_1fr]">
      <div className="flex flex-col justify-center">
        <h1 className="m-0 font-[family-name:var(--face-jp)] text-[54px] leading-[1.05] font-medium tracking-[0.01em] text-(--ink)">
          {/* The name is optional — a nameless greeting still reads correctly. */}
          ようこそ{name && `、${name}`}
        </h1>
        <p className="mt-3.5 font-[family-name:var(--face-ui)] text-[17px] text-(--soft) italic">
          Welcome back — the sky kept your place.
        </p>
      </div>

      <Link
        href="/decks"
        aria-label="Open your star map"
        className="relative block min-h-[250px] overflow-hidden rounded-(--radius-pill) border-[1.5px] border-(--sky-border) bg-transparent shadow-(--sky-shadow) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
      />
    </div>
  );
}
