import { useState } from 'react';
import type { FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';

/**
 * Hosts the two reader-overlay states (dictionary, flashcard creator).
 * Kept as discrete states because they aren't strictly exclusive in edge
 * cases — the goal is just to shrink the reader page's useState surface.
 */
export function useReaderModals() {
  const [dictTerm, setDictTerm] = useState<string | null>(null);
  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);

  return {
    dictTerm,
    setDictTerm,
    flashcardPrefill,
    setFlashcardPrefill,
  };
}
