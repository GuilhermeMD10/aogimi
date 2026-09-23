import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { usePalette, useTheme, type Palette } from '@/theme';
import { selectionTickFeedback } from '@/lib/haptics';

/** DESIGN.md's progress track, plus the knob the Configs drawer draws on it. */
const TRACK_H = 4;
const KNOB = 20;
/** The row the finger actually gets: a 4pt track is not a target. */
const ROW_H = 44;

/**
 * **A slider over a fixed set of values.**
 *
 * It takes `values` rather than `min`/`max`/`step` because every caller has an
 * enumerated set and not a continuous range: the reader's font sizes are the
 * nine even points from 12 to 28, and its line heights are five hand-picked
 * ratios that are deliberately *not* evenly spaced. A continuous slider would
 * have to be quantised at each call site — twice, with two rounding rules — and
 * could still hand back a number the preference store has no place for. With
 * the set as the domain, the knob has one stop per legal value and the
 * component cannot emit anything else.
 *
 * Visually it is the progress bar with a grip: DESIGN.md's 4pt track, sakura
 * fill with the leading-edge glow, and a 20pt round knob.
 *
 * ── How the drag is read ───────────────────────────────────────────────────
 * The touch lands on this component's own row (the fill and knob are
 * `pointerEvents: none`, so they never become the gesture target), which makes
 * the grant event's `locationX` a position along the track. Every subsequent
 * move is that anchor plus `dx`, which is a page-space delta and therefore
 * immune to which view the finger happens to be over — a knob-relative
 * `locationX` would jump the moment the finger left the knob.
 */
export function Slider({
  values,
  value,
  onChange,
  accessibilityLabel,
  style,
}: {
  /** The legal values, ascending. At least two. */
  values: readonly number[];
  /** The current value. Snapped to the nearest entry for display. */
  value: number;
  onChange: (next: number) => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const s = useStyles(p, themeName === 'night');

  const [width, setWidth] = useState(0);
  const index = nearestIndex(values, value);
  const last = values.length - 1;
  const ratio = last > 0 ? index / last : 0;

  // Refs, not state: the gesture handlers are created once (PanResponder is
  // built in a ref so its identity is stable across renders) and would
  // otherwise close over the first render's values forever.
  const widthRef = useRef(0);
  const anchorRef = useRef(0);
  const indexRef = useRef(index);
  const valuesRef = useRef(values);
  const onChangeRef = useRef(onChange);
  widthRef.current = width;
  indexRef.current = index;
  valuesRef.current = values;
  onChangeRef.current = onChange;

  /** Commit the value at `r` (0–1 along the track), ticking on each step. */
  const commit = useCallback((r: number) => {
    const list = valuesRef.current;
    const steps = list.length - 1;
    if (steps <= 0) return;
    const next = Math.round(Math.max(0, Math.min(1, r)) * steps);
    if (next === indexRef.current) return;
    indexRef.current = next;
    // One tick per step crossed, which is what makes a stepped slider feel
    // stepped rather than like a continuous one that happens to snap.
    selectionTickFeedback();
    onChangeRef.current(list[next]!);
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const w = widthRef.current;
        if (w <= 0) return;
        anchorRef.current = Math.max(0, Math.min(1, e.nativeEvent.locationX / w));
        commit(anchorRef.current);
      },
      onPanResponderMove: (_, gs) => {
        const w = widthRef.current;
        if (w <= 0) return;
        commit(anchorRef.current + gs.dx / w);
      },
    }),
  ).current;

  const knobLeft = useMemo(
    // The knob is centred on its stop, so it hangs half a knob past each end of
    // the track. Clamping instead would make the two extremes unreachable-
    // looking, which is worse than the overhang.
    () => ratio * width - KNOB / 2,
    [ratio, width],
  );

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: last, now: index }}
      style={[s.row, style]}
    >
      <View pointerEvents="none" style={s.track}>
        <View style={[s.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[s.knob, { left: knobLeft }]} />
    </View>
  );
}

/** The entry `value` is closest to. Handles a stored value that is no longer in
 *  the set (an older build's step) without rejecting it. */
function nearestIndex(values: readonly number[], value: number): number {
  let best = 0;
  let bestDelta = Infinity;
  values.forEach((v, i) => {
    const d = Math.abs(v - value);
    if (d < bestDelta) {
      bestDelta = d;
      best = i;
    }
  });
  return best;
}

function useStyles(p: Palette, isNight: boolean) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: { height: ROW_H, justifyContent: 'center' },
        track: {
          height: TRACK_H,
          borderRadius: TRACK_H,
          backgroundColor: p.track,
        },
        fill: {
          height: '100%',
          borderRadius: TRACK_H,
          backgroundColor: p.fill,
          // The same leading-edge glow `ProgressBar` carries — this *is* a
          // progress track with a grip on it.
          shadowColor: p.glowProgress,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
        },
        knob: {
          position: 'absolute',
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          // Night's knob is the ink itself; Day's is white with a hairline,
          // because a white disc on the warm canvas needs an edge to be a disc.
          backgroundColor: isNight ? p.ink : '#FFFFFF',
          borderWidth: isNight ? 0 : 1,
          borderColor: p.glassBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isNight ? 0.4 : 0.2,
          shadowRadius: 8,
          elevation: 3,
        },
      }),
    [p, isNight],
  );
}
