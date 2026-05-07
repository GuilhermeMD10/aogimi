import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { useColors, useFonts, useShape } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing } from '@/theme/tokens';
import type { BookRecord } from '@/lib/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { bookFileExists, importEpub } from '@/lib/bookFiles';
import { createBook } from '@/lib/api';
import { useBooks } from '@/components/home/useBooks';
import { BookCover } from '@/components/home/BookCover';
import { formatRelativeTime } from '@/lib/relativeTime';
import {
  Denomination,
  HankoSeal,
  PerforationStrip,
  StampMark,
} from '@/components/theme-decorations/stamp';

const SCREEN_PADDING = 22;
const GRID_GAP = 14;

/**
 * Stamp-theme variant of the library screen.
 *
 * Composition (per Stamp Agent Handoff §04.01 / Stamp DS .card-stamp):
 *  - Masthead: vertical 蔵 kicker + 56px serif title + StampMark corner
 *  - Continue-reading hero: StampCard with perforated top + bottom edges,
 *    denomination top-left, 読 hanko top-right, footer-bar bottom
 *  - Grid: 2-col plain Card (no perforation — perforation is reserved for
 *    the active stamp), denomination + footer-bar per item
 */
export function HomeScreen() {
  const c = useColors();
  const f = useFonts();
  const s = useShape();
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const { books, loading, refreshing, error, refresh } = useBooks();
  const [importing, setImporting] = useState(false);

  const hero = useMemo<BookRecord | null>(() => {
    if (books.length === 0) return null;
    return [...books].sort(
      (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
    )[0]!;
  }, [books]);

  const restBooks = useMemo<BookRecord[]>(() => {
    if (!hero) return books;
    return books.filter((b) => b.id !== hero.id);
  }, [books, hero]);

  const openBook = (id: string) => router.push(`/reader/${id}`);

  async function handleImport() {
    if (!user || importing) return;
    setImporting(true);
    try {
      const imported = await importEpub();
      if (!imported) return;
      await createBook(user.id, {
        filename: imported.filename,
        title: imported.title || imported.filename,
        author: imported.author,
      });
      await refresh();
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : t('common.error'));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.fg} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Masthead ──────────────────────────────────────────────── */}
        <View style={styles.masthead}>
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: f.mono,
                fontSize: 10,
                letterSpacing: 2.4,
                color: c.accent,
                textTransform: 'uppercase',
              }}
            >
              蔵 書 · LIBRARY
            </Text>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: f.displayBold,
                fontSize: 44,
                color: c.fg,
                letterSpacing: -0.5,
                marginTop: 6,
                lineHeight: 46,
              }}
            >
              Library
            </Text>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: f.ui,
                fontStyle: 'italic',
                fontSize: 13,
                color: c.fgMuted,
                marginTop: 8,
                maxWidth: 260,
                lineHeight: 18,
              }}
            >
              {books.length > 0
                ? `${books.length} stamp${books.length === 1 ? '' : 's'} in your collection.`
                : 'Your collection awaits.'}
            </Text>
          </View>
          <Pressable
            onPress={handleImport}
            disabled={importing}
            hitSlop={6}
            accessibilityLabel={t('home.importEpub')}
            style={({ pressed }) => [
              {
                width: 36,
                height: 36,
                backgroundColor: c.bgElev,
                borderColor: c.fg,
                borderWidth: 1,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: c.fg,
                shadowOffset: pressed ? { width: 0, height: 0 } : { width: 2, height: 2 },
                shadowOpacity: pressed ? 0 : 1,
                shadowRadius: 0,
                transform: [
                  { translateX: pressed ? 2 : 0 },
                  { translateY: pressed ? 2 : 0 },
                ],
                opacity: importing ? 0.55 : 1,
                marginTop: 18,
              },
            ]}
          >
            {importing ? (
              <ActivityIndicator size="small" color={c.fg} />
            ) : (
              <Text style={{ color: c.fg, fontSize: 20, lineHeight: 22, fontFamily: f.display }}>
                +
              </Text>
            )}
          </Pressable>
          <View style={{ marginLeft: 6, marginTop: 4 }}>
            <StampMark size={64} rotate={-7}>
              印
            </StampMark>
          </View>
        </View>

        {/* sumi rule under masthead */}
        <View style={{ height: 2, backgroundColor: c.fg, marginBottom: spacing.xl }} />

        {error && (
          <Text
            style={{
              fontSize: 13,
              color: c.error,
              fontFamily: f.ui,
              marginBottom: spacing.md,
              paddingHorizontal: SCREEN_PADDING,
            }}
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={c.fg} />
          </View>
        ) : (
          <>
            {/* ── Continue-reading hero ──────────────────────────────── */}
            {hero && (
              <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.xl }}>
                <SectionLabel num="01" label={t('home.continueReading')} />
                <HeroStamp
                  book={hero}
                  hasFile={bookFileExists(hero.filename)}
                  onPress={() => openBook(hero.id)}
                />
              </View>
            )}

            {/* ── Grid ───────────────────────────────────────────────── */}
            {restBooks.length > 0 && (
              <View style={{ paddingHorizontal: SCREEN_PADDING }}>
                <SectionLabel num="02" label="Your books" />
                <View style={styles.grid}>
                  {restBooks.map((b) => (
                    <View key={b.id} style={styles.gridItem}>
                      <GridStamp
                        book={b}
                        hasFile={bookFileExists(b.filename)}
                        onPress={() => openBook(b.id)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {books.length === 0 && !error && (
              <View style={styles.emptyWrap}>
                <HankoSeal size={72} rotate={-6}>
                  読
                </HankoSeal>
                <Text
                  allowFontScaling={false}
                  style={{
                    color: c.fgMuted,
                    fontFamily: f.display,
                    fontSize: 18,
                    fontStyle: 'italic',
                    marginTop: 22,
                    textAlign: 'center',
                  }}
                >
                  Your collection awaits.
                </Text>
                <Text
                  allowFontScaling={false}
                  style={{
                    color: c.accent,
                    fontFamily: f.mono,
                    fontSize: 10,
                    letterSpacing: 2.2,
                    marginTop: 8,
                  }}
                >
                  蔵書を始める
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section label — vermillion mono cap with horizontal divider rule
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ num, label }: { num: string; label: string }) {
  const c = useColors();
  const f = useFonts();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: f.mono,
          fontSize: 10,
          letterSpacing: 2.2,
          color: c.accent,
          textTransform: 'uppercase',
        }}
      >
        {num} · {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: c.fg, opacity: 0.3 }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero — perforated StampCard with horizontal layout
// ─────────────────────────────────────────────────────────────────────────────

function HeroStamp({
  book,
  hasFile,
  onPress,
}: {
  book: BookRecord;
  hasFile: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const f = useFonts();
  const surface = useShape().surface;
  const t = useT();

  // Cover gradient under stamp: featured = vermillionD → sumi (per spec).
  const coverColor = '#9B2A22';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: c.bgElev,
          borderColor: surface.borderColor,
          borderWidth: surface.borderWidth,
          borderRadius: surface.radius,
          padding: 16,
          shadowColor: surface.shadowColor,
          shadowOffset: pressed ? { width: 0, height: 0 } : surface.shadowOffset,
          shadowOpacity: pressed ? 0 : surface.shadowOpacity,
          shadowRadius: surface.shadowRadius,
          transform: [
            { translateX: pressed ? 2 : 0 },
            { translateY: pressed ? 2 : 0 },
          ],
          opacity: hasFile ? 1 : 0.7,
          position: 'relative',
        },
      ]}
    >
      {/* Perforation strips (active stamp only) */}
      <PerforationStrip side="top" width={1000} />
      <PerforationStrip side="bottom" width={1000} />

      <View style={{ flexDirection: 'row', gap: 14 }}>
        <BookCover
          title={book.title}
          coverColor={coverColor}
          filename={hasFile ? book.filename : undefined}
          width={72}
          height={100}
          cornerRadius={0}
          style={{
            borderColor: c.fg,
            borderWidth: 1,
          }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}
          >
            <Denomination value={String(book.progress)} caption="% READ" size="md" />
            <HankoSeal size={36} rotate={6}>
              読
            </HankoSeal>
          </View>
          <Text
            allowFontScaling={false}
            numberOfLines={2}
            style={{
              fontFamily: f.jp,
              fontSize: 19,
              color: c.fg,
              fontWeight: '600',
              letterSpacing: 0.5,
              lineHeight: 24,
            }}
          >
            {book.title}
          </Text>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              fontFamily: f.ui,
              fontStyle: 'italic',
              fontSize: 12,
              color: c.fgSubtle,
              marginTop: 2,
            }}
          >
            {book.author || '—'}
          </Text>
          {/* progress bar — vermillion fill on paper-deep track */}
          <View
            style={{
              height: 6,
              backgroundColor: c.bgSunken,
              borderColor: c.fg,
              borderWidth: 1,
              marginTop: 10,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.max(0, Math.min(100, book.progress))}%`,
                height: '100%',
                backgroundColor: c.accent,
              }}
            />
          </View>
          {/* footer-bar */}
          <View
            style={{
              borderTopColor: c.fg,
              borderTopWidth: 1,
              marginTop: 10,
              paddingTop: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: f.mono,
                fontSize: 9,
                letterSpacing: 2,
                color: c.fg,
                textTransform: 'uppercase',
              }}
            >
              日 本
            </Text>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: f.mono,
                fontSize: 9,
                letterSpacing: 2,
                color: hasFile ? c.fg : c.fgSubtle,
                textTransform: 'uppercase',
              }}
            >
              {hasFile ? formatRelativeTime(book.last_read_at) : t('home.importEpub')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid item — plain Card (no perforation)
// ─────────────────────────────────────────────────────────────────────────────

function GridStamp({
  book,
  hasFile,
  onPress,
}: {
  book: BookRecord;
  hasFile: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const f = useFonts();
  const surface = useShape().surface;

  const sealChar = deriveSealChar(book.title);
  const coverColor = '#8C8275'; // mountain — non-featured

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: c.bgElev,
          borderColor: surface.borderColor,
          borderWidth: surface.borderWidth,
          borderRadius: surface.radius,
          shadowColor: surface.shadowColor,
          shadowOffset: pressed ? { width: 0, height: 0 } : surface.shadowOffset,
          shadowOpacity: pressed ? 0 : surface.shadowOpacity,
          shadowRadius: surface.shadowRadius,
          transform: [
            { translateX: pressed ? 2 : 0 },
            { translateY: pressed ? 2 : 0 },
          ],
          opacity: hasFile ? 1 : 0.6,
          overflow: 'hidden',
        },
      ]}
    >
      {/* Cover hero */}
      <View
        style={{
          aspectRatio: 3 / 4,
          borderBottomColor: c.fg,
          borderBottomWidth: 1,
          position: 'relative',
        }}
      >
        <BookCover
          title={book.title}
          coverColor={coverColor}
          filename={hasFile ? book.filename : undefined}
          aspectRatio={3 / 4}
          cornerRadius={0}
          style={{ width: '100%', height: '100%' }}
        />
        {/* Denom plate */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            backgroundColor: c.bg,
            borderColor: c.fg,
            borderWidth: 1,
            paddingHorizontal: 5,
            paddingVertical: 2,
          }}
        >
          <Denomination value={String(book.progress)} caption="% READ" size="sm" />
        </View>
        {/* Mini hanko corner seal */}
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            transform: [{ rotate: '8deg' }],
          }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              backgroundColor: c.accent,
              borderColor: c.bg,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              allowFontScaling={false}
              style={{
                color: c.accentFg,
                fontFamily: f.display,
                fontWeight: '700',
                fontSize: 12,
                letterSpacing: 0.4,
              }}
            >
              {sealChar}
            </Text>
          </View>
        </View>
      </View>

      {/* Text + footer */}
      <View style={{ padding: 12, gap: 4 }}>
        <Text
          allowFontScaling={false}
          numberOfLines={2}
          style={{
            fontFamily: f.display,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.2,
            color: c.fg,
            textAlign: 'center',
            lineHeight: 17,
          }}
        >
          {book.title}
        </Text>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{
            fontFamily: f.ui,
            fontStyle: 'italic',
            fontSize: 11,
            color: c.fgSubtle,
            textAlign: 'center',
          }}
        >
          {book.author || '—'}
        </Text>
        {/* footer-bar */}
        <View
          style={{
            borderTopColor: c.fg,
            borderTopWidth: 1,
            marginTop: 6,
            paddingTop: 6,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.mono,
              fontSize: 9,
              letterSpacing: 2,
              color: c.fg,
              textTransform: 'uppercase',
            }}
          >
            日 本
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: f.mono,
              fontSize: 9,
              letterSpacing: 2,
              color: hasFile ? c.fg : c.fgSubtle,
              textTransform: 'uppercase',
            }}
          >
            {hasFile ? `${book.progress}%` : 'LOCATE'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// First CJK char of the title (or initial Latin letter), à la web's
// `deriveSealChar`. Used as the kanji on the corner mini hanko.
const CJK_REGEX = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;
function deriveSealChar(title: string): string {
  const cjk = title.match(CJK_REGEX);
  if (cjk) return cjk[0];
  const first = title[0];
  if (first) return first.toUpperCase();
  return '読';
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl + 80 },
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: spacing.lg,
    gap: 12,
  },
  centered: { paddingVertical: 80, alignItems: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GRID_GAP / 2,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: GRID_GAP / 2,
    marginBottom: spacing.lg,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
  },
});
