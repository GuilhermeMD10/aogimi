'use client';

import { useState } from 'react';
import { btnBase, btnPrimary } from './types';

interface DeckFormValues {
  name: string;
  description: string;
}

interface DeckFormProps {
  /** "Create" for new decks; "Save" for edit flow. */
  submitLabel: string;
  /** Pre-filled values when editing an existing deck. */
  initial?: Partial<DeckFormValues>;
  onSubmit: (values: DeckFormValues) => void;
  onCancel: () => void;
}

/**
 * Shared name + description form used both when creating a new deck and
 * editing an existing one. Kept presentational — the parent decides which
 * mutation to run on submit.
 */
export function DeckForm({ submitLabel, initial, onSubmit, onCancel }: DeckFormProps) {
  const [name, setName]               = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const canSubmit = name.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-3 rounded border border-lumina-border-divider bg-lumina-surface-background p-4"
    >
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-lumina-secondary-text">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name"
          autoFocus
          className="mt-1 w-full rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm text-lumina-primary-text"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-lumina-secondary-text">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional — what's this deck for?"
          rows={2}
          className="mt-1 w-full resize-none rounded border border-lumina-border-divider bg-lumina-app-background px-3 py-2 text-sm text-lumina-primary-text"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className={btnBase}>
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit} className={btnPrimary}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
