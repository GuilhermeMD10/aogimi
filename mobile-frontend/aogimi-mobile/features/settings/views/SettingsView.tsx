import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { BackBar } from '@/shared/components/BackBar';
import { DangerButton } from '@/shared/components/DangerButton';
import { RowGroup, Row, SectionLabel } from '@/shared/components/RowGroup';
import { LOCALES, useI18n, useT } from '@/lib/i18n/I18nContext';
import { useReaderPrefs } from '@/features/books/reader/lib/readerPrefs';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/providers/AuthContext';

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
  const { signOut, status } = useAuth();
  const { preference } = useTheme();
  const { locale } = useI18n();
  const { prefs, hydrated: highlightHydrated } = useReaderPrefs();

  // Sign-out is only meaningful when there is a backend account to leave.
  // Signed-out users see sign-up / sign-in on the Profile screen instead.
  const isSignedIn = status === 'signed-in';

  const handleSignOut = () => {
    Alert.alert(t('profile.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => void signOut() },
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
          <Row
            label={t('appearance.title')}
            value={themeValue}
            chevron
            onPress={() => router.push('/profile/settings/appearance')}
          />
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
        </RowGroup>

        {/* Dev-only. Tuning screens for chrome that is still being decided; not
            drawn in a release build. __DEV__ is false in a Release build even
            for the "dev" bundle id, so this checks the build-time flag the
            build script sets instead (same mechanism as EXPO_PUBLIC_API_URL). */}
        {(__DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1') && (
          <>
            <SectionLabel>DEVELOPER</SectionLabel>
            <RowGroup>
              <Row
                label="Dock lab"
                description="Three docks at different timings and haptics"
                chevron
                onPress={() => router.push('/profile/settings/dock-lab')}
              />
            </RowGroup>
          </>
        )}

        {isSignedIn && (
          <View>
            <DangerButton label={t('profile.signOut')} onPress={handleSignOut} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
});
