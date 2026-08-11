'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
import { TopBar } from '@/features/app-shell/TopBar';
// The single `cards.back` flattening point, owned by the feature that builds
// drafts. Called at the createCard boundary so the draft never carries a second
// representation of its own reading + meanings.
// By file path, not through `@/features/dictionary`: that barrel imports this
// feature's barrel (for `MAX_MEANINGS_ON_CARD` and `CardDraft`), so the barrel
// form is a cycle — dictionary → sky/stage → SkyView → dictionary. It
// happens to resolve, but the house rule is to reach past a barrel rather than
// carry one (same reason feature code imports providers by path).
import { cardBack } from '@/features/dictionary/lib/cardDraft';
import { SkyMap, useSkySeed, type Insets, type SkyFrameMeta } from '@/features/sky/map';

import { CardDetailCard } from '../components/CardDetailCard';
import { DeckBar, startedLabel } from '../components/DeckBar';
import { GlassColumn, ColumnHandle } from '../components/GlassColumn';
import { NightConfirm } from '../components/NightConfirm';
import { PracticeOverlay } from '../../components/PracticeOverlay';
import { PendingCardOverlay, type PendingCardFlow } from '../components/PendingCardOverlay';
import { StageActions } from '../components/StageActions';
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
import type { CardDraft, CardRecord } from '../types';

/**
 * `/sky` — the whole sky as a page: every deck a constellation in a card frame,
 * on the page's own night canvas under the shared TopBar, filling the rest of
 * the viewport (no page scroll). The old deck grid, the deck-detail screen and
 * the old `/decks` route all merged into this. Three tiers:
 *
 *   outer sky:    every framed constellation, the stat ledger and the one
 *                 action cluster; clicking a frame is the only way into a deck.
 *   focused deck: the camera flies in, the stats bar takes the top of the stage
 *                 (back, name, figures, mix, delete) and the card list panel
 *                 opens on the left (this deck's session, search, rows).
 *   card:         a star or row opens the detail as its own card on the right —
 *                 **beside** the list, not instead of it, so you keep your place
 *                 in the deck while reading one word.
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

/** Camera insets per tier — stage-relative (the stage is everything below the
 *  TopBar row, edge to edge). The chrome never moves, so these are constants:
 *  the action band at the outer tier, the stats bar plus the card list panel (or
 *  its reopen handle) and the card detail inside a deck.
 *
 *  Each edge is the chrome's own outer edge exactly and carries no gutter on
 *  purpose: the sky's dashed boundary is meant to *meet* the glass, so entering
 *  a deck spends every pixel the panels leave. The deck's own DECK_PAD is what
 *  keeps its outermost star off that edge.
 *
 *    left    20 (the panel's offset) + 296 (its width) = 316; 58 collapsed, where
 *            only the ≡ CARDS handle is out there.
 *    right   58 at rest; 20 + 340 = 360 while the card detail is open on that
 *            side. **This is the axis the detail card added** — it is the one
 *            piece of deck chrome that comes and goes, so the focused tier is a
 *            2×2 (panel shown/hidden × detail open/closed) rather than the two
 *            fixed boxes it was when the detail lived inside the panel.
 *    top     96 clears the stats bar, whose height is set by the tallest thing
 *            in it — the 38px delete button, so 20 offset + 22 padding + 38 = 80.
 *            The panels start at 92, a 12px gutter below it.
 *    bottom  84 clears the Dock.
 *
 *  **The outer tier's `bottom` is the Dock's clearance and nothing else** now
 *  that the stat band sits in the top row (see StageLedger). It used to be 216 —
 *  the band's own height at the bottom of the screen — which came straight off
 *  the axis the deck grid is starved on: a deck's cell is ~500 world units tall
 *  before a star, so how large a deck card is drawn is set by the *height* of the
 *  free window. 96 clears the Dock (fixed at `bottom-[22px]`, ~50px tall) with a
 *  gutter, and gives the sky back the rest. There is no second outer-tier inset
 *  any more, because the band has no second size. */
const SKY_INSETS: Insets = { top: 96, right: 24, bottom: 96, left: 24 };

const DECK_LEFT_PANEL = 316;
const DECK_LEFT_COLLAPSED = 58;
const DECK_RIGHT_REST = 58;
const DECK_RIGHT_DETAIL = 360;

/** The focused tier's four boxes, off the two things that can be open. Written
 *  as a function rather than four constants because the axes are independent —
 *  spelling out the combinations invites the fourth to be forgotten. */
function deckInsets(panelHidden: boolean, detailOpen: boolean): Insets {
  return {
    top: 96,
    bottom: 84,
    left: panelHidden ? DECK_LEFT_COLLAPSED : DECK_LEFT_PANEL,
    right: detailOpen ? DECK_RIGHT_DETAIL : DECK_RIGHT_REST,
  };
}

type Confirm =
  // `cardCount` so the dialog can say what is actually being destroyed — the
  // delete control now sits on the stats bar, one click from the mastery
  // legend, so the confirm carries the weight.
  | { kind: 'deck'; id: string; name: string; cardCount: number }
  | { kind: 'card'; card: CardRecord }
  | null;

export function SkyView() {
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
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [practising, setPractising] = useState(false);

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
    return qs ? `/sky?${qs}` : '/sky';
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

  /* ---------- reader → pending-card hand-off, ported from the old SkyView ---------- */

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
      // The hand-off's `word` is the front, always — `draft` (present only when
      // the reader resolved a dictionary entry) supplies the rest, and its own
      // `front` is overridden so the two can't disagree about the headword.
      // No draft = a blank card the form's Reading and Meanings fields fill in.
      //
      // `contextSentence` falls back to the hand-off's own: a selection-started
      // card carries the book sentence beside the (null) draft, because there
      // was no draft for it to ride in at click time.
      draft: pendingCard.draft
        ? {
            ...pendingCard.draft,
            front: pendingCard.word,
            contextSentence: pendingCard.draft.contextSentence ?? pendingCard.contextSentence,
          }
        : {
            front: pendingCard.word,
            reading: '',
            meanings: [],
            jlptLevel: null,
            contextSentence: pendingCard.contextSentence,
          },
    });
    setPendingCard(null);
  }, [pendingCard, setPendingCard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const cancelPendingFlow = useCallback(() => setPendingCardFlow(null), []);

  // Both deck-choosing paths **spread the previous flow** rather than listing
  // its fields: picking a deck only decides `deckId`, and every rebuild that
  // enumerated the card's fields here was a place for a newly-added one to
  // survive the hand-off and then vanish on selection.
  const selectDeckForPending = useCallback((deckId: string) => {
    setPendingCardFlow((prev) => (prev ? { ...prev, phase: 'create-card', deckId } : prev));
  }, []);

  const createDeckAndUseForPending = useCallback(
    async (name: string) => {
      const deck = await providerCreateDeck({ name });
      setPendingCardFlow((prev) =>
        prev ? { ...prev, phase: 'create-card', deckId: deck.id } : prev,
      );
      // The new (empty) deck earns its frame now, even if the card is cancelled.
      void refreshSky();
    },
    [providerCreateDeck, refreshSky],
  );

  const submitPendingCard = useCallback(
    async (draft: CardDraft) => {
      const flow = pendingCardFlow;
      if (flow?.phase !== 'create-card') return;
      // The draft goes over whole; `back` is derived here and only here, by the
      // one helper that knows the format (`cardBack`). The column is still
      // written because mobile and every legacy read site still expect it.
      await api.createCard(flow.deckId, { ...draft, back: cardBack(draft) });
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
    focusedDeckKey === null ? SKY_INSETS : deckInsets(panelHidden, selectedCardId !== null);

  // the focused deck's own figure, for the glass column. The stage actions read the all-decks
  // total directly now that they only exist at the outer tier.
  const focusedDue =
    focusedDeckKey === null ? null : dueLoading ? null : (byDeck[focusedDeckKey] ?? 0);

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

  /**
   * The cards "Study ahead" drills — straight off the inventory this page is
   * already holding, which is the whole point of running practice here rather
   * than at `/study`: it costs no request, because the request already happened.
   *
   * **Scoped to whatever the button that opened it was scoped to**: the focused
   * deck's cards when you are standing in one (the card list panel's own study
   * button), every deck's out on the sky (`StageActions`). Both triggers set the
   * same `practising` flag, so the scope is read off the focus rather than
   * carried by the trigger — one source of truth for "which deck am I in", which
   * is the URL.
   *
   * Memoised on that inventory, not rebuilt per render: `useStudySession` keys
   * its seeding on this array's identity, so a fresh one each render would
   * reshuffle the queue under the user mid-session. The overlay covers the whole
   * page, so the focus can't change underneath a running sitting.
   */
  const practiceCards = useMemo<CardRecord[]>(
    () => (focusedDeck ? focusedDeck.cards : decks ? decks.flatMap((d) => d.cards) : []),
    [focusedDeck, decks],
  );

  /* ---------- render: TopBar column, then one stage panel — everything floats over the sky ---------- */

  return (
    <div className="flex h-full w-full flex-col overflow-hidden font-[family-name:var(--face-ui)] font-medium">
      {/* The shared TopBar on the same content bounds as home/profile
          (max-w-[1300px] + px-11). The stage below is bounded a step wider —
          see the note on its wrapper. */}
      <div className="mx-auto w-full max-w-[1300px] shrink-0 px-11 pt-[34px]">
        <TopBar />
      </div>

      {/* No gutter, no radius, no fill: the stage IS the page. SkyCanvas paints
          nothing and the app's night is `--page-base` (see the Page background
          block in ds-tokens.css), so the constellations sit on the same canvas
          the TopBar above them does — there is no panel edge left to frame
          them.
          **Unbounded in width, deliberately.** It used to stop at 1440px, one
          step wider than the TopBar's 1300px column, so the stage read as the
          page's widest element. That cap was costing the outer view horizontal
          room it now needs: at twenty decks the grid is a ~7×3 arrangement whose
          fit is set by whichever axis runs out first, and on anything wider than
          1440 the cap was throwing away the surplus. The chrome (StageChrome,
          StageLedger, GlassColumn) positions against the box inside this, so it
          spans with the sky rather than staying on the old column. */}
      <div className="min-h-0 w-full flex-1">
        <div className="relative h-full w-full overflow-hidden">
          {/* ── the sky itself; the page's own night shows through before the seed lands ── */}
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

          {/* ── whole-sky chrome: the all-decks actions and the stat band ── */}
          {focusedDeck === null ? (
            <>
              <StageActions
                dueCount={dueLoading ? null : dueTotal}
                atDeckQuota={deckCount >= MAX_DECKS}
                deckCount={deckCount}
                onCreateDeck={createDeck}
                onStudyAhead={() => setPractising(true)}
              />
              {decks && decks.length > 0 && (
                <StageLedger
                  days={ledger.days}
                  stars={totals?.stars ?? null}
                  dueToday={dueLoading ? null : dueTotal}
                  mastered={totals?.mastered ?? null}
                  mix={mix}
                />
              )}
            </>
          ) : (
            /* ── deck chrome: the stats bar in BOTH panel states (so the way
                  back out never collapses with the panel), then the card list
                  or its handle, and the detail card when a star is ringed. ── */
            <>
              <DeckBar
                deck={focusedDeck}
                dueCount={focusedDue}
                onBack={() => focusDeck(null)}
                onRequestDeleteDeck={() =>
                  setConfirm({
                    kind: 'deck',
                    id: focusedDeck.id,
                    name: focusedDeck.name,
                    cardCount: focusedDeck.cards.length,
                  })
                }
              />

              {panelHidden ? (
                <ColumnHandle onOpen={() => setPanelHidden(false)} />
              ) : (
                <GlassColumn
                  deck={focusedDeck}
                  decks={decks ?? []}
                  selectedCardId={selectedCardId}
                  dueCount={focusedDue}
                  onCollapse={() => setPanelHidden(true)}
                  onSelectCard={selectCard}
                  onSearchPick={focusAndSelect}
                  onStudyAhead={() => setPractising(true)}
                />
              )}

              {selectedCard && (
                <CardDetailCard
                  card={selectedCard}
                  onClose={() => selectCard(null)}
                  onRequestDelete={() => setConfirm({ kind: 'card', card: selectedCard })}
                />
              )}
            </>
          )}

          {/* Practice, over everything. Unmounted when closed, so re-opening
              reshuffles rather than resuming a half-finished queue. */}
          <PracticeOverlay
            open={practising}
            cards={practiceCards}
            deckName={focusedDeck?.name ?? null}
            onClose={() => setPractising(false)}
          />

          <PendingCardOverlay
            flow={pendingCardFlow}
            decks={deckSummaries ?? []}
            onCancel={cancelPendingFlow}
            onSelectDeck={selectDeckForPending}
            onCreateDeckAndUse={(name) => void createDeckAndUseForPending(name)}
            onSubmitCard={(draft) => void submitPendingCard(draft)}
          />

          {confirm !== null &&
            (confirm.kind === 'deck' ? (
              <NightConfirm
                title={`Delete “${confirm.name}”?`}
                body={`This deletes the deck and all ${confirm.cardCount.toLocaleString()} ${
                  confirm.cardCount === 1 ? 'card' : 'cards'
                } in it — its constellation leaves your sky. There is no undo.`}
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
