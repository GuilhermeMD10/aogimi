'use client';

import OnboardingExplainer from './OnboardingExplainer';

export interface OnboardingExplainerModalProps {
  onDismiss: () => void;
}

export default function OnboardingExplainerModal({ onDismiss }: OnboardingExplainerModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onDismiss} />
      {/* `--pane`, not `--pane`: that group is transparent app-wide, and a
          dialog over a scrim has nothing behind it to separate against. */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-(--radius-card) border border-(--pane-bd) bg-(--pane) shadow-(--shadow-hero)">
        <OnboardingExplainer onDismiss={onDismiss} />
      </div>
    </>
  );
}
