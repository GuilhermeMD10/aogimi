'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultOnboardingExplainer, { type OnboardingExplainerProps } from './OnboardingExplainer';

export type { OnboardingExplainerProps } from './OnboardingExplainer';

export default function OnboardingExplainer(props: OnboardingExplainerProps) {
  const Resolved = useThemedComponent('OnboardingExplainer', DefaultOnboardingExplainer);
  return <Resolved {...props} />;
}
