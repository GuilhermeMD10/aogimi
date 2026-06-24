'use client';

import { useCallback } from 'react';
import { BookOpen, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { clearNeedsOnboarding } from '@/lib/storage/onboarding';
import { markOnboardingCompleted } from '@/lib/userApi';

const POINTS = [
  {
    icon: HardDrive,
    title: 'Your files stay on your device',
    body: 'EPUB files are stored locally in your browser. They never leave your machine.',
  },
  {
    icon: Cloud,
    title: 'Progress syncs automatically',
    body: 'Your reading position, highlights, and vocabulary sync to the cloud so you can pick up on any device.',
  },
  {
    icon: RefreshCw,
    title: 'Re-import is fast',
    body: 'When you log in on a new device, point us to your EPUBs and we’ll match them by content — even if filenames changed.',
  },
];

export interface OnboardingExplainerProps {
  userId: number;
  onDismiss: () => void;
}

export default function OnboardingExplainer({ userId, onDismiss }: OnboardingExplainerProps) {
  const handleGotIt = useCallback(async () => {
    clearNeedsOnboarding();
    try { await markOnboardingCompleted(); } catch { /* best-effort */ }
    onDismiss();
  }, [userId, onDismiss]);

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex items-center justify-center" style={{ height: 96 }}>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lgc-bg-elev"
            style={{ border: '1px solid var(--lgc-border)' }}
          >
            <BookOpen size={24} className="text-lgc-accent" />
          </div>
        </div>

        <h1
          className="mb-1.5 text-center font-medium tracking-tight text-lgc-fg font-display"
        >
          Your progress syncs. Your files stay yours.
        </h1>
        <p className="mb-8 text-center text-[13px] text-lgc-fg-muted">
          Here’s how Aogimi handles your books.
        </p>

        <div className="mb-8 flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-lg border border-lgc-border bg-lgc-bg-elev px-4 py-3.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lgc-bg-sunken">
                <Icon size={16} className="text-lgc-fg-muted" />
              </div>
              <div>
                <div
                  className="mb-0.5 text-[13px] font-medium text-lgc-fg font-display"
                >
                  {title}
                </div>
                <div className="text-[12px] leading-relaxed text-lgc-fg-muted">
                  {body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleGotIt}
            className="rounded-lg bg-lgc-accent px-8 py-2.5 text-sm font-semibold text-lgc-accent-fg transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
