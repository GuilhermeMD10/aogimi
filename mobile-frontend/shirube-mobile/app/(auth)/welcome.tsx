import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { BrandGlyph } from '@/components/ui/BrandGlyph';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';
import { useAuth } from '@/lib/auth/AuthContext';

export default function WelcomeScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { continueAsGuest } = useAuth();

  return (
    <Screen padded>
      <View style={styles.container}>
        <View style={styles.top}>
          <BrandGlyph size={64} />
          <Text style={[styles.headline, { color: c.fg }]}>{t('auth.welcome.headline')}</Text>
          <Text style={[styles.tagline, { color: c.fgMuted }]}>{t('auth.welcome.tagline')}</Text>
        </View>

        <View style={styles.bottom}>
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
          <View style={styles.socialRow}>
            <Button label={t('auth.welcome.google')} variant="secondary" full style={{ flex: 1 }} />
            <Button label={t('auth.welcome.apple')} variant="secondary" full style={{ flex: 1 }} />
          </View>
          {/* "Continue without account" — local-only session. Books +
              decks + cards still work, all marked unsynced. Conversion
              to a real account happens later from the Profile page. */}
          <Pressable
            onPress={async () => {
              await continueAsGuest();
              router.replace('/(tabs)/reader');
            }}
            hitSlop={8}
            style={({ pressed }) => [styles.guestRow, { opacity: pressed ? 0.55 : 1 }]}
          >
            <Text style={[styles.guestLabel, { color: c.fgMuted }]}>
              {t('auth.welcome.continueAsGuest')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingBottom: 40 },
  top: { marginTop: 40 },
  headline: {
    fontFamily: fontFamily.displayBold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    marginTop: 44,
  },
  tagline: {
    fontSize: fontSize.lg,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  bottom: { marginTop: 'auto', gap: 10 },
  socialRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  guestRow: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  guestLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
