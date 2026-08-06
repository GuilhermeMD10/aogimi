'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_OVERRIDES,
  fetchRemote,
  pushRemote,
  resolveOverride,
  type DeckOverride,
  type DeckOverrides,
} from '../lib/deckOverrides';

// Backend is the source of truth (no client cache). Optimistic setters
// fire-and-forget the push; overrides resolve to defaults until the fetch
// resolves.

export function useDeckOverrides() {
  const [overrides, setOverrides] = useState<DeckOverrides>(EMPTY_OVERRIDES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const remote = await fetchRemote(controller.signal);
        if (cancelled) return;
        setOverrides(remote);
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

  const getFor = useCallback(
    (deckId: string) => resolveOverride(overrides, deckId),
    [overrides],
  );

  const setFor = useCallback((deckId: string, value: DeckOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [deckId]: value };
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  const clearFor = useCallback((deckId: string) => {
    setOverrides((prev) => {
      if (!(deckId in prev)) return prev;
      const next = { ...prev };
      delete next[deckId];
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  return { overrides, loading, getFor, setFor, clearFor };
}
