'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useReaderState } from '@/features/app-shell/providers/ReaderStateProvider';
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
import { PANE } from '@/shared/components';
import { cn } from '@/lib/util/cn';

import { PracticeOverlay } from '../../components/PracticeOverlay';
import {
  CardsSection,
  type ListCard,
  ConfirmDialog,
  type DeckMenuAction,
  DeckNameModal,
  FieldHeader,
  Inspector,
} from '../components';
import { PendingCardOverlay, type PendingCardFlow } from '../components/PendingCardOverlay';
import { useDeckDueCounts, useSkyDecks } from '../hooks';
import { startedLabel, deckVisuals, MAX_DECKS } from '../lib';
import * as api from '../lib/decksApi';
import { useDecks } from '../providers/DecksProvider';
import { type CardDraft, type DeckWithCards, type SkyCardRecord, toSkyCard } from '../types';

/**
 * `/sky` — the whole sky as a page (handoff pages 04/05, re-arranged by the
 * owner 2026-09-22). The map sits inside the **Sky field**, a rounded dark
 * panel that is night under every theme and fills the viewport under the nav;
 * the **Cards** list is a column on its right that scrolls inside itself.
 * Nothing on the page moves when a deck or a card opens: the field keeps its
 * size and the inspector floats inside it. Two tiers, both inside the field:
 *
 *   outer sky:    every framed constellation; the field header carries the
 *                 `SKY · 星空マップ` eyebrow, the stars pill, the ⋯ menu (New
 *                 deck) and Continue Studying. The list below is every card,
 *                 newest first — clicking a row flies into its deck and rings
 *                 its star. Clicking a frame is the other way into a deck.
 *   focused deck: the camera flies in; the header shows the way back, the deck's
 *                 name, its stars, the ⋯ menu (New · Rename · Delete) and the
 *                 deck's own session. A star or a row opens the **inspector**
 *                 on the right of the field; the list narrows to this deck.
 *
 * **The URL is the only navigation state**: `?deck={uuid}` is the focused deck,
 * `&card={uuid}` the ringed star — uuids only, never a render-local index, so a
 * link means the same sky after any reorder. Entering or leaving a deck is a
 * place you can come back to (`push`); selecting a card within one is not
 * (`replace`) — the dictionary's precedent. A deep link opens already inside
 * its deck; only *changes* of focus fly the camera. A stale or foreign uuid
 * degrades to the outer view rather than erroring.
 *
 * The two navigation invariants live in the setters here: a selected card's
 * deck is always the focused deck, and changing focus clears the selection
 * (the URL builder simply never emits `card` without `deck`).
 *
 * Mutations flow through both owners so nothing holds a ghost: the
 * `DecksProvider` (summaries the rest of the app reads) takes the API call,
 * and `useSkyDecks` patches its inventory in place — a created row is inserted
 * as the server returned it, a renamed one is renamed, a deleted one is hidden
 * before the request and put back if the request fails. Nothing refetches the
 * whole inventory for a one-row change; the sky, the list and the frames all
 * read the same patched projection.
 */

/** Camera insets — **field-relative** (the map fills the field). The header
 *  row is 20 from the top and 48 tall; the inspector and the map's free window
 *  both start at 92, a 24px gutter below it. Each other edge is a plain 24px
 *  gutter, and the inspector — the one piece of chrome that comes and goes —
 *  adds its 20 offset + 340 width on the right while it is open. */
const FIELD_TOP = 92;
const FIELD_PAD = 24;
const INSPECTOR_RIGHT = 20 + 340;

const SKY_INSETS: Insets = { top: FIELD_TOP, right: FIELD_PAD, bottom: FIELD_PAD, left: FIELD_PAD };

function deckInsets(inspectorOpen: boolean): Insets {
  return { top: FIELD_TOP, right: inspectorOpen ? INSPECTOR_RIGHT : FIELD_PAD, bottom: FIELD_PAD, left: FIELD_PAD };
}

/** The field's background: the nebula (themed) and the aurora over the fixed
 *  gradient. Page 04 lights the top and bottom edges; page 05 pulls the nebula
 *  down and the aurora left, under where the constellation sits. */
const FIELD_BG_SKY =
  'radial-gradient(ellipse 80% 50% at 50% -10%, rgb(var(--nebula-rgb) / .28), transparent 70%), ' +
  'radial-gradient(ellipse 70% 50% at 50% 110%, var(--field-aurora), transparent 70%), var(--field-bg)';
const FIELD_BG_DECK =
  'radial-gradient(ellipse 90% 60% at 50% 20%, rgb(var(--nebula-rgb) / .32), transparent 70%), ' +
  'radial-gradient(ellipse 70% 50% at 30% 90%, var(--field-aurora), transparent 70%), var(--field-bg-deck)';

type Confirm =
  // `cardCount` so the dialog can say what is actually being destroyed.
  | { kind: 'deck'; id: string; name: string; cardCount: number }
  // `deckId` is the focused deck's — a selected card is always in the focused
  // deck — carried here because the lean card row does not name its deck.
  | { kind: 'card'; card: SkyCardRecord; deckId: string }
  | null;

/** The ⋯ menu's two naming dialogs. */
type NameDialog = { kind: 'create' } | { kind: 'rename'; deck: DeckWithCards } | null;

/** True for a keystroke aimed at a field — the page's Escape leaves those alone. */
const inEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]');

export function SkyView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seed = useSkySeed();
  const {
    decks,
    sources,
    loading,
    error,
    hideDeck,
    unhideDeck,
    hideCard,
    unhideCard,
    addDeck,
    renameDeck,
    addCard,
  } = useSkyDecks();
  const { total: dueTotal, byDeck, loading: dueLoading } = useDeckDueCounts();
  const {
    decks: deckSummaries,
    createDeck: providerCreateDeck,
    updateDeck: providerUpdateDeck,
    deleteDeck: providerDeleteDeck,
    bumpCardCount,
  } = useDecks();

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
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

  // A list row names a card in some deck. If that deck is already open the
  // ring is immediate; otherwise the selection waits for the camera flight to
  // land (onSettled), so the star is ringed in a sky that is actually showing
  // stars. Kept as a ref pairing the deck it was meant for — a flight
  // interrupted into somewhere else discards it.
  const pendingRef = useRef<{ deckKey: string; cardId: string } | null>(null);

  const focusAndSelect = useCallback(
    (deckKey: string, cardId: string) => {
      if (!decks?.some((d) => d.id === deckKey)) return; // e.g. a row for a deck deleted meanwhile
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

  /* ---------- one level up: dialog → card → deck. Escape is its keyboard. ---------- */

  const back = useCallback(() => {
    if (confirm !== null) setConfirm(null);
    else if (nameDialog !== null) setNameDialog(null);
    else if (selectedCardId !== null) selectCard(null);
    else if (focusedDeckKey !== null) focusDeck(null);
  }, [confirm, nameDialog, selectedCardId, focusedDeckKey, selectCard, focusDeck]);

  // through a ref, so the listener attaches once and still reads the current tier
  const backRef = useRef(back);
  useEffect(() => {
    backRef.current = back;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A field owns its own Escape (the search pill clears); the tier walk
      // only answers a key pressed on the page itself.
      if (e.key === 'Escape' && !inEditable(e.target)) backRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- reader → pending-card hand-off ---------- */

  const [pendingCardFlow, setPendingCardFlow] = useState<PendingCardFlow>(null);
  const { pendingCard, setPendingCard } = useReaderState();

  // Guard against replaying the seed (Strict Mode double-invocation, remount
  // ordering): stash the last-handled object identity so the flow is seeded
  // once per hand-off. The pending-fields idiom this app uses. setState
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
      // The new (empty) deck earns its frame now, even if the card is cancelled.
      addDeck(deck);
      setPendingCardFlow((prev) =>
        prev ? { ...prev, phase: 'create-card', deckId: deck.id } : prev,
      );
    },
    [providerCreateDeck, addDeck],
  );

  const submitPendingCard = useCallback(
    async (draft: CardDraft) => {
      const flow = pendingCardFlow;
      if (flow?.phase !== 'create-card') return;
      // The draft goes over whole; `back` is derived here and only here, by the
      // one helper that knows the format (`cardBack`). The column is still
      // written because mobile and every legacy read site still expect it.
      const created = await api.createCard(flow.deckId, { ...draft, back: cardBack(draft) });
      bumpCardCount(flow.deckId, +1);
      // Into the inventory before focusing: the new star has to be in the data
      // before the URL names its deck, or the focus degrades to the outer view.
      // The server's own row, projected the way the endpoint would have.
      addCard(flow.deckId, toSkyCard(created));
      setPendingCardFlow(null);
      router.push(urlFor(flow.deckId, null), { scroll: false });
    },
    [pendingCardFlow, bumpCardCount, addCard, router],
  );

  /* ---------- the ⋯ menu: create / rename / delete, through the provider + the sky's patches ---------- */

  const deckCount = deckSummaries?.length ?? decks?.length ?? 0;

  const onMenu = useCallback(
    (action: DeckMenuAction) => {
      if (action === 'create') setNameDialog({ kind: 'create' });
      else if (focusedDeck === null) return; // rename/delete are a focused deck's
      else if (action === 'rename') setNameDialog({ kind: 'rename', deck: focusedDeck });
      else
        setConfirm({
          kind: 'deck',
          id: focusedDeck.id,
          name: focusedDeck.name,
          cardCount: focusedDeck.cards.length,
        });
    },
    [focusedDeck],
  );

  const createDeck = useCallback(
    async (name: string) => {
      addDeck(await providerCreateDeck({ name }));
    },
    [providerCreateDeck, addDeck],
  );

  const renameFocusedDeck = useCallback(
    async (id: string, name: string) => {
      await providerUpdateDeck(id, { name });
      renameDeck(id, name);
    },
    [providerUpdateDeck, renameDeck],
  );

  const runConfirm = useCallback(() => {
    if (confirm === null) return;
    setConfirm(null);
    if (confirm.kind === 'deck') {
      const { id } = confirm;
      hideDeck(id); // the frame goes now; a failed request brings it honestly back
      focusDeck(null); // the focused tier no longer exists — leave before the data does
      void providerDeleteDeck(id).catch(() => unhideDeck(id));
    } else {
      const { card, deckId } = confirm;
      hideCard(card.id);
      if (selectedCardId === card.id) selectCard(null);
      void api
        .deleteCard(card.id)
        .then(() => bumpCardCount(deckId, -1))
        .catch(() => unhideCard(card.id));
    }
  }, [
    confirm,
    hideDeck,
    unhideDeck,
    hideCard,
    unhideCard,
    focusDeck,
    selectCard,
    selectedCardId,
    providerDeleteDeck,
    bumpCardCount,
  ]);

  /* ---------- the figures: frames, header, list — counted off data in hand ---------- */

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
        // light under every theme, as the field is.
        coverInk: 'var(--night-ink)',
        coverGlyph: kamon,
        ...(started ? { subtitle: `STARTED ${started.toUpperCase()}` } : {}),
        // card/mastered counts deliberately omitted: SkyMap derives them from
        // the same cards array this page feeds it, so they cannot disagree.
      });
    }
    return map;
  }, [decks, byDeck, dueLoading]);

  const insets = focusedDeckKey === null ? SKY_INSETS : deckInsets(selectedCardId !== null);

  // The header's due figure for its scope: every deck's, or the focused deck's.
  const dueInScope = focusedDeckKey === null ? dueTotal : (byDeck[focusedDeckKey] ?? 0);
  const due = dueLoading ? null : dueInScope;

  const starCount = useMemo(() => {
    if (!decks) return null;
    if (focusedDeck) return focusedDeck.cards.length;
    return decks.reduce((n, d) => n + d.cards.length, 0);
  }, [decks, focusedDeck]);

  // The list's scope: this deck's cards as the endpoint ordered them, or every
  // card across decks merged newest first (each deck arrives newest first).
  const listCards = useMemo<ListCard[]>(() => {
    if (!decks) return [];
    if (focusedDeck) {
      return focusedDeck.cards.map((card) => ({ card, deckKey: focusedDeck.id, deckName: focusedDeck.name }));
    }
    return decks
      .flatMap((d) => d.cards.map((card) => ({ card, deckKey: d.id, deckName: d.name })))
      .sort((a, b) => (Date.parse(b.card.created_at) || 0) - (Date.parse(a.card.created_at) || 0));
  }, [decks, focusedDeck]);

  /* ---------- render: the field beside the list column; dialogs portal over both ---------- */

  const focused = focusedDeck !== null;

  return (
    <div className="flex min-h-0 flex-1 gap-5 pt-6 pb-8 font-[family-name:var(--face-ui)]">
      {/* ── the Sky field: night under every theme, the map filling it edge to
             edge, sized by the viewport so opening a deck or a card never
             moves the page ── */}
      <section
        aria-label={focused ? `${focusedDeck.name} — constellation` : 'Your sky'}
        className="relative min-w-0 flex-1 overflow-hidden rounded-(--radius-hero) border border-(--field-bd) shadow-[0_30px_60px_rgb(var(--line-rgb)/0.25)]"
        style={{ background: focused ? FIELD_BG_DECK : FIELD_BG_SKY }}
      >
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

          {(loading || (sources && sources.length === 0)) && (
            <p className="absolute inset-0 m-0 flex items-center justify-center px-8 text-center font-[family-name:var(--face-mono)] text-[11px] tracking-[0.1em] uppercase text-[rgb(var(--night-ink-rgb)/0.5)]">
              {loading
                ? 'Loading your sky…'
                : 'Your sky is empty — save words from the reader and each one becomes a star.'}
            </p>
          )}
        </div>

        {error && (
          <p
            role="status"
            className={cn(
              PANE,
              'absolute top-[92px] left-1/2 z-40 m-0 -translate-x-1/2 rounded-full px-4 py-2.5 text-[13px] font-medium whitespace-nowrap text-(--ink)',
            )}
          >
            Couldn&rsquo;t load your sky — {error}
          </p>
        )}

        <FieldHeader
          deck={focusedDeck}
          deckCount={deckCount}
          starCount={starCount}
          due={due}
          atDeckQuota={deckCount >= MAX_DECKS}
          onBack={() => focusDeck(null)}
          onStudyAhead={() => setPractising(true)}
          onMenu={onMenu}
        />

        {focusedDeck && selectedCard && (
          <Inspector
            card={selectedCard}
            onClose={() => selectCard(null)}
            onRequestDelete={() => setConfirm({ kind: 'card', card: selectedCard, deckId: focusedDeck.id })}
          />
        )}
      </section>

      <CardsSection
        cards={listCards}
        scope={focused ? 'deck' : 'sky'}
        loading={loading && !decks}
        selectedCardId={selectedCardId}
        onSelect={focusAndSelect}
      />

      {/* Practice, over everything. Unmounted when closed, so re-opening
          reshuffles rather than resuming a half-finished queue. **Scoped to
          whatever the button that opened it was scoped to**: the focused deck
          when you are standing in one, every deck out on the sky. Both
          triggers set the same `practising` flag, so the scope is read off the
          focus rather than carried by the trigger — one source of truth for
          "which deck am I in", which is the URL. */}
      <PracticeOverlay
        open={practising}
        deckId={focusedDeck?.id ?? null}
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

      {nameDialog !== null &&
        (nameDialog.kind === 'create' ? (
          <DeckNameModal mode="create" onSubmit={createDeck} onClose={() => setNameDialog(null)} />
        ) : (
          <DeckNameModal
            mode="rename"
            initialName={nameDialog.deck.name}
            onSubmit={(name) => renameFocusedDeck(nameDialog.deck.id, name)}
            onClose={() => setNameDialog(null)}
          />
        ))}

      {confirm !== null &&
        (confirm.kind === 'deck' ? (
          <ConfirmDialog
            title={`Delete “${confirm.name}”?`}
            body={`This deletes the deck and all ${confirm.cardCount.toLocaleString()} ${
              confirm.cardCount === 1 ? 'card' : 'cards'
            } in it — its constellation leaves your sky. There is no undo.`}
            confirmLabel="Delete deck"
            onConfirm={runConfirm}
            onCancel={() => setConfirm(null)}
          />
        ) : (
          <ConfirmDialog
            title={`Delete “${confirm.card.front}”?`}
            body="This removes the card and its star. There is no undo."
            confirmLabel="Delete card"
            onConfirm={runConfirm}
            onCancel={() => setConfirm(null)}
          />
        ))}
    </div>
  );
}
