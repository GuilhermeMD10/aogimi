'use client';

import { useState } from 'react';

import { Button, Eyebrow, Modal } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { MAX_DECK_NAME } from '../lib/limits';

type Props = {
  /** `create` posts a new deck; `rename` renames `initialName`'s deck. */
  mode: 'create' | 'rename';
  initialName?: string;
  /** Rejects with the message to show; resolves once the server has the name. */
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

/**
 * The one deck-naming dialog, for both New deck and Rename deck (the `⋯`
 * menu's two naming rows). A short `Modal` sized to its content: a labelled
 * field capped at the backend's `MAX_DECK_NAME`, Cancel, and the primary
 * action. Enter submits; Esc and the scrim are the modal's.
 */
export function DeckNameModal({ mode, initialName = '', onSubmit, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const unchanged = mode === 'rename' && trimmed === initialName.trim();
  const canSubmit = trimmed.length > 0 && !unchanged && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={mode === 'create' ? 'New deck' : 'Rename deck'}
      width={420}
      height="auto"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <Eyebrow>Deck name</Eyebrow>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this deck"
            // Mirrors the backend cap so the browser stops the typing rather
            // than the server rejecting the submit.
            maxLength={MAX_DECK_NAME}
            autoFocus
            className={cn(
              'w-full rounded-(--radius-control) border border-(--pane-bd) bg-(--pane) px-3.5 py-2.5',
              'font-[family-name:var(--face-ui)] text-[15px] font-medium text-(--ink) placeholder:text-(--ink-3)',
              'outline-none focus:border-(--ink)',
            )}
          />
        </label>

        {error && (
          <p role="alert" className="m-0 font-[family-name:var(--face-ui)] text-[13px] text-(--danger)">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="white" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            {mode === 'create' ? 'Create' : 'Rename'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
