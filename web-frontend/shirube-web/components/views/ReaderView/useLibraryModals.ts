'use client';

import { useState } from 'react';
import type { LibraryBook } from '@/components/library/BookList';

/**
 * Hosts the three independent library-page dialog states (locate file,
 * onboarding modal, delete confirm). Kept as separate fields rather than
 * a discriminated union because they aren't strictly exclusive and the
 * call sites read like flags.
 */
export function useLibraryModals() {
  const [locatingBookId, setLocatingBookId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deletingBook, setDeletingBook] = useState<LibraryBook | null>(null);

  return {
    locatingBookId,
    setLocatingBookId,
    showOnboarding,
    setShowOnboarding,
    deletingBook,
    setDeletingBook,
  };
}
