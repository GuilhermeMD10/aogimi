'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DictionaryView from '@/components/views/DictionaryView';
import SinglePageWorkspace from '@/components/workspace/SinglePageWorkspace';
import { useReaderState } from '@/components/providers/ReaderStateProvider';

function DictionaryWithCardRedirect() {
  const router = useRouter();
  const { pendingCard } = useReaderState();

  // When add-card is triggered on the standalone dictionary page,
  // navigate to workspace where CardDeckView can handle it.
  useEffect(() => {
    if (pendingCard) {
      router.push('/modular');
    }
  }, [pendingCard, router]);

  return <DictionaryView />;
}

export default function DictionaryPage() {
  return (
    <SinglePageWorkspace tab="dictionary">
      <Suspense>
        <DictionaryWithCardRedirect />
      </Suspense>
    </SinglePageWorkspace>
  );
}
