import { Suspense } from 'react';
import { DecksView } from '@/features/study/decks';

// `/decks` is the sky stage — every deck a framed constellation. Suspense is
// required, not decorative: DecksView reads `useSearchParams` (the
// `?deck=&card=` navigation state), which suspends during prerender.
export default function DecksPage() {
  return (
    <Suspense>
      <DecksView />
    </Suspense>
  );
}
