import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components/Screen';
import { BackBar } from '@/shared/components/BackBar';
import { DangerButton } from '@/shared/components/DangerButton';
import { RowGroup, Row, SectionLabel } from '@/shared/components/RowGroup';
import { LOCALES, useI18n, useT } from '@/lib/i18n/I18nContext';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/providers/AuthContext';

/**
 * Settings — the handoff's grouped-card layout, carrying **exactly** the rows
 * this app already had.
 *
 * The handoff draws rows this app has no feature behind: a Japanese-font
 * picker, three study toggles wired to nothing here, sync status, CSV export,
 * delete-all-data, and a version footer. **None of them are built.** Drawing a
 * row implies a working setting, and a settings screen that lies is worse than
 * a short one. What changed is only the *arrangement*: a flat list of five
 * undifferentiated rows became three labelled groups, which is the part of the
 * handoff that is a design and not a feature request.
 *
 * The groups are named for what our rows actually are, so APPEARANCE and STUDY
 * match the handoff and its DATA group is replaced by ABOUT — we have no data
 * controls to put in one.
 */
export function SettingsView() {
  const t = useT();
  const router = useRouter();
  const { signOut, status } = useAuth();
  const { preference } = useTheme();
  const { locale } = useI18n();

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
