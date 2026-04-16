'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import {
  FONT_STACKS,
  HIGHLIGHT_COLORS,
  useBookStorage,
  type HighlightColor,
  type ReaderPrefs,
} from '@/components/reader/useBookStorage';
import { TocPanel, type NavItem } from '@/components/reader/TocPanel';
import { AnnotationsPanel } from '@/components/reader/AnnotationsPanel';
import { DeepLTranslationPopup } from '@/components/DeepLTranslationPopup';

// ── Types ────────────────────────────────────────────────────────────────────

type Panel = 'toc' | 'annotations' | null;

type Props = {
  fileUrl: string;
  filename: string;
  onLookup: (word: string) => void;
  onAddCard: (word: string) => void;
};

// ── Theme maps ───────────────────────────────────────────────────────────────

const EPUB_THEMES: Record<ReaderPrefs['theme'], Record<string, string>> = {
  light: { background: '#ffffff', color: '#1a1a1a' },
  dark:  { background: '#1e1e1e', color: '#d4d4d4' },
  sepia: { background: '#f8f1e3', color: '#3b2f2f' },
};

const CONTAINER_BG: Record<ReaderPrefs['theme'], string> = {
  light: 'bg-white',
  dark:  'bg-[#1e1e1e]',
  sepia: 'bg-[#f8f1e3]',
};

// ── Shared button styles ─────────────────────────────────────────────────────

const btn     = 'flex items-center rounded border border-lumina-border-divider px-2 py-0.5 text-xs hover:bg-lumina-primary-text/5 shrink-0';
const btnOn   = 'bg-lumina-primary-teal border-lumina-primary-teal text-black';

// ── Component ────────────────────────────────────────────────────────────────

export function EpubReader({ fileUrl, filename, onLookup, onAddCard }: Props) {
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

  // ── Refs ──────────────────────────────────────────────────────────────────
  const containerRef   = useRef<HTMLDivElement>(null);
  const bookRef        = useRef<Book | null>(null);
  const renditionRef   = useRef<Rendition | null>(null);
  const currentCfiRef  = useRef<string>('');
  // Updated every render — lets the load effect read the latest CFI without
  // being in its dependency array, which would cause unnecessary reloads.
  const restoreCfiRef  = useRef<string | undefined>(lastCfi);
  restoreCfiRef.current = lastCfi;

  // ── State ─────────────────────────────────────────────────────────────────
  const [renditionKey,    setRenditionKey]    = useState(0);
  const [progress,        setProgress]        = useState(0);
  const [toc,             setToc]             = useState<NavItem[]>([]);
  const [panel,           setPanel]           = useState<Panel>(null);
  const [showRuler,       setShowRuler]       = useState(false);
  const [rulerOffset,     setRulerOffset]     = useState(40);
  const [isSpeaking,      setIsSpeaking]      = useState(false);
  const [selectedText,    setSelectedText]    = useState('');
  const [selectedCfi,     setSelectedCfi]     = useState<string | null>(null);
  const [contextMenu,     setContextMenu]     = useState<{ x: number; y: number } | null>(null);
  const [translationPopup, setTranslationPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const [loadError,       setLoadError]       = useState<string | null>(null);
  const [loadStep,        setLoadStep]        = useState<string>('idle');
  const [isVerticalText,  setIsVerticalText]  = useState(false);
  const isVerticalTextRef = useRef(false);
  isVerticalTextRef.current = isVerticalText;
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // ── Prefs → rendition (stable ref, updated every render) ─────────────────
  const applyPrefs = useCallback(
    (rendition: Rendition) => {
      const t    = EPUB_THEMES[prefs.theme];
      const font = FONT_STACKS[prefs.fontFamily];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (rendition.themes as any).default({
        body: {
          background:    `${t.background} !important`,
          color:         `${t.color} !important`,
          'font-size':   `${prefs.fontSize}% !important`,
          'line-height': `${prefs.lineSpacing} !important`,
          'font-family': `${font} !important`,
        },
        '*': {
          color:                 `${t.color} !important`,
          'user-select':         'text !important',
          '-webkit-user-select': 'text !important',
        },
      });
    },
    [prefs],
  );

  // Direct ref assignment (no effect needed — safe to mutate a ref in render).
  const applyPrefsRef    = useRef(applyPrefs);
  applyPrefsRef.current  = applyPrefs;

  // Keep highlights readable from inside the load effect without depending on them.
  const epubHighlightsRef = useRef(epubHighlights);
  epubHighlightsRef.current = epubHighlights;

  // ── Detect writing-mode from the rendered iframe ────────────────────────
  const detectWritingMode = useCallback(() => {
    const iframe = containerRef.current?.querySelector('iframe');
    const body = iframe?.contentDocument?.body;
    if (!body) return;
    const wm = getComputedStyle(body).writingMode;
    setIsVerticalText(wm === 'vertical-rl' || wm === 'vertical-lr');
  }, []);

  // ── Load / reload EPUB ────────────────────────────────────────────────────
  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;
    let cancelled = false;

    setLoadError(null);
    setLoadStep('importing');
    const load = async () => {
      try {
        const [mod, arrayBuffer] = await Promise.all([
          import('epubjs'),
          fetch(fileUrl).then(r => r.arrayBuffer()),
        ]);
        if (cancelled || !containerRef.current) return;
        setLoadStep('opening');

        const book = (mod.default as (data: ArrayBuffer) => Book)(arrayBuffer);
        bookRef.current = book;
        setLoadStep('rendering');

        const rendition = book.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          flow: prefs.flowMode === 'scrolled' ? 'scrolled-doc' : 'paginated',
        });
        renditionRef.current = rendition;

        applyPrefsRef.current(rendition);

        // ── Register hooks and event listeners BEFORE display ──────────
        // hooks.content fires once per content section load — if we
        // register after display() the initial section is already loaded
        // and the hook never fires for it.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('relocated', (loc: any) => {
          if (cancelled) return;
          const cfi = loc?.start?.cfi as string | undefined;
          if (cfi) { currentCfiRef.current = cfi; saveLastCfi(cfi); }
          setProgress(Math.round(((loc?.start?.percentage as number) ?? 0) * 100));
          detectWritingMode();
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, contents: any) => {
          if (cancelled) return;
          try {
            const sel: Selection | null = contents.window.getSelection();
            const text = sel?.toString().trim() ?? '';
            setSelectedText(text);
            setSelectedCfi(text ? cfiRange : null);
          } catch { /* ignore */ }
        });

        // Bridge right-click from inside the iframe to show a custom
        // context menu.  Must be registered before display() so the
        // initial content section gets the listener.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.hooks.content.register((contents: any) => {
          contents.document.addEventListener('contextmenu', (e: MouseEvent) => {
            if (cancelled) return; // guard against state-after-unmount
            const sel: Selection | null = contents.window.getSelection();
            const text = sel?.toString().trim() ?? '';
            setSelectedText(text);
            if (!text) { setSelectedCfi(null); return; } // no selection → browser default

            e.preventDefault();
            const iframe = containerRef.current?.querySelector('iframe');
            const ir = iframe?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setContextMenu({ x: ir.left + e.clientX + 8, y: ir.top + e.clientY + 8 });
          });
        });

        // ── Display ────────────────────────────────────────────────────
        setLoadStep('displaying');
        await rendition.display(restoreCfiRef.current ?? undefined);
        if (cancelled) return;

        setLoadStep('ready');
        detectWritingMode();

        // Restore saved highlights once on initial display
        for (const h of epubHighlightsRef.current) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rendition.annotations as any).add(
              'highlight', h.cfi, { id: h.id }, undefined, `hl-${h.color}`,
              { fill: HIGHLIGHT_COLORS[h.color], 'fill-opacity': '0.35' },
            );
          } catch { /* CFI may no longer be valid */ }
        }

        await book.loaded.navigation;
        if (!cancelled) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setToc(((book.navigation as any).toc as NavItem[]) ?? []);
        }
      } catch (err) {
        console.error('[EpubReader] load failed:', err);
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      }
    };

    void load();

    return () => {
      cancelled = true;
      renditionRef.current?.destroy();
      renditionRef.current = null;
      bookRef.current?.destroy();
      bookRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, renditionKey]);

  // Re-apply prefs when they change without reloading the book
  useEffect(() => {
    if (renditionRef.current) applyPrefs(renditionRef.current);
  }, [applyPrefs]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const handleTts = useCallback(() => {
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const iframe = containerRef.current?.querySelector('iframe');
    const text = (iframe?.contentDocument?.body?.innerText ?? '').trim();
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.onend  = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
    setIsSpeaking(true);
  }, [isSpeaking]);

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const handleBookmark = useCallback(() => {
    const cfi = currentCfiRef.current;
    if (!cfi) return;
    addEpubBookmark({ cfi, label: `Position ${progress}%` });
  }, [progress, addEpubBookmark]);

  // ── Highlight (add / switch color / remove toggle) ─────────────────────────
  const handleHighlight = useCallback(
    (color: HighlightColor) => {
      if (!selectedText || !selectedCfi) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotations = renditionRef.current?.annotations as any;
      const hlStyles = (c: HighlightColor) => ({ fill: HIGHLIGHT_COLORS[c], 'fill-opacity': '0.35' });

      const existing = epubHighlights.find(h => h.cfi === selectedCfi);
      if (existing) {
        // Always remove the visual mark first
        try { annotations?.remove(existing.cfi, 'highlight'); } catch { /* ignore */ }

        if (existing.color === color) {
          // Same color → toggle off
          removeEpubHighlight(existing.id);
        } else {
          // Different color → swap
          updateEpubHighlightColor(existing.id, color);
          try {
            annotations?.add(
              'highlight', selectedCfi, { id: existing.id }, undefined, `hl-${color}`, hlStyles(color),
            );
          } catch { /* ignore */ }
        }
        return;
      }

      // New highlight
      const h = addEpubHighlight({ cfi: selectedCfi, text: selectedText, color, note: '' });
      try {
        annotations?.add(
          'highlight', selectedCfi, { id: h.id }, undefined, `hl-${color}`, hlStyles(color),
        );
      } catch { /* ignore */ }
    },
    [selectedText, selectedCfi, epubHighlights, addEpubHighlight, removeEpubHighlight, updateEpubHighlightColor],
  );

  // ── Delete highlight ──────────────────────────────────────────────────────
  const handleDeleteHighlight = useCallback(
    (id: string) => {
      const h = epubHighlights.find(x => x.id === id);
      if (h) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (renditionRef.current?.annotations as any)?.remove(h.cfi, 'highlight');
        } catch { /* ignore */ }
      }
      removeEpubHighlight(id);
    },
    [epubHighlights, removeEpubHighlight],
  );

  // ── Flow mode toggle ──────────────────────────────────────────────────────
  const toggleFlow = useCallback(() => {
    savePrefs({ flowMode: prefs.flowMode === 'scrolled' ? 'paginated' : 'scrolled' });
    setRenditionKey(k => k + 1);
  }, [prefs.flowMode, savePrefs]);

  // ── Keyboard shortcuts (stable via ref pattern) ───────────────────────────
  const handleTtsRef      = useRef(handleTts);
  const handleBookmarkRef = useRef(handleBookmark);
  handleTtsRef.current      = handleTts;
  handleBookmarkRef.current = handleBookmark;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': void renditionRef.current?.next(); break;
        case 'ArrowLeft':  case 'ArrowUp':   void renditionRef.current?.prev(); break;
        case 'b': case 'B': handleBookmarkRef.current(); break;
        case 'r': case 'R': setShowRuler(v => !v); break;
        case 't': case 'T': handleTtsRef.current(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Close context menu on outside click / scroll ─────────────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onPointerDown = (e: PointerEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      close();
    };
    // Also close if user clicks inside the iframe
    const iframe = containerRef.current?.querySelector('iframe');
    const iframeDoc = iframe?.contentDocument;
    const iframeClose = () => close();

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', close, true);
    iframeDoc?.addEventListener('pointerdown', iframeClose);
    iframeDoc?.addEventListener('scroll', iframeClose, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', close, true);
      iframeDoc?.removeEventListener('pointerdown', iframeClose);
      iframeDoc?.removeEventListener('scroll', iframeClose, true);
    };
  }, [contextMenu]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-lumina-border-divider px-2 py-1">

        <button type="button" onClick={toggleFlow} className={btn} title="Toggle scroll / paginated">
          {prefs.flowMode === 'scrolled' ? 'Scroll' : 'Pages'}
        </button>

        {prefs.flowMode === 'paginated' && (
          <>
            <button type="button" className={btn} onClick={() => renditionRef.current?.prev()} title="Previous (←)">←</button>
            <button type="button" className={btn} onClick={() => renditionRef.current?.next()} title="Next (→)">→</button>
          </>
        )}

        <span className="h-4 w-px shrink-0 bg-lumina-border-divider" />

        <button type="button" className={btn} onClick={() => savePrefs({ fontSize: Math.max(70,  prefs.fontSize - 10) })}>A−</button>
        <span className="shrink-0 text-xs text-lumina-secondary-text">{prefs.fontSize}%</span>
        <button type="button" className={btn} onClick={() => savePrefs({ fontSize: Math.min(200, prefs.fontSize + 10) })}>A+</button>

        <button type="button" className={btn} onClick={() => savePrefs({ lineSpacing: Math.max(1.0, Number((prefs.lineSpacing - 0.2).toFixed(1))) })} title="Decrease line spacing">≡−</button>
        <button type="button" className={btn} onClick={() => savePrefs({ lineSpacing: Math.min(3.0, Number((prefs.lineSpacing + 0.2).toFixed(1))) })} title="Increase line spacing">≡+</button>

        <select value={prefs.theme} onChange={e => savePrefs({ theme: e.target.value as ReaderPrefs['theme'] })} className="rounded border border-lumina-border-divider px-1 py-0.5 text-xs">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="sepia">Sepia</option>
        </select>

        <select value={prefs.fontFamily} onChange={e => savePrefs({ fontFamily: e.target.value as ReaderPrefs['fontFamily'] })} className="rounded border border-lumina-border-divider px-1 py-0.5 text-xs" title="Font">
          <option value="system">System</option>
          <option value="sans-jp">Sans JP</option>
          <option value="serif-jp">Serif JP</option>
        </select>

        <span className="h-4 w-px shrink-0 bg-lumina-border-divider" />

        <button type="button" className={`${btn} ${panel === 'toc' ? btnOn : ''}`} onClick={() => setPanel(p => p === 'toc' ? null : 'toc')} title="Table of contents">TOC</button>
        <button type="button" className={`${btn} ${panel === 'annotations' ? btnOn : ''}`} onClick={() => setPanel(p => p === 'annotations' ? null : 'annotations')} title="Bookmarks & highlights">Notes</button>
        <button type="button" className={btn} onClick={handleBookmark} title="Add bookmark (B)">⊕</button>
        <button type="button" className={`${btn} ${showRuler ? btnOn : ''}`} onClick={() => setShowRuler(v => !v)} title="Reading ruler (R)">—</button>
        <button type="button" className={`${btn} ${isSpeaking ? btnOn : ''}`} onClick={handleTts} title="Read aloud (T)">{isSpeaking ? '■' : '▶'}</button>

        <span className="ml-auto shrink-0 text-xs text-lumina-secondary-text">{progress}%</span>
      </div>

      {/* ── Content row ───────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">

        {panel === 'toc' && (
          <div className="w-52 shrink-0 overflow-y-auto border-r border-lumina-border-divider bg-lumina-surface-background">
            <TocPanel items={toc} onNavigate={href => { void renditionRef.current?.display(href); setPanel(null); }} onClose={() => setPanel(null)} />
          </div>
        )}

        <div className={`relative min-w-0 flex-1 ${CONTAINER_BG[prefs.theme]}`}>
          {(loadError || (loadStep !== 'idle' && loadStep !== 'ready')) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-lumina-surface-background/90 p-4">
              {loadError
                ? <p className="max-w-md text-center text-sm text-red-600">EPUB load error: {loadError}</p>
                : <p className="text-sm text-lumina-secondary-text">Loading… (step: {loadStep})</p>}
            </div>
          )}

          <div ref={containerRef} className="h-full w-full" />

          {showRuler && (
            isVerticalText ? (
              <div className="pointer-events-none absolute inset-y-0" style={{ right: `${rulerOffset}%` }}>
                <div className="h-full w-8 border-x border-yellow-300/60 bg-yellow-200/25" />
                <div className="pointer-events-auto absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
                  <button type="button" onClick={() => setRulerOffset(v => Math.min(90, v + 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">←</button>
                  <button type="button" onClick={() => setRulerOffset(v => Math.max(5,  v - 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">→</button>
                </div>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-x-0" style={{ top: `${rulerOffset}%` }}>
                <div className="h-8 border-y border-yellow-300/60 bg-yellow-200/25" />
                <div className="pointer-events-auto absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <button type="button" onClick={() => setRulerOffset(v => Math.max(5,  v - 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">↑</button>
                  <button type="button" onClick={() => setRulerOffset(v => Math.min(90, v + 5))} className="text-xs leading-none text-lumina-secondary-text hover:text-lumina-primary-text">↓</button>
                </div>
              </div>
            )
          )}
        </div>

        {panel === 'annotations' && (
          <div className="w-52 shrink-0 overflow-y-auto border-l border-lumina-border-divider bg-lumina-surface-background">
            <AnnotationsPanel
              epubHighlights={epubHighlights}
              epubBookmarks={epubBookmarks}
              onJumpEpubHighlight={h => { void renditionRef.current?.display(h.cfi); setPanel(null); }}
              onDeleteEpubHighlight={handleDeleteHighlight}
              onJumpEpubBookmark={b => { void renditionRef.current?.display(b.cfi); setPanel(null); }}
              onDeleteEpubBookmark={removeEpubBookmark}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
      </div>

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      <div className="h-0.5 shrink-0 bg-lumina-border-divider">
        <div className="h-full bg-lumina-primary-teal transition-[width]" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Context menu (portal) ────────────────────────────────────────── */}
      {contextMenu && createPortal(
        <div
          ref={contextMenuRef}
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 50 }}
          className="min-w-36 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95"
        >
          <p className="px-1.5 py-1 text-xs font-medium text-muted-foreground">
            &ldquo;{selectedText.slice(0, 40)}{selectedText.length > 40 ? '…' : ''}&rdquo;
          </p>
          <div className="-mx-1 my-1 h-px bg-border" />
          <button type="button" onClick={() => { onLookup(selectedText); setContextMenu(null); }} className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">Look up in dictionary</button>
          <button type="button" onClick={() => { onAddCard(selectedText); setContextMenu(null); }} className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">Add as flashcard</button>
          <div className="-mx-1 my-1 h-px bg-border" />
          <button type="button" onClick={() => { setTranslationPopup({ text: selectedText, x: contextMenu.x, y: contextMenu.y }); setContextMenu(null); }} className="flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground">Translate with DeepL</button>
          <div className="-mx-1 my-1 h-px bg-border" />
          <div className="flex items-center gap-2 px-1.5 py-1.5">
            <span className="text-xs text-muted-foreground">Highlight:</span>
            {(['yellow', 'green', 'blue'] as HighlightColor[]).map(c => {
              const active = selectedCfi ? epubHighlights.find(h => h.cfi === selectedCfi)?.color === c : false;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { handleHighlight(c); setContextMenu(null); }}
                  className="relative h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110"
                  style={{ background: HIGHLIGHT_COLORS[c] }}
                  title={active ? `Remove ${c} highlight` : c}
                >
                  {active && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none text-white drop-shadow-sm">✕</span>}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}

      {/* ── DeepL translation popup ───────────────────────────────────────── */}
      {translationPopup && (
        <DeepLTranslationPopup
          originalText={translationPopup.text}
          position={{ x: translationPopup.x, y: translationPopup.y }}
          onClose={() => setTranslationPopup(null)}
        />
      )}
    </div>
  );
}
