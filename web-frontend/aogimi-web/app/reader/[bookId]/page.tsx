import { Suspense } from 'react';
import { ReaderView } from '@/features/books';

export default async function ReaderBookPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  // The segment is the book's filename, so it arrives percent-encoded.
  const { bookId } = await params;

  return (
    <Suspense>
      <ReaderView bookId={decodeURIComponent(bookId)} />
    </Suspense>
  );
}
