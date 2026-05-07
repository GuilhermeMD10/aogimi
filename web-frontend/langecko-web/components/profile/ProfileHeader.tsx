'use client';

import { Pencil, Settings, Share2 } from 'lucide-react';
import { KAMON_SET, Kamon } from '@/components/AvatarPickerModal';

/** Avatar + display name + language/joined chips + share/settings buttons. */
export function ProfileHeader({
  avatarIndex,
  displayName,
  language,
  joinDate,
  onEditAvatar,
}: {
  avatarIndex: number;
  displayName: string;
  language: string | null;
  joinDate: string | null;
  onEditAvatar: () => void;
}) {
  return (
    <div className="mb-5 flex items-end gap-5" style={{ marginTop: -44 }}>
      <div className="relative">
        <Kamon char={KAMON_SET[avatarIndex]?.k ?? '波'} size={88} />
        <button
          type="button"
          onClick={onEditAvatar}
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-lgc-bg bg-lgc-accent text-white"
        >
          <Pencil size={11} />
        </button>
      </div>

      <div className="flex-1 pb-1.5">
        <div className="mb-1 flex items-center gap-2">
          <h1
            className="text-[22px] font-medium tracking-tight text-lgc-fg font-display"
            style={{ letterSpacing: '-0.015em' }}
          >
            {displayName}
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          {language && (
            <span
              className="lgc-chip font-semibold"
              style={{ background: 'var(--lgc-accent-soft)', color: 'var(--lgc-accent)' }}
            >
              日本語 · {language}
            </span>
          )}
          {joinDate && <span className="lgc-chip text-lgc-fg-muted">Joined {joinDate}</span>}
        </div>
      </div>

      <div className="flex gap-1.5 pb-1.5">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-elev"
        >
          <Share2 size={13} /> Share
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md border border-lgc-border px-3 py-1.5 text-[13px] text-lgc-fg transition-colors hover:bg-lgc-bg-elev"
        >
          <Settings size={13} /> Settings
        </button>
      </div>
    </div>
  );
}
