import { Suspense } from 'react';
import ReaderView from '@/components/views/ReaderView';

export default function ReaderPage() {
  return (
    <Suspense>
      <ReaderView />
    </Suspense>
  );
}
