'use client';

import { useCallback } from 'react';
import { Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { StampMark } from '@/components/theme-decorations/stamp/StampMark';
import { clearNeedsOnboarding } from '@/lib/storage/onboarding';
import { markOnboardingCompleted } from '@/lib/userApi';
import type { OnboardingExplainerProps } from '@/components/onboarding/OnboardingExplainer/OnboardingExplainer';

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
          <StampMark size={72} rotate={-6}>語</StampMark>
        </div>

        <h1
          className="mb-1.5 text-center font-medium tracking-tight text-lgc-fg font-display"
          style={{ fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em', }}
        >
          Your progress syncs.
        </h1>
        <h2
          className="mb-1.5 text-center font-medium tracking-tight text-lgc-fg font-display"
          style={{ fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em', }}
        >
          Your files stay yours.
        </h2>
        <p
          className="mb-8 text-center text-[13px] text-lgc-fg-muted font-mono"
          style={{ letterSpacing: '0.18em',
            textTransform: 'uppercase', }}
        >
          How Aogimi handles your books
        </p>

        <div className="mb-8 flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-lg border border-lgc-border bg-lgc-bg-elev px-4 py-3.5"
              style={{
                borderWidth: 1.5,
                borderColor: 'var(--lgc-fg)',
                boxShadow: '3px 3px 0 var(--lgc-fg)',
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lgc-bg-sunken"
                style={{ border: '1px solid var(--lgc-fg)' }}
              >
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
            style={{
              border: '1px solid var(--lgc-fg)',
              boxShadow: '2px 2px 0 var(--lgc-fg)',
              fontFamily: 'var(--lgc-font-display)',
              letterSpacing: '0.04em',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
