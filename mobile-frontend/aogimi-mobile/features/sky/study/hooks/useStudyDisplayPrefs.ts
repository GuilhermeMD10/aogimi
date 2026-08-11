// React wrapper around displayPrefs.ts. Loads from local cache
// synchronously-ish on mount (one async tick), then fetches from the
// backend in the background to reconcile across devices. Setters
// update React state optimistically, write to AsyncStorage, and push
// to the backend best-effort.
//
// No context provider — each consumer gets its own state instance.
// Cross-screen reactivity (toggling in Settings while StudyScreen is
// mounted) isn't supported in Phase 3; users typically configure once
// and study after. Promote to a provider if mid-session toggling
// becomes a real use case.

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PREFS,
  fetchRemote,
  loadLocal,
  presetPrefs,
  pushRemote,
  saveLocal,
} from '../lib/displayPrefs';
import type { BackPrefs, DisplayPrefs, FrontPrefs, Preset } from '../types';

export type StudyDisplayPrefsApi = {
  prefs: DisplayPrefs;
  loading: boolean;
  setPreset: (preset: Preset) => void;
  toggleFront: (key: keyof FrontPrefs) => void;
  toggleBack: (key: keyof BackPrefs) => void;
};

export function useStudyDisplayPrefs(): StudyDisplayPrefsApi {
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      // Local cache renders immediately so the UI doesn't flash defaults.
      const local = await loadLocal();
      if (cancelled) return;
      setPrefs(local);
      setLoading(false);

      // Backend wins across devices — if signed-in and reachable,
      // overwrite local with whatever's stored remotely. Silent on
      // failure (signed-out, offline, 401 — all fall through).
      try {
        const remote = await fetchRemote(controller.signal);
        if (cancelled) return;
        setPrefs(remote.display);
        await saveLocal(remote.display);
      } catch {
        /* ignore — local is fine */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Central commit path so every setter has the same persistence
  // behaviour. Optimistic state update happens BEFORE the writes so
  // the UI is snappy and offline-safe.
  const commit = useCallback((next: DisplayPrefs) => {
    setPrefs(next);
    void saveLocal(next);
    pushRemote(next).catch(() => {});
  }, []);

  const setPreset = useCallback((preset: Preset) => {
    commit(presetPrefs(preset));
  }, [commit]);

  const toggleFront = useCallback((key: keyof FrontPrefs) => {
    setPrefs((prev) => {
      const next: DisplayPrefs = {
        ...prev,
        front: { ...prev.front, [key]: !prev.front[key] },
      };
      void saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  const toggleBack = useCallback((key: keyof BackPrefs) => {
    setPrefs((prev) => {
      const next: DisplayPrefs = {
        ...prev,
        back: { ...prev.back, [key]: !prev.back[key] },
      };
      void saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, loading, setPreset, toggleFront, toggleBack };
}
