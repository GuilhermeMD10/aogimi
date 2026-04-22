import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { BrandGlyph } from '@/components/ui/BrandGlyph';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchUserBooks, fetchUserDecks } from '@/lib/api';
import { fontFamily, fontSize, spacing } from '@/theme/tokens';

type SyncState =
  | { kind: 'loading' }
  | { kind: 'ok'; books: number; decks: number }
  | { kind: 'error' };

export default function OnboardingScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<SyncState>({ kind: 'loading' });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [books, decks] = await Promise.all([
          fetchUserBooks(user.id),
          fetchUserDecks(user.id),
        ]);
        if (cancelled) return;
        setState({ kind: 'ok', books: books.length, decks: decks.length });
      } catch {
        if (cancelled) return;
        setState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const finish = () => router.replace('/(tabs)');

  return (
    <Screen padded>
      <View style={styles.container}>
        <View style={styles.top}>
          <BrandGlyph size={56} />
          {user && (
            <Text style={[styles.hello, { color: c.fgMuted }]}>
              {user.display_name ?? user.username}
            </Text>
          )}
        </View>

        <View style={styles.middle}>
          {state.kind === 'loading' && (
            <>
              <ActivityIndicator color={c.fg} />
              <Text style={[styles.status, { color: c.fg }]}>{t('auth.onboarding.syncing')}</Text>
            </>
          )}
          {state.kind === 'ok' && (
            <Text style={[styles.status, { color: c.fg }]}>
              {state.books + state.decks === 0
                ? t('auth.onboarding.noRecords')
                : t('auth.onboarding.synced', { books: state.books, decks: state.decks })}
            </Text>
          )}
          {state.kind === 'error' && (
            <Text style={[styles.status, { color: c.fgMuted }]}>
              {t('auth.onboarding.errorOffline')}
            </Text>
          )}
        </View>

        <View style={styles.bottom}>
          <Button
            label={t('auth.onboarding.continue')}
            onPress={finish}
            disabled={state.kind === 'loading'}
            full
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingBottom: 40 },
  top: { marginTop: 40, alignItems: 'center', gap: spacing.md },
  hello: { fontSize: fontSize.md },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  status: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: { marginTop: 'auto' },
});
