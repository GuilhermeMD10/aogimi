// Display preferences persistence: a single JSON blob stored locally
// (AsyncStorage) and synced to the backend `user_study_prefs` row when
// the user is signed in. Backend wins across devices; local cache is
// warm-start + offline support.
//
// The "preset" field is a quick-set tool — selecting it overwrites
// every toggle. After a manual toggle, the preset stays whatever was
// last picked but the toggle values diverge from the preset baseline.

import { request } from '@/lib/api';
import { loadJSON, saveJSON } from '@/lib/storage';
import type { BackPrefs, DisplayPrefs, FrontPrefs, Preset } from '../types';

const STORAGE_KEY = 'study_display_prefs_v1';

export const DEFAULT_PREFS: DisplayPrefs = {
  preset: 'default',
  front: { reading: false, context: true, deckName: true },
  back:  { exampleSentence: true },
};

// Resolve a preset to its canonical toggle layout. Production keeps
// the same "what's visible on the back" toggles but the renderer
// special-cases the orientation (meaning on front, kanji on back).
export const PRESETS: Record<Preset, { front: FrontPrefs; back: BackPrefs }> = {
  easy: {
    front: { reading: true,  context: true,  deckName: true },
    back:  { exampleSentence: true },
  },
  default: {
    front: { reading: false, context: true,  deckName: true },
    back:  { exampleSentence: true },
  },
  hard: {
    front: { reading: false, context: false, deckName: false },
    back:  { exampleSentence: true },
  },
  production: {
    // Front is meaning-only (no kanji affordances); back shows kanji +
    // reading + sentence. Toggles map to the "back" side of the card
    // since that's where the kanji lives in this preset.
    front: { reading: false, context: false, deckName: true },
    back:  { exampleSentence: true },
  },
};

export function presetPrefs(preset: Preset): DisplayPrefs {
  return { preset, ...PRESETS[preset] };
}

// ── Local cache ────────────────────────────────────────────────────────────

export function loadLocal(): Promise<DisplayPrefs> {
  return loadJSON<DisplayPrefs>(STORAGE_KEY, DEFAULT_PREFS);
}

export function saveLocal(prefs: DisplayPrefs): Promise<void> {
  return saveJSON(STORAGE_KEY, prefs);
}

// ── Backend sync ───────────────────────────────────────────────────────────

type PrefsPayload = {
  display: DisplayPrefs;
  deckOverrides: Record<string, { mode: string; sessionSize: number }>;
};

export function fetchRemote(signal?: AbortSignal): Promise<PrefsPayload> {
  return request<PrefsPayload>('/api/study/prefs', { signal });
}

export function pushRemote(display: DisplayPrefs): Promise<PrefsPayload> {
  return request<PrefsPayload>('/api/study/prefs', {
    method: 'PUT',
    body: JSON.stringify({ display }),
  });
}
