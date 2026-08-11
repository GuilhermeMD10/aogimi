import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useCamera } from '../hooks/useCamera';
import { useSkyDraw, useSkyStage } from '../hooks/useSkyFrame';
import { buildSky, todayBucket, type SkyDeckSource } from '../lib/buildSky';
import { fitZoom } from '../lib/camera';
import { openConstellationOf } from '../lib/generator';
import { framedAt } from '../lib/layout';
import { DEFAULT_SKY_HUE, SKY_PALETTES, type SkyHue } from '../lib/palette';
import type { FocusPath, Insets, Star } from '../lib/types';
import { SkyCanvas } from './SkyCanvas';
import { type DeckFrameData, FALLBACK_COVER } from './SkyFrames';

/**
 * The whole sky — every deck at once. The native port of the web's `SkyMap.tsx`, and the only
 * component a host needs: hand it a seed and card rows and it draws.
 *
 * Two tiers, both already in the lib (`tiers.ts`): the outer view is a locked chooser — every deck a
 * soft form under the star budget, wearing its card frame on the grid, a tap picks one — and a
 * focused deck is the honest zoom-crossfade interior. Focus and selection arrive as (deck uuid, card
 * uuid) props and leave through the same vocabulary, so the host can keep them in its own navigation
 * state without ever storing a render-local index.
 *
 * Moving between tiers is a camera flight (`flyTo`), not a jump. `onSettled` fires when a flight
 * genuinely lands — a host uses it to sequence "focus this deck, then ring that star" behind the
 * camera actually arriving.
 *
 * ── The one structural difference from the web copy ──────────────────────────────────────────────
 * The web reads its hue preset from `useSkyHue()` (an app-shell provider that also stamps
 * `html[data-sky-hue]` so the CSS mastery chrome can follow the sky). Mobile has no such provider
 * yet, so the preset is a **prop** defaulting to `DEFAULT_SKY_HUE`. That is the smaller seam and it
 * points the right way: when a picker lands it passes a `hue` down, and nothing here changes.
 *
 * The web's `useLayoutEffect` for the flight's departure pose is a plain `useEffect` here — RN has no
 * pre-paint commit hook with the same meaning, and `flyTo` commits the departure pose synchronously
 * regardless.
 */

/** Module consts: the frame cache and the canvas compare `focus` by identity. */
const OUTER: FocusPath = [];

/**
 * Per-deck display data for the outer view's card frames — everything a frame shows that the engine
 * cannot derive from the cards it was fed. Keyed by deck uuid. A missing map, entry or field degrades
 * rather than errors. The deck's *name* is not here on purpose — `SkyDeckSource` already carries it.
 */
export type SkyFrameMeta = {
  /** null draws the pill dashed — "the host has no figure", which is not the same as 0. */
  dueCount: number | null;
  /** The cover tile, as the stage paints it: fill, glyph ink, and the glyph itself. */
  coverColor: string;
  coverInk: string;
  coverGlyph: string;
  /** The mono line under the deck name. Omitted → the line is simply not drawn. */
  subtitle?: string;
  /** Overrides for the counts otherwise derived from the deck's cards. */
  cardCount?: number;
  masteredCount?: number;
};

type Props = {
  /** `users.sky_seed`. */
  seed: string;
  /** Referentially stable: the per-deck regeneration below reruns on data changes only, never per
   *  render. Order decides layout, never placement. */
  decks: SkyDeckSource[];
  /** The focused deck's uuid, or null at the outer chooser. */
  focusedDeckKey: string | null;
  /** The ringed card's uuid — meaningful only inside the focused deck. */
  selectedCardId: string | null;
  onFocusDeck: (deckKey: string | null) => void;
  onSelectCard: (cardId: string | null) => void;
  /** The flight into (or out of) the current focus has landed. */
  onSettled?: () => void;
  /** Frame display data by deck uuid. The frames render without it. */
  frameMeta?: ReadonlyMap<string, SkyFrameMeta>;
  /** How much of each viewport edge the host's overlays cover, in px. Applied to every camera fit
   *  and clamp; compared by value, and a change re-fits the camera as a flight. */
  insets?: Insets;
  /** The mastery hue preset. See the note above on why this is a prop here and a provider on web. */
  hue?: SkyHue;
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
  hue = DEFAULT_SKY_HUE,
}: Props) {
  const palette = SKY_PALETTES[hue];
  // `today` read inside the memo on purpose: a rebuild just after midnight opens a fresh day
  const snapshot = useMemo(() => buildSky({ seed, today: todayBucket(), decks }), [seed, decks]);

  // deck uuid ↔ render-local did. The array index *is* the did — buildSky feeds decks in order.
  const didByKey = useMemo(() => new Map(decks.map((d, i) => [d.key, i])), [decks]);
  const focusedDid = focusedDeckKey === null ? null : (didByKey.get(focusedDeckKey) ?? null);
  const focus = useMemo<FocusPath>(() => (focusedDid === null ? OUTER : [focusedDid]), [focusedDid]);

  const stage = useSkyStage(snapshot, focus, palette.ranks);

  // the outer view is a chooser, so it is immobile; inside a single deck the boundary is the
  // container itself (fillViewport)
  const locked = focusedDid === null;
  const singleDeck = focusedDid !== null || snapshot.decks.length <= 1;
  const leave = useCallback(() => onFocusDeck(null), [onFocusDeck]);
  const cam = useCamera(stage.bounds, {
    locked,
    fillViewport: singleDeck,
    // pinching out past a focused deck's fit means "leave" — the same motion that got you around
    // inside it. At the outer view there is nothing above to escape to.
    onZoomOutFloor: focusedDid !== null ? leave : undefined,
    insets,
    // inside a deck both zoom limits adapt to its spread, so a sparse deck rests filling the view
    adaptiveZoomLimits: focusedDid !== null,
  });

  const frame = useSkyDraw(stage, focus, cam.camera, cam.view);

  /**
   * Frame LOD — derived during render, no state and no effect. That is only possible because the
   * layout ignores the mode: `stage.layout` and its fit are the same whichever way this resolves, so
   * reading the measured viewport here creates no cycle. Always framed inside a deck, where no frames
   * are drawn at all and the question is moot.
   */
  const framed =
    focusedDid !== null || framedAt(stage.layout, fitZoom(stage.layout.bounds, cam.viewport, insets));

  // The outer view's card frames: the layout's boxes joined to each deck's display data. Memoised
  // like the snapshot is — SkyFrames is a memo, so a stable array keeps the whole layer out of the
  // per-frame work.
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

  // Skipped on mount: a deep link into a deck should open already inside it, not replay the approach.
  const { flyTo } = cam;
  const prevFocusRef = useRef(focusedDid);
  useEffect(() => {
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
      focus={focus}
      cam={cam}
      selected={selectedStarId}
      openTip={openTip}
      frames={frames}
      framed={framed}
      onEnterDeck={enterDeck}
      onStarClick={starClick}
      onMiss={miss}
    />
  );
}
