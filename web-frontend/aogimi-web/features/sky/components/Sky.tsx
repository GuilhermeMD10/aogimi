'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fitZoom } from '../lib/camera';
import { openConstellationOf, openTipOf } from '../lib/generator';
import type { FocusPath, Star } from '../lib/types';

import { SkyCanvas } from './SkyCanvas';
import { SkyControls } from './SkyControls';
import { SkyPanel } from './SkyPanel';
import { SkyStats } from './SkyStats';

/** The demo screen's own box. Not a component constant — SkyCanvas fills whatever it is given. */
const DEMO_BOX = { width: 820, height: 520 };
import { useCamera } from '../hooks/useCamera';
import { useSkyDraw, useSkyStage } from '../hooks/useSkyFrame';
import { useSkyGenerator } from '../hooks/useSkyGenerator';

/**
 * Wires the generator, the camera and the views together. Holds no logic of its own — except the
 * one thing that must live above both views: the shared focus/selection state. The panel and the
 * canvas never talk to each other; each reads this state and writes it back through the setters
 * here, and the two invariants live in those setters rather than in either view: a selected star's
 * deck is always the focused deck, and leaving a deck (or entering another) clears the selection.
 */
export default function Sky() {
  const sky = useSkyGenerator();
  // destructured because the container object is fresh every render while the methods inside it
  // are stable — the useCallbacks below must depend on the methods, or they stabilise nothing
  const { snapshot, bumpStar, markSeen, sealNow } = sky;
  const [focus, setFocus] = useState<FocusPath>([]);
  const [selected, setSelected] = useState<number | null>(null); // star id — the open card
  const [hidden, setHidden] = useState(false);
  const [tinted, setTinted] = useState(true);

  // the trees and the deck arrangement, and with them the world box the camera may not leave.
  // Depends on the data and the focus, never on where the camera happens to be pointing.
  const stage = useSkyStage(snapshot, focus);

  // the outer view is a chooser, so it is immobile — every deck is on screen at once by construction
  // and there is nothing a pan could reach. Inside a deck the camera is free within that deck's box.
  const locked = focus.length === 0;
  // leaving is deliberate — the button — rather than a side effect of zooming out: the floor is
  // where the wheel naturally comes to rest, and resting there must not eject the reader
  const leave = useCallback(() => {
    setFocus((f) => (f.length ? [] : f));
    setSelected(null); // the invariant: no focus, no selection
  }, []);
  // inside a single deck — a focused one, or a sky that only has one — the boundary is the
  // container itself: the deck's box is grown to the viewport's aspect, so the fitted view fills
  // the frame edge to edge instead of letterboxing a smaller rectangle inside it
  const singleDeck = focus.length > 0 || snapshot.decks.length <= 1;
  const cam = useCamera(stage.bounds, { locked, fillViewport: singleDeck });

  const frame = useSkyDraw(stage, focus, cam.camera, cam.view, hidden);

  const { fitTo } = cam;
  const enterDeck = useCallback(
    (did: number) => {
      setFocus((f) => (f[0] === did ? f : [did]));
      setSelected((s) => (s === null ? s : null)); // a new deck starts unselected
      fitTo(); // an intent, so it frames the deck the focus is about to become
    },
    [fitTo],
  );

  /**
   * Open a star's card — from the canvas or from the panel's list, the same act. The focus
   * invariant is enforced here rather than trusted to the caller: selecting a star from anywhere
   * enters its deck first, so the selection can never point outside the focused deck.
   */
  const selectStar = useCallback(
    (star: Star) => {
      setFocus((f) => (f[0] === star.did ? f : [star.did]));
      setSelected(star.id);
    },
    [],
  );

  /** One level up, whatever that currently means: card → list, list → all decks. */
  const back = useCallback(() => {
    if (selected !== null) setSelected(null);
    else leave();
  }, [selected, leave]);

  // Escape is the keyboard's back button. Through a ref so the listener is attached once and
  // still reads the current tier, rather than re-subscribing on every selection change.
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

  // whichever deck is being looked at — the one whose open session the stats report on
  const activeDeck = focus.length ? focus[0] : 0;
  const open = openConstellationOf(snapshot.constellations, activeDeck);
  const openTip = openTipOf(snapshot.stars, snapshot.constellations);
  // cards arriving while the sky is closed are the whole point of the feature, so the count of
  // them is what the Show button advertises
  const waiting = useMemo(() => snapshot.stars.reduce((n, s) => n + (s.seen ? 0 : 1), 0), [snapshot.stars]);

  // clicking a star opens its card — reading is not reviewing, so the count moves only when the
  // reader says so, through the card's own button
  const logReview = useCallback((id: number) => bumpStar(id), [bumpStar]);

  /* ---------- what the panel reads, resolved once from the index ---------- */
  const focusedDid = focus.length ? focus[0] : null;
  const focusedStars = useMemo(
    () => (focusedDid === null ? [] : (stage.index.byDeck.get(focusedDid) ?? [])),
    [stage.index, focusedDid],
  );
  // resolved to the live snapshot copy, so the card's review count is current rather than the
  // value the star had when it was clicked
  const selectedStar = selected === null ? null : (stage.index.byId.get(selected) ?? null);

  return (
    <div className="flex flex-col items-center gap-4 font-sans">
      <SkyControls
        onSeal={sealNow}
        canSeal={!!openConstellationOf(snapshot.constellations)}
        focused={!locked}
        onLeave={leave}
        tinted={tinted}
        onTintedChange={setTinted}
        hidden={hidden}
        onHiddenChange={setHidden}
        waiting={waiting}
      />

      <SkyStats
        snapshot={snapshot}
        frame={frame}
        focus={focus}
        zoom={cam.camera.zoom}
        minZoom={fitZoom(cam.bounds, cam.viewport)}
        relZoom={cam.relZoom}
        open={open}
        waiting={waiting}
      />

      {/* The panel and the canvas are siblings over the same state — two views of one navigation,
          never talking to each other.

          The row is what gives them a size: SkyCanvas fills its parent and measures itself, so the
          box lives here, in the screen, rather than inside the component. A host swaps this for
          whatever its own layout says — a flex-1 pane, a fixed panel, the whole viewport. */}
      <div className="flex items-stretch gap-4" style={{ height: DEMO_BOX.height }}>
        <SkyPanel
          decks={snapshot.decks}
          focus={focusedDid}
          stars={focusedStars}
          selected={selectedStar}
          onEnterDeck={enterDeck}
          onSelectStar={selectStar}
          onBack={back}
          onLogReview={logReview}
        />
        <div className="overflow-hidden rounded-lg border border-white/20" style={{ width: DEMO_BOX.width }}>
          <SkyCanvas
            frame={frame}
            layout={stage.layout}
            bounds={cam.bounds}
            focus={focus}
            tinted={tinted}
            cam={cam}
            selected={selected}
            openTip={openTip}
            onEnterDeck={enterDeck}
            onStarClick={selectStar}
            onSeen={markSeen}
          />
        </div>
      </div>

      <p className="text-xs text-white/35">
        {locked
          ? 'click a form — or a deck in the list — to go into it'
          : 'drag to look around · scroll to zoom · click a star to open its card · esc goes up a level'}
      </p>
    </div>
  );
}
