import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { useAuth } from '@/lib/auth/AuthContext';

// Settings tab — a flat list of rows, each row pushes its own page (or
// runs an action for sign out). Intentionally minimal: text + padding, no
// icons or subtitles. New rows go in `ROWS` below; sign out is a sibling
// action since it doesn't navigate.

type NavRow = { kind: 'nav'; labelKey: string; path: string };

// Labels resolved through i18n at render time (not capture-time) so the
// row text re-renders when the locale changes.
const ROWS: NavRow[] = [
  { kind: 'nav', labelKey: 'profile.language',    path: '/settings/language' },
  { kind: 'nav', labelKey: 'studyDisplay.title',  path: '/settings/study-display' },
  { kind: 'nav', labelKey: 'settings.help',       path: '/settings/help' },
  { kind: 'nav', labelKey: 'settings.credits',    path: '/settings/credits' },
];

export default function SettingsTab() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { signOut, status } = useAuth();
  // Sign-out only meaningful when there's a backend account to leave.
  // Signed-out users will see sign-up / sign-in on the Profile tab.
  const isSignedIn = status === 'signed-in';

  const handleSignOut = () => {
    Alert.alert(t('profile.signOut'), 'Sign out of this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen padded>
      <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.ui }]}>
        {t('settings.title')}
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {ROWS.map((row, i) => (
          <Row
            key={row.path}
            label={t(row.labelKey)}
            onPress={() => router.push(row.path as never)}
            firstOfBlock={i === 0}
            color={c.fg}
            borderColor={c.border}
          />
        ))}

        {/* Sign out only renders when there's a real account to leave.
            Signed-out users sign up / sign in via the Profile tab. */}
        {isSignedIn && (
          <Row
            label={t('profile.signOut')}
            onPress={handleSignOut}
            firstOfBlock={ROWS.length === 0}
            color={c.fg}
            borderColor={c.border}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({
  label,
  onPress,
  firstOfBlock,
  color,
  borderColor,
}: {
  label: string;
  onPress: () => void;
  firstOfBlock: boolean;
  color: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderTopWidth: firstOfBlock ? StyleSheet.hairlineWidth : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor,
          opacity: pressed ? 0.55 : 1,
        },
      ]}
    >
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  list: { paddingBottom: spacing.xxl },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  rowLabel: {
    fontSize: fontSize.md,
  },
});
