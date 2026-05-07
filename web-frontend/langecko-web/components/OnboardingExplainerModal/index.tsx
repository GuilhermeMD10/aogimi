'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultOnboardingExplainerModal, { type OnboardingExplainerModalProps } from './OnboardingExplainerModal';

export type { OnboardingExplainerModalProps } from './OnboardingExplainerModal';

export default function OnboardingExplainerModal(props: OnboardingExplainerModalProps) {
  const Resolved = useThemedComponent('OnboardingExplainerModal', DefaultOnboardingExplainerModal);
  return <Resolved {...props} />;
}
