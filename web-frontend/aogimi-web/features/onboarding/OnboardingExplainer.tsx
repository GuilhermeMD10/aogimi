'use client';

import { useCallback } from 'react';
import { BookOpen, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { markOnboardingCompleted } from '@/features/profile/lib/userApi';
import { Button } from '@/shared/components';

const POINTS = [
  {
    icon: HardDrive,
    title: 'Your files stay on your device',
    body: 'EPUB files are stored locally in your browser. They never leave your machine.',
  },
  {
    icon: Cloud,
    title: 'Your library syncs automatically',
    body: 'Your books and vocabulary decks sync to the cloud so they’re available on any device.',
  },
  {
    icon: RefreshCw,
    title: 'Re-import is fast',
    body: 'When you log in on a new device, point us to your EPUBs and we’ll match them by content — even if filenames changed.',
  },
];

// No `userId`: `markOnboardingCompleted()` takes none — the endpoint reads the
// user from the access token, the same as every other protected route. The prop
// was threaded down from `BooksView` and never read.
export interface OnboardingExplainerProps {
  onDismiss: () => void;
}

export default function OnboardingExplainer({ onDismiss }: OnboardingExplainerProps) {
  const handleGotIt = useCallback(async () => {
    try { await markOnboardingCompleted(); } catch { /* best-effort */ }
    onDismiss();
  }, [onDismiss]);

  return (
    <div className="flex min-h-full items-center justify-center p-8 font-[family-name:var(--face-ui)]">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex h-24 items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-(--radius-card) border border-(--paper-bd) bg-(--paper-tile)">
            <BookOpen size={24} strokeWidth={1.7} className="text-(--accent)" />
          </div>
        </div>

        <h1 className="mb-1.5 text-center text-[21px] leading-tight font-bold tracking-[-0.01em] text-(--ink)">
          Your library syncs. Your files stay yours.
        </h1>
        <p className="mb-8 text-center text-[13px] text-(--muted)">
          Here’s how Aogimi handles your books.
        </p>

        <div className="mb-8 flex flex-col gap-3">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-(--radius-input) border border-(--paper-bd) px-4 py-3.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-tile) bg-(--paper-tile)">
                <Icon size={16} strokeWidth={1.8} className="text-(--muted)" />
              </div>
              <div>
                <div className="mb-0.5 text-[13.5px] font-bold text-(--ink)">{title}</div>
                <div className="text-[12.5px] leading-relaxed text-(--soft)">{body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={handleGotIt} className="mx-auto">
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
