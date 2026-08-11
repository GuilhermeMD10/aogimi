import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, palette, radius, spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { useBooks } from '@/features/books/hooks/useBooks';
import { useDecks } from '@/features/sky/stage/hooks/useDecks';
import { useDueCounts } from '@/features/sky/stage/hooks/useDueCounts';
import { useStatsCards } from '@/features/profile/hooks/useStatsCards';
import { kamonFor } from '@/features/profile/lib/kamon';
import { BookCover } from '@/features/books/library/components/BookCover';
import { deckGlyphFor } from '@/features/sky/stage/lib/deckVisuals';
import { BrandGlyph } from '@/shared/components/BrandGlyph';
import { useDockClearance } from '@/features/app-shell/Dock';

/**
 * Home — handoff screen 02.
 *
 * The one screen mobile has that the web does not: the web's `/` is the library
 * shelf and it deliberately has no dashboard. Added because the handoff's dock
 * is four tabs with Home first, and because on a phone the header avatar is the
 * only route to Profile now that Profile has left the dock.
 *
 * ── Two cards the handoff draws that are NOT here ────────────────────────────
 * Both are missing *data*, not missing layout, so they are omitted rather than
 * faked:
 *
 *  · **The "STUDIED · 64 days" streak pill.** Nothing in the app or the API
 *    computes a streak — `statsApi` returns per-state card counts and totals
 *    only. A streak needs a distinct-review-days query the backend does not
 *    expose. The header keeps the avatar (which is load-bearing: it is the way
 *    to Profile) and drops the pill.
 *
 *  · **Word of the day.** There is no such endpoint or curated list. Picking one
 *    from the bundled SQLite would need a deterministic day→word rule and a
 *    definition of "worth showing", i.e. a small feature rather than a card.
 *
 * The dictionary card shows recent *queries* rather than the handoff's
 * word/kana/gloss rows, because `dictionaryStorage` stores the query string and
 * nothing else — resolving each to an entry would be N lookups on mount.
 *
 * ── The sky teaser ──────────────────────────────────────────────────────────
 * A gradient panel carrying the real star count, not a star map: the
 * `react-native-svg` renderer is the next phase-6 item. When it lands it mounts
 * inside this panel and the gradient becomes its backdrop — the panel's box,
 * caption and chevron are already the handoff's.
 */
export function HomeView() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();

  // The dock floats, so the room it needs is its height plus the safe-area offset — see the hook.
  const dockClearance = useDockClearance();

  // Home is the one screen that draws its top bar in a bare `View` rather than
  // through `Screen` (SafeAreaView edges={['top']}), because the canvas should
  // run under the status bar while the content starts below it. That means the
  // top inset is this screen's own job: without it the brand row and the avatar
  // button sit *under* the notch — unreadable, and the avatar untappable on a
  // notched iPhone. Applied to the scroll content, not the root, so the page
  // still scrolls up behind the status bar.
  const insets = useSafeAreaInsets();

  const { books: allBooks } = useBooks();
  const { decks } = useDecks();
  const { counts } = useDueCounts();
  const { data: cardStats } = useStatsCards();
  // Newest-read first; the handoff's continue-reading card is the single most
  // recent in-progress book.
  const reading = allBooks
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort(
      (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
    );
  const current = reading[0];
  const shelf = allBooks.slice(0, 3);

  // Deck chips: only decks with something due, which is what the numbers on
  // them mean. `byDeck` omits zero-due decks, so this filter is the same set.
  const dueDecks = decks.filter((d) => counts.byDeck[d.id]);

  // `kamonFor` wraps its index, so 0 is a valid default for a user without one.
  const avatar = kamonFor(user?.avatar_index ?? 0);
  const displayName = user?.display_name || user?.username || '';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top, paddingBottom: dockClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <BrandGlyph size={32} />
            <Text style={styles.brandName}>aogimi</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.title')}
            hitSlop={8}
            style={styles.avatar}
          >
            <Text style={styles.avatarGlyph}>{avatar.char}</Text>
          </Pressable>
        </View>

        {displayName ? (
          <Text style={styles.greeting} numberOfLines={1}>
            {t('home.greeting', { name: displayName })}
          </Text>
        ) : null}
        <Text style={styles.greetingSub}>{t('home.greetingSub')}</Text>

        {/* ── 1 · Sky teaser ─────────────────────────────────────────────── */}
        {/* Flat `sky2` fill. This was a three-stop sky1→sky2→sky3 gradient
            until the 2026-08-10 strip-to-basics pass; the middle stop alone
            reads as "night" without the decoration. */}
        <Pressable
          onPress={() => router.push('/sky')}
          accessibilityRole="button"
          style={styles.skyPanel}
        >
          <View style={styles.skyFooter}>
            <Text style={styles.skyCaption}>
              {t('home.yourSky', { count: cardStats.total })}
            </Text>
            <Feather name="chevron-right" size={16} color={palette.soft} />
          </View>
        </Pressable>

        {/* ── 2 · Continue reading ───────────────────────────────────────── */}
        {current ? (
          <Card>
            <Text style={styles.kicker}>{t('home.continueReading')}</Text>
            <View style={styles.readRow}>
              <BookCover
                title={current.title}
                coverColor={current.cover_color}
                filename={current.filename}
                width={62}
                height={88}
                cornerRadius={radius.sm}
              />
              <View style={styles.readMeta}>
                <Text style={styles.readTitle} numberOfLines={1}>
                  {current.title}
                </Text>
                <Text style={styles.readProgress}>{Math.round(current.progress)}%</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${current.progress}%` }]} />
                </View>
                <Pressable
                  onPress={() => router.push(`/reader/${current.id}`)}
                  style={styles.primaryBtn}
                >
                  <Feather name="play" size={12} color={palette.btnInk} />
                  <Text style={styles.primaryBtnLabel}>{t('home.resumeReading')}</Text>
                </Pressable>
              </View>
            </View>
          </Card>
        ) : null}

        {/* ── 3 · Study due ──────────────────────────────────────────────── */}
        <Card>
          <View style={styles.dueHead}>
            <Text style={styles.dueCount}>{counts.total}</Text>
            <Text style={styles.dueLabel}>{t('home.cardsDue')}</Text>
          </View>
          {dueDecks.length > 0 ? (
            <View style={styles.chipRow}>
              {dueDecks.map((d) => (
                <View key={d.id} style={styles.deckChip}>
                  <Text style={styles.deckChipText}>
                    {deckGlyphFor(d.name)} {d.name} · {counts.byDeck[d.id]}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable
            onPress={() => router.push('/sky/study')}
            // A session with nothing due can only hand out cards whose grades
            // silently do not count — see useDueCounts. So the button refuses.
            disabled={counts.total === 0}
            style={[styles.primaryBtnWide, counts.total === 0 && styles.btnDisabled]}
          >
            <Feather name="star" size={13} color={palette.btnInk} />
            <Text style={styles.primaryBtnLabel}>{t('home.studyNow')}</Text>
          </Pressable>
        </Card>

        {/* ── 4 · Library ────────────────────────────────────────────────── */}
        {shelf.length > 0 ? (
          <Card>
            <SectionHead
              title={t('nav.reader')}
              onPress={() => router.push('/(tabs)/reader')}
              viewAll={t('home.viewAll')}
            />
            <View style={styles.shelf}>
              {shelf.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() => router.push(`/reader/${b.id}`)}
                  style={styles.shelfItem}
                >
                  <BookCover
                    title={b.title}
                    coverColor={b.cover_color}
                    filename={b.filename}
                    width={96}
                    height={140}
                    cornerRadius={radius.sm}
                    style={styles.shelfCover}
                  />
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        {/* ── 5 · Dictionary ─────────────────────────────────────────────── */}
        <Card>
          <SectionHead
            title={t('nav.dictionary')}
            onPress={() => router.push('/(tabs)/dictionary')}
            viewAll={t('home.viewAll')}
          />
          <Pressable
            onPress={() => router.push('/(tabs)/dictionary')}
            style={styles.searchField}
          >
            <Feather name="search" size={15} color={palette.accent} />
            <Text style={styles.searchPlaceholder}>{t('dict.search')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

/** The handoff's card: filled paper surface, 16px radius, hairline edge. */
function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function SectionHead({
  title,
  viewAll,
  onPress,
}: {
  title: string;
  viewAll: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable onPress={onPress} hitSlop={6}>
        <Text style={styles.viewAll}>{viewAll} →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  // Both vertical paddings come from the call site, because both depend on the
  // safe-area insets and neither can be a constant here: `paddingTop` clears the
  // notch/status bar (`insets.top`) and `paddingBottom` clears the floating dock
  // (`useDockClearance()`, which is the dock's height plus the bottom inset).
  scroll: { paddingHorizontal: spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandName: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: palette.ink,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.avatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontFamily: fontFamily.jp,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: palette.avatarInk,
  },

  greeting: {
    fontFamily: fontFamily.ui,
    fontSize: 30,
    fontWeight: '700',
    color: palette.ink,
    marginTop: spacing.lg,
  },
  greetingSub: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    color: palette.soft,
    marginTop: spacing.xs + 2,
  },

  skyPanel: {
    height: 172,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.bdA,
    backgroundColor: palette.sky2,
    marginTop: spacing.lg,
    justifyContent: 'flex-end',
  },
  skyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  skyCaption: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs - 1,
    letterSpacing: 1.2,
    color: palette.gold,
  },

  card: {
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.paperBd,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  kicker: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs - 2,
    letterSpacing: 1.4,
    color: palette.faint,
  },

  readRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  readMeta: { flex: 1, minWidth: 0 },
  readTitle: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: palette.ink,
  },
  readProgress: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    color: palette.muted,
    marginTop: spacing.xs,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.track,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: { height: '100%', backgroundColor: palette.fill },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.btn,
    marginTop: spacing.md,
  },
  primaryBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.btn,
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.4 },
  primaryBtnLabel: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: palette.btnInk,
  },

  dueHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  dueCount: {
    fontFamily: fontFamily.ui,
    fontSize: 30,
    fontWeight: '700',
    color: palette.ink,
  },
  dueLabel: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: palette.soft,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm - 1,
    marginTop: spacing.md - 1,
  },
  deckChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.xl,
    backgroundColor: palette.paperTile,
    borderWidth: 1,
    borderColor: palette.paperBd,
  },
  deckChipText: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: palette.soft,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: palette.ink,
  },
  viewAll: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs - 1,
    letterSpacing: 1,
    color: palette.muted,
  },

  shelf: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  shelfItem: { flex: 1 },
  shelfCover: { width: '100%' },

  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 1,
    borderWidth: 1.5,
    borderColor: palette.ink,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    marginTop: spacing.md,
  },
  searchPlaceholder: {
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    color: palette.faint,
  },
});
