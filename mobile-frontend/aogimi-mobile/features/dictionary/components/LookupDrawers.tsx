import { DictDrawer } from './DictDrawer';
import { FlashcardDrawer, type FlashcardPrefill } from '@/features/sky/stage/components/FlashcardDrawer';
import type { KanjiInfo, WordDetails } from '../types';

/**
 * The lookup sheet and the flashcard sheet, in the one arrangement iOS will
 * present. Every surface that opens a lookup over itself — the reader, the
 * study screen, the star map's card panel — mounts this and nothing else.
 *
 * The flashcard drawer is rendered *inside* the lookup sheet while the lookup
 * is open, and at the top level otherwise. That is what lets adding a card
 * from a dictionary result leave the lookup standing — same query, same entry,
 * same scroll — rather than collapsing it: `BottomSheet` is a `Modal`, whose
 * children unmount the moment it hides, so a lookup that closes is a lookup
 * that has forgotten everything.
 *
 * Nesting is also the only arrangement that works. Two sibling modals both
 * resolve to the same iOS view controller and UIKit refuses the second
 * presentation, so a card sheet raised beside an open lookup would never
 * appear at all. See `DictDrawer`'s `children`.
 *
 * The drawer moves between the two mount points, which remounts it — harmless,
 * because it can only move while it is closed. The lookup opens with no card in
 * flight, and it cannot be dismissed from under an open card sheet.
 *
 * State is deliberately **not** owned here: the reader raises the flashcard
 * drawer from a plain selection with no lookup involved, so `flashcardPrefill`
 * has to live above this. `useWordLookup` supplies that state for the callers
 * that have no such second entry point.
 */
export function LookupDrawers({
  dictTerm,
  onCloseDict,
  onAddFlashcard,
  onAddKanji,
  flashcardPrefill,
  onCloseFlashcard,
}: {
  /** The term the sheet opens queried with. `null` is closed; `''` opens it on
   *  its search stage with nothing queried yet. */
  dictTerm: string | null;
  onCloseDict: () => void;
  onAddFlashcard: (details: WordDetails) => void;
  /** A kanji result's add button. The host owns the draft builders it uses, so
   *  the sheet reports the character rather than building the card. */
  onAddKanji: (kanji: KanjiInfo) => void;
  flashcardPrefill: FlashcardPrefill | null;
  onCloseFlashcard: () => void;
}) {
  const dictOpen = dictTerm !== null;
  const flashcard = (
    <FlashcardDrawer
      visible={flashcardPrefill !== null}
      prefill={flashcardPrefill}
      onDismiss={onCloseFlashcard}
    />
  );

  return (
    <>
      <DictDrawer
        visible={dictOpen}
        term={dictTerm ?? ''}
        onDismiss={onCloseDict}
        onAddFlashcard={onAddFlashcard}
        onAddKanji={onAddKanji}
      >
        {dictOpen ? flashcard : null}
      </DictDrawer>
      {dictOpen ? null : flashcard}
    </>
  );
}
