// Per-deck session overrides. The backend (/api/study/prefs) is the source
// of truth — there is no client-side cache.

import { apiGet, apiSend } from '@/lib/api';
import type { DisplayPrefs, StudyMode } from '../types';

export const DEFAULT_MODE: StudyMode = 'hardest';
export const DEFAULT_SESSION_SIZE = 20;

export type DeckOverride = {
  mode: StudyMode;
  sessionSize: number;
};

export type DeckOverrides = Record<string, DeckOverride>;

export const EMPTY_OVERRIDES: DeckOverrides = {};

type PrefsPayload = {
  display: DisplayPrefs;
  deckOverrides: DeckOverrides;
};

export async function fetchRemote(signal?: AbortSignal): Promise<DeckOverrides> {
  const res = await apiGet<PrefsPayload>('/api/study/prefs', signal);
  return res.deckOverrides ?? {};
}

export async function pushRemote(overrides: DeckOverrides): Promise<DeckOverrides> {
  const res = await apiSend<PrefsPayload>('/api/study/prefs', 'PUT', { deckOverrides: overrides });
  return res.deckOverrides ?? overrides;
}

export function resolveOverride(
  overrides: DeckOverrides,
  deckId: string,
): DeckOverride {
  return overrides[deckId] ?? { mode: DEFAULT_MODE, sessionSize: DEFAULT_SESSION_SIZE };
}
