import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDockClearance } from '@/features/app-shell/Dock';
import { useHideDock } from '@/features/app-shell/DockVisibility';
import { useAuth } from '@/features/auth/providers/AuthContext';
import { SkyMap, type Insets, type SkyFrameMeta } from '@/features/sky/map';
import { LookupDrawers } from '@/features/dictionary/components/LookupDrawers';
import { useWordLookup } from '@/features/dictionary/hooks/useWordLookup';
import { Button } from '@/shared/components/Button';
import { InnerPlate } from '@/shared/components/Card';
import { PopoverMenu } from '@/shared/components/PopoverMenu';
import { Screen } from '@/shared/components/Screen';
import { ThemeScope, usePalette } from '@/theme/ThemeContext';
import { useT } from '@/lib/i18n/I18nContext';
import { spacing, type, type Palette } from '@/theme/tokens';

import { CardInspectorSheet } from '../components/CardInspectorSheet';
import { DeckMenu } from '../components/DeckMenu';
import { DeckStatsSheet } from '../components/DeckStatsSheet';
import { EditDeckSheet } from '../components/EditDeckSheet';
import { FocusedDeckHeader } from '../components/FocusedDeckHeader';
import { NewDeckSheet } from '../components/NewDeckSheet';
import { SkyTopBar } from '../components/SkyTopBar';
import { useDueCounts } from '../hooks/useDueCounts';
import { useSkyDecks, type DeckWithCards } from '../hooks/useSkyDecks';
import { deleteCardLocal } from '../lib/cardPush';
import { deckColorFor, deckGlyphFor } from '../lib/deckVisuals';
import { deleteDeckLocal } from '../lib/deckPush';
import { syncAllDeckChanges } from '../lib/decksSyncAll';
import { MAX_DECKS } from '../lib/limits';

/**
 * The Sky tab — every deck a constellation, on the app's own night. The decks
 * page **is** the sky.
 *
 * Two tiers, both in place — no route change between them:
 *
 *   outer sky:    every constellation with its due badge, and one block of
 *                 chrome at the top — the bar (stars, sync, menu) with the
 *                 study CTA under it; tapping a constellation is the way into
 *                 a deck, holding one opens its menu.
 *   focused deck: the camera flies in, the header takes the top of the stage
 *                 with Study and List under it, and tapping a star raises its
 *                 card from the bottom.
 *
 * ── Night in both themes ────────────────────────────────────────────────────
 * Stars need night, so the whole stage sits in `ThemeScope name="night"`: the
 * canvas `Screen` paints is the night one, and every primitive over it — glass,
 * buttons, sheets, the popover — reads the Night column. That is what retired
 * `nightChrome.ts`: there is no second ink ramp to maintain because there is no
 * second theme in here.
 *
 * ── Where this deliberately diverges from the web ──────────────────────────
 *
 * **Navigation state is local, not the URL.** A tab screen is not a link
 * somebody can send; the equivalent affordance is the hardware back button,
 * wired to the same tier walk below. The invariants the web's URL builder
 * enforced are enforced in the setters instead: a selection only exists inside
 * a focus, and changing focus clears it.
 *
 * **No optimistic hide layer.** Mobile is local-first: `deleteDeckLocal` /
 * `deleteCardLocal` write the local store first and push in the background,
 * and the store is what this screen reads — so re-reading after a delete
 * already shows the truth.
 *
 * **Deleting confirms through the platform `Alert`.** A destructive confirm is
 * exactly the case where a phone should look like the phone.
 *
 * ── Menus are one `PopoverMenu` each, hosted here ───────────────────────────
 * The deck menu (long-press or `…` in the focused header), the stage menu (`…`
 * at the outer tier) and the card menu (`…` in the inspector) are all `Modal`s
 * and all live at this level, because iOS presents one modal per view
 * controller and a sheet a menu row opens has to be presented *after* the menu
 * has gone — `PopoverMenu` sequences that, provided both are siblings here.
 */

/** Gutter between the chrome and the screen edge, and the chrome's own breathing
 *  room from the sky's boundary. The camera fits *inside* the insets, so this is
 *  the one number that decides how close a star may come to the glass. */
const GUTTER = 16;

export function SkyStageView() {
  return (
    <ThemeScope name="night">
      <SkyStage />
    </ThemeScope>
  );
}

function SkyStage() {
  const p = usePalette();
  const t = useT();
  const s = useStyles(p);
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
  const [syncing, setSyncing] = useState(false);
  const lookup = useWordLookup();

  // Overlays. Each is the id (or flag) of what is being asked about, and null
  // when nothing is — see the header on why they all live here.
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [menuDeckId, setMenuDeckId] = useState<string | null>(null);
  const [editDeckId, setEditDeckId] = useState<string | null>(null);
  const [statsDeckId, setStatsDeckId] = useState<string | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState(false);

  // Chrome is measured rather than assumed: the top block wraps, and the card
  // sheet's height depends on the card. The camera fits inside these, so a
  // guessed figure would put stars under glass.
  const [topChromeH, setTopChromeH] = useState(0);
  const [cardSheetH, setCardSheetH] = useState(0);
  // Rounded on purpose: layout re-fires with sub-pixel differences, and every
  // *changed* height re-fits the camera as a flight — so raw floats would turn
  // jitter into a sky that never settles.
  const measure = (set: (n: number) => void) => (e: LayoutChangeEvent) => set(Math.round(e.nativeEvent.layout.height));

  /* ---------- navigation state, validated against the data ---------- */

  const byId = useCallback(
    (id: string | null): DeckWithCards | null => (id === null ? null : (decks.find((d) => d.id === id) ?? null)),
    [decks],
  );

  // A deck deleted underneath the focus degrades to the outer view rather than
  // erroring — the web's rule for a stale uuid in the URL, same reason.
  const focusedDeck = useMemo(() => byId(focusedDeckId), [byId, focusedDeckId]);
  const focusedDeckKey = focusedDeck?.id ?? null;
  const menuDeck = useMemo(() => byId(menuDeckId), [byId, menuDeckId]);
  const editDeck = useMemo(() => byId(editDeckId), [byId, editDeckId]);
  const statsDeck = useMemo(() => byId(statsDeckId), [byId, statsDeckId]);

  /**
   * **A focused deck hides the dock.** Focusing is not a navigation — the stage
   * never leaves the screen — so nothing takes the tab bar away the way a push
   * would, and inside a deck the header already owns going back while the dock
   * would only cost the camera stars. Restores itself on unmount.
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

  // Push first, *then* refresh: hydrating before the pending rows have gone up
  // would overwrite them with the server's older copy.
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

  /* ---------- deletes: local store first, then re-read ---------- */

  const confirmDeleteDeck = useCallback(
    (deck: DeckWithCards) => {
      Alert.alert(
        t('sky.confirm.deleteDeckTitle', { name: deck.name }),
        t('sky.confirm.deleteDeckBody', { count: deck.cards.length.toLocaleString() }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('sky.deleteDeck'),
            style: 'destructive',
            onPress: () => {
              // Leave before the data does: if this is the focused deck, the tier
              // is about to stop existing, and `focusedDeck` degrading to null
              // mid-render would drop the header out from under the tap.
              if (focusedDeckId === deck.id) focusDeck(null);
              void deleteDeckLocal(deck.id).then(reloadLocal);
            },
          },
        ],
      );
    },
    [t, focusedDeckId, focusDeck, reloadLocal],
  );

  const confirmDeleteCard = useCallback(() => {
    if (!selectedCard) return;
    const { id, front } = selectedCard;
    Alert.alert(t('sky.confirm.deleteCardTitle', { front }), t('sky.confirm.deleteCardBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sky.deleteCard'),
        style: 'destructive',
        onPress: () => {
          setSelectedCardId(null);
          void deleteCardLocal(id).then(reloadLocal);
        },
      },
    ]);
  }, [selectedCard, reloadLocal, t]);

  /* ---------- the figures ---------- */

  const frameMeta = useMemo<ReadonlyMap<string, SkyFrameMeta>>(() => {
    const map = new Map<string, SkyFrameMeta>();
    for (const deck of decks) {
      map.set(deck.id, {
        // null while the counts request is in flight — no badge, which is not
        // the same as a confident 0 (also no badge, for a different reason).
        dueCount: dueLoading ? null : countFor(deck.id),
        // Keyed exactly as the deck menu keys it — colour off the id, glyph off
        // the name. The frames pass will draw these; the badge pass does not.
        coverColor: deckColorFor(deck.id),
        coverInk: p.ink,
        coverGlyph: deckGlyphFor(deck.name),
      });
    }
    return map;
  }, [decks, countFor, dueLoading, p.ink]);

  const totalStars = useMemo(() => decks.reduce((n, d) => n + d.cards.length, 0), [decks]);
  const focusedDue = focusedDeckKey === null || dueLoading ? null : countFor(focusedDeckKey);
  const nothingDue = !dueLoading && counts.total === 0;

  /** Each edge is the chrome's own outer edge plus `GUTTER`. Measured heights, so
   *  this re-fits when the header wraps or the card sheet grows. */
  const insets = useMemo<Insets>(
    () => ({
      top: safeArea.top + topChromeH + GUTTER,
      // Outer tier: the dock. Focused: the card sheet when one is up (it
      // carries its own safe-area padding), else the home indicator — the dock
      // is hidden in here. Gated on what is *mounted* rather than on the last
      // measured height, because an unmounting view never reports a closing 0.
      bottom:
        focusedDeck === null
          ? dockClearance
          : selectedCard
            ? cardSheetH + GUTTER
            : safeArea.bottom + GUTTER,
      left: GUTTER,
      right: GUTTER,
    }),
    [safeArea.top, safeArea.bottom, topChromeH, dockClearance, focusedDeck, selectedCard, cardSheetH],
  );

  /* ---------- signed-out: no seed, so no sky ---------- */

  if (status !== 'signed-in') {
    return (
      <Screen edges={[]}>
        <StatusBar style="light" />
        <View style={s.centered}>
          <Text style={s.emptyTitle}>{t('sky.signedOut.title')}</Text>
          <Text style={s.emptyBody}>{t('sky.signedOut.body')}</Text>
          <Button label={t('sky.signedOut.cta')} onPress={() => router.push('/profile')} />
          {decks.length > 0 && (
            <Text style={s.emptyNote}>{t('sky.signedOut.saved', { count: decks.length.toLocaleString() })}</Text>
          )}
        </View>
      </Screen>
    );
  }

  const hasSky = seed !== null && sources.length > 0;

  return (
    <Screen edges={[]}>
      {/* The stage is night whatever the theme says, so the status bar ink is
          light while it is focused; `app/_layout.tsx`'s bar follows the real
          theme and would draw dark glyphs over the sky in Day. */}
      <StatusBar style="light" />

      {/* ── the sky itself, edge to edge; the canvas shows through ── */}
      <View style={StyleSheet.absoluteFill}>
        {hasSky && (
          <SkyMap
            seed={seed}
            decks={sources}
            focusedDeckKey={focusedDeckKey}
            selectedCardId={selectedCardId}
            onFocusDeck={focusDeck}
            onSelectCard={selectCard}
            onLongPressDeck={setMenuDeckId}
            frameMeta={frameMeta}
            insets={insets}
          />
        )}
      </View>

      {loading && !hasSky && (
        <View style={s.centered}>
          <ActivityIndicator color={p.muted} />
        </View>
      )}

      {!loading && sources.length === 0 && (
        <View style={s.centered}>
          <Text style={s.emptyBody}>{t('sky.empty')}</Text>
        </View>
      )}

      {/* ── top chrome: whichever tier's bar, measured for the camera ── */}
      <View
        style={[s.topChrome, { top: safeArea.top + GUTTER }]}
        onLayout={measure(setTopChromeH)}
        pointerEvents="box-none"
      >
        {error && (
          <InnerPlate style={s.errorPlate}>
            <Text style={s.error}>{t('sky.loadError', { error })}</Text>
          </InnerPlate>
        )}

        {focusedDeck === null ? (
          <>
            <SkyTopBar
              stars={loading ? null : totalStars}
              syncing={syncing}
              onSync={() => void handleSync()}
              onMore={() => setStageMenuOpen(true)}
            />
            {/* The one CTA, part of the top block rather than parked at the
                bottom: the chooser is height-starved (a deck's cell is tall
                before a single star), and chrome at the bottom came off that
                axis twice — once for the dock, once for itself. */}
            {decks.length > 0 && (
              <Button
                label={t('sky.continueStudying')}
                icon="star"
                badge={dueLoading || nothingDue ? undefined : t('sky.dueBadge', { count: counts.total.toLocaleString() })}
                disabled={nothingDue}
                onPress={() => router.push('/sky/study')}
                full
              />
            )}
          </>
        ) : (
          <FocusedDeckHeader
            name={focusedDeck.name}
            cardCount={focusedDeck.cards.length}
            dueCount={focusedDue}
            onBack={() => focusDeck(null)}
            onMore={() => setMenuDeckId(focusedDeck.id)}
            onStudy={() => router.push(`/sky/${focusedDeck.id}/study`)}
            onList={() => router.push(`/sky/${focusedDeck.id}`)}
          />
        )}
      </View>

      {/* ── the ringed star's card, grown out of the bottom edge ── */}
      {selectedCard && (
        <View style={s.cardDock} onLayout={measure(setCardSheetH)} pointerEvents="box-none">
          <CardInspectorSheet
            card={selectedCard}
            onClose={() => setSelectedCardId(null)}
            onMore={() => setCardMenuOpen(true)}
            onLookUp={() => lookup.open(selectedCard.front)}
          />
        </View>
      )}

      {/* ── menus and sheets, all siblings — see the header ── */}
      <PopoverMenu
        visible={stageMenuOpen}
        onDismiss={() => setStageMenuOpen(false)}
        caption={t('sky.closeHint')}
        items={[
          {
            key: 'new',
            label: decks.length >= MAX_DECKS ? t('sky.deckLimit') : t('sky.newDeck'),
            icon: 'plus',
            accent: true,
            disabled: decks.length >= MAX_DECKS,
            onPress: () => setNewDeckOpen(true),
          },
        ]}
      />

      <DeckMenu
        deck={menuDeck}
        dueCount={menuDeck === null || dueLoading ? null : countFor(menuDeck.id)}
        onDismiss={() => setMenuDeckId(null)}
        onEdit={() => setEditDeckId(menuDeckId)}
        onStats={() => setStatsDeckId(menuDeckId)}
        onDelete={() => {
          if (menuDeck) confirmDeleteDeck(menuDeck);
        }}
      />

      <PopoverMenu
        visible={cardMenuOpen}
        onDismiss={() => setCardMenuOpen(false)}
        caption={t('sky.closeHint')}
        items={[
          { key: 'delete', label: t('sky.deleteCard'), icon: 'trash-2', destructive: true, onPress: confirmDeleteCard },
        ]}
      />

      <EditDeckSheet deck={editDeck} onDismiss={() => setEditDeckId(null)} onSaved={() => void reloadLocal()} />

      <DeckStatsSheet deck={statsDeck} onDismiss={() => setStatsDeckId(null)} />

      <NewDeckSheet
        visible={newDeckOpen}
        onDismiss={() => setNewDeckOpen(false)}
        onCreated={() => {
          setNewDeckOpen(false);
          // Re-read only — deliberately **not** a flight into the new deck: a
          // deck with no placeable cards has no box, and focusing one would fly
          // the camera at nothing. Save a word to it and it earns its constellation.
          void reloadLocal();
        }}
      />

      <LookupDrawers {...lookup.drawers} />
    </Screen>
  );
}

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        centered: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xxl,
          gap: spacing.md,
        },
        topChrome: { position: 'absolute', left: GUTTER, right: GUTTER, gap: spacing.sm + 2 },
        // Edge to edge: a sheet grows out of the bottom of the screen.
        cardDock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
        errorPlate: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
        error: { ...type.bodySm, color: p.danger },
        emptyTitle: { ...type.headlineLg, color: p.ink, textAlign: 'center' },
        emptyBody: { ...type.bodyMd, color: p.muted, textAlign: 'center' },
        emptyNote: { ...type.monoMeta, color: p.faint, textAlign: 'center' },
      }),
    [p],
  );
}
