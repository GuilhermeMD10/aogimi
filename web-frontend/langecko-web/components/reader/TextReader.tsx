'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import {
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

// ── Props ────────────────────────────────────────────────────────────────────

export type TextReaderProps = {
  book: Book;
  filename: string;
  initialCfi?: string;
  rtl?: boolean;
  onLookup: (word: string) => void;
  onAddCard: (word: string) => void;
  onProgressChange?: (progress: number, cfi: string) => void;
};

type Panel = 'toc' | 'annotations' | null;

// ═════════════════════════════════════════════════════════════════════════════
// TextReader — reflowable text EPUBs (western LTR or JP RTL via prop)
// ═════════════════════════════════════════════════════════════════════════════

export function TextReader({
  book,
  filename,
  initialCfi,
  rtl = false,
  onLookup,
  onAddCard,
  onProgressChange,
}: TextReaderProps) {
  // ── Local storage ─────────────────────────────────────────────────────
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

  // ── Refs ──────────────────────────────────────────────────────────────
  const wrapperRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const cfiRef = useRef('');
  const progressCbRef = useRef(onProgressChange);
  progressCbRef.current = onProgressChange;

  const startCfi = useRef(initialCfi ?? lastCfi ?? undefined);

  // ── State ─────────────────────────────────────────────────────────────
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
      const t = THEMES[prefs.theme];
      const font = FONT_STACKS[prefs.fontFamily];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r.themes as any).default({
        body: {
          background: `${t.bg} !important`,
          color: `${t.fg} !important`,
          'font-size': `${prefs.fontSize}% !important`,
          'line-height': `${prefs.lineSpacing} !important`,
          'font-family': `${font} !important`,
        },
        '*': {
          color: `${t.fg} !important`,
          'user-select': 'text !important',
          '-webkit-user-select': 'text !important',
        },
      });
    },
    [prefs],
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

        // ── Spine-based page count (available immediately) ──────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const spineItems = (book.spine as any).spineItems ?? [];
        const spineTotal = spineItems.length;
        if (spineTotal > 0) {
          setTotalLocations(spineTotal);
          setGlobalPage(1);
          globalPageRef.current = 1;
        }

        // ── Helper: compute page from CFI ───────────────────────────
        const updateGlobalPage = (cfi: string | undefined, pct: number) => {
          if (!cfi) return;
          if (locationsReady.current) {
            // Locations ready — use fine-grained page numbers
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const locIdx = (book as any).locations.locationFromCfi(cfi);
            const pg = typeof locIdx === 'number' && locIdx >= 0 ? locIdx + 1 : 0;
            globalPageRef.current = pg;
            setGlobalPage(pg);
            setTotalLocations(locTotal);
          } else {
            // Locations still generating — use spine index as fallback
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

        // ── Location changes ────────────────────────────────────────
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

          // Chapter label
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

        // ── Text selection ──────────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.on('selected', (cfiRange: string, contents: any) => {
          if (dead) return;
          try {
            const sel: Selection | null = contents.window.getSelection();
            const text = sel?.toString().trim() ?? '';
            setSelectedText(text);
            setSelectedCfi(text ? cfiRange : null);
          } catch { /* ignore */ }
        });

        // ── Right-click context menu ────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rendition.hooks.content.register((contents: any) => {
          contents.document.addEventListener('contextmenu', (e: MouseEvent) => {
            if (dead) return;
            const sel: Selection | null = contents.window.getSelection();
            const text = sel?.toString().trim() ?? '';
            setSelectedText(text);
            if (!text) { setSelectedCfi(null); return; }
            e.preventDefault();
            const iframe = el.querySelector('iframe');
            const ir = iframe?.getBoundingClientRect() ?? { left: 0, top: 0 };
            setCtxMenu({ x: ir.left + e.clientX + 8, y: ir.top + e.clientY + 8 });
          });
        });

        // ── Display ─────────────────────────────────────────────────
        await rendition.display(startCfi.current ?? undefined);
        if (dead) return;
        setReady(true);

        // ── Generate locations ───────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const locationCfis = await (book as any).locations.generate(1024);
        if (dead) return;
        locTotal = Array.isArray(locationCfis) ? locationCfis.length : 0;
        locationsReady.current = true;

        // Compute initial page
        const currentCfi = cfiRef.current;
        if (currentCfi) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const idx = (book as any).locations.locationFromCfi(currentCfi);
          const pg = typeof idx === 'number' && idx >= 0 ? idx + 1 : 1;
          globalPageRef.current = pg;
          setGlobalPage(pg);
          setTotalLocations(locTotal);
        }

        // Restore highlights
        for (const h of highlightsRef.current) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rendition.annotations as any).add(
              'highlight', h.cfi, { id: h.id }, undefined,
              `hl-${h.color}`, { fill: HIGHLIGHT_COLORS[h.color], 'fill-opacity': '0.35' },
            );
          } catch { /* stale CFI */ }
        }

        // Load TOC
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

  // Re-apply theme when prefs change
  useEffect(() => {
    if (renditionRef.current) applyTheme(renditionRef.current);
  }, [applyTheme]);

  // Reflow rendition when container size changes (width or height)
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
  // RTL (Japanese novels): left = advance (next), right = go back (prev)
  // LTR (Western text): left = prev, right = next
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

  // ── Computed ──────────────────────────────────────────────────────────
  const theme = THEMES[prefs.theme];
  const pageFraction = totalLocations > 0 ? ((globalPage / totalLocations) * 100).toFixed(1) : '0';

  // ═══════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="relative flex h-full min-h-0 flex-col" style={{ background: theme.bg }}>

      {/* ── Top info bar ──────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-2 border-b border-lgc-border px-4 py-2.5"
        style={{
          fontSize: 12,
          color: 'var(--lgc-fg-muted)',
          background: 'color-mix(in oklab, var(--lgc-bg) 85%, transparent)',
          backdropFilter: 'blur(10px)',
          zIndex: 5,
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {chapterLabel && <span className="truncate text-lgc-fg-muted">{chapterLabel}</span>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            className="text-[11px] text-lgc-fg-muted"
            style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
          >
            {globalPage} / {totalLocations}
          </span>
          <div
            className="relative h-0.75 w-15 rounded-full bg-lgc-bg-sunken"
            style={rtl ? { direction: 'rtl' } : undefined}
          >
            <div
              className={`absolute inset-y-0 rounded-full bg-lgc-accent transition-[width] duration-300 ${rtl ? 'right-0' : 'left-0'}`}
              style={{ width: `${pageFraction}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content row ─────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">

        {/* TOC panel */}
        {panel === 'toc' && (
          <div className="w-56 shrink-0 overflow-y-auto border-r border-lgc-border bg-lgc-bg-elev">
            <TocPanel
              items={toc}
              onNavigate={(href) => { void renditionRef.current?.display(href); setPanel(null); }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}

        {/* ── EPUB viewport ──────────────────────────────────────────── */}
        <div className="relative min-w-0 flex-1" style={{ background: theme.bg }}>

          {/* Loading / error overlay */}
          {(error || !ready) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: theme.bg }}>
              {error
                ? <p className="max-w-sm text-center text-sm text-lgc-error">EPUB load error: {error}</p>
                : <p className="text-sm text-lgc-fg-muted">Loading&hellip;</p>}
            </div>
          )}

          <div ref={wrapperRef} className="absolute inset-0 overflow-hidden" />

          {/* ── Typography panel ──────────────────────────────────────── */}
          {showTypo && (
            <div ref={typoPanelRef} className="absolute bottom-16 left-1/2 z-30 -translate-x-1/2">
              <TypographyPanel prefs={prefs} onSavePrefs={savePrefs} onClose={() => setShowTypo(false)} />
            </div>
          )}

          {/* ── Bottom floating toolbar ───────────────────────────────── */}
          <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
            <div className="flex items-center gap-0.5 rounded-xl border border-lgc-border-strong p-1 shadow-lg" style={{ background: 'var(--lgc-bg-elev)' }}>
              {/* Prev / Next */}
              <button type="button" className={ICON_BTN} onClick={onLeftBtn} title={rtl ? 'Next page (advance)' : 'Previous page'}><ChevronLeft size={15} /></button>
              <button type="button" className={ICON_BTN} onClick={onRightBtn} title={rtl ? 'Previous page (go back)' : 'Next page'}><ChevronRight size={15} /></button>

              <span className="mx-1 h-4.5 w-px bg-lgc-border" />

              {/* TOC */}
              <button type="button" className={`${ICON_BTN} ${panel === 'toc' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'toc' ? null : 'toc'))} title="Table of contents"><List size={15} /></button>

              {/* Annotations */}
              <button type="button" className={`${ICON_BTN} ${panel === 'annotations' ? ICON_BTN_ON : ''}`} onClick={() => setPanel((p) => (p === 'annotations' ? null : 'annotations'))} title="Bookmarks & highlights"><Highlighter size={15} /></button>

              {/* Bookmark */}
              <button type="button" className={ICON_BTN} onClick={addBookmark} title="Add bookmark (B)"><BookmarkPlus size={15} /></button>

              <span className="mx-1 h-4.5 w-px bg-lgc-border" />

              {/* Typography */}
              <button data-typo-toggle type="button" className={`${ICON_BTN} ${showTypo ? ICON_BTN_ON : ''}`} onClick={() => setShowTypo((v) => !v)} title="Typography & layout"><Type size={15} /></button>

              {/* TTS */}
              <button type="button" className={`${ICON_BTN} ${isSpeaking ? ICON_BTN_ON : ''}`} onClick={toggleTts} title="Read aloud (T)">
                {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              <span className="mx-1 h-4.5 w-px bg-lgc-border" />

              {/* Page indicator — click to jump */}
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
                <button type="button" onClick={() => setShowPageJump(true)} className="px-2.5 text-[11px] text-lgc-fg-muted transition-colors hover:text-lgc-fg" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} title="Go to page">
                  p. {globalPage}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Annotations panel */}
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

      {/* ── Context menu (portal) ────────────────────────────────────── */}
      {ctxMenu && createPortal(
        <TextContextMenu
          ref={ctxMenuRef}
          x={ctxMenu.x}
          y={ctxMenu.y}
          selectedText={selectedText}
          selectedCfi={selectedCfi}
          epubHighlights={epubHighlights}
          onLookup={() => onLookup(selectedText)}
          onDeepL={() => setTranslation({ text: selectedText, x: ctxMenu.x, y: ctxMenu.y })}
          onHighlight={applyHighlight}
          onAddCard={() => onAddCard(selectedText)}
          onClose={() => setCtxMenu(null)}
        />,
        document.body,
      )}

      {/* ── DeepL translation popup ──────────────────────────────────── */}
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
