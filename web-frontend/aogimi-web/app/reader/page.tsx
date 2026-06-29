import { Suspense } from 'react';
import { BooksView } from '@/features/books';

export default function ReaderPage() {
  return (
    <Suspense>
      <BooksView />
    </Suspense>
  );
}
