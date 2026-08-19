import { Suspense } from 'react';
import { BooksView } from '@/features/books';

// `/` — the library shelf, and the app's landing page: signing in lands you
// on your books. An open book keeps its own route, `/reader/[bookId]`.
export default function LibraryPage() {
  return (
    <Suspense>
      <BooksView />
    </Suspense>
  );
}
