import { Suspense } from 'react';
import MainWorkspace from '@/components/MainWorkspace';

export default function ModularPage() {
  return (
    <Suspense>
      <MainWorkspace />
    </Suspense>
  );
}
