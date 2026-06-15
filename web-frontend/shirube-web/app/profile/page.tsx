'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAuthedUser } from '@/components/providers/useAuthedUser';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getUserProfile, updateUserProfile } from '@/lib/userApi';
import { getUserBooks } from '@/components/books/utils/booksApi';
import { getUserDecks } from '@/components/decks/utils/decksApi';
import type { BookProgressRecord, UserProfile } from '@/lib/types';
import type { DeckRecord } from '@/components/decks/types';
import { setStoredAvatarIndex } from '@/lib/storage/avatar';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import OnboardingExplainerModal from '@/components/OnboardingExplainerModal';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { HeroBanner } from '@/components/profile/HeroBanner';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AccountSection } from '@/components/profile/AccountSection';
import { DecksSection } from '@/components/profile/DecksSection';
import { CurrentlyReadingSection } from '@/components/profile/CurrentlyReadingSection';
import { ThemeSection } from '@/components/profile/ThemeSection';
import { ActionsSection } from '@/components/profile/ActionsSection';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthedUser();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const profileQ = useFetchWithAbort<UserProfile>((s) => getUserProfile(user.id, s), [user.id]);
  const booksQ = useFetchWithAbort<BookProgressRecord[]>((s) => getUserBooks(user.id, s), [user.id]);
  const decksQ = useFetchWithAbort<DeckRecord[]>((s) => getUserDecks(user.id, s), [user.id]);

  // Local mirrors of server data so handlers can do optimistic updates.
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => { if (profileQ.data) setProfile(profileQ.data); }, [profileQ.data]);
  const books = booksQ.data ?? [];
  const decks = decksQ.data ?? [];
  const loading = profileQ.loading || booksQ.loading || decksQ.loading;

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Derived
  const avatarIndex = profile?.avatar_index ?? 0;
  const displayName = profile?.display_name || profile?.username || user.username;
  const language = profile?.language || null;
  const email = profile?.email || null;
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAvatarSelect = useCallback(
    (idx: number) => {
      setProfile((prev) => (prev ? { ...prev, avatar_index: idx } : prev));
      setStoredAvatarIndex(idx);
      // Backend update — works once the migration runs.
      updateUserProfile({ avatar_index: idx }).catch(() => { /* backend not ready */ });
    },
    [user],
  );

  const handleSignOut = useCallback(() => {
    logout();
    router.push('/authenticate');
  }, [logout, router]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const readingBooks = books.filter((b) => b.progress > 0 && b.progress < 100).slice(0, 3);

  // ── Loading gate ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-lgc-fg-muted">Loading profile&hellip;</p>
      </div>
    );
  }

  return (
    <div className="lgc-scroll min-h-full overflow-auto">
      <HeroBanner />

      <div style={{ padding: '0 24px 22px' }}>
        <ProfileHeader
          avatarIndex={avatarIndex}
          displayName={displayName}
          language={language}
          joinDate={joinDate}
          onEditAvatar={() => setShowAvatarPicker(true)}
        />

        {/* Auto-fit grid: gracefully collapses to one column under
            ~580px and expands back to two when the surface is wider.
            Same component is rendered in the standalone /profile route
            AND inside the 880px ProfileBubble — and could land in a
            narrower surface later without re-layout work. */}
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          <div>
            <AccountSection
              displayName={displayName}
              username={user.username}
              email={email}
              language={language}
            />
            <DecksSection decks={decks} />
          </div>

          <div>
            <CurrentlyReadingSection books={readingBooks} />
            <ThemeSection active={theme} onSelect={setTheme} />
            <ActionsSection
              onShowOnboarding={() => setShowOnboarding(true)}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </div>

      {showAvatarPicker && (
        <AvatarPickerModal
          current={avatarIndex}
          onSelect={handleAvatarSelect}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}

      {showOnboarding && (
        <OnboardingExplainerModal
          userId={user.id}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
