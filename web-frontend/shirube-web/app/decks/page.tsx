import { Suspense } from 'react';
import DecksView from '@/components/decks/ui/DecksView';

export default function DecksPage() {
  return (
    <Suspense>
      <DecksView />
    </Suspense>
  );
}
