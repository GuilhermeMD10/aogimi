'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PREFS,
  fetchRemote,
  presetPrefs,
  pushRemote,
} from '../utils/displayPrefs';
import type { BackPrefs, DisplayPrefs, FrontPrefs, Preset } from '../types';

// Backend is the source of truth (no client cache). Optimistic setters
// fire-and-forget the push; the UI shows defaults until the fetch resolves.

export function useStudyDisplayPrefs() {
  const [prefs, setPrefs] = useState<DisplayPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const remote = await fetchRemote(controller.signal);
        if (cancelled) return;
        setPrefs(remote.display);
      } catch {
        /* signed-out / offline — defaults stay */
      } finally {
        if (!cancelled) setLoading(false);
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
    pushRemote(next).catch(() => {});
  }, []);

  const toggleFront = useCallback((key: keyof FrontPrefs) => {
    setPrefs((prev) => {
      const next: DisplayPrefs = {
        ...prev,
        front: { ...prev.front, [key]: !prev.front[key] },
      };
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
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  return { prefs, loading, setPreset, toggleFront, toggleBack };
}
