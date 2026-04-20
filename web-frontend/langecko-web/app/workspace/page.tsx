import { Suspense } from 'react';
import MainWorkspace from '@/components/MainWorkspace';

export default function WorkspacePage() {
  return (
    <Suspense>
      <MainWorkspace />
    </Suspense>
  );
}
