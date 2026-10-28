import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, BackBar, DangerButton, RowGroup, Row, SectionLabel } from '@/shared/components';
import { LOCALES, useI18n, useT } from '@/lib/i18n/I18nContext';
import { useReaderPrefs } from '@/features/books/reader/lib/readerPrefs';
import { NIGHT_ENABLED, useTheme, spacing } from '@/theme';
import { useAuth } from '@/features/auth/providers/AuthContext';

// The policy lives on the web app (`/privacy` there), which is also the URL
// the store listings carry — one copy, opened in the browser.
const PRIVACY_POLICY_URL = 'https://aogimi.com/privacy';

/**
 * Settings — a grouped-card layout carrying **exactly** the rows the app has
 * a working feature behind.
 *
 * Drawing a row implies a working setting, and a settings screen that lies is
 * worse than a short one — so there is no Japanese-font picker, no study
 * toggles wired to nothing, no sync status, CSV export, delete-all-data or
 * version footer. The groups are named for what the rows actually are:
 * APPEARANCE, STUDY, ABOUT.
 */
export function SettingsView() {
  const t = useT();
  const router = useRouter();
  const { signOut, deleteAccount, status } = useAuth();
  const { preference } = useTheme();
  const { locale } = useI18n();
  const { prefs, hydrated: highlightHydrated } = useReaderPrefs();
  const [deleting, setDeleting] = useState(false);

  // Sign-out is only meaningful when there is a backend account to leave.
  // Signed-out users see sign-up / sign-in on the Profile screen instead.
  const isSignedIn = status === 'signed-in';

  const handleSignOut = () => {
    Alert.alert(t('profile.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  // App Store 5.1.1(v): account deletion must be reachable in-app. The
  // provider owns the whole success path (server delete → local wipe →
  // sign-out); this screen only confirms, shows the busy state and reports a
  // failure. On failure nothing has changed, so the user stays signed in.
  const runDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      // Same split as sign-in: `status` on the error means the server
      // answered (and refused); its absence means we never reached it.
      const answered = typeof (err as { status?: unknown } | null)?.status === 'number';
      Alert.alert(
        t('settings.deleteAccountFailed'),
        t(answered ? 'common.error' : 'auth.onboarding.errorOffline'),
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settings.deleteAccountConfirmTitle'), t('settings.deleteAccountConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void runDeleteAccount() },
    ]);
  };

  // Each row shows its current value, which the flat list did not. The theme
  // and locale are the two settings whose value is worth seeing without
  // opening the page.
  const themeValue = t(`appearance.${preference}`);
  const localeLabel = LOCALES.find((l) => l.code === locale)?.nativeLabel ?? locale;
  // Blank until reader prefs hydrate, rather than showing the default and
  // correcting it a frame later — the same rule the picker page follows.
  const highlightValue = highlightHydrated ? t(`highlight.${prefs.highlight}`) : undefined;

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackBar title={t('settings.title')} subtitle="設定" />

        <SectionLabel>{t('settings.groupAppearance')}</SectionLabel>
        <RowGroup>
          {/* Day is the only theme while Night is switched off — a picker
              with one working choice is a row with nothing behind it. */}
          {NIGHT_ENABLED && (
            <Row
              label={t('appearance.title')}
              value={themeValue}
              chevron
              onPress={() => router.push('/profile/settings/appearance')}
            />
          )}
          <Row
            label={t('profile.language')}
            value={localeLabel}
            chevron
            onPress={() => router.push('/profile/settings/language')}
          />
          <Row
            label={t('highlight.title')}
            value={highlightValue}
            chevron
            onPress={() => router.push('/profile/settings/highlight')}
          />
        </RowGroup>

        <SectionLabel>{t('settings.groupStudy')}</SectionLabel>
        <RowGroup>
          <Row
            label={t('studyDisplay.title')}
            chevron
            onPress={() => router.push('/profile/settings/study-display')}
          />
        </RowGroup>

        <SectionLabel>{t('settings.groupAbout')}</SectionLabel>
        <RowGroup>
          <Row
            label={t('settings.help')}
            chevron
            onPress={() => router.push('/profile/settings/help')}
          />
          <Row
            label={t('settings.credits')}
            chevron
            onPress={() => router.push('/profile/settings/credits')}
          />
          <Row
            label={t('settings.privacy')}
            chevron
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          />
        </RowGroup>

        {isSignedIn && (
          <View>
            <DangerButton label={t('profile.signOut')} onPress={handleSignOut} />
            <DangerButton
              label={t('settings.deleteAccount')}
              onPress={handleDeleteAccount}
              loading={deleting}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
});
