import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { BrandGlyph } from '@/components/ui/BrandGlyph';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchUserBooks, matchBooks } from '@/components/books/utils/booksApi';
import { fetchUserDecks } from '@/components/decks/utils/decksApi';
import { bookFileExists, bookFilePath, deleteBookFile } from '@/components/books/utils/bookPaths';
import { ExtensionMismatchError, importEpub } from '@/components/books/utils/bookFiles';
import { removeEntry, setStoredFileHash } from '@/components/books/utils/bookLocalState';
import type { BookRecord } from '@/components/books/types';
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
    if (!user) return;
    // Outer try/catch is the safety net — ANY unhandled exception here
    // would otherwise crash the JS runtime in dev mode, trigger a
    // Metro reload, and bounce the user out of onboarding to the
    // initial route (books tab). Every path inside MUST end with a
    // friendly alert or no-op, never an uncaught throw.
    try {
      let imported;
      try {
        imported = await importEpub({ expectedFilename: book.filename });
      } catch (err) {
        if (err instanceof ExtensionMismatchError) {
          Alert.alert(
            'Wrong file type',
            `"${book.title}" is a .${err.expected} file, but you picked a .${err.picked} file. Pick a matching one.`,
          );
        } else {
          Alert.alert(
            'Could not import',
            err instanceof Error ? err.message : 'Unknown error reading the file. Try a different one.',
          );
        }
        return;
      }
      if (!imported) return;

      // Identity-verify the picked file against the targeted book before we
      // attach it under book.filename. Without this, picking the wrong file
      // here silently rewrites a known book's slot with someone else's content.
      let matchedId: string | null = null;
      let matchedOther: { title: string } | null = null;
      try {
        const [result] = await matchBooks(user.id, [
          {
            file_hash: imported.fileHash,
            content_hash: imported.contentHash,
            pdf_id_original: imported.pdfIdOriginal,
            xmp_original_id: imported.xmpOriginalId,
            detected_doi: imported.detectedDoi,
            detected_isbn: imported.detectedIsbn,
            page_count: imported.pageCount,
            page_phashes: imported.pagePhashes,
            metadata: {
              title: imported.title || imported.filename,
              author: imported.author,
              dc_identifier: imported.dcIdentifier,
              filename: imported.filename,
            },
          },
        ]);
        // Only file_hash certifies "this is exactly that book". Other match
        // types (pdf_trailer_id, xmp_original_id, doi, isbn, content,
        // metadata, filename) can collide between distinct books — accepting
        // them here would silently attach the wrong content under the
        // target's filename slot. Same rule the +-button import flow uses.
        if (result?.match && result.match_type === 'file_hash') {
          matchedId = result.match.id;
          if (matchedId !== book.id) matchedOther = { title: result.match.title };
        }
      } catch {
        /* matcher unreachable — treat as no match, reject below */
      }

      if (matchedId !== book.id) {
        // Wrap the FS delete — file might be locked, missing, or just
        // refusing to die. Either way, the user-facing outcome is the
        // same "doesn't match" alert; the leftover bytes will get
        // cleaned up by the next reconcile.
        try { deleteBookFile(imported.filename); } catch { /* best-effort */ }
        Alert.alert(
          "Doesn't match",
          matchedOther
            ? `This file is already in your library as "${matchedOther.title}".`
            : `This file doesn't match "${book.title}". The book stays unimported.`,
        );
        return;
      }

      try {
        if (imported.filename !== book.filename) {
          const local = new File(bookFilePath(imported.filename));
          local.copy(new File(bookFilePath(book.filename)));
          local.delete();
          // Clean up the sync entry for the picked filename — file moved.
          await removeEntry(imported.filename);
        }
        // Locate flow: backend already had this record, so the destination
        // filename is `synced` directly. `setStoredFileHash` writes the
        // fileHash with no explicit syncState — treated as `synced` by
        // `effectiveSyncState`, which is what we want here.
        if (imported.fileHash) {
          await setStoredFileHash(book.filename, imported.fileHash);
        }
        setResolved((prev) => new Set(prev).add(book.id));
      } catch {
        /* fs error — leave unresolved so the user can retry */
      }
    } catch (err) {
      // Outer safety net — anything that slipped past the inner
      // try/catches lands here as an alert instead of crashing the
      // screen out to the books tab.
      Alert.alert(
        'Something went wrong',
        err instanceof Error ? err.message : 'Please try a different file.',
      );
    }
  }, [user]);

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
