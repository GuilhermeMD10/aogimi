import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Touchable } from '@/shared/components/Touchable';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { BackBar } from '@/shared/components/BackBar';
import { DangerButton } from '@/shared/components/DangerButton';
import { RowGroup, Row, SectionLabel } from '@/shared/components/RowGroup';
import { usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { updateUserProfile } from '../lib/profileApi';
import { kamonFor } from '../lib/kamon';
import { AvatarPickerSheet } from './AvatarPickerSheet';
import { SignedOutProfileScreen } from './SignedOutProfileScreen';
import { AnimalLabel } from './AnimalLabel';
import { ProfileIdentity } from './ProfileIdentity';
import { ProfileStats } from './ProfileStats';
import { ProfileHeaderButton } from './ProfileHeaderButton';
import { useStatsCards } from '../hooks/useStatsCards';
import { useStatsActivity } from '../hooks/useStatsActivity';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
type JlptLevel = (typeof JLPT_LEVELS)[number];

/**
 * Profile.
 *
 * **No dock, and a back chevron out.** Profile is a pushed screen reached from
 * Home's avatar, so it uses the app's standard exit affordance (`BackBar`) and
 * does *not* draw the tab bar — a dock on a pushed screen offers two competing
 * ways back.
 *
 * ── Deliberately not here ────────────────────────────────────────────────────
 * A "currently reading" list and a "your decks" list: both would be shortcuts
 * to places the app already reaches faster — Home's continue-reading card and
 * the Sky tab — and both would cost a `fetchUserBooks` + `fetchUserDecks`
 * round trip on every open. A sky strip (Home already has one, and Sky is a
 * tab), Daily goal and Study reminder (neither exists — a reminder needs a
 * notifications feature, not a row).
 */
export function ProfileScreen() {
  const t = useT();
  const p = usePalette();
  const router = useRouter();
  const { user, signOut, setUser, status } = useAuth();
  const styles = useStyles(p);

  // Signed-out users get a different surface, but rules of hooks require an
  // unconditional hook order — every hook runs, then the JSX branches.
  const isSignedOut = status === 'signed-out';

  const { data: cardsStats } = useStatsCards();
  const { data: activity } = useStatsActivity();

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  // One busy flag — only ever one profile mutation in flight.
  const [savingField, setSavingField] = useState<'avatar' | 'level' | null>(null);

  const handleAvatarSelect = useCallback(
    async (idx: number) => {
      if (!user) return;
      setSavingField('avatar');
      try {
        setUser(await updateUserProfile({ avatar_index: idx }));
      } catch {
        /* surface later if needed */
      } finally {
        setSavingField(null);
      }
    },
    [user, setUser],
  );

  const handleLevelSelect = useCallback(
    async (level: JlptLevel) => {
      if (!user || savingField === 'level') return;
      setSavingField('level');
      try {
        setUser(await updateUserProfile({ language: level }));
      } catch {
        /* ignore */
      } finally {
        setSavingField(null);
      }
    },
    [user, savingField, setUser],
  );

  const stats = useMemo(
    () => [
      { value: activity.daysStudied, label: t('profile.statDaysStudied') },
      { value: cardsStats.byState.mastered, label: t('profile.statMastered') },
      { value: cardsStats.total, label: t('profile.statStars'), highlight: true },
    ],
    [activity.daysStudied, cardsStats.byState.mastered, cardsStats.total, t],
  );

  if (isSignedOut) return <SignedOutProfileScreen />;
  if (!user) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={p.ink} />
        </View>
      </Screen>
    );
  }

  const displayName = user.display_name || user.username;
  const joined = new Date(user.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
  const currentLevel =
    user.language && JLPT_LEVELS.includes(user.language as JlptLevel)
      ? (user.language as JlptLevel)
      : null;
  const hasEmail = typeof user.email === 'string' && user.email.length > 0;

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackBar
          title={t('profile.title')}
          right={
            <>
              <ProfileHeaderButton
                label={t('profile.changeAvatar')}
                onPress={() => setAvatarPickerOpen(true)}
              />
              <ProfileHeaderButton
                label={t('settings.title')}
                icon="settings"
                iconOnly
                onPress={() => router.push('/profile/settings')}
              />
            </>
          }
        />

        <ProfileIdentity
          glyph={kamonFor(user.avatar_index).char}
          displayName={displayName}
          since={t('profile.lookingUpSince', { date: joined.toUpperCase() })}
          changeAvatarLabel={t('profile.changeAvatar')}
          saving={savingField === 'avatar'}
          onPressAvatar={() => setAvatarPickerOpen(true)}
        />

        <View style={styles.chipRow}>
          <AnimalLabel mastered={cardsStats.byState.mastered} />
        </View>

        <ProfileStats stats={stats} />

        <SectionLabel>{t('profile.account')}</SectionLabel>
        <RowGroup>
          <Row label={t('profile.username')} value={user.username} />
          {/* Older accounts have no email, and it is nullable in the DB.
              A boolean rather than `{user.email && …}`: an empty string is a
              *kept* child in `Children.toArray`, so it would count as the last
              row and steal the divider suppression from the JLPT row. */}
          {hasEmail && <Row label={t('profile.email')} value={user.email ?? ''} />}
          <Row label={t('profile.jlptLevel')}>
            {/* Inline chips rather than a chevron into a subpage: five
                options fit on the row. */}
            <View style={styles.levelRow}>
              {JLPT_LEVELS.map((l) => {
                const active = currentLevel === l;
                return (
                  <Touchable
                    minTarget={false}
                    hitSlop={6}
                    key={l}
                    onPress={() => handleLevelSelect(l)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.levelChip, active && styles.levelChipActive]}
                  >
                    <Text style={[styles.levelText, active && styles.levelTextActive]}>{l}</Text>
                  </Touchable>
                );
              })}
            </View>
          </Row>
        </RowGroup>

        <DangerButton label={t('profile.signOut')} onPress={() => void signOut()} />
      </ScrollView>

      <AvatarPickerSheet
        visible={avatarPickerOpen}
        current={user.avatar_index}
        onDismiss={() => setAvatarPickerOpen(false)}
        onSelect={handleAvatarSelect}
      />
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        scroll: { paddingBottom: spacing.xxl },
        loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
        levelRow: { flexDirection: 'row', gap: 5 },
        levelChip: {
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: p.paperTile,
        },
        levelChipActive: { backgroundColor: p.active },
        levelText: {
          fontFamily: fontFamily.ui,
          fontSize: fontSize.xs + 1,
          color: p.muted,
        },
        levelTextActive: { color: p.activeInk, fontWeight: '700' },
      }),
    [p],
  );
}
