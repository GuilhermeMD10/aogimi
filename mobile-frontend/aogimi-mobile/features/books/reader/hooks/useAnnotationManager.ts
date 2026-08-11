// Highlight CRUD for the reader. Owns the three pathways that
// previously sat as separate callbacks in ReaderScreen:
//
//   - applyColor(color): create at the picker location, or replace
//     the color on an existing highlight at the same cfi, or remove
//     it if the user re-picks the same color (toggle behavior).
//   - clearAt(cfi): remove the highlight at a specific cfi (the
//     picker's "trash" affordance).
//   - removeById(id): delete by local id (the annotations pane).
//
// All three need the foliate WebView ref for in-frame mutation +
// the storage hook for persistence — the previous shape duplicated
// the find→ref→storage triad three times.

import { useCallback } from 'react';
import {
  HIGHLIGHT_COLORS,
  type EpubHighlight,
  type HighlightColor,
} from '../lib/readerStorage';
import type { FoliateReaderHandle } from '../components/novel/FoliateReader';

type AnnotationStorage = {
  highlights: EpubHighlight[];
  addHighlight: (h: { cfi: string; text: string; color: HighlightColor }) => EpubHighlight;
  removeHighlight: (id: string) => void;
  setHighlightColor: (id: string, color: HighlightColor) => void;
};

type UseAnnotationManagerArgs = {
  epubRef: React.RefObject<FoliateReaderHandle | null>;
  storage: AnnotationStorage;
};

export type AnnotationManager = {
  /** Apply `color` at the picker location: replace existing, toggle
   *  off on re-pick, or create new. */
  applyColor: (cfi: string, text: string, color: HighlightColor) => void;
  /** Remove the highlight at `cfi` (picker's clear button). */
  clearAt: (cfi: string) => void;
  /** Remove by local id (annotations-pane swipe / tap). */
  removeById: (id: string) => void;
};

export function useAnnotationManager({
  epubRef,
  storage,
}: UseAnnotationManagerArgs): AnnotationManager {
  const { highlights, addHighlight, removeHighlight, setHighlightColor } = storage;

  const applyColor = useCallback(
    (cfi: string, text: string, color: HighlightColor) => {
      const existing = highlights.find((h) => h.cfi === cfi);
      if (existing) {
        epubRef.current?.removeHighlight(cfi);
        if (existing.color === color) {
          // Same color → toggle off.
          removeHighlight(existing.id);
        } else {
          setHighlightColor(existing.id, color);
          epubRef.current?.addHighlight(existing.id, cfi, HIGHLIGHT_COLORS[color]);
        }
        return;
      }
      const created = addHighlight({ cfi, text, color });
      epubRef.current?.addHighlight(created.id, cfi, HIGHLIGHT_COLORS[color]);
    },
    [highlights, addHighlight, removeHighlight, setHighlightColor, epubRef],
  );

  const clearAt = useCallback(
    (cfi: string) => {
      const existing = highlights.find((h) => h.cfi === cfi);
      if (!existing) return;
      epubRef.current?.removeHighlight(existing.cfi);
      removeHighlight(existing.id);
    },
    [highlights, removeHighlight, epubRef],
  );

  const removeById = useCallback(
    (id: string) => {
      const h = highlights.find((x) => x.id === id);
      if (h) epubRef.current?.removeHighlight(h.cfi);
      removeHighlight(id);
    },
    [highlights, removeHighlight, epubRef],
  );

  return { applyColor, clearAt, removeById };
}
