'use client';

import { useCallback } from 'react';
import { BookOpen, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { StampMark } from '@/components/theme-decorations/stamp/StampMark';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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
    body: 'When you log in on a new device, point us to your EPUBs and we\u2019ll match them by content — even if filenames changed.',
  },
];

export default function OnboardingExplainer({
  userId,
  onDismiss,
}: {
  userId: number;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const isStamp = theme === 'stamp';
  const handleGotIt = useCallback(async () => {
    // Remove local flag
    try { localStorage.removeItem('lgc_needs_onboarding'); } catch { /* ignore */ }

    // Mark onboarding completed on backend
    try {
      await fetch(`${API}/api/user/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, completed: true }),
      });
    } catch {
      // best-effort
    }

    onDismiss();
  }, [userId, onDismiss]);

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-6 flex items-center justify-center" style={{ height: 96 }}>
          {isStamp ? (
            <StampMark size={72} rotate={-6}>語</StampMark>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lgc-bg-elev"
              style={{ border: '1px solid var(--lgc-border)' }}
            >
              <BookOpen size={24} className="text-lgc-accent" />
            </div>
          )}
        </div>

        <h1
          className="mb-1.5 text-center font-medium tracking-tight text-lgc-fg"
          style={{
            fontFamily: 'var(--lgc-font-display)',
            fontSize: isStamp ? 28 : undefined,
            fontWeight: isStamp ? 700 : 500,
            letterSpacing: isStamp ? '-0.02em' : undefined,
          }}
        >
          {isStamp ? 'Your progress syncs.' : 'Your progress syncs. Your files stay yours.'}
        </h1>
        {isStamp && (
          <h2
            className="mb-1.5 text-center font-medium tracking-tight text-lgc-fg"
            style={{
              fontFamily: 'var(--lgc-font-display)',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            Your files stay yours.
          </h2>
        )}
        <p
          className="mb-8 text-center text-[13px] text-lgc-fg-muted"
          style={{
            fontFamily: isStamp ? 'var(--lgc-font-mono)' : undefined,
            letterSpacing: isStamp ? '0.18em' : undefined,
            textTransform: isStamp ? 'uppercase' : undefined,
          }}
        >
          {isStamp ? 'How Langeco handles your books' : 'Here’s how Langeco handles your books.'}
        </p>

        <div className="mb-8 flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-lg border border-lgc-border bg-lgc-bg-elev px-4 py-3.5"
              style={{
                borderWidth: isStamp ? 1.5 : undefined,
                borderColor: isStamp ? 'var(--lgc-fg)' : undefined,
                boxShadow: isStamp ? '3px 3px 0 var(--lgc-fg)' : undefined,
              }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-lgc-bg-sunken"
                style={{
                  border: isStamp ? '1px solid var(--lgc-fg)' : undefined,
                }}
              >
                <Icon size={16} className="text-lgc-fg-muted" />
              </div>
              <div>
                <div
                  className="mb-0.5 text-[13px] font-medium text-lgc-fg"
                  style={{ fontFamily: 'var(--lgc-font-display)' }}
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
              border: isStamp ? '1px solid var(--lgc-fg)' : undefined,
              boxShadow: isStamp ? '2px 2px 0 var(--lgc-fg)' : undefined,
              fontFamily: isStamp ? 'var(--lgc-font-display)' : undefined,
              letterSpacing: isStamp ? '0.04em' : undefined,
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
