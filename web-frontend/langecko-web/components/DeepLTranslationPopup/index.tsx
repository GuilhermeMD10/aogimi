'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import { DeepLTranslationPopup as DefaultDeepLTranslationPopup } from './DeepLTranslationPopup';

type Props = React.ComponentProps<typeof DefaultDeepLTranslationPopup>;

export function DeepLTranslationPopup(props: Props) {
  const Resolved = useThemedComponent('DeepLTranslationPopup', DefaultDeepLTranslationPopup);
  return <Resolved {...props} />;
}
