// Loader + typed surface for foliate-js, vendored under /public/foliate-js/.
//
// foliate-js ships as ES modules with relative imports (e.g.
// './epubcfi.js'). We load it at runtime by injecting a <script type="module">
// that imports view.js (which registers the <foliate-view> custom element as
// a side effect) and stashes the named export `makeBook` on a global so we
// can read EPUB metadata without rendering — used by EpubReader to detect
// text / novel / manga before mounting the actual engine.
//
// The wrapper types here narrow the parts of the API we actually call. They
// are not exhaustive; foliate's View / Renderer / Book have more surface.

import type { NavItem } from '@/features/books/reader/components/ContentsPanel';

// ── Types ──────────────────────────────────────────────────────────────────

export type FoliateTocItem = {
  label: string;
  href: string;
  id?: number;
  subitems?: FoliateTocItem[];
};

export interface FoliateSection {
  /** The spine item's **href**. foliate has no `section.href` — epub.js builds
   *  sections as `{ id: item.href, ... }` and view.js matches TOC targets
   *  against `sections.map(s => s.id)`. Don't add an `href` field back: it
   *  reads as the obvious name, is always `undefined`, and every
   *  `if (section.href)` guard it feeds is silently dead. */
  id?: string;
  size?: number;
  linear?: string;
  createDocument?: () => Promise<Document>;
}

export interface FoliateBook {
  toc?: FoliateTocItem[];
  sections?: FoliateSection[];
  dir?: 'ltr' | 'rtl' | string;
  rendition?: { layout?: 'pre-paginated' | 'reflowable' | string };
  metadata?: { title?: string; language?: string };
  resolveHref?: (href: string) => { index: number; anchor: unknown } | undefined;
}

/** The `relocate` event's detail. There is deliberately **no top-level
 *  `index`**: view.js `#onRelocate` emits `{ ...progress, tocItem, pageItem,
 *  cfi, range }`, and the spine index lives in `progress.section.current`.
 *  A declared `index` here reads as the spine index, is always `undefined`,
 *  and silently persists 0 into `book_progress.spine_index`. */
export interface FoliateRelocateDetail {
  cfi: string;
  fraction: number;
  size?: number;
  range?: Range;
  tocItem?: { label?: string; href?: string; id?: number };
  pageItem?: { label?: string };
  /** Spine position — `current` is the spine index. Optional because
   *  `progress` is `{}` when foliate built no section progress. */
  section?: { current: number; total: number };
  location?: { current: number; next: number; total: number };
}

export interface FoliateLoadDetail {
  doc: Document;
  index: number;
}

export type FoliateAnnotation = {
  value: string;
  id?: string;
  color?: string;
};

export interface FoliateDrawAnnotationDetail {
  draw: (shape: unknown, opts?: Record<string, unknown>) => void;
  annotation: FoliateAnnotation;
  doc: Document;
  range: Range;
}

export interface FoliateRenderer {
  setStyles?: (css: string) => void;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  tagName: string;
}

export interface FoliateViewElement extends HTMLElement {
  book: FoliateBook;
  renderer: FoliateRenderer;
  open(file: File | Blob): Promise<void>;
  close(): void;
  /** A plain `number` is a spine index (view.js `resolveNavigation`); a string
   *  is an href or a CFI. */
  goTo(
    target: number | string | { index: number; anchor?: unknown } | { fraction: number },
  ): Promise<unknown>;
  goLeft(): void;
  goRight(): void;
  prev(distance?: number): Promise<unknown>;
  next(distance?: number): Promise<unknown>;
  getCFI(index: number, range: Range): string;
  addAnnotation(ann: FoliateAnnotation, remove?: boolean): Promise<unknown>;
  deleteAnnotation(ann: FoliateAnnotation): unknown;
}

type FoliateOverlayerShape = {
  highlight: (rects: DOMRect[], options?: Record<string, unknown>) => unknown;
  underline: (rects: DOMRect[], options?: Record<string, unknown>) => unknown;
};

declare global {
  interface Window {
    __foliate?: {
      makeBook: (file: File | Blob) => Promise<FoliateBook>;
      Overlayer: FoliateOverlayerShape;
    };
  }
}

// ── Loader ─────────────────────────────────────────────────────────────────

const FOLIATE_BASE = '/foliate-js';

let loadPromise: Promise<void> | null = null;

/**
 * Idempotent. Resolves once <foliate-view> is registered and window.__foliate
 * exposes `makeBook`. Safe to call from any client component on mount.
 */
export function loadFoliate(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (customElements.get('foliate-view') && window.__foliate) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    // Inline module: import view.js (side effect: registers <foliate-view>
    // custom element) and stash makeBook on a global. Other foliate modules
    // — paginator, fixed-layout, epub, comic-book, fb2, mobi — are
    // dynamic-imported by view.js itself on demand.
    script.textContent = `
      import { makeBook } from '${FOLIATE_BASE}/view.js';
      import { Overlayer } from '${FOLIATE_BASE}/overlayer.js';
      window.__foliate = { makeBook, Overlayer };
      window.dispatchEvent(new Event('foliate:ready'));
    `;
    const onReady = () => {
      customElements
        .whenDefined('foliate-view')
        .then(() => resolve())
        .catch(reject);
    };
    window.addEventListener('foliate:ready', onReady, { once: true });
    script.addEventListener('error', () =>
      reject(new Error(`Failed to load ${FOLIATE_BASE}/view.js`)),
    );
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Load the EPUB metadata (sections, toc, rendition, dir) without mounting a
 * renderer. Used by the EpubReader router to pick text/novel/manga before
 * the visible engine takes over.
 */
export async function makeBookFromBlob(blob: Blob): Promise<FoliateBook> {
  await loadFoliate();
  const make = window.__foliate?.makeBook;
  if (!make) throw new Error('foliate makeBook unavailable');
  const file = new File([blob], 'book.epub', { type: 'application/epub+zip' });
  return make(file);
}

/**
 * Create a <foliate-view> element. Caller is responsible for inserting it
 * into the DOM and calling view.open(file).
 */
export function createFoliateView(): FoliateViewElement {
  return document.createElement('foliate-view') as FoliateViewElement;
}

/**
 * Flatten foliate's nested TOC into the linear shape the TocPanel expects.
 * `subitems` is recursive on both sides, so this is a near-identity copy that
 * just normalises labels.
 */
export function flattenFoliateToc(items: FoliateTocItem[] | undefined): NavItem[] {
  if (!items) return [];
  return items.map((it) => ({
    label: (it.label ?? '').trim(),
    href: it.href ?? '',
    subitems: it.subitems ? flattenFoliateToc(it.subitems) : undefined,
  }));
}
