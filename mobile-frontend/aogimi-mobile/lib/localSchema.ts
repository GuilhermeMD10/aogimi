// Local-store schema gate.
//
// The decks/cards local stores are a *mirror of backend rows*, not
// independently-meaningful data: `LocalCard` is a `CardRecord` plus a sync
// marker. So when the backend's card contract changes shape — a renamed rank,
// a new NOT NULL column — every cached row is stale in a way no amount of
// `?? fallback` at read sites can honestly repair, because the values simply
// were never captured.
//
// **The app is not deployed and has no users**, so this resolves the stale-row
// problem the cheap way: bump `LOCAL_SCHEMA_VERSION` and the next launch drops
// the affected stores and re-hydrates them from the backend. Writing real
// migrations for data nobody has would be work spent on a hypothetical.
//
// **What a bump costs.** `deck_local_state_v1` / `card_local_state_v1` are a
// local-first offline queue: a row can carry `pendingOp: 'create'`, meaning it
// exists only on this device. A wipe discards those unsynced writes. That is
// acceptable only while the user set is "us, testing" — the day this ships,
// this file has to become a real migration step, not a bigger number.
//
// Books are deliberately NOT in scope. Their blobs are expensive to re-acquire
// (re-import, re-hash, re-cover-extract) and their local records aren't tied to
// the card contract. Account-switch wiping is a separate concern that belongs
// to `lib/auth/wipeUserData.ts`.

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bump this whenever the shape of a `VERSIONED_KEYS` store changes
 * incompatibly, and say what changed:
 *
 *   1 — baseline (2026-08). Pre-FSRS-6 card rows: rank enum `seen`, no
 *       `peak_rank` / `next_due_at` / `jlpt_level` / `meanings`, and
 *       non-nullable `difficulty` / `stability`.
 *
 *   2 — FSRS-6 (2026-08). `seen` → `met`; added `peak_rank`, `next_due_at`,
 *       `jlpt_level`, `meanings`; `difficulty` / `stability` became nullable
 *       AND changed scale — difficulty moved from [0.05, 0.95] to [1, 10] and
 *       stability from an arbitrary multiplier to days-until-90%-recall.
 *
 *       **The scale change is why this is a wipe and not a backfill.** There is
 *       no honest conversion between the two difficulty scales; a v1 row's 0.30
 *       does not mean anything in [1, 10]. The backend's own answer was
 *       `scripts/replay-fsrs.js`, which rebuilds memory state by replaying the
 *       `card_reviews` log through FSRS-6 — a log this client does not hold.
 *       So local rows are dropped and re-hydrated from the server, which has
 *       already been replayed.
 */
export const LOCAL_SCHEMA_VERSION = 2;

const VERSION_KEY = 'aogimi_local_schema_version';

/** Stores whose shape follows the backend deck/card contract. Each is the
 *  literal AsyncStorage key its module declares — kept as literals rather than
 *  imported so this module stays free of feature imports and can run before
 *  anything else in the boot sequence. */
const VERSIONED_KEYS = [
  'deck_local_state_v1',
  'card_local_state_v1',
  'study_deck_overrides_v1',
  'study_display_prefs_v1',
];

/**
 * Drop the versioned stores when the persisted schema version doesn't match
 * the build's. Runs once per launch, before any store is read.
 *
 * A fresh install has no version key, which reads as a mismatch — the wipe is
 * a no-op there (nothing to remove) and the version gets stamped.
 *
 * Best-effort throughout: a device that can't clear these is better off
 * booting with stale rows than not booting.
 */
export async function ensureLocalSchema(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(VERSION_KEY);
    if (raw === String(LOCAL_SCHEMA_VERSION)) return;

    await AsyncStorage.multiRemove(VERSIONED_KEYS);
    await AsyncStorage.setItem(VERSION_KEY, String(LOCAL_SCHEMA_VERSION));
  } catch {
    /* best-effort — never block boot on this */
  }
}
