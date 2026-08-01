'use client';

// All TextReader state, refs, effects, and handlers — theme-agnostic.
// Engine is foliate-js: <foliate-view> custom element, view.open(blob),
// view.goTo(cfi|href), relocate / load events.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FONT_STACKS, useReaderPrefs } from '@/features/books/reader/hooks/useReaderPrefs';
import type { NavItem } from '@/features/books/reader/components/ContentsPanel';
import { THEMES } from '@/features/books/reader/lib/readerConstants';
import {
  createFoliateView,
  flattenFoliateToc,
  loadFoliate,
  type FoliateRelocateDetail,
  type FoliateLoadDetail,
  type FoliateViewElement,
} from '@/features/books/reader/lib/foliate';

// ── Ruby / reading stripping ────────────────────────────────────────────────

const PAREN_READING_RE =
  /[(（][぀-ゟ゠-ヿ・ー]+[)）]/g;

function stripParenReadings(text: string): string {
  return text.replace(PAREN_READING_RE, '');
}

function cleanElementText(el: Element): string {
  const cloned = el.cloneNode(true) as Element;
  cloned.querySelectorAll('rt, rp').forEach((node) => node.remove());
  return stripParenReadings(cloned.textContent ?? '');
}

export function cleanSelectionText(sel: Selection): string {
  try {
    if (sel.rangeCount === 0) return '';
    const range = sel.getRangeAt(0);
    const frag = range.cloneContents();
    frag.querySelectorAll('rt, rp').forEach((el) => el.remove());
    return stripParenReadings(frag.textContent ?? '').trim();
  } catch {
    return stripParenReadings(sel.toString()).trim();
  }
}

export function extractSentenceFromSelection(sel: Selection): string | undefined {
  const node = sel.anchorNode;
  if (!node) return undefined;

  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!el) return undefined;

  const block = el.closest('p, div, li, td, h1, h2, h3, h4, h5, h6') ?? el;
  const fullText = cleanElementText(block).trim();
  if (!fullText) return undefined;

  const word = cleanSelectionText(sel);
  if (!word) return undefined;

  const sentences = fullText.split(/(?<=[。!?\n])/);
  for (const s of sentences) {
    if (s.includes(word)) return s.trim();
  }

  return fullText.length <= 200 ? fullText : undefined;
}

// ── CSS builder for foliate's per-chapter style injection ───────────────────
// Foliate's renderer.setStyles takes a CSS string and re-injects it into each
// chapter iframe. The vertical-rl + direction:ltr trio matches the mobile
// reader: package-progression-direction="rtl" cascades direction:rtl onto the
// body, which combined with writing-mode: vertical-rl places terminal
// punctuation at the column top instead of bottom. Forcing direction:ltr on
// body restores top-to-bottom flow inside each column.

interface BuildThemeArgs {
  bg: string;
  fg: string;
  fontFamilyStack: string;
  fontSizePct: number;
  lineSpacing: number;
  vertical: boolean;
}

function buildThemeCss({ bg, fg, fontFamilyStack, fontSizePct, lineSpacing, vertical }: BuildThemeArgs): string {
  const common =
    `html, body { background: ${bg} !important; color: ${fg} !important; }` +
    `body {` +
      `font-size: ${fontSizePct}% !important;` +
      `line-height: ${lineSpacing} !important;` +
      `font-family: ${fontFamilyStack} !important;` +
    `}` +
    `p, div, span, li, h1, h2, h3, h4, h5, h6, a, blockquote, td, th, figcaption {` +
      `color: ${fg} !important;` +
      `-webkit-user-select: text !important;` +
      `user-select: text !important;` +
    `}`;
  if (!vertical) return common;
  const verticalRules =
    `body {` +
      `writing-mode: vertical-rl !important;` +
      `-webkit-writing-mode: vertical-rl !important;` +
      `text-orientation: mixed !important;` +
      `-webkit-text-orientation: mixed !important;` +
      `direction: ltr !important;` +
      `unicode-bidi: isolate !important;` +
    `}` +
    `p, div, span, li, h1, h2, h3, h4, h5, h6, a, blockquote, td, th, figcaption {` +
      `writing-mode: vertical-rl !important;` +
      `-webkit-writing-mode: vertical-rl !important;` +
      `direction: ltr !important;` +
      `unicode-bidi: isolate !important;` +
    `}`;
  return common + verticalRules;
}

/** The toolbar's popovers share one anchor, so only one can be open. */
export type Panel = 'toc' | 'settings' | null;

/** Position snapshot emitted on every relocate (page turn). Mirrors the
 *  `ProgressSnapshot` consumed by `useProgressSync`. */
export interface TextRelocateSnapshot {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
}

export interface UseTextReaderEngineParams {
  blob: Blob;
  /** Seeds the writing-mode pref from the EPUB's own `dir`. The reader can
   *  override it in Display afterwards — vertical text is a preference, not a
   *  property of the file. */
  defaultVertical?: boolean;
  /** CFI to restore to once the book is open. Null/undefined = open at start. */
  initialCfi?: string | null;
  /** Called on every relocate with the current position. */
  onRelocate?: (snapshot: TextRelocateSnapshot) => void;
}

export function useTextReaderEngine({
  blob,
  defaultVertical = false,
  initialCfi,
  onRelocate,
}: UseTextReaderEngineParams) {
  const { prefs, savePrefs } = useReaderPrefs({
    writingMode: defaultVertical ? 'vertical' : 'horizontal',
  });
  const vertical = prefs.writingMode === 'vertical';

  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewElement | null>(null);

  // Relocate handler can change between renders; the init effect reads the
  // latest via this ref so it doesn't need to re-run (and re-open the book).
  const onRelocateRef = useRef(onRelocate);
  useEffect(() => { onRelocateRef.current = onRelocate; }, [onRelocate]);
  // Captured once and consumed at open; restore is a one-shot on book load.
  const initialCfiRef = useRef(initialCfi);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chapterLabel, setChapterLabel] = useState('');

  const [globalPage, setGlobalPage] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  /** Whole-book reading fraction as a percentage — what the sky bar uncovers.
   *  Foliate's own `fraction`, which is finer than page/total. */
  const [progress, setProgress] = useState(0);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);

  const [selectedText, setSelectedText] = useState('');
  const [contextSentence, setContextSentence] = useState<string | undefined>(undefined);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  const ctxMenuRef = useRef<HTMLDivElement>(null);

  // Chapter docs reached so far — selectionchange handlers are attached on
  // load and we don't want to double-bind if a chapter re-fires the event.
  // Per-chapter listener bookkeeping: each entry carries the iframe doc and
  // a `cleanup` thunk that removes the selectionchange + contextmenu
  // listeners we attached. Stored together so the effect's teardown can
  // run them all and avoid foliate keeping references to bound listeners
  // long after this component unmounts.
  const docsRef = useRef<Map<number, { doc: Document; cleanup: () => void }>>(new Map());
  const currentChapterIndexRef = useRef(0);

  // ── Apply prefs to the renderer (style CSS) ───────────────────────────
  const applyTheme = useCallback(() => {
    const view = viewRef.current;
    if (!view || !view.renderer || typeof view.renderer.setStyles !== 'function') return;
    const t = THEMES[prefs.theme];
    const font = FONT_STACKS[prefs.fontFamily];
    try {
      view.renderer.setStyles(
        buildThemeCss({
          bg: t.bg,
          fg: t.fg,
          fontFamilyStack: font,
          fontSizePct: prefs.fontSize,
          lineSpacing: prefs.lineSpacing,
          vertical,
        }),
      );
    } catch { /* renderer not ready yet */ }
  }, [prefs, vertical]);

  // ── Apply prefs to the renderer (layout attributes) ───────────────────
  // Flow and margins are foliate-paginator attributes rather than CSS, so they
  // are set separately from the injected stylesheet. Vertical text wants less
  // margin and a tighter gap — the columns run the other way.
  const applyLayout = useCallback(() => {
    const renderer = viewRef.current?.renderer;
    if (!renderer || renderer.tagName?.toLowerCase() !== 'foliate-paginator') return;
    try {
      renderer.setAttribute('flow', prefs.flowMode);
      renderer.setAttribute('margin', vertical ? '16px' : '40px');
      renderer.setAttribute('gap', vertical ? '3%' : '6%');
    } catch { /* attribute set fail; non-fatal */ }
  }, [prefs.flowMode, vertical]);

  // The init effect below is keyed on the blob alone, so it can't close over
  // these directly — it reads them through refs to get the current version
  // without reopening the book when a pref changes. Assigned in an effect
  // rather than during render: a render-phase ref write is exactly what
  // `react-hooks/refs` warns about, and this effect is declared first, so both
  // refs are current before init's async body starts.
  const applyThemeRef = useRef(applyTheme);
  const applyLayoutRef = useRef(applyLayout);
  useEffect(() => {
    applyThemeRef.current = applyTheme;
    applyLayoutRef.current = applyLayout;
  }, [applyTheme, applyLayout]);

  // ── Init view ────────────────────────────────────────────────────────
  //
  // A LAYOUT effect, and that part is load-bearing — it's about the cleanup,
  // not the setup.
  //
  // foliate's paginator watches its own `#container` with a ResizeObserver
  // whose callback is `render()`, and `render()` reads
  // `iframe.contentDocument`, which becomes null the moment the view is
  // detached from the document. `view.close()` is what makes that safe: it
  // nulls the renderer's `#view`, after which the observer callback hits an
  // early return.
  //
  // A passive (`useEffect`) cleanup runs *after paint*, but React detaches the
  // DOM during the commit and ResizeObserver callbacks are delivered before
  // paint. So on unmount the order was: detach → container resizes → observer
  // fires against a document-less view → `columnize` throws → and only then
  // does our cleanup get around to calling `close()`. Every exit from a
  // flowing EPUB, deterministically.
  //
  // A layout-effect cleanup runs synchronously in the commit, before the host
  // nodes are removed, so the renderer is already torn down by the time
  // anything can resize. Manga is unaffected either way: `fixed-layout.js`
  // unobserves the same node it observed, so its observer doesn't outlive
  // `destroy()` the way the paginator's does.
  //
  // The resets below are the correct form of the lint rule's false positive:
  // they synchronise React with an external system (foliate + the blob) that
  // can't be read during render, and they clear the *previous* book's state
  // before a new one loads. Unconditional, so there's no cascade — and the
  // async body guards every later write with its own `dead` flag.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let dead = false;
    // Capture the Map reference once so cleanup operates on the same instance
    // that this effect run populated, even if a future render swaps it.
    const docs = docsRef.current;

    setReady(false);
    setError(null);

    const init = async () => {
      try {
        await loadFoliate();
        if (dead) return;

        const view = createFoliateView();
        view.style.cssText = 'display: block; position: absolute; inset: 0;';
        el.appendChild(view);
        viewRef.current = view;

        const file = new File([blob], 'book.epub', { type: 'application/epub+zip' });
        await view.open(file);
        if (dead) {
          try { view.close(); } catch { /* teardown */ }
          el.removeChild(view);
          return;
        }

        const sections = view.book.sections ?? [];
        const spineTotal = sections.length;
        if (spineTotal > 0) {
          setTotalLocations(spineTotal);
          setGlobalPage(1);
        }

        // ── Listeners ───────────────────────────────────────────────────
        view.addEventListener('relocate', (ev) => {
          if (dead) return;
          const detail = (ev as CustomEvent<FoliateRelocateDetail>).detail;
          if (!detail) return;

          // Prefer foliate's location counter when available (it auto-computes
          // page-equivalents from text size). Fall back to spine index.
          const loc = detail.location;
          if (loc && loc.total > 0) {
            const pg = Math.max(1, Math.min(loc.total, (loc.current ?? 0) + 1));
            setGlobalPage(pg);
            setTotalLocations(loc.total);
          } else if (typeof detail.index === 'number') {
            setGlobalPage(detail.index + 1);
          }

          // tocItem is resolved by foliate from the current range, so we get
          // a chapter label without scanning the TOC manually.
          setChapterLabel(detail.tocItem?.label ?? '');

          // Forward the position for progress sync. `fraction` is the
          // whole-book reading fraction (0–1); `index` is the spine item.
          const frac = typeof detail.fraction === 'number' ? detail.fraction : 0;
          setProgress(Math.max(0, Math.min(100, Math.round(frac * 100))));
          onRelocateRef.current?.({
            cfi: detail.cfi ?? '',
            progress: Math.max(0, Math.min(100, Math.round(frac * 100))),
            spineIndex: typeof detail.index === 'number' ? detail.index : 0,
            totalSpineItems: spineTotal,
          });
        });

        view.addEventListener('load', (ev) => {
          if (dead) return;
          const detail = (ev as CustomEvent<FoliateLoadDetail>).detail;
          if (!detail || !detail.doc) return;
          currentChapterIndexRef.current = detail.index;
          attachChapterListeners(detail.doc, detail.index);
        });

        // ── Renderer attributes ─────────────────────────────────────────
        const renderer = view.renderer;
        if (renderer?.tagName?.toLowerCase() === 'foliate-paginator') {
          try {
            renderer.setAttribute('animated', '');
            renderer.setAttribute('max-column-count', '1');
          } catch { /* attribute set fail; non-fatal */ }
        }
        applyLayoutRef.current();
        applyThemeRef.current();
        if (dead) return;

        // ── TOC ─────────────────────────────────────────────────────────
        setToc(flattenFoliateToc(view.book.toc));

        // ── Restore saved position (one-shot) ───────────────────────────
        // The relocate this triggers only seeds the sync baseline (see
        // useProgressSync), so it never writes back the restored position.
        const restoreCfi = initialCfiRef.current;
        if (restoreCfi) {
          try { await view.goTo(restoreCfi); } catch { /* stale/invalid CFI — stay at start */ }
          if (dead) return;
        }

        setReady(true);
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    };

    // selectionchange + contextmenu on each loaded chapter iframe document.
    // The handlers are stored alongside their doc in `docs` so the effect
    // teardown can call `removeEventListener` rather than relying on the
    // iframe being torn down for cleanup (foliate's `view.close()` does NOT
    // GC the chapter docs synchronously, so handlers could otherwise fire
    // setState on an unmounted component).
    const attachChapterListeners = (doc: Document, index: number) => {
      const existing = docs.get(index);
      if (existing && existing.doc === doc) return;
      // A different doc replaced this chapter slot — clean up the old one
      // before attaching new listeners.
      if (existing) existing.cleanup();

      let raf = 0;
      const onSelectionChange = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          raf = 0;
          try {
            const sel = doc.defaultView?.getSelection();
            if (!sel || sel.rangeCount === 0) {
              setSelectedText('');
              setContextSentence(undefined);
              return;
            }
            const text = cleanSelectionText(sel);
            if (!text) {
              setSelectedText('');
              setContextSentence(undefined);
              return;
            }
            setSelectedText(text);
            setContextSentence(extractSentenceFromSelection(sel));
          } catch { /* ignore */ }
        });
      };

      const onContextMenu = (e: MouseEvent) => {
        const sel = doc.defaultView?.getSelection();
        const text = sel ? cleanSelectionText(sel) : '';
        if (!text) return;
        e.preventDefault();
        setSelectedText(text);
        setContextSentence(sel ? extractSentenceFromSelection(sel) : undefined);
        // Translate iframe-relative coords to window coords. The chapter
        // iframe sits inside foliate's shadow root, but we know its
        // containing <foliate-view> is positioned absolutely over the
        // wrapper — so wrapper-relative MouseEvent offsets work.
        const iframeEl = doc.defaultView?.frameElement as HTMLIFrameElement | null;
        const ir = iframeEl?.getBoundingClientRect() ?? { left: 0, top: 0 };
        setCtxMenu({ x: ir.left + e.clientX + 8, y: ir.top + e.clientY + 8 });
      };

      doc.addEventListener('selectionchange', onSelectionChange);
      doc.addEventListener('contextmenu', onContextMenu);

      docs.set(index, {
        doc,
        cleanup: () => {
          if (raf) cancelAnimationFrame(raf);
          doc.removeEventListener('selectionchange', onSelectionChange);
          doc.removeEventListener('contextmenu', onContextMenu);
        },
      });
    };

    void init();

    return () => {
      dead = true;
      const view = viewRef.current;
      viewRef.current = null;
      // Tear down per-chapter listeners BEFORE closing the foliate view so
      // we never leave bound handlers that could fire after unmount.
      for (const entry of docs.values()) entry.cleanup();
      docs.clear();
      if (view) {
        try { view.close(); } catch { /* foliate teardown */ }
        try { view.remove(); } catch { /* already detached */ }
      }
    };
    // Keyed on the blob alone, deliberately: everything else this effect
    // touches it reaches through a ref, so a pref change re-styles the open
    // book instead of reopening it.
  }, [blob]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Re-apply theme + layout when prefs change. Foliate re-injects the
  // stylesheet per chapter, and the paginator observes its own attributes, so
  // both take effect without reopening the book.
  useEffect(() => {
    if (viewRef.current) applyTheme();
  }, [applyTheme]);

  useEffect(() => {
    if (viewRef.current) applyLayout();
  }, [applyLayout]);

  // ── Navigation ────────────────────────────────────────────────────────
  const prev = useCallback(() => void viewRef.current?.prev(), []);
  const next = useCallback(() => void viewRef.current?.next(), []);
  // Vertical-rl runs right to left, so the left button advances — the same
  // inversion the page-progression direction implies.
  const onLeftBtn = vertical ? next : prev;
  const onRightBtn = vertical ? prev : next;

  const goToPage = useCallback(
    (pageNum: number) => {
      // We don't have a page→CFI mapping (foliate's location counter is
      // internal). Approximate by fraction: pageNum / totalLocations.
      if (totalLocations <= 0) return;
      const frac = Math.max(0, Math.min(1, (pageNum - 0.5) / totalLocations));
      void viewRef.current?.goTo({ fraction: frac });
    },
    [totalLocations],
  );

  // ── Close context menu on outside click / scroll ──────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onDown = (e: PointerEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', close, true);
    // Also listen inside each loaded chapter doc — selection scrolls there
    // shouldn't leave the menu floating.
    const chapterDocs = Array.from(docsRef.current.values()).map((e) => e.doc);
    chapterDocs.forEach((d) => {
      d.addEventListener('pointerdown', close);
      d.addEventListener('scroll', close, true);
    });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', close, true);
      chapterDocs.forEach((d) => {
        d.removeEventListener('pointerdown', close);
        d.removeEventListener('scroll', close, true);
      });
    };
  }, [ctxMenu]);

  // ── Close the open popover ────────────────────────────────────────────
  // A mousedown outside the panel and outside the button that opened it closes
  // it; Esc closes it. Both panels are marked `data-reader-panel` and the
  // toolbar buttons `data-reader-tool`, so this doesn't need a ref per panel.
  // Chapter documents are included: clicking into the book should dismiss it,
  // and a click inside an iframe never reaches the parent window.
  useEffect(() => {
    if (!panel) return;
    const close = () => setPanel(null);
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-reader-panel]')) return;
      if (target?.closest?.('[data-reader-tool]')) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    const chapterDocs = Array.from(docsRef.current.values()).map((e) => e.doc);
    chapterDocs.forEach((d) => d.addEventListener('pointerdown', close));
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
      chapterDocs.forEach((d) => d.removeEventListener('pointerdown', close));
    };
  }, [panel]);

  return {
    // refs
    wrapperRef,
    viewRef,
    ctxMenuRef,
    // state
    ready,
    error,
    chapterLabel,
    globalPage,
    totalLocations,
    progress,
    toc,
    panel,
    setPanel,
    selectedText,
    contextSentence,
    ctxMenu,
    setCtxMenu,
    // prefs (for the Display panel)
    prefs,
    savePrefs,
    // navigation
    onLeftBtn,
    onRightBtn,
    goToPage,
    // resolved writing mode, for the toolbar's arrow tooltips
    vertical,
  };
}

export type TextReaderEngine = ReturnType<typeof useTextReaderEngine>;
