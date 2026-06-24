import { useState } from 'react';
import type { FlashcardPrefill } from '@/components/decks/ui/FlashcardDrawer';

export type HighlightPickerState = {
  cfi: string;
  text: string;
  x: number;
  y: number;
};

/**
 * Hosts the four reader-overlay states (dictionary, flashcard creator,
 * DeepL translation, highlight color picker). Kept as discrete states
 * because they aren't strictly exclusive in edge cases — the goal is
 * just to shrink the reader page's useState surface.
 */
export function useReaderModals() {
  const [dictTerm, setDictTerm] = useState<string | null>(null);
  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);
  const [deepLText, setDeepLText] = useState<string | null>(null);
  const [highlightPicker, setHighlightPicker] = useState<HighlightPickerState | null>(null);

  return {
    dictTerm,
    setDictTerm,
    flashcardPrefill,
    setFlashcardPrefill,
    deepLText,
    setDeepLText,
    highlightPicker,
    setHighlightPicker,
  };
}
