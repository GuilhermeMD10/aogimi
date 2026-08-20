import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS's "reduce motion" switch is on.
 *
 * The mobile counterpart of the web's `@media (prefers-reduced-motion: reduce)`
 * block in `styles/glass.css`, which drops the press transform and nothing else.
 * Same treatment here: `Touchable` keeps its haptic and its fill change and
 * skips the nudge, so the control still answers a press — the feedback stops
 * *moving*, it does not stop existing.
 *
 * ── One subscription for the whole app, not one per control ────────────────
 * Every `Touchable` calls this, and a screen can hold fifty of them. A
 * `useEffect` per instance would mean fifty `AccessibilityInfo` listeners and
 * fifty async reads on every mount, for a value that is global and changes
 * about never. So the subscription is module-level and opened once, on the
 * first call; `useSyncExternalStore` hands each component the same snapshot.
 */
let reduceMotion = false;
let started = false;
const listeners = new Set<() => void>();

function publish(next: boolean): void {
  if (next === reduceMotion) return;
  reduceMotion = next;
  for (const fn of listeners) fn();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!started) {
    started = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(publish);
    // Never removed: the store outlives every subscriber, and re-adding it on
    // each new one is what this exists to avoid.
    AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
  }
  return () => listeners.delete(onChange);
}

/** Starts `false` and corrects after the first async read. One frame of motion
 *  on a cold start is the honest trade against blocking every control's first
 *  render on an `AccessibilityInfo` round trip. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduceMotion);
}
