import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useT } from '@/lib/i18n/I18nContext';
import { usePalette } from '@/theme/ThemeContext';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { useBooks } from '@/features/books/hooks/useBooks';
import { useDecks } from '@/features/sky/stage/hooks/useDecks';
import { useDueCounts } from '@/features/sky/stage/hooks/useDueCounts';
import { useStatsActivity } from '@/features/profile/hooks/useStatsActivity';
import { useStatsCards } from '@/features/profile/hooks/useStatsCards';
import { kamonFor } from '@/features/profile/lib/kamon';
import {
  getRecentLookups,
  type RecentLookup,
} from '@/features/dictionary/lib/dictionaryStorage';
import { useDockClearance } from '@/features/app-shell/Dock';
import { HomeTopBar } from '../components/HomeTopBar';
import { HomeHero } from '../components/HomeHero';
import { SkyShortcut } from '../components/SkyShortcut';
import { ContinueReadingCard } from '../components/ContinueReadingCard';
import { StudyCard } from '../components/StudyCard';
import { DictionaryCard } from '../components/DictionaryCard';

/**
 * Home — the mobile-only dashboard, rebuilt against the design handoff
 * (2026-08-12).
 *
 * The web has no equivalent: its `/` is the library shelf and it deliberately
 * has no dashboard. This exists because the dock is four tabs with Home first,
 * and because on a phone the header avatar is the only route to Profile.
 *
 * **This file is composition and data only.** Every card is its own component
 * in `../components`; anything visual belongs there. The order is the handoff's:
 * top bar, hero, sky, continue reading, study, dictionary.
 *
 * ── Two cards from the handoff that are not built ───────────────────────────
 * Both cut deliberately, not deferred:
 *
 *  · **Library.** Its job — browse every book — is the Reader tab, one tap away
 *    in the dock. A three-cover strip on Home duplicated that tab's top row.
 *  · **Word of the day.** There is no endpoint and no curated list. Picking one
 *    from the bundled SQLite needs a deterministic day→word rule *and* a
 *    definition of "worth showing", which is a feature rather than a card.
 *
 * ── Empty states ────────────────────────────────────────────────────────────
 * No placeholders anywhere. No in-progress book → the card is absent. Nothing
 * due → the study button is disabled (grading early does nothing, so an enabled
 * button would be a lie). No lookups → the dictionary card is its field alone.
 * Signed out, every count is 0 and the page degrades to hero + sky + an empty
 * study card, which is a legitimate first-run screen.
 */
export function HomeView() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();
  const p = usePalette();

  // The dock floats, so the room it needs is its height plus the safe-area
  // offset — see the hook. Never a hardcoded spacer.
  const dockClearance = useDockClearance();

  // Home draws its own top inset rather than going through `Screen`
  // (SafeAreaView edges={['top']}), because the canvas should run under the
  // status bar while the content starts below it. Applied to the scroll
  // content, not the root, so the page still scrolls up behind the status bar.
  // Without it the brand row sits under the notch and the avatar — the only
  // route to Profile — is untappable.
  const insets = useSafeAreaInsets();

  const { books } = useBooks();
  const { decks } = useDecks();
  const { counts, countFor } = useDueCounts();
  const { data: cardStats } = useStatsCards();
  const { data: activity } = useStatsActivity();

  // The single most recently opened book that is started but not finished.
  const current = books
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort(
      (a, b) => new Date(b.last_read_at).getTime() - new Date(a.last_read_at).getTime(),
    )[0];

  // `byDeck` omits decks with nothing due, so this filter and the chip counts
  // are the same set by construction.
  const dueDecks = decks.filter((d) => countFor(d.id) > 0);

  // Recents are written by the dictionary tab and the reader's drawer, not by
  // this screen — so they are re-read on focus rather than once on mount, or a
  // word looked up mid-session would not appear until the app restarted.
  const [recents, setRecents] = useState<RecentLookup[]>([]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getRecentLookups().then((next) => {
        if (!cancelled) setRecents(next);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // `kamonFor` wraps its index, so 0 is a valid default for a user without one.
  const avatar = kamonFor(user?.avatar_index ?? 0);
  const displayName = user?.display_name || user?.username || '';

  const openLookup = useCallback(
    (lookup: RecentLookup) => {
      // `n` is a nonce — the dictionary tab stays mounted, so re-opening the
      // same word needs the params to differ. See DictionaryView's deep link.
      router.push(
        `/(tabs)/dictionary?word=${lookup.wordId}&n=${Date.now()}` as never,
      );
    },
    [router],
  );

  return (
    <View style={[styles.root, { backgroundColor: p.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top, paddingBottom: dockClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HomeTopBar
          avatarGlyph={avatar.char}
          daysStudied={activity.daysStudied}
          studiedLabel={t('home.daysStudied')}
          profileLabel={t('profile.title')}
          onProfilePress={() => router.push('/profile')}
        />

        <HomeHero
          greeting={displayName ? t('home.greeting', { name: displayName }) : null}
          caption={t('home.greetingSub')}
        />

        <View style={styles.stack}>
          <SkyShortcut
            caption={t('home.yourSky', { count: cardStats.total })}
            accessibilityLabel={t('nav.sky')}
            onPress={() => router.push('/sky')}
          />

          {current && (
            <ContinueReadingCard
              book={current}
              kicker={t('home.continueReading')}
              resumeLabel={t('home.resumeReading')}
              onResume={() => router.push(`/reader/${current.id}`)}
            />
          )}

          <StudyCard
            total={counts.total}
            decks={dueDecks}
            countFor={countFor}
            dueLabel={t('home.cardsDue')}
            studyLabel={t('home.studyNow')}
            onStudyAll={() => router.push('/sky/study')}
            onStudyDeck={(deckId) => router.push(`/sky/${deckId}/study`)}
          />

          <DictionaryCard
            title={t('nav.dictionary')}
            viewAllLabel={t('home.viewAll')}
            placeholder={t('dict.search')}
            recents={recents}
            onOpenDictionary={() => router.push('/(tabs)/dictionary')}
            onOpenLookup={openLookup}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Both vertical paddings come from the call site: `paddingTop` clears the
  // notch and `paddingBottom` clears the floating dock, and neither is a
  // constant.
  scroll: { paddingHorizontal: spacing.lg },
  // One gap rule for the card stack, rather than a `marginTop` on each card —
  // that way a card that renders conditionally cannot leave a double gap.
  stack: { marginTop: spacing.lg, gap: spacing.md + 2 },
});
