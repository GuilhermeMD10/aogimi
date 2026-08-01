import { Suspense } from 'react';
import { StudyView } from '@/features/study';

// Suspense is required, not decorative: StudyView reads `useSearchParams`,
// which suspends during prerender.
export default function StudyPage() {
  return (
    <Suspense>
      <StudyView />
    </Suspense>
  );
}
