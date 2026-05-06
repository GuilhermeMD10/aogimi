'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultOnboardingExplainer, { type OnboardingExplainerProps } from './OnboardingExplainer';

export type { OnboardingExplainerProps } from './OnboardingExplainer';

export default function OnboardingExplainer(props: OnboardingExplainerProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.OnboardingExplainer ?? DefaultOnboardingExplainer,
    [theme],
  );
  return <Resolved {...props} />;
}
