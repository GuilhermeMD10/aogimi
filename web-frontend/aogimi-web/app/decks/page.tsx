import { Suspense } from 'react';
import { DecksView } from '@/features/study/decks';

export default function DecksPage() {
  return (
    <Suspense>
      <DecksView />
    </Suspense>
  );
}
