'use client';

import { Button, Modal } from '@/shared/components';

/**
 * The stage's confirm step, before its two destructive acts (delete deck,
 * delete card). The app-global `Modal` sized to its content (D9 re-skin of the
 * former `NightConfirm`: same title · body · Cancel / confirm layout, the
 * shared primitives instead of the night chrome). Esc and the scrim cancel;
 * the page's Escape walk checks for an open confirm before it moves a tier.
 */
type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal onClose={onCancel} width={400} height="auto" aria-label={title}>
      <h2 className="m-0 font-[family-name:var(--face-ui)] text-[18px] leading-tight font-bold text-(--ink)">
        {title}
      </h2>
      <p className="mt-2 mb-0 font-[family-name:var(--face-ui)] text-[14px] leading-relaxed text-(--ink-2)">
        {body}
      </p>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button variant="white" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
