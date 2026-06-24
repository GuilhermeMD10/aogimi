'use client';

import { useThemedComponent } from '@/themes/useThemedComponent';
import DefaultReaderView from './ReaderView';

export default function ReaderView() {
  const Resolved = useThemedComponent('ReaderView', DefaultReaderView);
  return <Resolved />;
}
