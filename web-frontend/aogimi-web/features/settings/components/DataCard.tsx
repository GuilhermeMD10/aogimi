'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { PAPER_GHOST, PaperCard } from '@/shared/components';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { SettingRow } from './SettingRow';

/**
 * The account actions. Sign-out goes straight — there is no sync queue on the
 * web (writes hit the backend immediately), so there is never unsynced work
 * to warn about. Delete sits last, outlined not filled, and is the only red
 * on the page; the typed confirm lives in DeleteAccountDialog.
 *
 * Signed out, the card collapses to a Sign in row — everything else on the
 * page still works, the theme is local.
 */
export function DataCard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const signOut = useCallback(() => {
    void logout();
    router.push('/authenticate');
  }, [logout, router]);

  if (!user) {
    return (
      <PaperCard>
        <SettingRow
          title="Sign in"
          description="You're not signed in. The theme still applies; it stays on this device."
          control={
            <Link href="/authenticate" className={PAPER_GHOST}>
              Sign in
            </Link>
          }
        />
      </PaperCard>
    );
  }

  return (
    <PaperCard>
      <SettingRow
        title="Sign out"
        description={
          <>
            Signed in as <span className="font-bold text-(--soft)">{user.username}</span>.
          </>
        }
        control={
          <button type="button" onClick={signOut} className={PAPER_GHOST}>
            Sign out
          </button>
        }
      />
      <SettingRow
        className="border-t border-(--paper-bd)"
        danger
        title="Delete account"
        description="Deletes your account and everything in it — decks, cards, books, and reading progress. This cannot be undone."
        control={
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center rounded-(--radius-button) border border-(--danger-bd) px-4 py-[11px] text-[13.5px] leading-none font-bold text-(--danger) transition-colors duration-120 ease-[ease] hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--danger)"
          >
            Delete account
          </button>
        }
      />
      {confirmingDelete && <DeleteAccountDialog onClose={() => setConfirmingDelete(false)} />}
    </PaperCard>
  );
}
