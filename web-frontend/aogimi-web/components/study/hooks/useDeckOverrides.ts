'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_OVERRIDES,
  fetchRemote,
  loadLocal,
  pushRemote,
  resolveOverride,
  saveLocal,
  type DeckOverride,
  type DeckOverrides,
} from '../utils/deckOverrides';

// Same surface as mobile's useDeckOverrides — local-first load,
// optimistic setters, fire-and-forget remote push.

export function useDeckOverrides() {
  const [overrides, setOverrides] = useState<DeckOverrides>(EMPTY_OVERRIDES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    // Mount-time hydration from localStorage — see the matching
    // disable in useStudyDisplayPrefs.ts for context.
    const local = loadLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverrides(local);
    setLoading(false);

    (async () => {
      try {
        const remote = await fetchRemote(controller.signal);
        if (cancelled) return;
        setOverrides(remote);
        saveLocal(remote);
      } catch {
        /* signed-out / offline — local stays */
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const getFor = useCallback(
    (deckId: string) => resolveOverride(overrides, deckId),
    [overrides],
  );

  const setFor = useCallback((deckId: string, value: DeckOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [deckId]: value };
      saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  const clearFor = useCallback((deckId: string) => {
    setOverrides((prev) => {
      if (!(deckId in prev)) return prev;
      const next = { ...prev };
      delete next[deckId];
      saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  return { overrides, loading, getFor, setFor, clearFor };
}
