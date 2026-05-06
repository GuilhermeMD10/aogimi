'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import DefaultOnboardingExplainerModal, { type OnboardingExplainerModalProps } from './OnboardingExplainerModal';

export type { OnboardingExplainerModalProps } from './OnboardingExplainerModal';

export default function OnboardingExplainerModal(props: OnboardingExplainerModalProps) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.OnboardingExplainerModal ?? DefaultOnboardingExplainerModal,
    [theme],
  );
  return <Resolved {...props} />;
}
