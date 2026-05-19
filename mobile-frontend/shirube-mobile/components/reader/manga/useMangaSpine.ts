import { useEffect, useState } from 'react';
import { isMangaEpub, prepareMangaSpine, type MangaSpineHandle } from '@/lib/mangaPages';
import type { BookRecord } from '@/lib/types';

export type MangaSpineState = {
  isManga: boolean;
  handle: MangaSpineHandle | null;
  error: string | null;
};

/**
 * Sniff the EPUB up-front. If fixed-layout, prepare the spine handle so
 * the RN renderer can draw pages directly (foliate / WebView is skipped).
 * The caller threads `isManga` / `handle` into bookType / totalPages /
 * readerReady — this hook only owns the detection + prep state.
 */
export function useMangaSpine(book: BookRecord | null, hasFile: boolean): MangaSpineState {
  const [state, setState] = useState<MangaSpineState>({
    isManga: false,
    handle: null,
    error: null,
  });

  useEffect(() => {
    if (!book || !hasFile) {
      setState({ isManga: false, handle: null, error: null });
      return;
    }
    let cancelled = false;
    (async () => {
      const isManga = await isMangaEpub(book.filename);
      if (cancelled || !isManga) return;
      setState((p) => ({ ...p, isManga: true }));
      try {
        const handle = await prepareMangaSpine(book.id, book.filename);
        if (cancelled) return;
        setState((p) => ({ ...p, handle }));
      } catch (e) {
        if (cancelled) return;
        setState((p) => ({
          ...p,
          error: e instanceof Error ? e.message : 'Failed to prepare pages',
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book, hasFile]);

  return state;
}
