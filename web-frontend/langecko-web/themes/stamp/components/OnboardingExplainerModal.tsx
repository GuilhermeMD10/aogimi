'use client';

import OnboardingExplainer from '@/components/onboarding/OnboardingExplainer';
import type { OnboardingExplainerModalProps } from '@/components/OnboardingExplainerModal/OnboardingExplainerModal';

export default function OnboardingExplainerModal({ userId, onDismiss }: OnboardingExplainerModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onDismiss} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-lgc-border-strong bg-lgc-bg shadow-2xl"
        style={{
          borderWidth: 2,
          borderColor: 'var(--lgc-fg)',
          boxShadow: '6px 6px 0 var(--lgc-fg)',
        }}
      >
        <OnboardingExplainer userId={userId} onDismiss={onDismiss} />
      </div>
    </>
  );
}
