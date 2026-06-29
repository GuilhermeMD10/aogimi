import { Suspense } from 'react';
import { DictionaryView } from '@/features/dictionary';

export default function DictionaryPage() {
  return (
    <Suspense>
      <DictionaryView />
    </Suspense>
  );
}
