'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { TopBar } from '@/features/app-shell/TopBar';
import { SkyMap, useSkySeed, type Insets, type SkyFrameMeta } from '@/features/sky';

import { GlassColumn, ColumnHandle, startedLabel } from '../components/GlassColumn';
import { NightConfirm } from '../components/NightConfirm';
import { PendingCardOverlay, type PendingCardFlow } from '../components/PendingCardOverlay';
import { StageChrome } from '../components/StageChrome';
import { StageLedger } from '../components/StageLedger';
import { useDeckDueCounts } from '../hooks/useDeckDueCounts';
import { useSkyDecks } from '../hooks/useSkyDecks';
import { useSkyLedger } from '../hooks/useSkyLedger';
import * as api from '../lib/decksApi';
import { deckVisuals } from '../lib/deckVisuals';
import { MAX_DECKS } from '../lib/limits';
import { masteryMixOf } from '../lib/masteryMix';
import { NIGHT } from '../lib/nightChrome';
import { useDecks } from '../providers/DecksProvider';
import type { CardRecord } from '../types';

/**
 * `/decks` — the whole sky as the decks page: every deck a constellation in a
 * card frame, one rounded stage panel under the shared TopBar filling the rest
 * of the viewport (no page scroll). The old deck grid, deck detail and the
 * `/sky` route all merged into this. Three tiers:
 *
 *   outer sky:    every framed constellation + the bottom ledger; clicking a
 *                 frame is the only way into a deck.
 *   focused deck: the camera flies in, the glass column opens on the left
 *                 (search, card list, deck info).
 *   card:         a star or row swaps the column to the card's detail.
 *
 * **The URL is the only navigation state**: `?deck={uuid}` is the focused deck,
 * `&card={uuid}` the ringed star — uuids only, never a render-local index, so a
 * link means the same sky after any reorder. Entering or leaving a deck is a
 * place you can come back to (`push`); selecting a card within one is not
 * (`replace`) — the dictionary's precedent. A deep link opens already inside
 * its deck; only *changes* of focus fly the camera. A stale or foreign uuid
 * degrades to the outer view rather than erroring.
 *
 * The two navigation invariants live in the setters here, carried over from
 * the outgoing /sky view: a selected card's deck is always the focused deck,
 * and changing focus clears the selection (the URL builder simply never emits
 * `card` without `deck`).
 *
 * Mutations flow through both owners so nothing holds a ghost: the
 * `DecksProvider` (summaries the rest of the app reads) takes the API call,
 * and `useSkyDecks` hides the row optimistically then refetches — the sky, the
 * column and the frames all read the same filtered projection.
 */

/** Camera insets per tier — panel-relative (the stage is an inset rounded
 *  panel below the TopBar, not a viewport bleed). The chrome never moves, so
 *  these are constants: the action band at the outer tier, the glass column
 *  (or its reopen handle) inside a deck. */
const SKY_INSETS: Insets = { top: 96, right: 48, bottom: 216, left: 48 };
const SKY_INSETS_LEDGER_COLLAPSED: Insets = { top: 96, right: 48, bottom: 156, left: 48 };
const DECK_INSETS: Insets = { top: 88, right: 58, bottom: 84, left: 396 };
const DECK_INSETS_PANEL_HIDDEN: Insets = { top: 88, right: 58, bottom: 84, left: 58 };

type Confirm =
  | { kind: 'deck'; id: string; name: string }
  | { kind: 'card'; card: CardRecord }
  | null;

export function DecksView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seed = useSkySeed();
  const { decks, sources, loading, error, refresh: refreshSky, hideDeck, hideCard } = useSkyDecks();
  const ledger = useSkyLedger();
  const { total: dueTotal, byDeck, loading: dueLoading } = useDeckDueCounts();
  const {
    decks: deckSummaries,
    createDeck: providerCreateDeck,
    deleteDeck: providerDeleteDeck,
    bumpCardCount,
  } = useDecks();

  const [panelHidden, setPanelHidden] = useState(false);
  const [ledgerExpanded, setLedgerExpanded] = useState(true);
  const [confirm, setConfirm] = useState<Confirm>(null);

  /* ---------- navigation state, read off the URL and validated against the data ---------- */

  const deckParam = searchParams.get('deck');
  const cardParam = searchParams.get('card');

  const focusedDeck = useMemo(
    () => (deckParam === null ? null : (decks?.find((d) => d.id === deckParam) ?? null)),
    [decks, deckParam],
  );
  const focusedDeckKey = focusedDeck?.id ?? null;
  const selectedCard = useMemo(
    () =>
      focusedDeck === null || cardParam === null
        ? null
        : (focusedDeck.cards.find((c) => c.id === cardParam) ?? null),
    [focusedDeck, cardParam],
  );
  const selectedCardId = selectedCard?.id ?? null;

  const urlFor = (deck: string | null, card: string | null) => {
    const params = new URLSearchParams();
    if (deck !== null) params.set('deck', deck);
    if (deck !== null && card !== null) params.set('card', card); // no selection outside a focus
    const qs = params.toString();
    return qs ? `/decks?${qs}` : '/decks';
  };

  const focusDeck = useCallback(
    (deckKey: string | null) => {
      // a tier is a place to come back to; a new tier starts unselected
      router.push(urlFor(deckKey, null), { scroll: false });
    },
    [router],
  );

  const selectCard = useCallback(
    (cardId: string | null) => {
      if (focusedDeckKey === null) return; // nothing to ring at the outer view
      // replace: the map never leaves the screen, so "back" to the previous ring is meaningless
      router.replace(urlFor(focusedDeckKey, cardId), { scroll: false });
    },
    [router, focusedDeckKey],
  );

  /* ---------- the two-step choreography: focus a deck, ring a star on arrival ---------- */

  // A search result or ledger row names a card in some deck. If that deck is
  // already open the ring is immediate; otherwise the selection waits for the
  // camera flight to land (onSettled), so the star is ringed in a sky that is
  // actually showing stars. Kept as a ref pairing the deck it was meant for —
  // a flight interrupted into somewhere else discards it.
  const pendingRef = useRef<{ deckKey: string; cardId: string } | null>(null);

  const focusAndSelect = useCallback(
    (deckKey: string, cardId: string) => {
      if (!decks?.some((d) => d.id === deckKey)) return; // e.g. an upgrade row for a deleted deck
      if (deckKey === focusedDeckKey) {
        selectCard(cardId);
        return;
      }
      pendingRef.current = { deckKey, cardId };
      focusDeck(deckKey);
    },
    [decks, focusedDeckKey, selectCard, focusDeck],
  );

  const onSettled = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    if (pending.deckKey === focusedDeckKey) selectCard(pending.cardId);
  }, [focusedDeckKey, selectCard]);

  /* ---------- one level up: confirm → card → deck. Escape is its keyboard. ---------- */

  const back = useCallback(() => {
    if (confirm !== null) setConfirm(null);
    else if (selectedCardId !== null) selectCard(null);
    else if (focusedDeckKey !== null) focusDeck(null);
  }, [confirm, selectedCardId, focusedDeckKey, selectCard, focusDeck]);

  // through a ref, so the listener attaches once and still reads the current tier
  const backRef = useRef(back);
  useEffect(() => {
    backRef.current = back;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') backRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- reader → pending-card hand-off, ported from the old DecksView ---------- */

  const [pendingCardFlow, setPendingCardFlow] = useState<PendingCardFlow>(null);
  const { pendingCard, setPendingCard } = useReaderState();

  // Guard against replaying the seed (Strict Mode double-invocation, remount
  // ordering): stash the last-handled object identity so the flow is seeded
  // once per hand-off. The pending-fields idiom CLAUDE.md prescribes. setState
  // in the effect is intentional — the flow *is* local state synced from an
  // external trigger (the reader's pending field), the documented false
  // positive of this rule.
  const handledPendingCardRef = useRef<typeof pendingCard | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!pendingCard) return;
    if (handledPendingCardRef.current === pendingCard) return;
    handledPendingCardRef.current = pendingCard;
    setPendingCardFlow({
      phase: 'select-deck',
      word: pendingCard.word,
      initialBack: pendingCard.back,
      contextSentence: pendingCard.contextSentence,
    });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const cancelPendingFlow = useCallback(() => setPendingCardFlow(null), []);

  const selectDeckForPending = useCallback((deckId: string) => {
    setPendingCardFlow((prev) =>
      prev
        ? {
            phase: 'create-card',
            word: prev.word,
            deckId,
            initialBack: prev.initialBack,
            contextSentence: prev.contextSentence,
          }
        : prev,
    );
  }, []);

  const createDeckAndUseForPending = useCallback(
    async (name: string) => {
      const deck = await providerCreateDeck({ name });
      setPendingCardFlow((prev) =>
        prev
          ? {
              phase: 'create-card',
              word: prev.word,
              deckId: deck.id,
              initialBack: prev.initialBack,
              contextSentence: prev.contextSentence,
            }
          : prev,
      );
      // The new (empty) deck earns its frame now, even if the card is cancelled.
      void refreshSky();
    },
    [providerCreateDeck, refreshSky],
  );

  const submitPendingCard = useCallback(
    async (back: string, contextSentence?: string) => {
      const flow = pendingCardFlow;
      if (flow?.phase !== 'create-card') return;
      await api.createCard(flow.deckId, { front: flow.word, back, contextSentence });
      bumpCardCount(flow.deckId, +1);
      setPendingCardFlow(null);
      // Refresh before focusing: the new star (or a whole new deck) has to be
      // in the data before the URL can name it, or the focus degrades to the
      // outer view.
      await refreshSky();
      router.push(urlFor(flow.deckId, null), { scroll: false });
    },
    [pendingCardFlow, bumpCardCount, refreshSky, router],
  );

  /* ---------- create / delete, through the provider + the sky's optimistic hides ---------- */

  const deckCount = deckSummaries?.length ?? decks?.length ?? 0;

  const createDeck = useCallback(
    async (name: string) => {
      await providerCreateDeck({ name });
      await refreshSky();
    },
    [providerCreateDeck, refreshSky],
  );

  const runConfirm = useCallback(() => {
    if (confirm === null) return;
    setConfirm(null);
    if (confirm.kind === 'deck') {
      const { id } = confirm;
      hideDeck(id); // the frame goes now; the refetch makes it truth (or brings it honestly back)
      focusDeck(null); // the focused tier no longer exists — leave before the data does
      void providerDeleteDeck(id).finally(() => void refreshSky());
    } else {
      const { card } = confirm;
      hideCard(card.id);
      if (selectedCardId === card.id) selectCard(null);
      void api
        .deleteCard(card.id)
        .then(() => bumpCardCount(card.deck_id, -1))
        .finally(() => void refreshSky());
    }
  }, [
    confirm,
    hideDeck,
    hideCard,
    focusDeck,
    selectCard,
    selectedCardId,
    providerDeleteDeck,
    bumpCardCount,
    refreshSky,
  ]);

  /* ---------- the figures: frames, chrome, ledger — counted off data in hand ---------- */

  const frameMeta = useMemo<ReadonlyMap<string, SkyFrameMeta> | undefined>(() => {
    if (!decks) return undefined;
    const map = new Map<string, SkyFrameMeta>();
    for (const deck of decks) {
      const { color, kamon } = deckVisuals(deck.name);
      const started = startedLabel(deck.created_at);
      map.set(deck.id, {
        // null while the counts request is in flight — the pill draws dashed
        dueCount: dueLoading ? null : (byDeck[deck.id] ?? 0),
        coverColor: color,
        // Every deckVisuals colour is dark, so the glyph ink is the night ink —
        // not a theme token, because the sky is night in both themes.
        coverInk: NIGHT.ink,
        coverGlyph: kamon,
        ...(started ? { subtitle: `STARTED ${started.toUpperCase()}` } : {}),
        // card/mastered counts deliberately omitted: SkyMap derives them from
        // the same cards array this page feeds it, so they cannot disagree.
      });
    }
    return map;
  }, [decks, byDeck, dueLoading]);

  const insets =
    focusedDeckKey === null
      ? ledgerExpanded
        ? SKY_INSETS
        : SKY_INSETS_LEDGER_COLLAPSED
      : panelHidden
        ? DECK_INSETS_PANEL_HIDDEN
        : DECK_INSETS;

  const focusedDue =
    focusedDeckKey === null ? null : dueLoading ? null : (byDeck[focusedDeckKey] ?? 0);
  const chromeDue = focusedDeckKey === null ? (dueLoading ? null : dueTotal) : focusedDue;

  const totals = useMemo(() => {
    if (!decks) return null;
    let stars = 0;
    let mastered = 0;
    for (const deck of decks) {
      stars += deck.cards.length;
      for (const card of deck.cards) if (card.state === 'mastered') mastered++;
    }
    return { stars, mastered };
  }, [decks]);

  const mix = useMemo(
    () => (decks ? masteryMixOf(decks.flatMap((d) => d.cards)) : null),
    [decks],
  );

  /* ---------- render: TopBar column, then one stage panel — everything floats over the sky ---------- */

  return (
    <div className="flex h-full w-full flex-col overflow-hidden font-[family-name:var(--face-ui)] font-medium">
      {/* The shared TopBar on the same content bounds as home/profile
          (max-w-[1300px] + px-11). The stage panel below deliberately spans
          wider than this column — see the gutter note on the wrapper. */}
      <div className="mx-auto w-full max-w-[1300px] shrink-0 px-11 pt-[34px]">
        <TopBar />
      </div>

      {/* A 12px gutter (px-3/pb-3), not the page margin: the panel reads as a
          rounded floating stage that still all but fills the viewport. */}
      <div className="min-h-0 w-full flex-1 px-3 pb-3">
        <div
          className="relative h-full w-full overflow-hidden rounded-[24px]"
          style={{ background: NIGHT.bg }}
        >
          {/* ── the sky itself; the night gradient is the pre-seed placeholder ── */}
          <div className="absolute inset-0">
            {seed && sources && sources.length > 0 && (
              <SkyMap
                seed={seed}
                decks={sources}
                focusedDeckKey={focusedDeckKey}
                selectedCardId={selectedCardId}
                onFocusDeck={focusDeck}
                onSelectCard={selectCard}
                onSettled={onSettled}
                frameMeta={frameMeta}
                insets={insets}
              />
            )}

            {sources && sources.length === 0 && !loading && (
              <p className="absolute inset-0 m-0 flex items-center justify-center px-8 text-center font-[family-name:var(--face-mono)] text-[11px] tracking-[0.1em] text-white/45">
                Your sky is empty — save words from the reader and each one becomes a star.
              </p>
            )}
          </div>

          {error && (
            <p
              role="status"
              className="absolute top-[74px] left-1/2 z-40 m-0 -translate-x-1/2 rounded-[11px] px-4 py-2.5 text-[12.5px] whitespace-nowrap backdrop-blur-[12px]"
              style={{
                background: NIGHT.panel,
                border: `1px solid ${NIGHT.bdB}`,
                color: NIGHT.soft,
              }}
            >
              Couldn&rsquo;t load your sky — {error}
            </p>
          )}

          <StageChrome
            focusedDeckId={focusedDeckKey}
            dueCount={chromeDue}
            atDeckQuota={deckCount >= MAX_DECKS}
            deckCount={deckCount}
            onCreateDeck={createDeck}
            onRequestDeleteDeck={() => {
              if (focusedDeck) setConfirm({ kind: 'deck', id: focusedDeck.id, name: focusedDeck.name });
            }}
          />

          {focusedDeck === null ? (
            decks &&
            decks.length > 0 && (
              <StageLedger
                expanded={ledgerExpanded}
                onToggle={() => setLedgerExpanded((v) => !v)}
                days={ledger.days}
                stars={totals?.stars ?? null}
                dueToday={dueLoading ? null : dueTotal}
                mastered={totals?.mastered ?? null}
                mix={mix}
                upgrades={ledger.upgrades}
                onUpgradeClick={focusAndSelect}
              />
            )
          ) : panelHidden ? (
            <ColumnHandle onOpen={() => setPanelHidden(false)} />
          ) : (
            <GlassColumn
              deck={focusedDeck}
              decks={decks ?? []}
              selectedCard={selectedCard}
              dueCount={focusedDue}
              onBack={back}
              onCollapse={() => setPanelHidden(true)}
              onSelectCard={selectCard}
              onSearchPick={focusAndSelect}
              onRequestDeleteCard={(card) => setConfirm({ kind: 'card', card })}
            />
          )}

          <PendingCardOverlay
            flow={pendingCardFlow}
            decks={deckSummaries ?? []}
            onCancel={cancelPendingFlow}
            onSelectDeck={selectDeckForPending}
            onCreateDeckAndUse={(name) => void createDeckAndUseForPending(name)}
            onSubmitCard={(back, ctx) => void submitPendingCard(back, ctx)}
          />

          {confirm !== null &&
            (confirm.kind === 'deck' ? (
              <NightConfirm
                title={`Delete “${confirm.name}”?`}
                body="This deletes the deck and every card in it — its constellation leaves your sky. There is no undo."
                confirmLabel="Delete deck"
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
              />
            ) : (
              <NightConfirm
                title={`Delete “${confirm.card.front}”?`}
                body="This removes the card and its star. There is no undo."
                confirmLabel="Delete card"
                onConfirm={runConfirm}
                onCancel={() => setConfirm(null)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
