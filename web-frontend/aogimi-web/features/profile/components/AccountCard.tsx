'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '../hooks/useProfile';
import { GLASS_GHOST, GlassCard, HAIRLINE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

/**
 * Email + sign out. No sync-status row: the web app has no sync engine —
 * writes go straight to the backend — so there is no state for the row to
 * report. Sign-out goes straight (no confirm): confirm only when there is
 * unsynced work, and there never is.
 *
 * Sign out is the one button on this page that keeps a colour: it is glass like
 * the rest, but the `--danger` edge and ink stay, because destructive is
 * semantics rather than decoration. The glass fill is its only hover — two
 * hover effects on one button read as a flicker.
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
    <GlassCard aria-labelledby="profile-account">
      <div className="px-6 pt-5 pb-3.5">
        <h2 id="profile-account" className="font-[family-name:var(--face-ui)] text-[22px] font-bold text-(--ink)">
          Account
        </h2>
      </div>

      <div className={cn('flex items-center gap-3.5 border-t px-6 py-4', HAIRLINE)}>
        <span className="font-[family-name:var(--face-ui)] text-[14.5px] font-bold text-(--ink)">Email</span>
        <span className="ml-auto truncate font-[family-name:var(--face-mono)] text-[12.5px] text-(--muted)">
          {/* Email isn't collected at signup yet, so "—" is the common case. */}
          {loading ? '' : (email ?? '—')}
        </span>
      </div>

      <div className={cn('border-t px-6 py-[18px]', HAIRLINE)}>
        <button
          type="button"
          onClick={signOut}
          className={cn(GLASS_GHOST, 'h-11 w-full justify-center border-(--danger-bd) text-(--danger)')}
        >
          Sign out
        </button>
      </div>
    </GlassCard>
  );
}
