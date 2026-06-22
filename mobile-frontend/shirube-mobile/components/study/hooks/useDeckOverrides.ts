// Per-deck session overrides hook. Mirrors useStudyDisplayPrefs in
// structure — local-first load, optimistic setters, fire-and-forget
// remote push.
//
// Each consumer gets its own state instance. Consumers that need
// per-deck reactivity across screens can subscribe via the resolver
// (`resolveOverride`) rather than holding the full map locally.

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

export type DeckOverridesApi = {
  overrides: DeckOverrides;
  loading: boolean;
  getFor: (deckId: string) => DeckOverride;
  setFor: (deckId: string, value: DeckOverride) => void;
  /** Clear a deck's override so it falls back to defaults. */
  clearFor: (deckId: string) => void;
};

export function useDeckOverrides(): DeckOverridesApi {
  const [overrides, setOverrides] = useState<DeckOverrides>(EMPTY_OVERRIDES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      const local = await loadLocal();
      if (cancelled) return;
      setOverrides(local);
      setLoading(false);

      try {
        const remote = await fetchRemote(controller.signal);
        if (cancelled) return;
        setOverrides(remote);
        await saveLocal(remote);
      } catch {
        /* signed-out or offline — local stays */
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

  const persist = useCallback((next: DeckOverrides) => {
    setOverrides(next);
    void saveLocal(next);
    pushRemote(next).catch(() => {});
  }, []);

  const setFor = useCallback((deckId: string, value: DeckOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [deckId]: value };
      void saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  const clearFor = useCallback((deckId: string) => {
    setOverrides((prev) => {
      if (!(deckId in prev)) return prev;
      const next = { ...prev };
      delete next[deckId];
      void saveLocal(next);
      pushRemote(next).catch(() => {});
      return next;
    });
  }, []);

  // Persist callback is kept for symmetry with display prefs — not
  // currently used externally, so silenced via void.
  void persist;

  return { overrides, loading, getFor, setFor, clearFor };
}
