'use client';

import Link from 'next/link';
import { BarChart3, Pencil, Settings, Share2 } from 'lucide-react';
import { KAMON_SET, Kamon } from '@/features/profile/avatar-picker';
import { AnimalLabel } from './AnimalLabel';

/** Avatar + display name + language/joined chips + share/settings buttons. */
export function ProfileHeader({
  avatarIndex,
  displayName,
  language,
  joinDate,
  mastered,
  onEditAvatar,
}: {
  avatarIndex: number;
  displayName: string;
  language: string | null;
  joinDate: string | null;
  /** Mastered card count — drives the AnimalLabel chip. */
  mastered?: number;
  onEditAvatar: () => void;
}) {
  return (
    // Row sits naturally below the HeroBanner. The negative margin lives
    // on the avatar alone (with `self-start` overriding the row's
    // `items-end`) so only the avatar floats over the banner — the title
    // column and action buttons stay at their natural row position.
    // Previously the negative margin was on the row, lifting EVERYTHING
    // — the taller middle column then poked up into the dark banner
    // and "cropped" the title visually.
    //
    // `flex-wrap` + `min-w-0` on the title column make the layout
    // gracefully reflow when the container narrows (the profile bubble
    // is fixed-width today, but this keeps it from breaking if the
    // bubble ever becomes resizable or is rendered in a narrow surface).
    <div className="mb-5 flex flex-wrap items-end gap-x-5 gap-y-3">
      <div className="relative self-start shrink-0" style={{ marginTop: -44 }}>
        <Kamon char={KAMON_SET[avatarIndex]?.k ?? '波'} size={88} />
        <button
          type="button"
          onClick={onEditAvatar}
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-lgc-bg bg-lgc-accent text-white"
        >
          <Pencil size={11} />
        </button>
      </div>

      <div className="flex-1 min-w-0 pb-1.5">
        <div className="mb-1 flex items-center gap-2">
          <h1
            className="truncate text-[22px] font-medium tracking-tight text-lgc-fg font-display"
            style={{ letterSpacing: '-0.015em' }}
          >
            {displayName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {language && (
            <span
              className="lgc-chip font-semibold"
              style={{ background: 'var(--lgc-accent-soft)', color: 'var(--lgc-accent)' }}
            >
              日本語 · {language}
            </span>
          )}
          {mastered !== undefined && <AnimalLabel mastered={mastered} />}
          {joinDate && <span className="lgc-chip text-lgc-fg-muted">Joined {joinDate}</span>}
        </div>
      </div>

      <div className="flex gap-1.5 pb-1.5 shrink-0">
        <Link
          href="/stats"
          className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
        >
          <BarChart3 size={13} /> Stats
        </Link>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev"
        >
          <Share2 size={13} /> Share
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
        >
          <Settings size={13} /> Settings
        </Link>
      </div>
    </div>
  );
}
