'use client';
import { useMemo } from 'react';

import { useCamera } from '../hooks/useCamera';
import { useSkyDraw, useSkyStage } from '../hooks/useSkyFrame';
import { buildSky, todayBucket, type SkyCard } from '../lib/buildSky';
import { openTipOf } from '../lib/generator';
import type { FocusPath, Star } from '../lib/types';
import { SkyCanvas } from './SkyCanvas';

/**
 * One deck's sky, locked to that deck — the star map inside deck details.
 *
 * The lock is structural, not a disabled control: the generator is fed only this deck's cards,
 * `focus` is pinned to it, and the camera's bounds are the deck's own box grown to the container's
 * aspect. Wheel-out comes to rest at the fitted view (no `onZoomOutFloor`, so the floor escapes to
 * nothing), the outer chooser is unreachable (`onEnterDeck` can never fire while a deck is
 * focused), and pan is confined to the deck. Because stars live in deck-local coordinates and the
 * placement stream is keyed on the deck's uuid, every position here is identical to what the full
 * map will draw for this deck when it focuses it.
 *
 * Selection is the host's, by card uuid — the same `selectedCardId` the card panel beside this
 * component reads, so a star click and a list-row click are one act arriving by different fingers.
 * `Star.key` carries the uuid back out; the maps below translate in both directions.
 *
 * Rebuilds only when the inputs change: `cards` is referentially stable in the deck page's state,
 * so the ~1–26ms regenerate runs on mount and on add/delete, never per render. `today` is read
 * inside the memo on purpose — a card added just after midnight recomputes it, so the new card
 * opens a fresh day instead of growing yesterday's.
 */

const DECK_FOCUS: FocusPath = [0]; // module const: the frame cache compares focus by identity
const noop = () => {};

type Props = {
  /** `users.sky_seed` — see useSkySeed. */
  seed: string;
  /** The deck's uuid. Placement identity; `did` 0 is only this page's render-local index. */
  deckKey: string;
  deckName: string;
  cards: SkyCard[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string | null) => void;
};

export function DeckSky({ seed, deckKey, deckName, cards, selectedCardId, onSelectCard }: Props) {
  const snapshot = useMemo(
    () => buildSky({ seed, today: todayBucket(), decks: [{ key: deckKey, name: deckName, cards }] }),
    [seed, deckKey, deckName, cards],
  );

  const stage = useSkyStage(snapshot, DECK_FOCUS);
  const cam = useCamera(stage.bounds, { fillViewport: true });
  const frame = useSkyDraw(stage, DECK_FOCUS, cam.camera, cam.view);

  // card uuid ↔ star id, both directions of the shared selection
  const selectedStarId = useMemo(
    () => (selectedCardId === null ? null : (snapshot.stars.find((s) => s.key === selectedCardId)?.id ?? null)),
    [snapshot, selectedCardId],
  );
  const openTip = useMemo(() => openTipOf(snapshot.stars, snapshot.constellations), [snapshot]);

  return (
    <SkyCanvas
      frame={frame}
      layout={stage.layout}
      bounds={cam.bounds}
      focus={DECK_FOCUS}
      tinted={false}
      cam={cam}
      selected={selectedStarId}
      openTip={openTip}
      onEnterDeck={noop}
      onStarClick={(star: Star) => onSelectCard(star.key)}
      onSeen={noop}
    />
  );
}
