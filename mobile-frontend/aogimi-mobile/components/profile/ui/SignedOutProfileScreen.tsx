import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { BrandGlyph } from '@/components/ui/BrandGlyph';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';

// Profile-tab content shown while signed-out. The app itself is fully
// usable in this state — local-first imports + decks + cards persist on
// device and flow through the same `pending` sync pipeline that
// signed-in users use offline. Signing up here flips the auth state and
// the next sync-now (manual or auto) pushes everything that was
// captured locally; there is no separate "convert" path anymore.

export function SignedOutProfileScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();

  return (
    <Screen padded>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.brandRow}>
          <BrandGlyph size={48} />
        </View>
        <Text style={[styles.title, { color: c.fg, fontFamily: fontFamily.displayBold }]}>
          {t('auth.welcome.headline')}
        </Text>
        <Text style={[styles.lede, { color: c.fgMuted }]}>
          {t('auth.welcome.tagline')}
        </Text>
        <Text style={[styles.note, { color: c.fgSubtle }]}>
          {t('profile.signedOut.note')}
        </Text>

        <View style={styles.actions}>
          <Button
            label={t('auth.welcome.createAccount')}
            onPress={() => router.push('/(auth)/signup')}
            full
          />
          <Button
            label={t('auth.welcome.signIn')}
            onPress={() => router.push('/(auth)/signin')}
            variant="secondary"
            full
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingVertical: spacing.xl, gap: spacing.lg },
  brandRow: { alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 32, lineHeight: 36, textAlign: 'center' },
  lede: {
    fontSize: fontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  note: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  actions: { gap: 10, marginTop: spacing.lg },
});
