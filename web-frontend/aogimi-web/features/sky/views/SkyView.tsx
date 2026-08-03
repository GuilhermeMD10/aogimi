'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { TopBar } from '@/features/app-shell/TopBar';
import { Skeleton, stageColor } from '@/shared/components';

import { SkyLedger } from '../components/SkyLedger';
import { SkyMap } from '../components/SkyMap';
import { SkyMapPanel } from '../components/SkyMapPanel';
import { SkySearch } from '../components/SkySearch';
import { useSkyDecks } from '../hooks/useSkyDecks';
import { useSkyLedger } from '../hooks/useSkyLedger';
import { useSkySeed } from '../hooks/useSkySeed';

/**
 * `/sky` — the whole sky: every deck a constellation, the deck-details layout with one more
 * panel level. The panel (deck list → word list → word card, ledger footer under all three) and
 * the map are siblings over the same two uuids; neither talks to the other.
 *
 * **The URL is the only navigation state**: `?deck={uuid}` is the focused deck, `&card={uuid}`
 * the ringed star — uuids only, never a render-local index, so a link means the same sky after
 * any reorder. Entering or leaving a deck is a place you can come back to (`push`); selecting a
 * card within one is not (`replace`) — the dictionary's precedent. A deep link opens already
 * inside its deck; only *changes* of focus fly the camera.
 *
 * The two navigation invariants live in the setters here, exactly as the demo harness has them:
 * a selected card's deck is always the focused deck, and changing focus clears the selection
 * (the URL builder simply never emits `card` without `deck`).
 */

export function SkyView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seed = useSkySeed();
  const { decks, sources, loading, error } = useSkyDecks();
  const ledger = useSkyLedger();

  const [panelHidden, setPanelHidden] = useState(false);

  /* ---------- navigation state, read off the URL and validated against the data ---------- */

  const deckParam = searchParams.get('deck');
  const cardParam = searchParams.get('card');

  // a stale or foreign uuid degrades to the outer view rather than erroring
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

  // A search result or ledger row names a card in some deck. If that deck is already open the
  // ring is immediate; otherwise the selection waits for the camera flight to land (onSettled),
  // so the star is ringed in a sky that is actually showing stars. Kept as a ref pairing the
  // deck it was meant for — a flight interrupted into somewhere else discards it.
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

  /* ---------- one level up: card → list, list → all decks. Escape is its keyboard. ---------- */

  const back = useCallback(() => {
    if (selectedCardId !== null) selectCard(null);
    else if (focusedDeckKey !== null) focusDeck(null);
  }, [selectedCardId, focusedDeckKey, selectCard, focusDeck]);

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

  /* ---------- the ledger's client-side figures: counted off the cards already in hand ---------- */

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

  return (
    <div className="h-full w-full overflow-auto font-[family-name:var(--face-ui)] font-medium">
      <div className="mx-auto flex w-full max-w-[1300px] flex-col px-11 pt-[34px] pb-[140px]">
        <TopBar />

        {/* ── Header: the title, the counts, the search ── */}
        <div className="mt-2.5 mb-5 flex flex-wrap items-end justify-between gap-6.5">
          <div className="min-w-0">
            <h1 className="m-0 font-[family-name:var(--face-jp)] text-[31px] leading-[1.1] font-bold text-(--ink)">
              Your sky
            </h1>
            <div className="mt-2.25 font-[family-name:var(--face-mono)] text-[11px] tracking-[0.07em] text-(--muted)">
              {totals && decks ? (
                <>
                  {totals.stars.toLocaleString()} {totals.stars === 1 ? 'star' : 'stars'} ·{' '}
                  {decks.length.toLocaleString()} {decks.length === 1 ? 'deck' : 'decks'}
                  {ledger.days !== null && <> · {ledger.days.toLocaleString()} {ledger.days === 1 ? 'day' : 'days'}</>}
                </>
              ) : (
                <Skeleton className="h-3.5 w-44" />
              )}
            </div>
          </div>

          <div className="w-[320px] max-w-full flex-none">
            {decks && <SkySearch decks={decks} onPick={focusAndSelect} />}
          </div>
        </div>

        {error && (
          <p
            role="status"
            className="mb-5 rounded-(--radius-button) border border-(--paper-bd) bg-(--paper-tile) px-4 py-3 text-[13.5px] text-(--soft)"
          >
            Couldn&rsquo;t load your sky — {error}
          </p>
        )}

        {/* ── Panel + sky: the deck-details row, one panel level deeper. Below 1100px the
            panel drops under the sky at full width. ── */}
        <div className="flex h-[70vh] min-h-[480px] w-full flex-col items-stretch gap-4 max-[1100px]:h-auto max-[1100px]:min-h-0 min-[1101px]:flex-row">
          {!panelHidden && (
            <div className="min-[1101px]:w-[304px] min-[1101px]:shrink-0 max-[1100px]:order-2 max-[1100px]:h-[440px] max-[1100px]:w-full">
              {decks ? (
                <SkyMapPanel
                  decks={decks}
                  focusedDeck={focusedDeck}
                  selectedCard={selectedCard}
                  onEnterDeck={(deckKey) => focusDeck(deckKey)}
                  onSelectCard={selectCard}
                  onBack={back}
                >
                  <SkyLedger
                    title="YOUR LEDGER"
                    tiles={[
                      { label: 'DAYS', value: ledger.days, color: 'var(--ink)' },
                      { label: 'STARS', value: totals?.stars ?? null, color: 'var(--ink)' },
                      { label: 'DUE TODAY', value: ledger.dueToday, color: 'var(--gold)' },
                      {
                        label: 'MASTERED',
                        value: totals?.mastered ?? null,
                        color: stageColor('mastered'),
                      },
                    ]}
                    upgrades={ledger.upgrades}
                    onUpgradeClick={focusAndSelect}
                  />
                </SkyMapPanel>
              ) : (
                <Skeleton className="h-full w-full rounded-(--radius-panel)" />
              )}
            </div>
          )}

          {/* The sky. The div keeps its `--deck-sky` fill as the pre-seed / pre-data
              placeholder, exactly like deck details. */}
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-[20px] border border-(--bd-a) bg-(--deck-sky) shadow-(--deck-sky-shadow) max-[1100px]:order-1 max-[1100px]:h-[52vh] max-[1100px]:min-h-[320px]">
            {seed && sources && sources.length > 0 && (
              <SkyMap
                seed={seed}
                decks={sources}
                focusedDeckKey={focusedDeckKey}
                selectedCardId={selectedCardId}
                onFocusDeck={focusDeck}
                onSelectCard={selectCard}
                onSettled={onSettled}
              />
            )}

            {sources && sources.length === 0 && !loading && (
              // light-on-night like the canvas chrome: the sky container is night in both themes
              <p className="absolute inset-0 m-0 flex items-center justify-center px-8 text-center font-[family-name:var(--face-mono)] text-[11px] tracking-[0.1em] text-white/45">
                Your sky is empty — save words from the reader and each one becomes a star.
              </p>
            )}

            <button
              type="button"
              onClick={() => setPanelHidden((v) => !v)}
              className="absolute top-3 right-3 z-10 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-[family-name:var(--face-mono)] text-[9.5px] tracking-[0.14em] text-white/70 backdrop-blur-[6px] hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {panelHidden ? 'SHOW PANEL' : 'HIDE PANEL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
