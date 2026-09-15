import { useCallback, useState } from 'react';
import type { FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';

/**
 * Hosts the two reader-overlay states (dictionary, flashcard creator).
 * Kept as discrete states because they aren't strictly exclusive in edge
 * cases — the goal is just to shrink the reader page's useState surface.
 */
export function useReaderModals() {
  const [dictTerm, setDictTerm] = useState<string | null>(null);
  // The sentence the term was selected in. Set together with the term so a
  // card made from the lookup gets the book's sentence, not a stale one from
  // an earlier selection or from a lookup the dock opened with no selection.
  const [dictSentence, setDictSentence] = useState<string | undefined>(undefined);
  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);

  const openDict = useCallback((term: string, sentence?: string) => {
    setDictTerm(term);
    setDictSentence(sentence);
  }, []);

  return {
    dictTerm,
    dictSentence,
    openDict,
    setDictTerm,
    flashcardPrefill,
    setFlashcardPrefill,
  };
}
