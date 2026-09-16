import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useT } from '@/lib/i18n/I18nContext';
import { Screen } from '@/shared/components/Screen';
import { spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { useBooks } from '@/features/books/hooks/useBooks';
import { useDecks } from '@/features/sky/stage/hooks/useDecks';
import { useDueCounts } from '@/features/sky/stage/hooks/useDueCounts';
import { useStatsActivity } from '@/features/profile/hooks/useStatsActivity';
import { kamonFor } from '@/features/profile/lib/kamon';
import {
  getRecentLookups,
  type RecentLookup,
} from '@/features/dictionary/lib/dictionaryStorage';
import { useDockClearance } from '@/features/app-shell/Dock';
import { ContinueReadingCard } from '@/features/books/library/components/ContinueReadingCard';
import { HomeTopBar } from '../components/HomeTopBar';
import { StudyCard } from '../components/StudyCard';
import { DictionaryCard } from '../components/DictionaryCard';

/**
 * Home — the mobile-only dashboard.
 *
 * The web has no equivalent: its `/` is the library shelf and it deliberately
 * has no dashboard. This exists because the dock is four tabs with Home first,
 * and because on a phone the header avatar is the only route to Profile.
 *
 * **This file is composition and data only.** Every card is its own component;
 * anything visual belongs there. Order, top to bottom: header, dictionary,
 * continue reading, study.
 *
 * `ContinueReadingCard` is the **shelf's**, imported from `books/library` — the
 * same component this screen already borrows `BookCover` from. Home had its own
 * copy until the two had drifted apart; there is one now.
 *
 * ── What is deliberately not here ───────────────────────────────────────────
 *
 *  · **The salutation.** A 30px "おかえり, name" was the first thing on the
 *    screen and the last thing anyone came to Home to read. Removed outright;
 *    the header carries the identity now.
 *  · **The sky panel.** `SkyShortcut` still exists and is untouched, but Home
 *    does not mount it: the sky is being redesigned in its own session and a
 *    shortcut into a screen that is mid-rebuild would have to be built twice.
 *    The dock reaches `/sky` in one tap meanwhile.
 *  · **Library.** Its job — browse every book — is the Reader tab, one tap away
 *    in the dock. A three-cover strip here would duplicate that tab's top row.
 *  · **Word of the day.** There is no endpoint and no curated list. Picking one
 *    from the bundled SQLite needs a deterministic day→word rule *and* a
 *    definition of "worth showing", which is a feature rather than a card.
 *
 * ── Empty states ────────────────────────────────────────────────────────────
 * No placeholders anywhere. No in-progress book → the card is absent. Nothing
 * due → the study button is disabled and drops its count badge (grading early
 * does nothing, so an enabled button would be a lie). No lookups → the
 * dictionary card is its field alone. Signed out, every count is 0 and the page
 * degrades to the header, a search field and an empty study card, which is a
 * legitimate first-run screen.
 */
export function HomeView() {
  const t = useT();
  const router = useRouter();
  const { user } = useAuth();

  // The dock floats, so the room it needs is its height plus the safe-area
  // offset — see the hook. Never a hardcoded spacer.
  const dockClearance = useDockClearance();

  // Home takes no safe-area edge from `Screen` and applies the top inset to the
  // scroll *content* instead, so the sky runs under the status bar while the
  // header starts below it. Without it the brand row sits under the notch and
  // the avatar — the only route to Profile — is untappable.
  const insets = useSafeAreaInsets();

  const { books } = useBooks();
  const { decks } = useDecks();
  const { counts, countFor } = useDueCounts();
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
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.screenTop, paddingBottom: dockClearance },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HomeTopBar
          brandName={t('home.brand')}
          avatarGlyph={avatar.char}
          daysStudied={activity.daysStudied}
          streakLabel={t('home.streak', { count: activity.daysStudied })}
          profileLabel={t('profile.title')}
          onProfilePress={() => router.push('/profile')}
        />

        <View style={styles.stack}>
          <DictionaryCard
            placeholder={t('dict.search')}
            searchLabel={t('home.searchLabel')}
            recents={recents}
            onOpenDictionary={() => router.push('/(tabs)/dictionary')}
            onOpenLookup={openLookup}
          />

          {/* The shelf's card, not a second one — it owns its own copy, so
              nothing is passed but the book and how loud its CTA should be.
              `secondary`, because `StudyCard` below it carries the primary. */}
          {current && (
            <ContinueReadingCard
              book={current}
              cta="secondary"
              onPress={() => router.push(`/reader/${current.id}`)}
            />
          )}

          <StudyCard
            total={counts.total}
            decks={dueDecks}
            countFor={countFor}
            dueTitle={t('home.cardsDueTitle', { count: counts.total })}
            studyLabel={t('home.startReview')}
            dueBadge={t('home.dueBadge', { count: counts.total })}
            onStudyAll={() => router.push('/sky/study')}
            onStudyDeck={(deckId) => router.push(`/sky/${deckId}/study`)}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Both vertical paddings come from the call site: `paddingTop` clears the
  // notch and `paddingBottom` clears the floating dock, and neither is a
  // constant.
  scroll: { paddingHorizontal: spacing.screenX },
  // One gap rule for the card stack, rather than a `marginTop` on each card —
  // that way a card that renders conditionally cannot leave a double gap.
  stack: { marginTop: spacing.stackGap, gap: spacing.stackGap },
});
