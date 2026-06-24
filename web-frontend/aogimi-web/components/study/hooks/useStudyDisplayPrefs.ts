'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PREFS,
  fetchRemote,
  loadLocal,
  presetPrefs,
  pushRemote,
  saveLocal,
} from '../utils/displayPrefs';
import type { BackPrefs, DisplayPrefs, FrontPrefs, Preset } from '../types';

// Same surface as mobile — hook with optimistic setters; backend wins
// across devices, local cache renders immediately.

export function useStudyDisplayPrefs() {
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Local cache first so the UI never paints defaults. Setting state
    // synchronously inside the effect is intentional — we're hydrating
    // from localStorage on mount, which the lint rule's heuristic
    // can't tell apart from a render loop.
    const local = loadLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(local);
    setLoading(false);

    (async () => {
      try {
        const remote = await fetchRemote(controller.signal);
        if (cancelled) return;
        setPrefs(remote.display);
        saveLocal(remote.display);
      } catch {
        /* signed-out / offline — local stays */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const setPreset = useCallback((preset: Preset) => {
    const next = presetPrefs(preset);
    setPrefs(next);
    saveLocal(next);
    pushRemote(next).catch(() => {});
  }, []);

  const toggleFront = useCallback((key: keyof FrontPrefs) => {
    setPrefs((prev) => {
      const next: DisplayPrefs = {
        ...prev,
        front: { ...prev.front, [key]: !prev.front[key] },
      };
      saveLocal(next);
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
      saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, loading, setPreset, toggleFront, toggleBack };
}
