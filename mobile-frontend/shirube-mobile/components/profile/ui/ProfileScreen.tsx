import { useCallback, useState } from 'react';
import { useFetchWithAbort } from '@/lib/useFetchWithAbort';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchUserBooks } from '@/components/books/utils/booksApi';
import { fetchUserDecks } from '@/components/decks/utils/decksApi';
import { updateUserProfile } from '../utils/profileApi';
import { kamonFor } from '../utils/kamon';
import { BookCover } from '@/components/books/ui/BookCover';
import { DeckCover } from '@/components/decks/ui/DeckCover';
import { Button } from '@/components/ui/Button';
import { AvatarPickerSheet } from './AvatarPickerSheet';
import { ThemePicker } from './ThemePicker';
import { SignedOutProfileScreen } from './SignedOutProfileScreen';

const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
type JlptLevel = (typeof JLPT_LEVELS)[number];

export function ProfileScreen() {
  const c = useColors();
  const t = useT();
  const router = useRouter();
  const { user, signOut, setUser, status } = useAuth();

  // Signed-out users see a different surface (sign-up / sign-in CTAs)
  // but rules of hooks require unconditional hook order — run every
  // hook below first, then branch on `status` at the JSX level.
  const isSignedOut = status === 'signed-out';

  const userId = user?.id;
  const { data, loading } = useFetchWithAbort(
    async (signal) => {
      const [books, decks] = await Promise.all([
        fetchUserBooks(userId!, signal),
        fetchUserDecks(userId!, signal),
      ]);
      return { books, decks };
    },
    [userId],
    { enabled: !isSignedOut && userId != null },
  );
  const books = data?.books ?? [];
  const decks = data?.decks ?? [];

  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  // Single busy-field flag — only one profile mutation is ever in flight.
  const [savingField, setSavingField] = useState<'avatar' | 'level' | null>(null);
  const savingAvatar = savingField === 'avatar';
  const savingLevel = savingField === 'level';

  const handleAvatarSelect = useCallback(
    async (idx: number) => {
      if (!user) return;
      setSavingField('avatar');
      try {
        const updated = await updateUserProfile({ avatar_index: idx });
        setUser(updated);
      } catch {
        /* surface later if needed */
      } finally {
        setSavingField(null);
      }
    },
    [user, setUser],
  );

  const handleLevelSelect = useCallback(
    async (level: JlptLevel) => {
      if (!user || savingLevel) return;
      setSavingField('level');
      try {
        const updated = await updateUserProfile({ language: level });
        setUser(updated);
      } catch {
        /* ignore */
      } finally {
        setSavingField(null);
      }
    },
    [user, savingLevel, setUser],
  );

  // Branch after all hooks have run. Guest first (no backend fetch
  // needed), then the loading state, then the real profile.
  if (isSignedOut) return <SignedOutProfileScreen />;
  if (loading || !user) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.fg} />
      </View>
    );
  }

  const displayName = user.display_name || user.username;
  const email = user.email;
  const joinDate = new Date(user.created_at).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
  const currentLevel = user.language && JLPT_LEVELS.includes(user.language as JlptLevel)
    ? (user.language as JlptLevel)
    : null;
  const avatar = kamonFor(user.avatar_index);

  const readingBooks = books
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort((a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime())
    .slice(0, 3);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#1A1918', '#3A342C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroPattern} />
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: c.fg, borderColor: c.bg }]}>
                <Text style={[styles.avatarGlyph, { color: c.accentFg }]}>{avatar.char}</Text>
              </View>
              <Pressable
                onPress={() => setAvatarPickerOpen(true)}
                disabled={savingAvatar}
                style={[
                  styles.avatarEdit,
                  { backgroundColor: c.accent, borderColor: c.bg, opacity: savingAvatar ? 0.6 : 1 },
                ]}
                hitSlop={6}
                accessibilityLabel={t('profile.changeAvatar')}
              >
                <Text style={[styles.avatarEditIcon, { color: c.accentFg }]}>✎</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.displayName, { color: c.fg }]}>{displayName}</Text>
          <Text style={[styles.handle, { color: c.fgMuted }]}>@{user.username}</Text>

          <View style={styles.chipsRow}>
            {currentLevel && (
              <View
                style={[styles.chip, { backgroundColor: c.accentSoft, borderColor: 'transparent' }]}
              >
                <Text style={[styles.chipText, { color: c.accent, fontWeight: '600' }]}>
                  日本語 · {currentLevel}
                </Text>
              </View>
            )}
            <View
              style={[styles.chip, { backgroundColor: c.bgSunken, borderColor: 'transparent' }]}
            >
              <Text style={[styles.chipText, { color: c.fgMuted }]}>Joined {joinDate}</Text>
            </View>
          </View>

          <Section title={t('profile.account')}>
            <Row label={t('profile.username')} value={user.username} borderColor={c.border} labelColor={c.fgMuted} valueColor={c.fg} />
            {email && (
              <Row label="Email" value={email} borderColor={c.border} labelColor={c.fgMuted} valueColor={c.fg} />
            )}
            <Row
              label="Language level"
              borderColor={c.border}
              labelColor={c.fgMuted}
              valueColor={c.fg}
            >
              <View style={styles.levelRow}>
                {JLPT_LEVELS.map((l) => {
                  const active = currentLevel === l;
                  return (
                    <Pressable
                      key={l}
                      onPress={() => handleLevelSelect(l)}
                      style={[
                        styles.levelChip,
                        {
                          backgroundColor: active ? c.fg : c.bgSunken,
                        },
                      ]}
                      hitSlop={2}
                    >
                      <Text
                        style={{
                          color: active ? c.accentFg : c.fgMuted,
                          fontSize: fontSize.xs + 1,
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {l}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Row>
          </Section>

          <Section title={t('profile.theme')}>
            <ThemePicker />
          </Section>

          <Section title={t('profile.currentlyReading')} subtitle={`${readingBooks.length} book${readingBooks.length !== 1 ? 's' : ''}`}>
            {readingBooks.length === 0 ? (
              <Text style={[styles.empty, { color: c.fgMuted }]}>
                Nothing in progress right now.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {readingBooks.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => router.push(`/reader/${b.id}`)}
                    style={[styles.readingRow, { backgroundColor: c.bgElev, borderColor: c.border }]}
                  >
                    <BookCover
                      title={b.title}
                      coverColor={b.cover_color}
                      filename={b.filename}
                      width={44}
                      height={60}
                      cornerRadius={6}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.readingTitle, { color: c.fg }]} numberOfLines={1}>
                        {b.title}
                      </Text>
                      <Text style={[styles.readingMeta, { color: c.fgMuted }]} numberOfLines={1}>
                        {b.author ? `${b.author} · ` : ''}{b.progress}%
                      </Text>
                      <View style={[styles.miniTrack, { backgroundColor: c.bgSunken }]}>
                        <View
                          style={[
                            styles.miniFill,
                            { backgroundColor: c.fg, width: `${b.progress}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Section>

          <Section title="Your decks" subtitle={`${decks.length} deck${decks.length !== 1 ? 's' : ''}`}>
            {decks.length === 0 ? (
              <Text style={[styles.empty, { color: c.fgMuted }]}>No decks yet.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {decks.slice(0, 4).map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => router.push(`/decks/${d.id}`)}
                    style={[styles.deckRow, { backgroundColor: c.bgElev, borderColor: c.border }]}
                  >
                    <DeckCover deckKey={d.id} deckName={d.name} width={36} height={36} cornerRadius={6} glyphSize={18} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.deckTitle, { color: c.fg }]} numberOfLines={1}>
                        {d.name}
                      </Text>
                      {d.description.length > 0 && (
                        <Text style={[styles.deckDesc, { color: c.fgMuted }]} numberOfLines={1}>
                          {d.description}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Section>

          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={t('profile.signOut')}
              variant="secondary"
              onPress={signOut}
              full
            />
          </View>
        </View>
      </ScrollView>

      <AvatarPickerSheet
        visible={avatarPickerOpen}
        current={user.avatar_index}
        onDismiss={() => setAvatarPickerOpen(false)}
        onSelect={handleAvatarSelect}
      />
    </View>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View style={{ marginTop: spacing.xl }}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: c.fgMuted }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: c.fgSubtle }]}>{subtitle}</Text>
        )}
      </View>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  children,
  borderColor,
  labelColor,
  valueColor,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  borderColor: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <View style={[styles.row, { borderTopColor: borderColor }]}>
      <Text style={[styles.rowLabel, { color: labelColor }]}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {children ?? (
          <Text style={[styles.rowValue, { color: valueColor }]} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );
}

const HERO_HEIGHT = 108;

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    // A very faint repeating texture done via border; leave empty for now.
  },
  body: { paddingHorizontal: 24, marginTop: -44 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { fontFamily: fontFamily.jp, fontSize: 40, fontWeight: '500' },
  avatarEdit: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: { fontSize: 12, lineHeight: 14 },
  displayName: {
    fontFamily: fontFamily.displayBold,
    fontSize: 26,
    letterSpacing: -0.3,
    marginTop: spacing.md,
  },
  handle: { fontSize: fontSize.sm, marginTop: 2 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 11 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionSubtitle: { fontSize: fontSize.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    width: 120,
  },
  rowValue: { fontSize: fontSize.sm + 1 },
  levelRow: { flexDirection: 'row', gap: 5 },
  levelChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  empty: { fontSize: fontSize.sm, paddingVertical: 10 },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  readingTitle: { fontFamily: fontFamily.jp, fontSize: fontSize.md, fontWeight: '500' },
  readingMeta: { fontSize: fontSize.xs + 1, marginTop: 2 },
  miniTrack: {
    height: 2,
    borderRadius: 99,
    marginTop: 6,
    overflow: 'hidden',
  },
  miniFill: { height: '100%', borderRadius: 99 },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  deckTitle: { fontSize: fontSize.sm + 1, fontWeight: '600' },
  deckDesc: { fontSize: fontSize.xs + 1, marginTop: 2 },
});
