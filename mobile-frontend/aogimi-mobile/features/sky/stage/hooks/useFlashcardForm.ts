import { useCallback, useState } from 'react';
import { MAX_CARD_MEANINGS } from '../lib/limits';
import type { CardDraft } from '../types';

/**
 * Owns the editable state of the flashcard creation form.
 *
 * **It holds a `CardDraft`, not a free-text `back`.** The form used to expose a
 * single "Back (meaning)" textarea, which made `back` the thing the user edited
 * and `meanings` a snapshot taken before they touched it — so the moment anyone
 * typed, the card's structured glosses and its rendered back disagreed, with
 * nothing to say which was right. Now `meanings` is what gets edited and `back`
 * is derived from it by `cardBack()` at save time.
 *
 * Meanings are kept as a fixed-length array of `MAX_CARD_MEANINGS` slots rather
 * than a growable list with add/remove buttons: the cap is small and enforced
 * by the API anyway, so N always-present inputs is less machinery and less UI
 * than a list editor. Empty slots are dropped on read.
 */
export function useFlashcardForm() {
  const [front, setFront] = useState('');
  const [reading, setReading] = useState('');
  const [meanings, setMeanings] = useState<string[]>(() => emptySlots());
  const [newDeckName, setNewDeckName] = useState('');

  /** Carried through the form untouched — there is no input for either. The
   *  JLPT tier is a snapshot of the source entry, and re-deriving it from an
   *  edited front would be wrong (the backend doesn't recompute it either). */
  const [jlptLevel, setJlptLevel] = useState<number | null>(null);
  const [contextSentence, setContextSentence] = useState<string | undefined>(undefined);

  const setMeaningAt = useCallback((index: number, value: string) => {
    setMeanings((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  /** Seed every field from a draft — what the prefill path calls. Slots are
   *  padded so the input count is stable regardless of how many glosses the
   *  source entry had. */
  const loadDraft = useCallback((draft: CardDraft) => {
    setFront(draft.front);
    setReading(draft.reading);
    setMeanings(padSlots(draft.meanings));
    setJlptLevel(draft.jlptLevel);
    setContextSentence(draft.contextSentence);
  }, []);

  /** The current state as a draft, ready for `createCardLocal`. Blank meaning
   *  slots are dropped rather than sent as `''` — the API rejects empty
   *  strings, and "fewer meanings" is expressed by a shorter array. */
  const toDraft = useCallback(
    (): CardDraft => ({
      front: front.trim(),
      reading: reading.trim(),
      meanings: meanings.map((m) => m.trim()).filter((m) => m.length > 0),
      jlptLevel,
      contextSentence,
    }),
    [front, reading, meanings, jlptLevel, contextSentence],
  );

  const reset = useCallback(() => {
    setFront('');
    setReading('');
    setMeanings(emptySlots());
    setJlptLevel(null);
    setContextSentence(undefined);
    setNewDeckName('');
  }, []);

  return {
    front,
    setFront,
    reading,
    setReading,
    meanings,
    setMeaningAt,
    newDeckName,
    setNewDeckName,
    loadDraft,
    toDraft,
    reset,
  };
}

const emptySlots = () => Array<string>(MAX_CARD_MEANINGS).fill('');

function padSlots(meanings: string[]): string[] {
  const slots = emptySlots();
  meanings.slice(0, MAX_CARD_MEANINGS).forEach((m, i) => {
    slots[i] = m;
  });
  return slots;
}
