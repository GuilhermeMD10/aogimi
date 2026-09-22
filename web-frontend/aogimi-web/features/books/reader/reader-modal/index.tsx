'use client';

// The app-global modal (pages 10/11): the dictionary pop-up and the add-card
// form, in one `Modal` slot. Mounted by `AppShell`, so it is the reader's
// lookup when no dictionary surface is docked, *and* the add-card flow on
// `/dictionary` and `/sky`. Nothing here may assume a reader is behind it.
//
// Two phases. `dict` → the `+` on a result (or "Add to deck" on an entry)
// moves to `addCard` with that entry's draft; `addCard` opens straight onto
// the form. There is no way back from the form to the dictionary — the form
// is one screen, and Cancel closes.

import { useState } from 'react';
import type { CardDraft } from '@/features/sky/stage';
import { DictLookup } from './DictLookup';
import { AddCardForm } from './AddCardForm';

type Common = {
  onClose: () => void;
  /** A card landed (from either phase). The shell closes the modal and shows
   *  the toast. */
  onCreated: (deckName: string) => void;
};

export type ReaderModalProps = Common & (
  | { mode: 'dict' }
  | {
      mode: 'addCard';
      word: string;
      /** `null` when the card was started from a raw reader selection, in which
       *  case `useCardPrefill` supplies the fields. Never a blank draft — see
       *  `ReaderModalState`. */
      draft: CardDraft | null;
      /** The book sentence for a selection-started card. */
      contextSentence?: string;
      /** A dictionary surface is already on screen behind this modal — see
       *  `ReaderModalState`. Kept on the state for `useReaderActions`; the form
       *  never touches shared dictionary state either way. */
      dictVisibleBehind?: boolean;
    }
);

type Phase =
  | { type: 'dict' }
  | { type: 'addCard'; word: string; draft: CardDraft | null; contextSentence?: string };

export default function ReaderModal(props: ReaderModalProps) {
  const [phase, setPhase] = useState<Phase>(
    props.mode === 'addCard'
      ? { type: 'addCard', word: props.word, draft: props.draft, contextSentence: props.contextSentence }
      : { type: 'dict' },
  );

  if (phase.type === 'dict') {
    return (
      <DictLookup
        onClose={props.onClose}
        onAddCard={(draft) => setPhase({ type: 'addCard', word: draft.front, draft })}
      />
    );
  }

  return (
    <AddCardForm
      key={phase.word}
      word={phase.word}
      draft={phase.draft}
      contextSentence={phase.contextSentence}
      onClose={props.onClose}
      onCreated={props.onCreated}
    />
  );
}
