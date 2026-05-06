'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  List,
  Type,
  Volume2,
  VolumeX,
  Highlighter,
  BookmarkPlus,
} from 'lucide-react';
import {
  FONT_STACKS,
  HIGHLIGHT_COLORS,
  useBookStorage,
  type HighlightColor,
} from '@/components/reader/useBookStorage';
import { TocPanel, type NavItem } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { DeepLTranslationPopup } from '@/components/DeepLTranslationPopup';
import { THEMES, ICON_BTN, ICON_BTN_ON } from '@/components/reader/readerConstants';
import { TypographyPanel } from '@/components/reader/TypographyPanel';
import { TextContextMenu } from '@/components/reader/TextContextMenu';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';

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

function cleanSelectionText(sel: Selection): string {
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

function extractSentenceFromSelection(sel: Selection): string | undefined {
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

export type TextReaderProps = {
  book: Book;
  filename: string;
  bookTitle: string;
  initialCfi?: string;
  rtl?: boolean;
  onLookup: (word: string, contextSentence?: string) => void;
  onAddCard: (word: string, contextSentence?: string) => void;
  onProgressChange?: (progress: number, cfi: string) => void;
  onBack: () => void;
};

type Panel = 'toc' | 'annotations' | null;

export function TextReader({
  book,
  filename,
  bookTitle,
  initialCfi,
  rtl = false,
  onLookup,
  onAddCard,
  onProgressChange,
  onBack,
}: TextReaderProps) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r.themes as any).default({
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spineItems = (book.spine as any).spineItems ?? [];
        const spineTotal = spineItems.length;
        if (spineTotal > 0) {
          setTotalLocations(spineTotal);
          setGlobalPage(1);
          globalPageRef.current = 1;
        }

        const updateGlobalPage = (cfi: string | undefined, pct: number) => {
          if (!cfi) return;
          if (locationsReady.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const locIdx = (book as any).locations.locationFromCfi(cfi);
            const pg = typeof locIdx === 'number' && locIdx >= 0 ? locIdx + 1 : 0;
            globalPageRef.current = pg;
            setGlobalPage(pg);
            setTotalLocations(locTotal);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const section = (book.spine as any).get(cfi);
            if (section) {
              const pg = section.index + 1;
              globalPageRef.current = pg;
              setGlobalPage(pg);
            }
          }
          progressCbRef.current?.(pct, cfi);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (loc: any) => {
          if (dead) return;
          const cfi = loc?.start?.cfi as string | undefined;
          if (cfi) {
            cfiRef.current = cfi;
            saveLastCfi(cfi);
          }
          const pct = Math.round(((loc?.start?.percentage as number) ?? 0) * 100);
          setPercent(pct);
          updateGlobalPage(cfi, pct);

          try {
            const href = loc?.start?.href as string | undefined;
            if (href && book.navigation) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tocItems = (book.navigation as any).toc as NavItem[] | undefined;
              const match = tocItems?.find((t) => href.includes(t.href.split('#')[0]));
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const locationCfis = await (book as any).locations.generate(1024);
        if (dead) return;
        locTotal = Array.isArray(locationCfis) ? locationCfis.length : 0;
        locationsReady.current = true;

        const currentCfi = cfiRef.current;
        if (currentCfi) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const idx = (book as any).locations.locationFromCfi(currentCfi);
          const pg = typeof idx === 'number' && idx >= 0 ? idx + 1 : 1;
          globalPageRef.current = pg;
          setGlobalPage(pg);
          setTotalLocations(locTotal);
        }

        for (const h of highlightsRef.current) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rendition.annotations as any).add(
              'highlight', h.cfi, { id: h.id }, undefined,
              `hl-${h.color}`, { fill: HIGHLIGHT_COLORS[h.color], 'fill-opacity': '0.35' },
            );
          } catch { /* stale CFI */ }
        }

        await book.loaded.navigation;
        if (!dead) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setToc(((book.navigation as any).toc as NavItem[]) ?? []);
        }
      } catch (err) {
        if (!dead) setError(err instanceof Error ? err.message : String(err));
      }
    };

    void init();

    return () => {
      dead = true;
      locationsReady.current = false;
      if (renditionRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (renditionRef.current as any).q?.clear();
        try { renditionRef.current.destroy(); } catch { /* epubjs internal teardown */ }
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current);
  }, [applyTheme]);

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

  const prev = useCallback(() => void renditionRef.current?.prev(), []);
  const next = useCallback(() => void renditionRef.current?.next(), []);
  const onLeftBtn = rtl ? next : prev;
  const onRightBtn = rtl ? prev : next;

  const goToPage = useCallback(
    (pageNum: number) => {
      if (!locationsReady.current) return;
      const idx = Math.max(0, pageNum - 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cfi = (book as any).locations.cfiFromLocation(idx);
      if (cfi && cfi !== -1) void renditionRef.current?.display(cfi);
    },
    [book],
  );

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

  const addBookmark = useCallback(() => {
    const cfi = cfiRef.current;
    if (!cfi) return;
    addEpubBookmark({ cfi, label: `Page ${globalPageRef.current}/${totalLocations} · ${percent}%` });
  }, [totalLocations, percent, addEpubBookmark]);

  const applyHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selectedText || !selectedCfi) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ann = renditionRef.current?.annotations as any;
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
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renditionRef.current?.annotations as any)?.remove(h.cfi, 'highlight');
        } catch { /* ok */ }
      }
      removeEpubHighlight(id);
    },
    [epubHighlights, removeEpubHighlight],
  );

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

  const theme = THEMES[prefs.theme];
  const pageFraction = totalLocations > 0 ? ((globalPage / totalLocations) * 100).toFixed(1) : '0';

  return (
    <div className="relative flex h-full min-h-0 flex-col" style={{ background: theme.bg }}>
      <div
        className="flex shrink-0 items-center gap-2 border-b border-lgc-border px-2 py-1"
        style={{
          fontSize: 12,
          color: 'var(--lgc-fg-muted)',
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
          zIndex: 5,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center gap-1 px-1.5 py-1 text-[12px] text-lgc-fg-muted transition-colors hover:bg-lgc-bg-sunken hover:text-lgc-fg"
          title="Back to library"
          style={{ borderRadius: 6 }}
        >
          <ArrowLeft size={12} />
          <span>Books</span>
        </button>
        <span
          className="min-w-0 max-w-[24ch] shrink truncate text-[12px] font-medium text-lgc-fg"
          style={{ fontFamily: 'var(--lgc-font-display)' }}
          title={bookTitle}
        >
          {bookTitle}
        </span>

        <span className="mx-0.5 h-4 w-px shrink-0 bg-lgc-border" />

        {chapterLabel && (
          <span className="min-w-0 max-w-[24ch] shrink truncate text-[11.5px] text-lgc-fg-muted">
            {chapterLabel}
          </span>
        )}
        <span
          className="shrink-0 text-[11px] text-lgc-fg-muted"
          style={{
            fontFamily: 'var(--lgc-font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {globalPage} / {totalLocations}
        </span>
        <ReaderProgressBar fraction={Number(pageFraction)} rtl={rtl} />

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button type="button" className={ICON_BTN} onClick={onLeftBtn} title={rtl ? 'Next page (advance)' : 'Previous page'}><ChevronLeft size={14} /></button>
          <button type="button" className={ICON_BTN} onClick={onRightBtn} title={rtl ? 'Previous page (go back)' : 'Next page'}><ChevronRight size={14} /></button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          <button type="button" className={`${ICON_BTN} ${panel === 'toc' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'toc' ? null : 'toc'))} title="Table of contents"><List size={14} /></button>
          <button type="button" className={`${ICON_BTN} ${panel === 'annotations' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'annotations' ? null : 'annotations'))} title="Bookmarks & highlights"><Highlighter size={14} /></button>
          <button type="button" className={ICON_BTN} onClick={addBookmark} title="Add bookmark (B)"><BookmarkPlus size={14} /></button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          <button data-typo-toggle type="button" className={`${ICON_BTN} ${showTypo ? ICON_BTN_ON : ''}`} onClick={() => setShowTypo((v) => !v)} title="Typography & layout"><Type size={14} /></button>
          <button type="button" className={`${ICON_BTN} ${isSpeaking ? ICON_BTN_ON : ''}`} onClick={toggleTts} title="Read aloud (T)">
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <span className="mx-1 h-4 w-px bg-lgc-border" />

          {showPageJump ? (
            <form
              className="flex items-center px-1"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.currentTarget.elements as HTMLFormControlsCollection).namedItem('page') as HTMLInputElement;
                const val = parseInt(input.value, 10);
                if (val > 0 && val <= totalLocations) goToPage(val);
                setShowPageJump(false);
              }}
            >
              <input
                name="page" type="number" min={1} max={totalLocations} defaultValue={globalPage} autoFocus
                onBlur={() => setShowPageJump(false)}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowPageJump(false); }}
                className="w-12 rounded-md border border-lgc-border bg-lgc-bg-sunken px-1.5 py-0.5 text-center text-[11px] text-lgc-fg outline-none focus:border-lgc-accent"
                style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
              />
            </form>
          ) : (
            <button type="button" onClick={() => setShowPageJump(true)} className="px-2 text-[11px] text-lgc-fg-muted transition-colors hover:text-lgc-fg" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} title="Go to page">
              p. {globalPage}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        {panel === 'toc' && (
          <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
            <TocPanel
              items={toc}
              onNavigate={(href) => { void renditionRef.current?.display(href); setPanel(null); }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        <div className="relative min-w-0 flex-1" style={{ background: theme.bg }}>
          {(error || !ready) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: theme.bg }}>
              {error
                ? <p className="max-w-sm text-center text-sm text-lgc-error">EPUB load error: {error}</p>
                : <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
            </div>
          )}

          <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" />

          {showTypo && (
            <div ref={typoPanelRef} className="absolute right-3 top-2 z-30">
              <TypographyPanel prefs={prefs} onSavePrefs={savePrefs} onClose={() => setShowTypo(false)} />
            </div>
          )}
        </div>

        {panel === 'annotations' && (
          <div className="w-56 shrink-0 overflow-y-auto border-l border-lgc-border bg-lgc-bg-elev">
            <AnnotationsPanel
              epubHighlights={epubHighlights}
              epubBookmarks={epubBookmarks}
              onJumpEpubHighlight={(h) => { void renditionRef.current?.display(h.cfi); setPanel(null); }}
              onDeleteEpubHighlight={deleteHighlight}
              onJumpEpubBookmark={(b) => { void renditionRef.current?.display(b.cfi); setPanel(null); }}
              onDeleteEpubBookmark={removeEpubBookmark}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
      </div>

      {ctxMenu && createPortal(
        <TextContextMenu
          ref={ctxMenuRef}
          x={ctxMenu.x}
          y={ctxMenu.y}
          selectedText={selectedText}
          selectedCfi={selectedCfi}
          epubHighlights={epubHighlights}
          onLookup={() => onLookup(selectedText, contextSentence)}
          onDeepL={() => setTranslation({ text: selectedText, x: ctxMenu.x, y: ctxMenu.y })}
          onHighlight={applyHighlight}
          onAddCard={() => onAddCard(selectedText, contextSentence)}
          onClose={() => setCtxMenu(null)}
        />,
        document.body,
      )}

      {translation && (
        <DeepLTranslationPopup
          originalText={translation.text}
          position={{ x: translation.x, y: translation.y }}
          onClose={() => setTranslation(null)}
        />
      )}
    </div>
  );
}
