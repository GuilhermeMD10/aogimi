'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { themeComponentRegistry } from '@/themes';
import { DeepLTranslationPopup as DefaultDeepLTranslationPopup } from './DeepLTranslationPopup';

type Props = React.ComponentProps<typeof DefaultDeepLTranslationPopup>;

export function DeepLTranslationPopup(props: Props) {
  const { theme } = useTheme();
  const Resolved = useMemo(
    () => themeComponentRegistry[theme]?.DeepLTranslationPopup ?? DefaultDeepLTranslationPopup,
    [theme],
  );
  return <Resolved {...props} />;
}
