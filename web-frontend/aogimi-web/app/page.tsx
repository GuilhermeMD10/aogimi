import { Suspense } from 'react';
import { BooksView } from '@/features/books';

// `/` — the library shelf, and the app's landing page. It used to live at
// `/reader` under a home dashboard that owned this route; the dashboard is
// gone and the shelf took its place, so signing in lands you on your books.
// An open book keeps its own route, `/reader/[bookId]`.
export default function LibraryPage() {
  return (
    <Suspense>
      <BooksView />
    </Suspense>
  );
}
