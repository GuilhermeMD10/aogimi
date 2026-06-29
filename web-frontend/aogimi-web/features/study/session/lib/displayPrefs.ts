// Display preferences. The backend (/api/study/prefs) is the source of
// truth — there is no client-side cache.

import { apiGet, apiSend } from '@/lib/api';
import type {
  BackPrefs,
  DisplayPrefs,
  FrontPrefs,
  Preset,
} from '../types';

export const DEFAULT_PREFS: DisplayPrefs = {
  preset: 'default',
  front: { reading: false, context: true, deckName: true },
  back:  { exampleSentence: true },
};

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
    front: { reading: false, context: false, deckName: true },
    back:  { exampleSentence: true },
  },
};

export function presetPrefs(preset: Preset): DisplayPrefs {
  return { preset, ...PRESETS[preset] };
}

type PrefsPayload = {
  display: DisplayPrefs;
  deckOverrides: Record<string, { mode: string; sessionSize: number }>;
};

export function fetchRemote(signal?: AbortSignal): Promise<PrefsPayload> {
  return apiGet<PrefsPayload>('/api/study/prefs', signal);
}

export function pushRemote(display: DisplayPrefs): Promise<PrefsPayload> {
  return apiSend<PrefsPayload>('/api/study/prefs', 'PUT', { display });
}
