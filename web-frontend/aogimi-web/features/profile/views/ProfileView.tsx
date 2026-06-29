'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useAuthedUser } from '@/features/auth/hooks/useAuthedUser';
import { getUserProfile, updateUserProfile } from '@/features/profile/lib/userApi';
import { getUserBooks } from '@/features/books';
import { getUserDecks } from '@/features/study/decks';
import type { BookProgressRecord } from '@/features/books/types';
import type { UserProfile } from '@/features/profile/types';
import type { DeckRecord } from '@/features/study/decks';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import OnboardingExplainerModal from '@/features/onboarding';
import AvatarPickerModal from '@/features/profile/avatar-picker';
import { HeroBanner } from '@/features/profile/components/HeroBanner';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { AccountSection } from '@/features/profile/components/AccountSection';
import { DecksSection } from '@/features/profile/components/DecksSection';
import { CurrentlyReadingSection } from '@/features/profile/components/CurrentlyReadingSection';
import { ActionsSection } from '@/features/profile/components/ActionsSection';
import { useStatsCards } from '@/features/study/stats';

export default function ProfileView() {
  const router = useRouter();
  const user = useAuthedUser();
  const { logout } = useAuth();

  const profileQ = useFetchWithAbort<UserProfile>((s) => getUserProfile(user.id, s), [user.id]);
  const booksQ = useFetchWithAbort<BookProgressRecord[]>((s) => getUserBooks(user.id, s), [user.id]);
  const decksQ = useFetchWithAbort<DeckRecord[]>((s) => getUserDecks(user.id, s), [user.id]);
  // Mastered count for the AnimalLabel chip — silent on failure
  // (signed-out / offline). Hook always fires; data is harmless when
  // empty.
  const { data: cardsStats } = useStatsCards();

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
      // Backend is the source of truth for the avatar; optimistic update above.
      updateUserProfile({ avatar_index: idx }).catch(() => { /* backend not ready */ });
    },
    [],
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
          mastered={cardsStats.byState.mastered}
          onEditAvatar={() => setShowAvatarPicker(true)}
        />

        {/* Auto-fit grid: gracefully collapses to one column under
            ~580px and expands back to two when the surface is wider. */}
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
