'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

// By file path, not through the app-shell barrel: the provider imports `lib/palette` from this
// feature, and going via barrels either way would close a module cycle.
import { useSkyHue } from '@/features/app-shell/providers/SkyHueProvider';

import { useCamera } from '../hooks/useCamera';
import { useSkyDraw, useSkyStage } from '../hooks/useSkyFrame';
import { buildSky, todayBucket, type SkyDeckSource } from '../lib/buildSky';
import { openConstellationOf } from '../lib/generator';
import type { FocusPath, Insets, Star } from '../lib/types';
import { SkyCanvas } from './SkyCanvas';
import { type DeckFrameData, FALLBACK_COVER } from './SkyFrames';

/**
 * The whole sky — every deck at once, as the /decks stage draws it. The production sibling of
 * the demo harness in `Sky.tsx`. Placement is keyed on (seed, deck uuid, card uuid); the
 * render-local `did` here is layout only.
 *
 * Two tiers, both already in the lib (`tiers.ts`): the outer view is a locked chooser — every
 * deck a soft form under the star budget, wearing its card frame on the grid, a tap picks one —
 * and a focused deck is the honest zoom-crossfade interior. What this component adds over the
 * demo is the seam to
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

/**
 * Per-deck display data for the outer view's card frames — everything a frame shows that the
 * engine cannot derive from the cards it was fed. Keyed by deck uuid on the `frameMeta` prop.
 * A missing map, entry or field degrades rather than errors: counts fall back to the deck's own
 * cards, the cover to a neutral tile lettered with the deck name's first character, the due pill
 * to a dash. The deck's *name* is not here on purpose — `SkyDeckSource` already carries it.
 */
export type SkyFrameMeta = {
  /** null draws the pill dashed — "the host has no figure", which is not the same as 0. */
  dueCount: number | null;
  /** The cover tile, as the decks feature paints it: fill, glyph ink, and the glyph itself. */
  coverColor: string;
  coverInk: string;
  coverGlyph: string;
  /** The mono line under the deck name. Omitted → the line is simply not drawn. */
  subtitle?: string;
  /** Overrides for the counts otherwise derived from the deck's cards — for a host whose
   *  authoritative figures differ from what it fed the sky. */
  cardCount?: number;
  masteredCount?: number;
};

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
  /** Frame display data by deck uuid — see SkyFrameMeta. The frames render without it. */
  frameMeta?: ReadonlyMap<string, SkyFrameMeta>;
  /**
   * How much of each viewport edge the host's overlays cover, in CSS px — the glass column, the
   * ledger, the title chrome. Applied to every camera fit and clamp at either tier; compared by
   * value, and a change re-fits the camera as a flight (the panel-toggle behaviour), so the host
   * simply states the current chrome and the sky settles into what is left.
   */
  insets?: Insets;
};

export function SkyMap({
  seed,
  decks,
  focusedDeckKey,
  selectedCardId,
  onFocusDeck,
  onSelectCard,
  onSettled,
  frameMeta,
  insets,
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
  // container itself (fillViewport) — both exactly as the demo establishes them
  const locked = focusedDid === null;
  const singleDeck = focusedDid !== null || snapshot.decks.length <= 1;
  const leave = useCallback(() => onFocusDeck(null), [onFocusDeck]);
  const cam = useCamera(stage.bounds, {
    locked,
    fillViewport: singleDeck,
    // wheel-out resting at a focused deck's fit means "leave" — the same motion that got you
    // around inside it. At the outer view there is nothing above to escape to.
    onZoomOutFloor: focusedDid !== null ? leave : undefined,
    insets,
    // inside a deck the ceiling adapts to its spread, so a sparse deck can fill the view; the
    // outer chooser keeps the constant cap (moot while locked, but stated for the flight out)
    adaptiveMaxZoom: focusedDid !== null,
  });

  const frame = useSkyDraw(stage, focus, cam.camera, cam.view);

  // The outer view's card frames: the layout's boxes joined to each deck's display data. Memoised
  // like the snapshot is — the canvas gates them to the outer tier, and SkyFrames is a memo, so a
  // stable array here keeps the whole layer out of the per-frame work.
  const frames = useMemo<DeckFrameData[]>(() => {
    const out: DeckFrameData[] = [];
    decks.forEach((deck, did) => {
      const place = stage.layout.places.get(did);
      if (!place) return; // a deck with no placeable cards has no box, so no frame
      const meta = frameMeta?.get(deck.key);
      let mastered = 0;
      for (const c of deck.cards) if (c.mastery >= 3) mastered++;
      out.push({
        did,
        frame: place.frame,
        name: deck.name,
        cardCount: meta?.cardCount ?? deck.cards.length,
        masteredCount: meta?.masteredCount ?? mastered,
        dueCount: meta?.dueCount ?? null,
        coverColor: meta?.coverColor ?? FALLBACK_COVER.color,
        coverInk: meta?.coverInk ?? FALLBACK_COVER.ink,
        // spread, not charAt: the glyph may be an astral-plane character
        coverGlyph: meta?.coverGlyph ?? [...deck.name][0] ?? '·',
        subtitle: meta?.subtitle ?? null,
      });
    });
    return out;
  }, [decks, frameMeta, stage.layout]);

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
      frames={frames}
      onEnterDeck={enterDeck}
      onStarClick={starClick}
      onMiss={miss}
      // a replayed sky is history, not news — buildSky marks everything seen, nothing pops
      onSeen={noop}
    />
  );
}
