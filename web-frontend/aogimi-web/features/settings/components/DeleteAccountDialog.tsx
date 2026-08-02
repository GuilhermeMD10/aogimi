'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { PAPER_GHOST } from '@/shared/components';
import { deleteAccount } from '../lib/settingsApi';

type Props = {
  /** Fired on any close path — Cancel, Escape, backdrop-free (native dialog). */
  onClose: () => void;
};

/**
 * The typed confirm in front of `DELETE /api/user`. Mount it to open it —
 * the parent conditionally renders it, so every open starts with fresh state
 * and the native `<dialog>` provides focus containment and Escape for free.
 *
 * On success: local session wiped (the backend already revoked every refresh
 * token) and the router lands on /authenticate.
 */
export function DeleteAccountDialog({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { logout } = useAuth();

  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'deleting' | 'error'>('idle');

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const canDelete = confirmText.trim().toLowerCase() === 'delete' && phase !== 'deleting';

  const confirm = async () => {
    if (!canDelete) return;
    setPhase('deleting');
    try {
      await deleteAccount();
      // The account is gone; logout() only clears local state (its backend
      // call fails harmlessly against revoked tokens).
      await logout();
      router.push('/authenticate');
    } catch {
      setPhase('error');
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="delete-account-title"
      className="m-auto w-[min(440px,calc(100vw-48px))] rounded-(--radius-panel) border border-(--paper-bd) bg-(--paper) p-7 font-[family-name:var(--face-ui)] font-medium shadow-(--paper-shadow) backdrop:bg-black/50"
    >
      <h2 id="delete-account-title" className="text-[20px] leading-tight font-bold text-(--danger)">
        Delete account
      </h2>
      <p className="mt-2.5 text-[13.5px] leading-[1.6] text-(--muted)">
        This deletes your account and everything in it — decks, cards, books, and reading
        progress. This cannot be undone.
      </p>

      <label className="mt-4 block text-[13px] font-bold text-(--ink)" htmlFor="delete-confirm">
        Type <span className="font-[family-name:var(--face-mono)] text-(--danger)">delete</span> to
        confirm
      </label>
      <input
        id="delete-confirm"
        autoFocus
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void confirm();
        }}
        autoComplete="off"
        className="mt-2 w-full rounded-(--radius-button) border border-(--paper-bd) bg-(--paper-tile) px-3.5 py-2.5 text-[14px] font-bold text-(--ink) outline-none focus:border-(--danger)"
      />

      {phase === 'error' && (
        <p className="mt-2.5 text-[12.5px] text-(--danger)">Couldn&apos;t delete — try again.</p>
      )}

      <div className="mt-5 flex justify-end gap-2.5">
        <button type="button" onClick={() => ref.current?.close()} className={PAPER_GHOST}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={!canDelete}
          className="inline-flex items-center rounded-(--radius-button) border border-(--danger-bd) px-4 py-[11px] text-[13.5px] leading-none font-bold text-(--danger) transition-colors duration-120 ease-[ease] hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--danger)"
        >
          {phase === 'deleting' ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </dialog>
  );
}
