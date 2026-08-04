// Display preferences. The backend (/api/study/prefs) is the source of
// truth — there is no client-side cache.

import { apiGet, apiSend } from '@/lib/api';
import type {
  BackPrefs,
  DisplayPrefs,
  FrontPrefs,
  Preset,
} from '../types';

// These mirror `DEFAULT_DISPLAY` in `backend/src/routes/study.js`, which is what
// a user with no stored row gets — keep the `default` preset and DEFAULT_PREFS
// in step with it, or the first session after sign-up differs from the second.
//
// `jlpt` is on everywhere except `hard`: the level is a difficulty *hint* about
// the prompt, so it belongs with the reading and the context sentence that
// `hard` also strips.
export const DEFAULT_PREFS: DisplayPrefs = {
  preset: 'default',
  front: { reading: false, context: true, jlpt: true, deckName: true },
  back:  { exampleSentence: true },
};

export const PRESETS: Record<Preset, { front: FrontPrefs; back: BackPrefs }> = {
  easy: {
    front: { reading: true,  context: true,  jlpt: true,  deckName: true },
    back:  { exampleSentence: true },
  },
  default: {
    front: { reading: false, context: true,  jlpt: true,  deckName: true },
    back:  { exampleSentence: true },
  },
  hard: {
    front: { reading: false, context: false, jlpt: false, deckName: false },
    back:  { exampleSentence: true },
  },
  production: {
    front: { reading: false, context: false, jlpt: true,  deckName: true },
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
