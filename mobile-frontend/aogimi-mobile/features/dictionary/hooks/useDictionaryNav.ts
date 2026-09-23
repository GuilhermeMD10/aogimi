import { useCallback, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchWordDetails, peekWord } from '../lib';
import type { WordDetails } from '../types';

/**
 * A single navigation "frame" inside the dictionary tab. The dictionary
 * keeps a back-stack of these so a user can drill from a word's detail
 * into one of its kanji (which spawns a fresh search frame), tap a result,
 * see *that* word's detail, and then back-step out level by level.
 */
export type DictFrame =
  | { kind: 'search'; query: string }
  | { kind: 'detailLoading' }
  | { kind: 'detail'; details: WordDetails };

export type DictNav = {
  current: DictFrame;
  canGoBack: boolean;
  /** The nearest search frame's query — see `query` in the hook below. */
  query: string;
  detailError: string | null;
  setQuery: (v: string) => void;
  /** Resolves to the opened entry, or `null` if the load failed. */
  openDetail: (id: number) => Promise<WordDetails | null>;
  openKanjiSearch: (char: string) => void;
  back: () => void;
};

/**
 * Stack-based navigation state for the dictionary tab.
 *
 * Frames are pushed when the user opens a detail or drills into a kanji,
 * and popped on `back()`. The active screen is the topmost frame. Drilling
 * into a kanji starts a new search frame seeded with that kanji as the query,
 * and popping back restores the previous frame's query verbatim.
 *
 * ── The search bar outlives the frame ──────────────────────────────────────
 * `DictionaryView` pins one field above *every* frame, so `query` and
 * `setQuery` address the nearest search frame rather than the top one — the
 * bar keeps showing what led here while an entry is open, and editing it
 * unwinds back to those results. See both below.
 */
export function useDictionaryNav(): DictNav {
  const [history, setHistory] = useState<DictFrame[]>(() => [
    { kind: 'search', query: '' },
  ]);
  const [detailError, setDetailError] = useState<string | null>(null);

  const current = history[history.length - 1]!;
  // The search bar is pinned above every frame, so it needs a query on a
  // *detail* frame too — the one that produced the entry, which is the nearest
  // search frame below it. Reading the top frame alone would blank the bar the
  // moment a result is opened.
  const query = nearestSearch(history)?.query ?? '';

  const push = useCallback((frame: DictFrame) => {
    setHistory((h) => [...h, frame]);
  }, []);

  const pop = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  // Typing is always typing into the nearest search frame, and everything
  // stacked above it goes: a pinned bar that says one thing while an unrelated
  // entry fills the page is the one state it must not produce. From a search
  // frame this is a plain edit; from an entry it is "back to results, changed".
  const setQuery = useCallback((v: string) => {
    setHistory((h) => {
      const i = lastSearchIndex(h);
      if (i < 0) return h;
      return [...h.slice(0, i), { kind: 'search', query: v }];
    });
  }, []);

  // Returns the resolved entry, or `null` when the load failed. The caller
  // needs it to record the lookup in the recents store, and returning it beats
  // making the caller watch `current` for a frame transition.
  const openDetail = useCallback(
    async (id: number): Promise<WordDetails | null> => {
      setDetailError(null);
      // Fast path: word already in the LRU cache from a previous lookup.
      // Skip the 'detailLoading' frame entirely so the user sees no
      // spinner when revisiting an entry.
      const cached = peekWord(id);
      if (cached) {
        push({ kind: 'detail', details: cached });
        return cached;
      }
      push({ kind: 'detailLoading' });
      try {
        const details = await fetchWordDetails(id);
        // Replace the loading frame with the resolved detail. If the user
        // already popped back during the request, replaceTop on a non-top
        // frame is harmless because pop already reset state.
        setHistory((h) => {
          const top = h[h.length - 1]!;
          if (top.kind !== 'detailLoading') return h;
          return [...h.slice(0, -1), { kind: 'detail', details }];
        });
        return details;
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Failed to load word');
        // Drop the loading frame.
        setHistory((h) => {
          const top = h[h.length - 1]!;
          if (top.kind !== 'detailLoading') return h;
          return h.slice(0, -1);
        });
        return null;
      }
    },
    [push],
  );

  const openKanjiSearch = useCallback(
    (char: string) => {
      push({ kind: 'search', query: char });
    },
    [push],
  );

  const back = useCallback(() => {
    setDetailError(null);
    pop();
  }, [pop]);

  // Wire Android's hardware back button to the in-app frame stack while the
  // dictionary tab is focused. iOS doesn't fire this, so no parallel handling
  // is needed there (and the tab navigator has no swipe-back gesture).
  const canGoBack = history.length > 1;
  const backStateRef = useRef<{ canGoBack: boolean; back: () => void }>({
    canGoBack,
    back,
  });
  backStateRef.current = { canGoBack, back };
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const state = backStateRef.current;
        if (state.canGoBack) {
          state.back();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  return {
    current,
    canGoBack,
    query,
    detailError,
    setQuery,
    openDetail,
    openKanjiSearch,
    back,
  };
}

/** Index of the topmost search frame; `-1` only if there is none, which the
 *  initial state rules out. */
function lastSearchIndex(history: DictFrame[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.kind === 'search') return i;
  }
  return -1;
}

function nearestSearch(history: DictFrame[]): { kind: 'search'; query: string } | null {
  const i = lastSearchIndex(history);
  return i < 0 ? null : (history[i] as { kind: 'search'; query: string });
}
