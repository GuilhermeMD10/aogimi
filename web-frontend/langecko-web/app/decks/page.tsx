import { Suspense } from 'react';
import CardDeckView from '@/components/views/CardDeckView';

export default function DecksPage() {
  return (
    <Suspense>
      <CardDeckView />
    </Suspense>
  );
}
