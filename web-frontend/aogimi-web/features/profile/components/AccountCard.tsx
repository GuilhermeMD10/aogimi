'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '../hooks/useProfile';
import { PaperCard } from '@/shared/components';

/**
 * Email + sign out. The handoff's sync-status row is dropped: the web app has
 * no sync engine — writes go straight to the backend — so there is no state
 * for the row to report. Sign-out goes straight (no confirm) per the handoff's
 * own rule: confirm only when there is unsynced work, and there never is.
 */
export function AccountCard() {
  const router = useRouter();
  const { logout } = useAuth();
  const { email, loading } = useProfile();

  const signOut = useCallback(() => {
    logout();
    router.push('/authenticate');
  }, [logout, router]);

  return (
    <PaperCard aria-labelledby="profile-account">
      <div className="px-6 pt-5 pb-3.5">
        <h2
          id="profile-account"
          className="font-[family-name:var(--face-ui)] text-[22px] font-bold text-(--ink)"
        >
          Account
        </h2>
      </div>

      <div className="flex items-center gap-3.5 border-t border-(--paper-bd) px-6 py-4">
        <span className="font-[family-name:var(--face-ui)] text-[14.5px] font-bold text-(--ink)">
          Email
        </span>
        <span className="ml-auto truncate font-[family-name:var(--face-mono)] text-[12.5px] text-(--muted)">
          {/* Email isn't collected at signup yet, so "—" is the common case. */}
          {loading ? '' : (email ?? '—')}
        </span>
      </div>

      <div className="border-t border-(--paper-bd) px-6 py-[18px]">
        <button
          type="button"
          onClick={signOut}
          className="flex h-11 w-full items-center justify-center rounded-(--radius-button) border border-(--danger-bd) font-[family-name:var(--face-ui)] text-[13.5px] font-bold text-(--danger) transition-colors duration-120 ease-[ease] hover:bg-(--danger-bg) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
        >
          Sign out
        </button>
      </div>
    </PaperCard>
  );
}
