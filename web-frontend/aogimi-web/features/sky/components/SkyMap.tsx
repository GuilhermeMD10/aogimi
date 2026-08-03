'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

// By file path, not through the app-shell barrel: the provider imports `lib/palette` from this
// feature, and going via barrels either way would close a module cycle.
import { useSkyHue } from '@/features/app-shell/providers/SkyHueProvider';

import { useCamera } from '../hooks/useCamera';
import { useSkyDraw, useSkyStage } from '../hooks/useSkyFrame';
import { buildSky, todayBucket, type SkyDeckSource } from '../lib/buildSky';
import { openConstellationOf } from '../lib/generator';
import type { FocusPath, Star } from '../lib/types';
import { SkyCanvas } from './SkyCanvas';

/**
 * The whole sky — every deck at once, as the /sky page draws it. The production sibling of the
 * demo harness in `Sky.tsx`, and of `DeckSky`, whose one deck this map renders at identical
 * positions when it focuses it (placement is keyed on (seed, deck uuid, card uuid); the
 * render-local `did` here is layout only).
 *
 * Two tiers, both already in the lib (`tiers.ts`): the outer view is a locked chooser — every
 * deck a soft form under the star budget, a tap picks one — and a focused deck is the honest
 * zoom-crossfade interior `DeckSky` shows. What this component adds over the demo is the seam to
 * a host that speaks uuids: focus and selection arrive as (deck uuid, card uuid) props and leave
 * through the same vocabulary, so the host can keep them in the URL without ever storing a
 * render-local index.
 *
 * Moving between tiers is a camera flight (`flyTo`), not a jump: entering a deck dives from the
 * chooser into the interior crossfade, leaving pulls back out. `onSettled` fires when a flight
 * genuinely lands — the host uses it to sequence "focus this deck, then ring that star" behind
 * the camera actually arriving. Escape and any other keyboard chrome are the host's; this
 * component owns only the canvas and its gestures (wheel-out past a focused deck's fit leaves it).
 */

/** Module consts: the frame cache and the canvas compare `focus` by identity. */
const OUTER: FocusPath = [];
const noop = () => {};

type Props = {
  /** `users.sky_seed` — see useSkySeed. */
  seed: string;
  /** Referentially stable (useSkyDecks memoises it): the ~1–26ms-per-deck regeneration below
   *  reruns on data changes only, never per render. Order decides layout, never placement. */
  decks: SkyDeckSource[];
  /** The focused deck's uuid, or null at the outer chooser. */
  focusedDeckKey: string | null;
  /** The ringed card's uuid — meaningful only inside the focused deck. */
  selectedCardId: string | null;
  onFocusDeck: (deckKey: string | null) => void;
  onSelectCard: (cardId: string | null) => void;
  /** The flight into (or out of) the current focus has landed. */
  onSettled?: () => void;
};

export function SkyMap({
  seed,
  decks,
  focusedDeckKey,
  selectedCardId,
  onFocusDeck,
  onSelectCard,
  onSettled,
}: Props) {
  const { palette } = useSkyHue();
  // `today` read inside the memo on purpose: a rebuild just after midnight opens a fresh day
  const snapshot = useMemo(() => buildSky({ seed, today: todayBucket(), decks }), [seed, decks]);

  // deck uuid ↔ render-local did. The array index *is* the did — buildSky feeds decks in order.
  const didByKey = useMemo(() => new Map(decks.map((d, i) => [d.key, i])), [decks]);
  const focusedDid = focusedDeckKey === null ? null : (didByKey.get(focusedDeckKey) ?? null);
  const focus = useMemo<FocusPath>(() => (focusedDid === null ? OUTER : [focusedDid]), [focusedDid]);

  const stage = useSkyStage(snapshot, focus, palette.ranks);

  // the outer view is a chooser, so it is immobile; inside a single deck the boundary is the
  // container itself (fillViewport) — both exactly as the demo and DeckSky establish them
  const locked = focusedDid === null;
  const singleDeck = focusedDid !== null || snapshot.decks.length <= 1;
  const leave = useCallback(() => onFocusDeck(null), [onFocusDeck]);
  const cam = useCamera(stage.bounds, {
    locked,
    fillViewport: singleDeck,
    // wheel-out resting at a focused deck's fit means "leave" — the same motion that got you
    // around inside it. At the outer view there is nothing above to escape to.
    onZoomOutFloor: focusedDid !== null ? leave : undefined,
  });

  const frame = useSkyDraw(stage, focus, cam.camera, cam.view);

  /* ---------- the flight between tiers ---------- */

  // through a ref, so a host re-rendering with a fresh callback doesn't restart anything
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  // A layout effect, so the flight's departure pose is committed before this frame paints —
  // otherwise the first painted frame after a focus change is the destination's fit, and the
  // flight appears to jump there and fly back. Skipped on mount: a deep link into a deck should
  // open already inside it, not replay the approach.
  const { flyTo } = cam;
  const prevFocusRef = useRef(focusedDid);
  useLayoutEffect(() => {
    if (prevFocusRef.current === focusedDid) return;
    prevFocusRef.current = focusedDid;
    flyTo('fit', () => onSettledRef.current?.());
  }, [focusedDid, flyTo]);

  /* ---------- uuid ↔ star id, both directions of the shared selection ---------- */

  const selectedStarId = useMemo(() => {
    if (selectedCardId === null || focusedDid === null) return null;
    return snapshot.stars.find((s) => s.did === focusedDid && s.key === selectedCardId)?.id ?? null;
  }, [snapshot, focusedDid, selectedCardId]);

  // the reach ring around the focused deck's still-open day, if it has one
  const openTip = useMemo(() => {
    if (focusedDid === null) return null;
    const open = openConstellationOf(snapshot.constellations, focusedDid);
    if (!open?.starIds.length) return null;
    const tipId = open.starIds[open.starIds.length - 1];
    return snapshot.stars.find((s) => s.id === tipId) ?? null;
  }, [snapshot, focusedDid]);

  const enterDeck = useCallback(
    (did: number) => {
      const key = decks[did]?.key; // index is did by construction, see didByKey
      if (key !== undefined) onFocusDeck(key);
    },
    [decks, onFocusDeck],
  );
  const starClick = useCallback((star: Star) => onSelectCard(star.key), [onSelectCard]);
  const miss = useCallback(() => onSelectCard(null), [onSelectCard]);

  return (
    <SkyCanvas
      frame={frame}
      layout={stage.layout}
      palette={palette}
      bounds={cam.bounds}
      focus={focus}
      tinted={false}
      cam={cam}
      selected={selectedStarId}
      openTip={openTip}
      onEnterDeck={enterDeck}
      onStarClick={starClick}
      onMiss={miss}
      // a replayed sky is history, not news — buildSky marks everything seen, nothing pops
      onSeen={noop}
    />
  );
}
