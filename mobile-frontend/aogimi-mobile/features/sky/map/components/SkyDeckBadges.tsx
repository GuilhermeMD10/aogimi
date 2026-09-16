import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { usePalette } from '@/theme/ThemeContext';
import { radius, type, type Palette } from '@/theme/tokens';
import type { SkyCameraController } from '../hooks/useSkyCamera';
import type { SkyDeckSource } from '../lib/buildSky';
import type { SkyLayout } from '../lib/layout';
import type { Bounds } from '../lib/types';
import type { SkyFrameMeta } from './SkyMap';

/**
 * **The due badge on each constellation** — the first piece of the RN overlay the card frames were
 * always going to be (see `SkyCanvas`'s header). One chip per deck, pinned to the top-right corner
 * of the deck's star box, showing how many of its cards are due.
 *
 * ── It rides the live camera ─────────────────────────────────────────────────────────────────────
 * The outer tier is locked, so the badges could be placed once — but the flight *out* of a deck
 * starts with the camera deep inside it and ends fitted, and a badge parked at its final position
 * would sit still while the stars slid under it. So each badge's position is an animated style off
 * the same shared values the canvas's own transform reads: world → screen is
 * `viewport/2 + (world − cam) × zoom`, the inverse of `toWorldLive`. Nothing here re-renders during
 * a pan or a flight.
 *
 * Inert (`pointerEvents="none"`): a tap on the badge is a tap on the deck, which the canvas already
 * answers.
 *
 * `null` (the host has no figure yet) and `0` both draw nothing. A dashed "loading" pill was the
 * web's answer; here a count that is not known for a few hundred milliseconds is better absent than
 * announced, and a zero is noise on a chooser whose whole point is *where is the work*.
 */
export function SkyDeckBadges({
  layout,
  cam,
  decks,
  frameMeta,
  visible,
}: {
  layout: SkyLayout;
  cam: SkyCameraController;
  /** did → deck uuid, by index — the same mapping `SkyMap` builds `didByKey` from. */
  decks: SkyDeckSource[];
  frameMeta: ReadonlyMap<string, SkyFrameMeta>;
  /** False inside a focused deck; the badges unmount rather than fade, matching the frames. */
  visible: boolean;
}) {
  const p = usePalette();
  const s = useStyles(p);
  if (!visible || !cam.measured) return null;

  const out: React.ReactNode[] = [];
  for (const [did, place] of layout.places) {
    const key = decks[did]?.key;
    const due = key === undefined ? null : (frameMeta.get(key)?.dueCount ?? null);
    if (due === null || due <= 0) continue;
    out.push(<Badge key={did} box={place.box} due={due} cam={cam} styles={s} />);
  }
  if (out.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {out}
    </View>
  );
}

/** DESIGN.md's due badge: a 20pt circle for one or two digits, a 6px-radius chip beyond. */
const BADGE = 20;

const Badge = memo(function Badge({
  box,
  due,
  cam,
  styles,
}: {
  box: Bounds;
  due: number;
  cam: SkyCameraController;
  styles: ReturnType<typeof useStyles>;
}) {
  const { camX, camY, camZoom, viewport } = cam;
  const wide = due >= 100;
  // Centred on the corner, so the chip overhangs the box the way a notification badge overhangs an
  // icon — half in, half out.
  const position = useAnimatedStyle(() => ({
    transform: [
      { translateX: viewport.width / 2 + (box.maxX - camX.value) * camZoom.value - BADGE / 2 },
      { translateY: viewport.height / 2 + (box.minY - camY.value) * camZoom.value - BADGE / 2 },
    ],
  }));
  return (
    <Animated.View style={[styles.badge, wide && styles.badgeWide, position]}>
      <Text style={styles.label} allowFontScaling={false}>
        {due.toLocaleString()}
      </Text>
    </Animated.View>
  );
});

function useStyles(p: Palette) {
  return useMemo(
    () =>
      StyleSheet.create({
        badge: {
          position: 'absolute',
          left: 0,
          top: 0,
          minWidth: BADGE,
          height: BADGE,
          borderRadius: BADGE / 2,
          paddingHorizontal: 5,
          backgroundColor: p.accentDeep,
          alignItems: 'center',
          justifyContent: 'center',
        },
        badgeWide: { borderRadius: radius.chip },
        label: {
          ...type.eyebrow,
          fontFamily: type.headlineMd.fontFamily,
          fontWeight: '700',
          letterSpacing: 0,
          color: p.btnInk,
          fontVariant: ['tabular-nums'],
        },
      }),
    [p],
  );
}
