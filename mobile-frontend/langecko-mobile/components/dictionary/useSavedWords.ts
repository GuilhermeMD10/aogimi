import { useCallback, useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '@/lib/storage';

const STORAGE_KEY = 'dictionary_saved_words';

export interface SavedWord {
  /** Backend word id — same identifier consumed by `/api/words/:id/details`. */
  id: number;
  /** Primary surface form (first kanji, or first reading if kana-only). */
  headword: string;
  /** Primary kana reading, if distinct from `headword`. */
  reading?: string;
  /** First-meaning preview joined on "; ". Used by the saved list row. */
  glosses?: string;
  savedAt: number;
}

/**
 * Preview envelope accepted by `toggleSaved`. Kept loose so callers (e.g.
 * a word detail view that already has the full `WordDetails` payload) don't
 * have to construct the exact stored shape — the hook fills in `savedAt`.
 */
export type SavedWordPreview = Omit<SavedWord, 'savedAt'>;

interface SavedWordsStore {
  savedWords: SavedWord[];
  ready: boolean;
  isSaved: (id: number | string) => boolean;
  toggleSaved: (preview: SavedWordPreview) => void;
  removeSaved: (id: number | string) => void;
}

/**
 * Persistent list of dictionary entries the user has bookmarked. Follows the
 * same write-through pattern as `useDeckStore`: hydrate once on mount, then
 * each mutation updates state and persists synchronously.
 *
 * Saved ids are coerced to numbers on read so callers can pass either `number`
 * (from `WordResult.id`) or `string` (from URL params) interchangeably.
 */
export function useSavedWords(): SavedWordsStore {
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadJSON<{ words?: SavedWord[] }>(STORAGE_KEY, { words: [] }).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data.words)) setSavedWords(data.words);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mutate = useCallback((updater: (prev: SavedWord[]) => SavedWord[]) => {
    setSavedWords((prev) => {
      const next = updater(prev);
      void saveJSON(STORAGE_KEY, { words: next });
      return next;
    });
  }, []);

  const isSaved = useCallback(
    (id: number | string) => {
      const n = Number(id);
      return savedWords.some((w) => w.id === n);
    },
    [savedWords],
  );

  const toggleSaved = useCallback(
    (preview: SavedWordPreview) =>
      mutate((prev) => {
        const n = Number(preview.id);
        if (prev.some((w) => w.id === n)) return prev.filter((w) => w.id !== n);
        return [...prev, { ...preview, id: n, savedAt: Date.now() }];
      }),
    [mutate],
  );

  const removeSaved = useCallback(
    (id: number | string) =>
      mutate((prev) => prev.filter((w) => w.id !== Number(id))),
    [mutate],
  );

  return { savedWords, ready, isSaved, toggleSaved, removeSaved };
}
