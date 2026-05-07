'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAuthedUser } from '@/components/providers/useAuthedUser';
import { useTheme } from '@/components/providers/ThemeProvider';
import { getUserProfile, updateUserProfile, type UserProfile } from '@/lib/userApi';
import { getUserBooks, type BookProgressRecord } from '@/lib/booksApi';
import { getUserDecks, type DeckRecord } from '@/lib/decksApi';
import { getUserDevices, removeDevice, renameDevice, type DeviceRecord } from '@/lib/devicesApi';
import { getDeviceId } from '@/lib/storage/device';
import { setStoredAvatarIndex } from '@/lib/storage/avatar';
import OnboardingExplainerModal from '@/components/OnboardingExplainerModal';
import AvatarPickerModal from '@/components/AvatarPickerModal';
import { HeroBanner } from '@/components/profile/HeroBanner';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AccountSection } from '@/components/profile/AccountSection';
import { DecksSection } from '@/components/profile/DecksSection';
import { CurrentlyReadingSection } from '@/components/profile/CurrentlyReadingSection';
import { ThemeSection } from '@/components/profile/ThemeSection';
import { DevicesSection } from '@/components/profile/DevicesSection';
import { ActionsSection } from '@/components/profile/ActionsSection';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthedUser();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<BookProgressRecord[]>([]);
  const [decks, setDecks] = useState<DeckRecord[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, booksData, decksData, devicesData] = await Promise.allSettled([
          getUserProfile(user.id),
          getUserBooks(user.id),
          getUserDecks(user.id),
          getUserDevices(user.id),
        ]);
        if (profileData.status === 'fulfilled') setProfile(profileData.value);
        if (booksData.status === 'fulfilled') setBooks(booksData.value);
        if (decksData.status === 'fulfilled') setDecks(decksData.value);
        if (devicesData.status === 'fulfilled') setDevices(devicesData.value);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAvatarSelect = useCallback(
    (idx: number) => {
      setProfile((prev) => (prev ? { ...prev, avatar_index: idx } : prev));
      setStoredAvatarIndex(idx);
      // Backend update — works once the migration runs.
      updateUserProfile(user.username, '', { avatar_index: idx }).catch(() => { /* backend not ready */ });
    },
    [user],
  );

  const handleSignOut = useCallback(() => {
    logout();
    router.push('/authenticate');
  }, [logout, router]);

  const handleRemoveDevice = useCallback(
    async (deviceId: string) => {
      try {
        await removeDevice(deviceId, user.id);
        setDevices((prev) => prev.filter((d) => d.device_id !== deviceId));
      } catch { /* ignore */ }
    },
    [user],
  );

  const handleRenameDevice = useCallback(
    async (deviceId: string, name: string) => {
      try {
        const updated = await renameDevice(deviceId, user.id, name);
        setDevices((prev) =>
          prev.map((d) => (d.device_id === deviceId ? { ...d, name: updated.name } : d)),
        );
      } catch { /* ignore */ }
    },
    [user],
  );

  // ── Computed ─────────────────────────────────────────────────────────────────
  const readingBooks = books.filter((b) => b.progress > 0 && b.progress < 100).slice(0, 3);
  const currentDeviceId = typeof window !== 'undefined' ? getDeviceId() : '';

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

        <div className="grid gap-5" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
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
            <DevicesSection
              devices={devices}
              currentDeviceId={currentDeviceId}
              onRename={handleRenameDevice}
              onRemove={handleRemoveDevice}
            />
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
