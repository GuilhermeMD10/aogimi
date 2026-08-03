'use client';

import { NIGHT } from '../lib/nightChrome';

/**
 * The stage's confirm step — a glass dialog over the sky, in the pending-card
 * overlay's scrim-and-panel shape but the night chrome's colours. Used before
 * the two destructive acts here (delete deck, delete card); Escape is handled
 * by the page, which closes this before it walks the tiers.
 */
type Props = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function NightConfirm({ title, body, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      className="absolute inset-0 z-70 flex items-center justify-center bg-black/50 p-4 font-[family-name:var(--face-ui)] backdrop-blur-sm"
    >
      <div
        className="w-full max-w-[360px] rounded-[14px] p-5 backdrop-blur-[16px]"
        style={{
          background: NIGHT.panel,
          border: `1px solid ${NIGHT.bdB}`,
          boxShadow: NIGHT.panelShadow,
        }}
      >
        <h2 className="m-0 text-[15.5px] leading-tight font-bold" style={{ color: NIGHT.ink }}>
          {title}
        </h2>
        <p className="mt-2 mb-0 text-[12.5px] leading-relaxed" style={{ color: NIGHT.muted }}>
          {body}
        </p>
        <div className="mt-4.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-[9px] px-3.5 py-2 text-[12.5px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ border: `1px solid ${NIGHT.bdA}`, background: NIGHT.tintB, color: NIGHT.soft }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[9px] px-3.5 py-2 text-[12.5px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{
              border: `1px solid ${NIGHT.dangerBd}`,
              background: NIGHT.dangerBg,
              color: NIGHT.danger,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
