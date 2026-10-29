import { useEffect, useState } from 'react';
import { isMangaEpub, prepareMangaSpine, type MangaSpineHandle } from '@/features/books/lib/mangaPages';
import type { BookRecord } from '@/features/books/types';

export type MangaSpineState = {
  isManga: boolean;
  handle: MangaSpineHandle | null;
  /** The prepare threw (a ZIP or OPF the extractor couldn't read). The
   *  cause is logged; the caller words the one line the reader shows. */
  failed: boolean;
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
    failed: false,
  });

  useEffect(() => {
    if (!book || !hasFile) {
      setState({ isManga: false, handle: null, failed: false });
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
        console.warn('[reader] manga prepare failed', e);
        setState((p) => ({ ...p, failed: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book, hasFile]);

  return state;
}
