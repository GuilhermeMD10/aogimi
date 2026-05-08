import { Suspense } from 'react';
import DictionaryView from '@/components/views/DictionaryView';

export default function DictionaryPage() {
  return (
    <Suspense>
      <DictionaryView />
    </Suspense>
  );
}
