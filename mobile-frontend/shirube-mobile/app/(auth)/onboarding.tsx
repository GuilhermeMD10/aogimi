import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { BrandGlyph } from '@/components/ui/BrandGlyph';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchUserBooks, fetchUserDecks } from '@/lib/api';
import { bookFileExists, importEpubForFilename } from '@/lib/bookFiles';
import type { BookRecord } from '@/lib/types';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';

type SyncState =
  | { kind: 'loading' }
  | { kind: 'reconcile'; books: BookRecord[]; decks: number; missing: BookRecord[] }
  | { kind: 'done'; books: number; decks: number }
  | { kind: 'error' };

export default function OnboardingScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();

  const [state, setState] = useState<SyncState>({ kind: 'loading' });
  const [resolved, setResolved] = useState<Set<string>>(new Set());

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
        const missing = books.filter((b) => !bookFileExists(b.filename));
        if (missing.length === 0) {
          setState({ kind: 'done', books: books.length, decks: decks.length });
        } else {
          setState({ kind: 'reconcile', books, decks: decks.length, missing });
        }
      } catch {
        if (!cancelled) setState({ kind: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const finish = useCallback(() => router.replace('/(tabs)/reader'), [router]);

  const handleFind = useCallback(async (book: BookRecord) => {
    const uri = await importEpubForFilename(book.filename);
    if (!uri) return;
    setResolved((prev) => new Set(prev).add(book.id));
  }, []);

  return (
    <Screen padded>
      <View style={styles.container}>
        <View style={styles.top}>
          <BrandGlyph size={52} />
          {user && (
            <Text style={[styles.hello, { color: c.fgMuted }]}>
              {user.display_name ?? user.username}
            </Text>
          )}
        </View>

        {state.kind === 'loading' && (
          <View style={styles.middle}>
            <ActivityIndicator color={c.fg} />
            <Text style={[styles.status, { color: c.fg }]}>{t('auth.onboarding.syncing')}</Text>
          </View>
        )}

        {state.kind === 'error' && (
          <View style={styles.middle}>
            <Text style={[styles.status, { color: c.fgMuted }]}>
              {t('auth.onboarding.errorOffline')}
            </Text>
          </View>
        )}

        {state.kind === 'done' && (
          <View style={styles.middle}>
            <Text style={[styles.status, { color: c.fg }]}>
              {state.books + state.decks === 0
                ? t('auth.onboarding.noRecords')
                : t('auth.onboarding.synced', { books: state.books, decks: state.decks })}
            </Text>
          </View>
        )}

        {state.kind === 'reconcile' && (
          <ReconcileView
            missing={state.missing}
            resolved={resolved}
            onFind={handleFind}
          />
        )}

        <View style={styles.bottom}>
          {state.kind === 'reconcile' ? (
            allResolved(state.missing, resolved) ? (
              <Button label={t('auth.onboarding.continue')} onPress={finish} full />
            ) : (
              <View style={{ gap: 10 }}>
                <Button label={t('auth.onboarding.skipAll')} variant="secondary" onPress={finish} full />
              </View>
            )
          ) : (
            <Button
              label={t('auth.onboarding.continue')}
              onPress={finish}
              disabled={state.kind === 'loading'}
              full
            />
          )}
        </View>
      </View>
    </Screen>
  );
}

function allResolved(missing: BookRecord[], resolved: Set<string>): boolean {
  return missing.every((b) => resolved.has(b.id));
}

function ReconcileView({
  missing,
  resolved,
  onFind,
}: {
  missing: BookRecord[];
  resolved: Set<string>;
  onFind: (book: BookRecord) => void;
}) {
  const c = useColors();
  const t = useT();
  const pending = missing.filter((b) => !resolved.has(b.id)).length;

  return (
    <View style={styles.reconcile}>
      <Text style={[styles.reconcileTitle, { color: c.fg }]}>
        {t('auth.onboarding.reconcileTitle')}
      </Text>
      <Text style={[styles.reconcileBody, { color: c.fgMuted }]}>
        {t('auth.onboarding.reconcileBody', { count: pending || missing.length })}
      </Text>

      <ScrollView
        style={{ flex: 1, marginTop: spacing.md }}
        contentContainerStyle={{ paddingBottom: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {missing.map((b) => {
          const done = resolved.has(b.id);
          return (
            <View
              key={b.id}
              style={[styles.row, { backgroundColor: '#FFFFFF', borderColor: c.border }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowTitle, { color: c.fg }]} numberOfLines={1}>
                  {b.title}
                </Text>
                {b.author.length > 0 && (
                  <Text style={[styles.rowSub, { color: c.fgMuted }]} numberOfLines={1}>
                    {b.author}
                  </Text>
                )}
              </View>
              {done ? (
                <Text style={[styles.done, { color: c.success }]}>✓ {t('auth.onboarding.found')}</Text>
              ) : (
                <Pressable
                  onPress={() => onFind(b)}
                  style={[styles.findBtn, { borderColor: c.borderStrong, backgroundColor: c.bgSunken }]}
                  hitSlop={4}
                >
                  <Text style={{ color: c.fg, fontSize: fontSize.sm, fontWeight: '500' }}>
                    {t('auth.onboarding.find')}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingBottom: 40 },
  top: { marginTop: 16, alignItems: 'center', gap: spacing.md },
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
  reconcile: {
    flex: 1,
    marginTop: spacing.xl,
  },
  reconcileTitle: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  reconcileBody: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  rowTitle: { fontFamily: fontFamily.jp, fontSize: fontSize.md, fontWeight: '500' },
  rowSub: { fontSize: fontSize.xs + 1, marginTop: 2 },
  findBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  done: { fontSize: fontSize.sm, fontWeight: '600' },
  bottom: { marginTop: spacing.md },
});
