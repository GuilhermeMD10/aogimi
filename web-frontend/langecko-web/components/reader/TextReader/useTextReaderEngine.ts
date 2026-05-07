'use client';

// All TextReader state, refs, effects, and handlers — theme-agnostic.

import { useCallback, useEffect, useRef, useState } from 'react';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import {
  FONT_STACKS,
  HIGHLIGHT_COLORS,
  useBookStorage,
  type HighlightColor,
} from '@/components/reader/useBookStorage';
import type { NavItem } from '@/components/reader/TocPanel';
import { THEMES } from '@/components/reader/readerConstants';
import {
  clearRenditionQueue,
  getAnnotations,
  getLocations,
  getNavigationToc,
  getSpineItems,
  getSpineSection,
  getThemes,
} from '@/lib/types/epubjs';

// ── Ruby / reading stripping ────────────────────────────────────────────────

const PAREN_READING_RE =
  /[（(][぀-ゟ゠-ヿ・ー]+[）)]/g;

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

export type Panel = 'toc' | 'annotations' | null;

export interface UseTextReaderEngineParams {
  book: Book;
  filename: string;
  initialCfi?: string;
  rtl?: boolean;
  onProgressChange?: (progress: number, cfi: string) => void;
}

export function useTextReaderEngine({
  book,
  filename,
  initialCfi,
  rtl = false,
  onProgressChange,
}: UseTextReaderEngineParams) {
  const {
    lastCfi,
    epubHighlights,
    epubBookmarks,
    prefs,
    saveLastCfi,
    savePrefs,
    addEpubHighlight,
    removeEpubHighlight,
    updateEpubHighlightColor,
    addEpubBookmark,
    removeEpubBookmark,
  } = useBookStorage(filename);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const cfiRef = useRef('');
  const progressCbRef = useRef(onProgressChange);
  progressCbRef.current = onProgressChange;

  const startCfi = useRef(initialCfi ?? lastCfi ?? undefined);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [percent, setPercent] = useState(0);
  const [chapterLabel, setChapterLabel] = useState('');

  const locationsReady = useRef(false);
  const globalPageRef = useRef(0);
  const [globalPage, setGlobalPage] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);

  const [toc, setToc] = useState<NavItem[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [showTypo, setShowTypo] = useState(false);
  const [showPageJump, setShowPageJump] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [selectedText, setSelectedText] = useState('');
  const [contextSentence, setContextSentence] = useState<string | undefined>(undefined);
  const [selectedCfi, setSelectedCfi] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [translation, setTranslation] = useState<{ text: string; x: number; y: number } | null>(null);

  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const typoPanelRef = useRef<HTMLDivElement>(null);
  const highlightsRef = useRef(epubHighlights);
  highlightsRef.current = epubHighlights;

  // ── Apply prefs to rendition ──────────────────────────────────────────
  const applyTheme = useCallback(
    (r: Rendition) => {
      try {
        const t = THEMES[prefs.theme];
        const font = FONT_STACKS[prefs.fontFamily];
        const bodyStyles: Record<string, string> = {
          background: `${t.bg} !important`,
          color: `${t.fg} !important`,
          'font-size': `${prefs.fontSize}% !important`,
          'line-height': `${prefs.lineSpacing} !important`,
          'font-family': `${font} !important`,
        };
        if (rtl) {
          bodyStyles['writing-mode'] = 'vertical-rl !important';
          bodyStyles['-webkit-writing-mode'] = 'vertical-rl !important';
          bodyStyles['text-orientation'] = 'mixed !important';
          bodyStyles['-webkit-text-orientation'] = 'mixed !important';
        }
        getThemes(r).default({
          body: bodyStyles,
          '*': {
            color: `${t.fg} !important`,
            'user-select': 'text !important',
            '-webkit-user-select': 'text !important',
          },
        });
      } catch { /* epubjs themes not ready yet */ }
    },
    [prefs, rtl],
  );
  const applyThemeRef = useRef(applyTheme);
  applyThemeRef.current = applyTheme;

  // ── Init rendition ────────────────────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let dead = false;

    setReady(false);
    setError(null);

    const init = async () => {
      try {
        const rendition = book.renderTo(el, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
        });
        renditionRef.current = rendition;
        applyThemeRef.current(rendition);

        let locTotal = 0;

        const spineItems = getSpineItems(book);
        const spineTotal = spineItems.length;
        if (spineTotal > 0) {
          setTotalLocations(spineTotal);
          setGlobalPage(1);
          globalPageRef.current = 1;
        }

        const updateGlobalPage = (cfi: string | undefined, pct: number) => {
          if (!cfi) return;
          if (locationsReady.current) {
            const locIdx = getLocations(book).locationFromCfi(cfi);
            const pg = typeof locIdx === 'number' && locIdx >= 0 ? locIdx + 1 : 0;
            globalPageRef.current = pg;
            setGlobalPage(pg);
            setTotalLocations(locTotal);
          } else {
            const section = getSpineSection(book, cfi);
            if (section) {
              const pg = section.index + 1;
              globalPageRef.current = pg;
              setGlobalPage(pg);
            }
          }
          progressCbRef.current?.(pct, cfi);
        };

        rendition.on('relocated', (loc: { start?: { cfi?: string; percentage?: number; href?: string } }) => {
          if (dead) return;
          const cfi = loc?.start?.cfi;
          if (cfi) {
            cfiRef.current = cfi;
            saveLastCfi(cfi);
          }
          const pct = Math.round((loc?.start?.percentage ?? 0) * 100);
          setPercent(pct);
          updateGlobalPage(cfi, pct);

          try {
            const href = loc?.start?.href;
            if (href && book.navigation) {
              const tocItems = getNavigationToc(book);
              const match = tocItems.find((t) => href.includes(t.href.split('#')[0]));
              setChapterLabel(match?.label ?? '');
            }
          } catch { /* ignore */ }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, contents: any) => {
          if (dead) return;
          try {
            const sel: Selection | null = contents.window.getSelection();
            const text = sel ? cleanSelectionText(sel) : '';
            setSelectedText(text);
            setSelectedCfi(text ? cfiRange : null);
            setContextSentence(sel && text ? extractSentenceFromSelection(sel) : undefined);
          } catch { /* ignore */ }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.hooks.content.register((contents: any) => {
          contents.document.addEventListener('contextmenu', (e: MouseEvent) => {
            if (dead) return;
            const sel: Selection | null = contents.window.getSelection();
            const text = sel ? cleanSelectionText(sel) : '';
            setSelectedText(text);
            setContextSentence(sel && text ? extractSentenceFromSelection(sel) : undefined);
            if (!text) { setSelectedCfi(null); return; }
            e.preventDefault();
            const iframe = el.querySelector('iframe');
            const ir = iframe?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setCtxMenu({ x: ir.left + e.clientX + 8, y: ir.top + e.clientY + 8 });
          });
        });

        await rendition.display(startCfi.current ?? undefined);
        if (dead) return;
        setReady(true);

        const locationCfis = await getLocations(book).generate(1024);
        if (dead) return;
        locTotal = Array.isArray(locationCfis) ? locationCfis.length : 0;
        locationsReady.current = true;

        const currentCfi = cfiRef.current;
        if (currentCfi) {
          const idx = getLocations(book).locationFromCfi(currentCfi);
          const pg = typeof idx === 'number' && idx >= 0 ? idx + 1 : 1;
          globalPageRef.current = pg;
          setGlobalPage(pg);
          setTotalLocations(locTotal);
        }

        const annotations = getAnnotations(rendition);
        for (const h of highlightsRef.current) {
          try {
            annotations?.add(
              'highlight', h.cfi, { id: h.id }, undefined,
              `hl-${h.color}`, { fill: HIGHLIGHT_COLORS[h.color], 'fill-opacity': '0.35' },
            );
          } catch { /* stale CFI */ }
        }

        await book.loaded.navigation;
        if (!dead) setToc(getNavigationToc(book));
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    };

    void init();

    return () => {
      dead = true;
      locationsReady.current = false;
      if (renditionRef.current) {
        clearRenditionQueue(renditionRef.current);
        try { renditionRef.current.destroy(); } catch { /* epubjs internal teardown */ }
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  // Re-apply theme when prefs change
  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current);
  }, [applyTheme]);

  // Reflow on container resize
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renditionRef.current?.resize(el.clientWidth, el.clientHeight);
      }, 150);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
    };
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────
  const prev = useCallback(() => void renditionRef.current?.prev(), []);
  const next = useCallback(() => void renditionRef.current?.next(), []);
  const onLeftBtn = rtl ? next : prev;
  const onRightBtn = rtl ? prev : next;

  const goToPage = useCallback(
    (pageNum: number) => {
      if (!locationsReady.current) return;
      const idx = Math.max(0, pageNum - 1);
      const cfi = getLocations(book).cfiFromLocation(idx);
      if (cfi && cfi !== -1) void renditionRef.current?.display(cfi);
    },
    [book],
  );

  // ── TTS ───────────────────────────────────────────────────────────────
  const toggleTts = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const iframe = wrapperRef.current?.querySelector('iframe');
    const text = (iframe?.contentDocument?.body?.innerText ?? '').trim();
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  }, [isSpeaking]);

  // ── Bookmarks ─────────────────────────────────────────────────────────
  const addBookmark = useCallback(() => {
    const cfi = cfiRef.current;
    if (!cfi) return;
    addEpubBookmark({ cfi, label: `Page ${globalPageRef.current}/${totalLocations} · ${percent}%` });
  }, [totalLocations, percent, addEpubBookmark]);

  // ── Highlights ────────────────────────────────────────────────────────
  const applyHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selectedText || !selectedCfi) return;
      const ann = getAnnotations(renditionRef.current);
      const styles = (c: HighlightColor) => ({ fill: HIGHLIGHT_COLORS[c], 'fill-opacity': '0.35' });

      const existing = epubHighlights.find((h) => h.cfi === selectedCfi);
      if (existing) {
        try { ann?.remove(existing.cfi, 'highlight'); } catch { /* ok */ }
        if (existing.color === color) {
          removeEpubHighlight(existing.id);
        } else {
          updateEpubHighlightColor(existing.id, color);
          try { ann?.add('highlight', selectedCfi, { id: existing.id }, undefined, `hl-${color}`, styles(color)); } catch { /* ok */ }
        }
        return;
      }

      const h = addEpubHighlight({ cfi: selectedCfi, text: selectedText, color, note: '' });
      try { ann?.add('highlight', selectedCfi, { id: h.id }, undefined, `hl-${color}`, styles(color)); } catch { /* ok */ }
    },
    [selectedText, selectedCfi, epubHighlights, addEpubHighlight, removeEpubHighlight, updateEpubHighlightColor],
  );

  const deleteHighlight = useCallback(
    (id: string) => {
      const h = epubHighlights.find((x) => x.id === id);
      if (h) {
        try { getAnnotations(renditionRef.current)?.remove(h.cfi, 'highlight'); } catch { /* ok */ }
      }
      removeEpubHighlight(id);
    },
    [epubHighlights, removeEpubHighlight],
  );

  // ── Keyboard ──────────────────────────────────────────────────────────
  const leftRef = useRef(onLeftBtn);
  const rightRef = useRef(onRightBtn);
  const ttsRef = useRef(toggleTts);
  const bmRef = useRef(addBookmark);
  leftRef.current = onLeftBtn;
  rightRef.current = onRightBtn;
  ttsRef.current = toggleTts;
  bmRef.current = addBookmark;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': rightRef.current(); break;
        case 'ArrowLeft': case 'ArrowUp': leftRef.current(); break;
        case 'b': case 'B': bmRef.current(); break;
        case 't': case 'T': ttsRef.current(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Close context menu on outside click / scroll ──────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    const onDown = (e: PointerEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return;
      close();
    };
    const iframe = wrapperRef.current?.querySelector('iframe');
    const iDoc = iframe?.contentDocument;
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', close, true);
    iDoc?.addEventListener('pointerdown', close);
    iDoc?.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', close, true);
      iDoc?.removeEventListener('pointerdown', close);
      iDoc?.removeEventListener('scroll', close, true);
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
    renditionRef,
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
    selectedCfi,
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
    addBookmark,
    // highlights
    epubHighlights,
    epubBookmarks,
    applyHighlight,
    deleteHighlight,
    removeEpubBookmark,
    // RTL flag passes through
    rtl,
  };
}

export type TextReaderEngine = ReturnType<typeof useTextReaderEngine>;
