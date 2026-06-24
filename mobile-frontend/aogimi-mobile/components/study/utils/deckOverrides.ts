// Per-deck study session overrides — what mode + session size to use
// when the user taps "Study" on a specific deck. Same storage row as
// the display prefs (`user_study_prefs.deck_overrides` on the backend)
// but kept as a separate local cache key so the two slices can be
// loaded / mutated independently.

import { request } from '@/lib/api';
import { loadJSON, saveJSON } from '@/lib/storage';
import type { DisplayPrefs, StudyMode } from '../types';

const STORAGE_KEY = 'study_deck_overrides_v1';

export const DEFAULT_MODE: StudyMode = 'hardest';
export const DEFAULT_SESSION_SIZE = 20;

export type DeckOverride = {
  mode: StudyMode;
  sessionSize: number;
};

export type DeckOverrides = Record<string, DeckOverride>;

export const EMPTY_OVERRIDES: DeckOverrides = {};

export function loadLocal(): Promise<DeckOverrides> {
  return loadJSON<DeckOverrides>(STORAGE_KEY, EMPTY_OVERRIDES);
}

export function saveLocal(overrides: DeckOverrides): Promise<void> {
  return saveJSON(STORAGE_KEY, overrides);
}

// The /api/study/prefs endpoint returns both display + deckOverrides
// in a single payload. Each consumer extracts its own slice — wasteful
// HTTP-wise (two GETs from two screens) but simpler than coordinating
// a shared cache. Bytes are tiny.
type PrefsPayload = {
  display: DisplayPrefs;
  deckOverrides: DeckOverrides;
};

export async function fetchRemote(signal?: AbortSignal): Promise<DeckOverrides> {
  const res = await request<PrefsPayload>('/api/study/prefs', { signal });
  return res.deckOverrides ?? {};
}

export async function pushRemote(overrides: DeckOverrides): Promise<DeckOverrides> {
  const res = await request<PrefsPayload>('/api/study/prefs', {
    method: 'PUT',
    body: JSON.stringify({ deckOverrides: overrides }),
  });
  return res.deckOverrides ?? overrides;
}

/** Resolve a deck's effective settings, falling back to defaults. */
export function resolveOverride(
  overrides: DeckOverrides,
  deckId: string,
): DeckOverride {
  return overrides[deckId] ?? { mode: DEFAULT_MODE, sessionSize: DEFAULT_SESSION_SIZE };
}
