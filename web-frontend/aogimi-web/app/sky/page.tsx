import { Suspense } from 'react';
import { SkyView } from '@/features/sky';

// `/sky` is the star map. Suspense is required, not decorative: SkyView reads
// `useSearchParams` (the `?deck=&card=` navigation state), which suspends
// during prerender.
export default function SkyPage() {
  return (
    <Suspense>
      <SkyView />
    </Suspense>
  );
}
