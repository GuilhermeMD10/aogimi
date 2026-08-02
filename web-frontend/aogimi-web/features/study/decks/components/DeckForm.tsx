'use client';

import { useState } from 'react';

// Name only. The deck-description field was dropped with the decks redesign:
// the new card has no slot for it, so it was collecting text nothing displayed.
interface DeckFormValues {
  name: string;
}

interface DeckFormProps {
  submitLabel: string;
  initial?: Partial<DeckFormValues>;
  onSubmit: (values: DeckFormValues) => void;
  onCancel: () => void;
}

// Create-a-deck and rename-a-deck, the same one field either way.
//
// The handoffs don't draw this form — neither the decks list nor the deck
// detail specifies what "New deck" opens — so it stays plain and takes its
// colours from the redesign's tokens. It used to read `--lgc-*`, which was the
// last outgoing island on two screens that had otherwise migrated.
export function DeckForm({ submitLabel, initial, onSubmit, onCancel }: DeckFormProps) {
  const [name, setName] = useState(initial?.name ?? '');

  const canSubmit = name.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim() });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-(--radius-card) border border-(--paper-bd) bg-(--paper) p-4.5 shadow-(--paper-shadow)"
    >
      <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
        <span className="font-[family-name:var(--face-mono)] text-[9px] tracking-[0.18em] uppercase text-(--faint)">
          Deck name
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this deck"
          autoFocus
          className="w-full rounded-(--radius-button) border border-(--bd-a) bg-transparent px-3 py-2.5 font-[family-name:var(--face-ui)] text-sm text-(--ink) placeholder:text-(--faint) focus-visible:border-(--ink) focus-visible:outline-none"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-(--radius-button) border border-(--bd-a) px-4 py-2.5 font-[family-name:var(--face-ui)] text-[13px] font-bold text-(--soft) hover:bg-(--tint-b) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-(--radius-button) bg-(--btn) px-4 py-2.5 font-[family-name:var(--face-ui)] text-[13px] font-bold text-(--btn-ink) disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
