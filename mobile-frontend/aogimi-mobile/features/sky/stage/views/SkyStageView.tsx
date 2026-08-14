import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDockClearance } from '@/features/app-shell/Dock';
import { useHideDock } from '@/features/app-shell/DockVisibility';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { SkyMap, type Insets, type SkyFrameMeta } from '@/features/sky/map';
import { fontFamily, fontSize, palette, radius, spacing } from '@/theme/tokens';

import { CardDetailSheet } from '../components/CardDetailSheet';
import { NewDeckSheet } from '../components/NewDeckSheet';
import { SkyDeckBar } from '../components/SkyDeckBar';
import { StageActions } from '../components/StageActions';
import { StageLedger } from '../components/StageLedger';
import { useDueCounts } from '../hooks/useDueCounts';
import { useSkyDecks } from '../hooks/useSkyDecks';
import { deleteCardLocal } from '../lib/cardPush';
import { deckColorFor, deckGlyphFor } from '../lib/deckVisuals';
import { deleteDeckLocal } from '../lib/deckPush';
import { syncAllDeckChanges } from '../lib/decksSyncAll';
import { MAX_DECKS } from '../lib/limits';
import { NIGHT } from '../lib/nightChrome';
import { masteryMixOf } from '../lib/masteryMix';

/**
 * The Sky tab — every deck a constellation, on the app's own night. The mobile
 * counterpart of the web's `SkyView`, and the screen that finally mounts the
 * ported renderer. Replaces `DecksListScreen`: the decks page **is** the sky.
 *
 * Two tiers, both in place — no route change between them:
 *
 *   outer sky:    every framed constellation, the stat band and the one action
 *                 cluster; tapping a frame is the only way into a deck.
 *   focused deck: the camera flies in, the deck bar takes the top of the stage,
 *                 and tapping a star docks its card at the bottom.
 *
 * ── Where this deliberately diverges from the web ────────────────────────────
 *
 * **Navigation state is local, not the URL.** The web's hard rule ("`/sky` keeps
 * navigation state in the URL only") exists because a web page is a link
 * somebody can send, reload and bookmark. A tab screen is none of those: the
 * equivalent affordance here is the hardware back button, which is wired to the
 * same tier walk below. Pushing router params on every star tap would also churn
 * the navigator on a surface whose whole point is that it never leaves the
 * screen. The invariants the URL builder enforced over there are enforced in the
 * setters here instead: a selection only exists inside a focus, and changing
 * focus clears it.
 *
 * **No optimistic hide layer.** The web's `useSkyDecks` carries `hideDeck` /
 * `hideCard` because its rows come straight from a fetch, so a delete has to be
 * faked until the server agrees. Mobile is local-first: `deleteDeckLocal` /
 * `deleteCardLocal` write the local store *first* and push in the background,
 * and the store is what this screen reads — so re-reading after a delete already
 * shows the truth. The optimistic layer would be a second one.
 *
 * **No "Study ahead".** See `StageActions` — mobile's `useStudySession` has no
 * `local` source to run a session whose grades don't count, so practice would
 * have to be built rather than wired. Deferred, not faked.
 *
 * **Deleting confirms through the platform `Alert`** rather than the web's
 * `NightConfirm` glass dialog. A destructive confirm is exactly the case where a
 * phone should look like the phone.
 */

/** Gutter between the chrome and the screen edge, and the chrome's own breathing
 *  room from the sky's dashed boundary. The camera fits *inside* the insets, so
 *  this is the one number that decides how close a star may come to the glass. */
const GUTTER = 16;

/**
 * The stage's night, behind everything — `sky1` at the top down to `sky3` at the
 * base, which is the gradient `theme/tokens.ts` unrolled the handoff's `skybg`
 * into. **Theme-invariant**: see `NIGHT.bgStops`. Rendered by both returns below
 * so the signed-out prompt sits on the same sky the map does rather than on a
 * flat slab.
 */
const NightBackdrop = () => (
  <>
    <LinearGradient colors={NIGHT.bgStops} style={StyleSheet.absoluteFill} pointerEvents="none" />
    {/* The app's status-bar ink comes from `theme.meta.isDark` (`app/_layout.tsx`'s
        ThemedStatusBar), which is `false` on the light baseline — dark glyphs. This
        screen is night whatever the theme says, so it overrides to light while it
        is focused. Mounted with the backdrop because the two are the same fact. */}
    <StatusBar style="light" />
  </>
);

export function SkyStageView() {
  const router = useRouter();
  const safeArea = useSafeAreaInsets();
  const dockClearance = useDockClearance();
  const { user, status } = useAuth();
  const { decks, sources, loading, error, refresh, reloadLocal } = useSkyDecks();
  const { counts, countFor, loading: dueLoading } = useDueCounts();

  /**
   * The sky cannot be drawn without a server-issued seed. `users.sky_seed` is
   * immutable and **must never be invented client-side** — a locally-minted one
   * would put a card in a different place on every install, which is precisely
   * what the seed exists to prevent. So a signed-out user gets the prompt below,
   * not a sky built on a guess.
   */
  const seed = user?.sky_seed ?? null;

  const [focusedDeckId, setFocusedDeckId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Chrome is measured rather than assumed: both bars wrap text that can wrap,
  // and the card panel's height depends on how many meanings the card has. The
  // camera fits inside these, so a guessed figure would put stars under glass.
  const [topChromeH, setTopChromeH] = useState(0);
  const [cardPanelH, setCardPanelH] = useState(0);
  // Rounded on purpose: layout re-fires with sub-pixel differences, and every
  // *changed* height re-fits the camera as a flight — so raw floats would turn
  // jitter into a sky that never settles. Rounding collapses that noise into a
  // repeat of the value already held, which React bails out of without a
  // re-render. The Dock's row measurement guards the same way.
  const measure = (set: (n: number) => void) => (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    set(h);
  };

  /* ---------- navigation state, validated against the data ---------- */

  // A deck deleted underneath the focus degrades to the outer view rather than
  // erroring — the web's rule for a stale uuid in the URL, same reason.
  const focusedDeck = useMemo(
    () => (focusedDeckId === null ? null : (decks.find((d) => d.id === focusedDeckId) ?? null)),
    [decks, focusedDeckId],
  );
  const focusedDeckKey = focusedDeck?.id ?? null;

  /**
   * **A focused deck hides the dock.** Focusing is not a navigation — the stage never leaves the
   * screen — so nothing takes the tab bar away the way a push would, and inside a deck it is actively
   * wrong: `SkyDeckBar` already owns going back, and `useDockClearance()` feeds the camera's bottom
   * inset, so a dock nobody is using is costing stars. Restores itself on unmount.
   */
  useHideDock(focusedDeckId !== null);

  const selectedCard = useMemo(
    () =>
      focusedDeck === null || selectedCardId === null
        ? null
        : (focusedDeck.cards.find((c) => c.id === selectedCardId) ?? null),
    [focusedDeck, selectedCardId],
  );

  /** Changing focus always starts unselected — the invariant the web's URL
   *  builder enforced by never emitting `card` without `deck`. */
  const focusDeck = useCallback((deckKey: string | null) => {
    setFocusedDeckId(deckKey);
    setSelectedCardId(null);
  }, []);

  const selectCard = useCallback((cardId: string | null) => setSelectedCardId(cardId), []);

  /* ---------- one level up: card → deck → sky. Android back is its key. ---------- */

  const back = useCallback((): boolean => {
    if (selectedCardId !== null) {
      setSelectedCardId(null);
      return true;
    }
    if (focusedDeckId !== null) {
      focusDeck(null);
      return true;
    }
    return false; // at the outer sky there is nowhere up — let the OS have it
  }, [selectedCardId, focusedDeckId, focusDeck]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  }, [back]);

  /* ---------- sync: push what's queued, then re-hydrate ---------- */

  // Carried over from `DecksListScreen`. Push first, *then* refresh: hydrating
  // before the pending rows have gone up would overwrite them with the server's
  // older copy, which is the one ordering this must not get wrong.
  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncAllDeckChanges();
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [syncing, refresh]);

  const hasPending = useMemo(
    () => decks.some((d) => d.syncState === 'pending' || d.cards.some((c) => c.syncState === 'pending')),
    [decks],
  );

  /* ---------- deletes: local store first, then re-read ---------- */

  const confirmDeleteDeck = useCallback(() => {
    if (!focusedDeck) return;
    const { id, name, cards } = focusedDeck;
    Alert.alert(
      `Delete “${name}”?`,
      `This deletes the deck and all ${cards.length.toLocaleString()} ${
        cards.length === 1 ? 'card' : 'cards'
      } in it — its constellation leaves your sky. There is no undo.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete deck',
          style: 'destructive',
          onPress: () => {
            // Leave before the data does: the focused tier is about to stop
            // existing, and `focusedDeck` degrading to null mid-render would
            // drop the bar out from under the tap that caused it.
            focusDeck(null);
            void deleteDeckLocal(id).then(reloadLocal);
          },
        },
      ],
    );
  }, [focusedDeck, focusDeck, reloadLocal]);

  const confirmDeleteCard = useCallback(() => {
    if (!selectedCard) return;
    const { id, front } = selectedCard;
    Alert.alert(`Delete “${front}”?`, 'This removes the card and its star. There is no undo.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete card',
        style: 'destructive',
        onPress: () => {
          setSelectedCardId(null);
          void deleteCardLocal(id).then(reloadLocal);
        },
      },
    ]);
  }, [selectedCard, reloadLocal]);

  /* ---------- the figures ---------- */

  const frameMeta = useMemo<ReadonlyMap<string, SkyFrameMeta>>(() => {
    const map = new Map<string, SkyFrameMeta>();
    for (const deck of decks) {
      map.set(deck.id, {
        // null while the counts request is in flight — the pill draws dashed,
        // which is not the same as a confident 0.
        dueCount: dueLoading ? null : countFor(deck.id),
        // Keyed exactly as `DeckCover` keys it — colour off the id, glyph off
        // the name — so a deck's frame on the sky is the same tile the profile
        // and the deck screens draw. Splitting the two is what makes a rename
        // change the glyph without moving the colour.
        coverColor: deckColorFor(deck.id),
        // Every palette entry is dark, so the glyph takes the night ink.
        coverInk: palette.ink,
        coverGlyph: deckGlyphFor(deck.name),
        // card/mastered counts deliberately omitted: SkyMap derives them from
        // the same cards array this screen feeds it, so they cannot disagree.
      });
    }
    return map;
  }, [decks, countFor, dueLoading]);

  const totals = useMemo(() => {
    let stars = 0;
    let mastered = 0;
    for (const deck of decks) {
      stars += deck.cards.length;
      for (const card of deck.cards) if (card.state === 'mastered') mastered++;
    }
    return { stars, mastered };
  }, [decks]);

  const mix = useMemo(() => masteryMixOf(decks.flatMap((d) => d.cards)), [decks]);

  const focusedDue = focusedDeckKey === null || dueLoading ? null : countFor(focusedDeckKey);

  /** Each edge is the chrome's own outer edge, carrying only `GUTTER`: the sky's
   *  dashed boundary is meant to meet the glass, so entering a deck spends every
   *  pixel the chrome leaves. Measured heights, so this re-fits when the bar
   *  wraps or the card panel grows. */
  const insets = useMemo<Insets>(
    () => ({
      top: safeArea.top + topChromeH + GUTTER,
      // Gated on the card being open rather than on the last measured height:
      // the panel unmounts when the selection clears, so its `onLayout` never
      // fires a closing 0 and `cardPanelH` stays at whatever the last card
      // measured. Reading it only while a card is selected is what keeps the
      // bottom inset from staying inflated over an empty stage.
      bottom: dockClearance + (selectedCard ? cardPanelH + GUTTER : 0),
      left: GUTTER,
      right: GUTTER,
    }),
    [safeArea.top, topChromeH, dockClearance, selectedCard, cardPanelH],
  );

  /* ---------- signed-out: no seed, so no sky ---------- */

  if (status !== 'signed-in') {
    return (
      <View style={styles.root}>
        <NightBackdrop />
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Your sky needs an account</Text>
          <Text style={styles.emptyBody}>
            Every card you save becomes a star, placed by a seed the server issues once and never
            changes — so the same sky follows you to every device. Sign in to see yours.
          </Text>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>Go to Profile</Text>
          </Pressable>
          {decks.length > 0 && (
            <Text style={styles.emptyNote}>
              {decks.length.toLocaleString()} {decks.length === 1 ? 'deck is' : 'decks are'} saved
              on this device and will be waiting.
            </Text>
          )}
        </View>
      </View>
    );
  }

  const hasSky = seed !== null && sources.length > 0;

  return (
    <View style={styles.root}>
      <NightBackdrop />

      {/* ── the sky itself, edge to edge; the stage's night shows through ── */}
      <View style={StyleSheet.absoluteFill}>
        {hasSky && (
          <SkyMap
            seed={seed}
            decks={sources}
            focusedDeckKey={focusedDeckKey}
            selectedCardId={selectedCardId}
            onFocusDeck={focusDeck}
            onSelectCard={selectCard}
            frameMeta={frameMeta}
            insets={insets}
          />
        )}
      </View>

      {loading && !hasSky && (
        <View style={styles.centered}>
          <ActivityIndicator color={NIGHT.ink} />
        </View>
      )}

      {!loading && sources.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyBody}>
            Your sky is empty — save words from the reader and each one becomes a star.
          </Text>
        </View>
      )}

      {/* ── top chrome: whichever tier's bar, measured for the camera ── */}
      <View
        style={[styles.topChrome, { top: safeArea.top + GUTTER }]}
        onLayout={measure(setTopChromeH)}
        pointerEvents="box-none"
      >
        {error && <Text style={styles.error}>Couldn&rsquo;t load your sky — {error}</Text>}

        {focusedDeck === null ? (
          <>
            <StageActions
              dueCount={dueLoading ? null : counts.total}
              atDeckQuota={decks.length >= MAX_DECKS}
              syncing={syncing}
              hasPending={hasPending}
              onStudyDue={() => router.push('/sky/study')}
              onCreateDeck={() => setNewDeckOpen(true)}
              onSync={() => void handleSync()}
            />
            {decks.length > 0 && (
              <StageLedger
                stars={totals.stars}
                dueToday={dueLoading ? null : counts.total}
                mastered={totals.mastered}
                mix={mix}
              />
            )}
          </>
        ) : (
          <SkyDeckBar
            name={focusedDeck.name}
            cardCount={focusedDeck.cards.length}
            dueCount={focusedDue}
            onBack={() => focusDeck(null)}
            onStudyDeck={() => router.push(`/sky/${focusedDeck.id}/study`)}
            onRequestDelete={confirmDeleteDeck}
          />
        )}
      </View>

      {/* ── the ringed star's card, docked above the dock ── */}
      {selectedCard && (
        <View
          style={[styles.cardDock, { bottom: dockClearance }]}
          onLayout={measure(setCardPanelH)}
          pointerEvents="box-none"
        >
          <CardDetailSheet
            card={selectedCard}
            onClose={() => setSelectedCardId(null)}
            onRequestDelete={confirmDeleteCard}
          />
        </View>
      )}

      <NewDeckSheet
        visible={newDeckOpen}
        onDismiss={() => setNewDeckOpen(false)}
        onCreated={() => {
          setNewDeckOpen(false);
          // Re-read only — deliberately **not** a flight into the new deck.
          // `SkyMap` gives a deck a frame from its layout box, and a deck with no
          // placeable cards has no box; focusing one would fly the camera at
          // nothing. The web's plain `createDeck` stays at the outer tier for the
          // same reason. Save a word to it and it earns its constellation.
          void reloadLocal();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NIGHT.bgStops[2] },
  centered: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  topChrome: { position: 'absolute', left: GUTTER, right: GUTTER, gap: spacing.sm },
  cardDock: { position: 'absolute', left: GUTTER, right: GUTTER },
  error: {
    color: NIGHT.ink,
    backgroundColor: palette.dangerBg,
    borderColor: palette.dangerBd,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fontFamily.ui,
    fontSize: fontSize.xs,
  },
  emptyTitle: {
    color: NIGHT.ink,
    fontFamily: fontFamily.displayBold,
    fontSize: fontSize.xl,
    textAlign: 'center',
  },
  emptyBody: {
    color: NIGHT.soft,
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyNote: {
    color: NIGHT.faint,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  cta: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    borderRadius: radius.pill,
    backgroundColor: palette.btn,
    marginTop: spacing.xs,
  },
  ctaLabel: {
    color: palette.btnInk,
    fontFamily: fontFamily.ui,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
