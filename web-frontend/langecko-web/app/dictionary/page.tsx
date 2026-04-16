import { Suspense } from 'react';
import DictionaryView from '@/components/views/DictionaryView';
import SinglePageWorkspace from '@/components/workspace/SinglePageWorkspace';

export default function DictionaryPage() {
  return (
    <SinglePageWorkspace tab="dictionary">
      {/* useSearchParams in DictionaryView must be wrapped in Suspense for
          static rendering. */}
      <Suspense>
        <DictionaryView />
      </Suspense>
    </SinglePageWorkspace>
  );
}
