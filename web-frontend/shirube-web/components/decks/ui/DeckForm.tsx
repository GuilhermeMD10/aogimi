'use client';

import { useState } from 'react';

interface DeckFormValues {
  name: string;
  description: string;
}

interface DeckFormProps {
  submitLabel: string;
  initial?: Partial<DeckFormValues>;
  onSubmit: (values: DeckFormValues) => void;
  onCancel: () => void;
}

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
      className="mt-4 space-y-3 rounded-lg border border-lgc-border bg-lgc-bg-elev p-4"
    >
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Deck name"
          autoFocus
          className="mt-1 w-full rounded-md border border-lgc-border bg-lgc-bg px-3 py-2 text-sm text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-lgc-fg-muted">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional \u2014 what\u2019s this deck for?"
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-lgc-border bg-lgc-bg px-3 py-2 text-sm text-lgc-fg placeholder:text-lgc-fg-subtle focus:border-lgc-border-strong focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="lgc-button-secondary">
          Cancel
        </button>
        <button type="submit" disabled={!canSubmit} className="lgc-button">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
