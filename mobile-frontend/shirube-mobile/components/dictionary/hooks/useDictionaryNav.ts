import { useCallback, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { fetchWordDetails } from '../utils/dictApi';
import { peekWord } from '../utils/dictCache';
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
  /** Search-frame query, or `''` when the top frame isn't a search. */
  query: string;
  detailError: string | null;
  setQuery: (v: string) => void;
  openDetail: (id: number) => Promise<void>;
  openKanjiSearch: (char: string) => void;
  back: () => void;
};

/**
 * Stack-based navigation state for the dictionary tab.
 *
 * Frames are pushed when the user opens a detail or drills into a kanji,
 * and popped on `back()`. The active screen is the topmost frame. Search
 * input is bound to whichever search frame is on top — drilling into a
 * kanji starts a new search frame seeded with that kanji as the query, and
 * popping back restores the previous frame's query verbatim.
 */
export function useDictionaryNav(): DictNav {
  const [history, setHistory] = useState<DictFrame[]>(() => [
    { kind: 'search', query: '' },
  ]);
  const [detailError, setDetailError] = useState<string | null>(null);

  const current = history[history.length - 1]!;
  const query = current.kind === 'search' ? current.query : '';

  const replaceTop = useCallback((frame: DictFrame) => {
    setHistory((h) => [...h.slice(0, -1), frame]);
  }, []);

  const push = useCallback((frame: DictFrame) => {
    setHistory((h) => [...h, frame]);
  }, []);

  const pop = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  const setQuery = useCallback(
    (v: string) => {
      // Only mutate when the active frame is a search frame — otherwise
      // bail. The TextInput is only rendered in search mode, so this guard
      // is mostly defensive.
      setHistory((h) => {
        const top = h[h.length - 1]!;
        if (top.kind !== 'search') return h;
        return [...h.slice(0, -1), { kind: 'search', query: v }];
      });
    },
    [],
  );

  const openDetail = useCallback(
    async (id: number) => {
      setDetailError(null);
      // Fast path: word already in the LRU cache from a previous lookup.
      // Skip the 'detailLoading' frame entirely so the user sees no
      // spinner when revisiting an entry.
      const cached = peekWord(id);
      if (cached) {
        push({ kind: 'detail', details: cached });
        return;
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
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : 'Failed to load word');
        // Drop the loading frame.
        setHistory((h) => {
          const top = h[h.length - 1]!;
          if (top.kind !== 'detailLoading') return h;
          return h.slice(0, -1);
        });
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
