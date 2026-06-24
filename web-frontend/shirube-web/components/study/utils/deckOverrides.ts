// Per-deck session overrides — mirror of mobile, localStorage-backed.

import { apiGet, apiSend } from '@/lib/api';
import { getJSON, setJSON } from '@/lib/storage/_helpers';
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

export function loadLocal(): DeckOverrides {
  return getJSON<DeckOverrides>(STORAGE_KEY) ?? EMPTY_OVERRIDES;
}

export function saveLocal(overrides: DeckOverrides): void {
  setJSON(STORAGE_KEY, overrides);
}

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
