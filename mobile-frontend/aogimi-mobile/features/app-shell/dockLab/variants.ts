import { DOCK_DEFAULTS, type DockHaptics } from '../DockBar';

/**
 * The docks the tuning lab mounts.
 *
 * There used to be four, varying on timing and haptics, because the question
 * was which direction to move in. That question is answered: the winning
 * pairing is now `DOCK_DEFAULTS` and the winning geometry is now `SIZES`, so
 * the three alternatives are gone and what is left is the real dock, mounted
 * once, routing nowhere.
 *
 * It reads `DOCK_DEFAULTS` rather than restating it, so it cannot drift from
 * the dock the rest of the app shows. The table stays a table because the next
 * experiment is an entry in it and nothing else.
 */
export type DockVariant = {
  key: string;
  /** What this one is trying to be, in the lab's own words. */
  name: string;
  holdMs: number;
  slideMs: number;
  /** Named for the ear, since the feel itself can't be written down. */
  feel: string;
  haptics: DockHaptics;
};

export const DOCK_VARIANTS: readonly DockVariant[] = [
  {
    key: 'current',
    name: 'Current — what the app ships',
    holdMs: DOCK_DEFAULTS.holdMs,
    slideMs: DOCK_DEFAULTS.slideMs,
    feel: 'soft press · solid detent',
    haptics: DOCK_DEFAULTS.haptics,
  },
];
