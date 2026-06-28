'use client';

// All TextReader state, refs, effects, and handlers — theme-agnostic.
// Engine is foliate-js: <foliate-view> custom element, view.open(blob),
// view.goTo(cfi|href), relocate / load events.

import { useCallback, useEffect, useRef, useState } from 'react';
import { FONT_STACKS, useReaderPrefs } from '@/components/reader/useReaderPrefs';
import type { NavItem } from '@/components/reader/TocPanel';
import { THEMES } from '@/components/reader/readerConstants';
import {
  createFoliateView,
  flattenFoliateToc,
  loadFoliate,
  type FoliateRelocateDetail,
  type FoliateLoadDetail,
  type FoliateViewElement,
} from '@/lib/foliate';
import { useShortcut } from '@/components/providers/ShortcutsProvider';

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

export type Panel = 'toc' | null;

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
  rtl?: boolean;
  /** CFI to restore to once the book is open. Null/undefined = open at start. */
  initialCfi?: string | null;
  /** Called on every relocate with the current position. */
  onRelocate?: (snapshot: TextRelocateSnapshot) => void;
}

export function useTextReaderEngine({
  blob,
  rtl = false,
  initialCfi,
  onRelocate,
}: UseTextReaderEngineParams) {
  const { prefs, savePrefs } = useReaderPrefs();

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

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [showTypo, setShowTypo] = useState(false);
  const [showPageJump, setShowPageJump] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [selectedText, setSelectedText] = useState('');
  const [contextSentence, setContextSentence] = useState<string | undefined>(undefined);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [translation, setTranslation] = useState<{ text: string; x: number; y: number } | null>(null);

  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const typoPanelRef = useRef<HTMLDivElement>(null);

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
          vertical: rtl,
        }),
      );
    } catch { /* renderer not ready yet */ }
  }, [prefs, rtl]);
  const applyThemeRef = useRef(applyTheme);
  applyThemeRef.current = applyTheme;

  // ── Init view ────────────────────────────────────────────────────────
  useEffect(() => {
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

        // ── Renderer attributes (paginated flow, animated nav, margins) ─
        const renderer = view.renderer;
        const isPaginator = renderer?.tagName?.toLowerCase() === 'foliate-paginator';
        if (isPaginator) {
          try {
            renderer.setAttribute('flow', 'paginated');
            renderer.setAttribute('animated', '');
            renderer.setAttribute('margin', rtl ? '16px' : '40px');
            renderer.setAttribute('gap', rtl ? '3%' : '6%');
            renderer.setAttribute('max-column-count', '1');
          } catch { /* attribute set fail; non-fatal */ }
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  // Re-apply theme when prefs change
  useEffect(() => {
    if (viewRef.current) applyTheme();
  }, [applyTheme]);

  // ── Navigation ────────────────────────────────────────────────────────
  const prev = useCallback(() => void viewRef.current?.prev(), []);
  const next = useCallback(() => void viewRef.current?.next(), []);
  // In RTL (vertical-rl) flow, the page-progression direction means
  // "left button = next page", same as the previous epubjs path.
  const onLeftBtn = rtl ? next : prev;
  const onRightBtn = rtl ? prev : next;

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

  // ── TTS ───────────────────────────────────────────────────────────────
  const toggleTts = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const entry = docsRef.current.get(currentChapterIndexRef.current);
    const text = (entry?.doc.body?.innerText ?? '').trim();
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  }, [isSpeaking]);

  // ── Keyboard ──────────────────────────────────────────────────────────
  // Bindings live in `lib/shortcuts/registry.ts`; the global keydown listener
  // is mounted by ShortcutsProvider. `useShortcut` captures the handler in a
  // ref so passing a new closure on every render doesn't re-bind.
  useShortcut('reader:page-next', () => { onRightBtn(); });
  useShortcut('reader:page-prev', () => { onLeftBtn(); });
  useShortcut('reader:tts-toggle', () => { toggleTts(); });

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

  // ── Close typo panel on outside click ─────────────────────────────────
  useEffect(() => {
    if (!showTypo) return;
    const onDown = (e: PointerEvent) => {
      if (typoPanelRef.current?.contains(e.target as Node)) return;
      if ((e.target as HTMLElement)?.closest('[data-typo-toggle]')) return;
      setShowTypo(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [showTypo]);

  return {
    // refs
    wrapperRef,
    viewRef,
    ctxMenuRef,
    typoPanelRef,
    // state
    ready,
    error,
    chapterLabel,
    globalPage,
    totalLocations,
    toc,
    panel,
    setPanel,
    showTypo,
    setShowTypo,
    showPageJump,
    setShowPageJump,
    isSpeaking,
    selectedText,
    contextSentence,
    ctxMenu,
    setCtxMenu,
    translation,
    setTranslation,
    // prefs (for typography panel)
    prefs,
    savePrefs,
    // navigation
    onLeftBtn,
    onRightBtn,
    goToPage,
    toggleTts,
    // RTL flag passes through
    rtl,
  };
}

export type TextReaderEngine = ReturnType<typeof useTextReaderEngine>;
