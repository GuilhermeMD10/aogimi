'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultDictionaryView from './DictionaryView';

export default function DictionaryView() {
  const Resolved = useThemedComponent('DictionaryView', DefaultDictionaryView);
  return <Resolved />;
}
