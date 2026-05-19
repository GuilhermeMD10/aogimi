// HTML template for the foliate-js WebView reader (next-gen path).
//
// Same architectural shape as epubHtml.ts -- a single WebView shell, one
// custom element (<foliate-view>) that handles rendering/pagination, and a
// JSON message bridge to/from RN. The wire format is intentionally identical
// to the epubjs bridge so FoliateReader.tsx is a drop-in replacement for
// EpubReader.tsx once we flip the flag in ReaderScreen.
//
// Status (initial scaffold): book opens, navigation works, relocate events
// fire. Style themes, view modes, highlights, and selection are stubbed --
// they'll be wired in the next migration pass.

import { FOLIATE_SOURCE } from './foliateLibs';

// ── Bridge types (kept identical to epubHtml.ts so RN doesn't care which
//    engine is running) ────────────────────────────────────────────────────

export type BookType = 'text' | 'novel' | 'manga';
export type ReaderViewMode = 'single' | 'double' | 'scroll';

export type ReaderThemeStyle = {
  bg: string;
  fg: string;
  fontFamily: string;
  fontPx: number;
  lineHeight: number;
  vertical: boolean;
};

export type EpubTocItem = { label: string; href: string };
export type HighlightStyle = { id: string; cfi: string; color: string };

export type FoliateBridgeInbound =
  | {
      type: 'load';
      base64: string;
      cfi?: string | null;
      style: ReaderThemeStyle;
      highlights: HighlightStyle[];
      viewport: { width: number; height: number };
    }
  | { type: 'setStyle'; style: ReaderThemeStyle }
  | { type: 'setViewMode'; mode: ReaderViewMode }
  | { type: 'setSize'; width: number; height: number }
  | { type: 'goToCfi'; cfi: string }
  | { type: 'goToSpine'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'addHighlight'; id: string; cfi: string; color: string }
  | { type: 'removeHighlight'; cfi: string };

export type FoliateBridgeOutbound =
  | {
      type: 'ready';
      toc: EpubTocItem[];
      bookType: BookType;
      direction: 'ltr' | 'rtl';
      spineCount: number;
    }
  | { type: 'error'; message: string }
  | {
      type: 'relocated';
      cfi: string;
      progress: number;
      page: number;
      totalPages: number;
      spineIndex: number;
      spineTotal: number;
      chapterHref?: string;
      chapterLabel?: string;
    }
  | { type: 'selection'; text: string; cfi: string; pageX: number; pageY: number };

// ── HTML shell ─────────────────────────────────────────────────────────────

export const FOLIATE_HTML = String.raw`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta id="viewport-meta" name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
      background: var(--reader-bg, #FAFAF9);
      color: var(--reader-fg, #1A1918);
      font-family: -apple-system, "SF Pro Text", system-ui, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
    body.is-manga {
      background: var(--manga-shell-bg, #1A1918);
    }
    #view { position: absolute; inset: 0; display: block; }
    /* Manga frame (5px gutter + rounded corners) is rendered by the RN
       wrapper around the WebView, NOT here. Putting it inside the WebView
       made it part of the document that native pinch-zoom scales, which
       the user didn't want -- the frame should stay static while the page
       art zooms underneath. See FoliateReader.tsx mangaShell/mangaFrame. */
    .status {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #888;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="status" id="status">Loading…</div>
  <foliate-view id="view"></foliate-view>

  <script>
    // Force open shadow roots so we can inject CSS into foliate-view and
    // foliate-fxl from the outer page. Both renderers use mode:"closed" by
    // default. Must run BEFORE FOLIATE_SOURCE so class definitions pick up
    // the patched method on first call.
    (function () {
      var orig = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (opts) {
        return orig.call(this, Object.assign({}, opts, { mode: 'open' }));
      };
    })();
  </script>
  <script>${FOLIATE_SOURCE}</script>

  <script>
    (function () {
      // ─── Layout tweakables ───────────────────────────────────────────────
      // Fraction of the viewport height each next/prev advances in vertical
      // (scrolled) mode. 1.0 = exactly one screen (foliate's default);
      // smaller values mean each tap moves less and the last bit of the
      // previous view stays visible as context, which feels lighter. Only
      // applies in scrolled mode; paginated mode is per-page-column.
      var SCROLL_PAGE_FRACTION = 0.2;

      // Outer margin/gap around the chapter content, chosen per book type.
      // Foliate's defaults are 48px / 7%. JP vertical-rl novels look great
      // tight (less wasted side space), Western horizontal books want more
      // breathing room around the column.
      //   *_MARGIN : top/bottom strip above + below content (any CSS length)
      //   *_GAP    : left/right strip on either side of column. Must be a
      //              percentage -- foliate parseFloat()s it. Also doubles as
      //              inner-iframe padding (gap/2 on each side).
      var NOVEL_OUTER_MARGIN = '16px';  // JP vertical-rl
      var NOVEL_OUTER_GAP    = '3%';
      var TEXT_OUTER_MARGIN  = '40px';  // Western LTR
      var TEXT_OUTER_GAP     = '6%';

      var view = null;       // <foliate-view> element
      var book = null;       // foliate Book object
      var tocItems = [];
      var spineTotal = 0;
      var bookType = 'text';
      var direction = 'ltr';
      var viewportW = 0;
      var viewportH = 0;
      var pendingStartCfi = null;
      var currentStyle = null;
      var currentViewMode = 'single';
      // First-time guard. setViewMode skips when mode === currentViewMode,
      // but on initial load currentViewMode is the default 'single' and the
      // attributes have never actually been set on the renderer -- so for
      // books that default to a 2-column spread (e.g. JP vertical-rl novels
      // in portrait), the first matching-mode call would silently skip and
      // we'd never enforce max-column-count="1". Force-apply on the first
      // call.
      var viewModeApplied = false;
      // CFI -> { id, color }. Populated on addHighlight / initial highlight
      // restore so the draw-annotation listener knows what color to paint.
      var highlightInfo = new Map();
      // index -> doc (for selection wiring). One entry per loaded chapter
      // iframe; selectionchange handlers are attached lazily inside the
      // foliate-view 'load' event.
      var loadedDocs = new Map();
      var currentChapterIndex = 0;

      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function err(prefix, e) {
        post({ type: 'error', message: prefix + ': ' + ((e && e.message) || e) });
      }

      function base64ToBlob(base64) {
        var binary = atob(base64);
        var len = binary.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: 'application/epub+zip' });
      }

      function flattenToc(items) {
        var out = [];
        function walk(arr) {
          if (!arr) return;
          for (var i = 0; i < arr.length; i++) {
            var it = arr[i];
            out.push({ label: (it.label || '').toString().trim(), href: it.href || '' });
            if (it.subitems && it.subitems.length) walk(it.subitems);
          }
        }
        walk(items);
        return out;
      }

      function detectBookType(b) {
        // foliate's Book exposes dir (page-progression-direction) and a rendition
        // hint for fixed-layout. Mirror the heuristic from epubHtml.ts so the
        // RN side gets the same bookType values regardless of engine.
        try {
          var fxl = b.rendition && b.rendition.layout === 'pre-paginated';
          var dir = (b.dir || 'ltr').toLowerCase();
          var type = fxl ? 'manga' : (dir === 'rtl' ? 'novel' : 'text');
          return { bookType: type, direction: dir === 'rtl' ? 'rtl' : 'ltr' };
        } catch (e) {
          return { bookType: 'text', direction: 'ltr' };
        }
      }

      function emitRelocated(detail) {
        if (!detail) return;
        var cfi = detail.cfi || '';
        var frac = detail.fraction || 0;
        var spineIdx = (detail.index != null) ? detail.index : 0;
        // For fixed-layout (manga) each spine item is one page, so we report
        // page index + total directly off the spine. Progress for FXL comes
        // from spine position too because detail.fraction stays 0 there.
        // Reflowable text books keep the existing fraction-based progress.
        var isFxl = bookType === 'manga';
        var page = isFxl ? (spineIdx + 1) : 0;
        var totalPages = isFxl ? spineTotal : 0;
        var pct = isFxl
          ? (spineTotal > 0 ? Math.round(((spineIdx + 1) / spineTotal) * 100) : 0)
          : Math.round(frac * 100);
        post({
          type: 'relocated',
          cfi: cfi,
          progress: pct,
          page: page,
          totalPages: totalPages,
          spineIndex: spineIdx,
          spineTotal: spineTotal,
          chapterHref: '',
          chapterLabel: '',
        });
      }

      // Build the per-chapter CSS that the paginator injects into every
      // content iframe. We pass real CSS text -- foliate's setStyles signature
      // is more direct than epubjs's theme-rules-as-object approach. The
      // vertical-rl + direction:ltr trio is the same fix we ship on epubjs;
      // see comment in epubHtml.ts applyStyle for the rationale (kinsoku-like
      // punctuation winds up at column top when direction:rtl cascades from
      // package-progression-direction).
      function buildThemeCss(style) {
        var common =
          'html, body {' +
            'background: ' + style.bg + ' !important;' +
            'color: ' + style.fg + ' !important;' +
          '}' +
          'body {' +
            'font-size: ' + style.fontPx + 'px !important;' +
            'line-height: ' + style.lineHeight + ' !important;' +
            'font-family: ' + style.fontFamily + ' !important;' +
          '}' +
          'p, div, span, li, h1, h2, h3, h4, h5, h6, a, blockquote, td, th, figcaption {' +
            'color: ' + style.fg + ' !important;' +
            '-webkit-user-select: text !important;' +
            'user-select: text !important;' +
          '}';
        if (style.vertical) {
          var vertical =
            'body {' +
              'writing-mode: vertical-rl !important;' +
              '-webkit-writing-mode: vertical-rl !important;' +
              'text-orientation: mixed !important;' +
              '-webkit-text-orientation: mixed !important;' +
              'direction: ltr !important;' +
              'unicode-bidi: isolate !important;' +
            '}' +
            'p, div, span, li, h1, h2, h3, h4, h5, h6, a, blockquote, td, th, figcaption {' +
              'writing-mode: vertical-rl !important;' +
              '-webkit-writing-mode: vertical-rl !important;' +
              'direction: ltr !important;' +
              'unicode-bidi: isolate !important;' +
            '}';
          return common + vertical;
        }
        return common;
      }

      function applyStyle(style) {
        currentStyle = style;
        // Mirror the bg into the WebView shell so the area outside the
        // iframe matches the theme (otherwise you see white during loads).
        document.documentElement.style.setProperty('--reader-bg', style.bg);
        document.documentElement.style.setProperty('--reader-fg', style.fg);
        // For manga, the .is-manga body class wins via --manga-shell-bg;
        // the shell color comes from style.bg too (RN sends a darker value
        // for manga so the page art pops off the surround).
        document.documentElement.style.setProperty('--manga-shell-bg', style.bg);
        document.body.style.background = style.bg;
        if (!view || !view.renderer || typeof view.renderer.setStyles !== 'function') return;
        try { view.renderer.setStyles(buildThemeCss(style)); } catch (e) { err('setStyle', e); }
      }

      // Toggle pinch-zoom on the WebView itself. Disabled by default because
      // text reflowable layouts must not scale (foliate paginates against the
      // measured viewport, not the visual viewport). For manga (fixed-layout
      // pages) we flip user-scalable on so the user can pinch to inspect art.
      function setPinchZoom(enabled) {
        var meta = document.getElementById('viewport-meta');
        if (!meta) return;
        meta.setAttribute(
          'content',
          enabled
            ? 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=4, user-scalable=yes'
            : 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        );
      }

      // Round the corners of the actual manga page (the iframe inside the
      // foliate-fxl renderer) AND nudge the page slightly past fit-page so
      // the outer rounded RN frame visibly cuts into the page art at the
      // default zoom (instead of clipping shell color only). The scale is
      // a CSS transform on the page wrapper, so foliate's own layout math
      // (which reads the host's getBoundingClientRect) is untouched.
      //
      // Shadow access only works because attachShadow was monkey-patched
      // to open mode at the top of <head>; foliate-fxl natively uses
      // {mode:"closed"} and the iframe wrapper would be unreachable.
      var mangaPageStyleEl = null;
      var MANGA_OVERZOOM = 1.2;
      function applyMangaPageStyle() {
        if (!view || !view.renderer) return;
        var root = view.renderer.shadowRoot;
        if (!root) return;
        if (mangaPageStyleEl && mangaPageStyleEl.parentNode === root) return;
        mangaPageStyleEl = root.ownerDocument.createElement('style');
        mangaPageStyleEl.setAttribute('data-manga-page', '');
        mangaPageStyleEl.textContent =
          'iframe[part="filter"] { border-radius: 8px !important; overflow: hidden !important; }' +
          'div:has(> iframe[part="filter"]) {' +
            'border-radius: 8px !important;' +
            'overflow: hidden !important;' +
            'transform: scale(' + MANGA_OVERZOOM + ') !important;' +
            'transform-origin: center center !important;' +
          '}';
        root.appendChild(mangaPageStyleEl);
      }


      function attachSelectionListener(doc, index) {
        if (!doc || loadedDocs.get(index) === doc) return;
        loadedDocs.set(index, doc);
        // selectionchange fires on the iframe document; debounce to the next
        // animation frame so we read the final range, not an interim one
        // mid-drag.
        var raf = 0;
        doc.addEventListener('selectionchange', function () {
          if (raf) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () {
            raf = 0;
            try {
              var sel = doc.defaultView && doc.defaultView.getSelection();
              if (!sel || sel.rangeCount === 0) return;
              var range = sel.getRangeAt(0);
              var text = (sel.toString() || '').trim();
              if (!text) return;
              var rect = range.getBoundingClientRect();
              var cfi = '';
              try { cfi = view.getCFI(index, range); } catch (e) { /* keep blank */ }
              post({
                type: 'selection',
                text: text,
                cfi: cfi,
                pageX: rect.left + rect.width / 2,
                pageY: rect.top,
              });
            } catch (e) { /* swallow; non-fatal */ }
          });
        });
      }

      function attachViewListeners() {
        view.addEventListener('relocate', function (ev) {
          emitRelocated(ev.detail);
        });
        view.addEventListener('load', function (ev) {
          if (!ev.detail) return;
          currentChapterIndex = ev.detail.index;
          attachSelectionListener(ev.detail.doc, ev.detail.index);
        });
        // Highlight rendering. We pass our color through annotation metadata
        // and recover it here; foliate provides the draw fn that wraps the
        // SVG positioning so we only have to pick a shape.
        view.addEventListener('draw-annotation', function (ev) {
          if (!ev.detail) return;
          var draw = ev.detail.draw;
          var ann = ev.detail.annotation || {};
          var info = highlightInfo.get(ann.value);
          var color = (info && info.color) || (ann && ann.color) || 'yellow';
          var Overlayer = globalThis.FoliateOverlayer;
          if (typeof draw === 'function' && Overlayer && typeof Overlayer.highlight === 'function') {
            try { draw(Overlayer.highlight, { color: color }); } catch (e) { err('draw', e); }
          }
        });
      }

      function addHighlight(id, cfi, color) {
        if (!view) return;
        highlightInfo.set(cfi, { id: id, color: color });
        try {
          view.addAnnotation({ value: cfi, color: color, id: id });
        } catch (e) { err('addHighlight', e); }
      }

      function removeHighlight(cfi) {
        if (!view) return;
        highlightInfo.delete(cfi);
        try { view.deleteAnnotation({ value: cfi }); } catch (e) { err('removeHighlight', e); }
      }

      // Manga scroll mode is now rendered on the RN side (a ScrollView of
      // Image components driven by jszip-extracted page files). The WebView
      // only owns page-mode rendering -- the RN overlay covers it while
      // scroll mode is active.

      // View-mode toggle for the reflowable paginator only. Fixed-layout
      // manga uses foliate-fxl, which doesn't expose flow/spread the same
      // way -- we don't try to drive its layout from here.
      function setViewMode(mode) {
        if (!view || !view.renderer) return;
        if (viewModeApplied && mode === currentViewMode) return;
        viewModeApplied = true;
        currentViewMode = mode;
        var tag = view.renderer.tagName && view.renderer.tagName.toLowerCase();
        if (tag !== 'foliate-paginator') return;
        try {
          if (mode === 'scroll') {
            view.renderer.setAttribute('flow', 'scrolled');
          } else {
            view.renderer.setAttribute('flow', 'paginated');
            view.renderer.setAttribute('max-column-count', mode === 'double' ? '2' : '1');
          }
        } catch (e) { err('setViewMode', e); }
      }

      // Foliate's renderer serializes navigation internally and handles
      // cross-spine prev/next without help. The epubjs path needed an outer
      // navInFlight guard because epub.js dropped concurrent display() calls
      // silently; foliate does not, so we just hand each call straight
      // through and let promise rejections (e.g. nothing-to-go-to) flow.
      function nav(kind, target) {
        if (!view) return;
        // In scrolled mode pass a sub-viewport distance so each next/prev
        // advances by SCROLL_PAGE_FRACTION of the viewport instead of a full
        // screen -- "lowers the threshold" to reach the next page. In
        // paginated mode the distance is ignored (foliate moves per column).
        var distance;
        if (currentViewMode === 'scroll' && viewportH > 0) {
          distance = Math.max(1, Math.floor(viewportH * SCROLL_PAGE_FRACTION));
        }
        try {
          if (kind === 'next') view.next(distance);
          else if (kind === 'prev') view.prev(distance);
          else if (kind === 'left') view.goLeft();   // direction-aware tap
          else if (kind === 'right') view.goRight(); // direction-aware tap
          else if (kind === 'goTo') view.goTo(target);
        } catch (e) { err('nav', e); }
      }

      async function loadBook(base64, cfi, style, highlights, viewport) {
        try {
          if (viewport && viewport.width > 0 && viewport.height > 0) {
            viewportW = viewport.width;
            viewportH = viewport.height;
          }
          pendingStartCfi = cfi || null;

          var blob = base64ToBlob(base64);
          // Give the blob a name -- foliate's type detection inspects file
          // extension as a hint when MIME doesn't disambiguate.
          var file = new File([blob], 'book.epub', { type: 'application/epub+zip' });

          // Mirror foliate's own reader.js open flow exactly.
          //   1. Create + append the foliate-view (already in the body, just
          //      grab it).
          //   2. view.open(file)  -- view internally calls makeBook.
          //   3. Wire load/relocate listeners. (Do AFTER open() so we don't
          //      miss the first emission; reference reader does the same.)
          //   4. setStyles via renderer (the renderer is the thing that
          //      injects the user CSS into each chapter iframe).
          //   5. If we have a stored CFI, view.goTo(cfi). Else
          //      view.renderer.next() to advance to the first content page.
          // We deliberately do NOT call view.init() -- it pushes a synthetic
          // history.pushState(0) entry and runs view.next() which leaves the
          // renderer in a state where cross-chapter prev() fails to load the
          // previous spine item. The reference reader skips init() entirely.
          view = document.getElementById('view');
          await view.open(file);
          book = view.book;
          tocItems = flattenToc(book && book.toc);
          try {
            spineTotal = (book && book.sections && book.sections.length) || 0;
          } catch (e) { spineTotal = 0; }
          // Detect book type early -- we need it to pick the right outer
          // margin/gap before applying renderer attributes.
          var detected = detectBookType(book);
          bookType = detected.bookType;
          direction = detected.direction;
          // Tag the shell so manga gets its own background surround and
          // pinch-zoom (text/novel must stay non-scalable -- foliate
          // paginates against the measured viewport, not the visual one).
          if (bookType === 'manga') {
            document.body.classList.add('is-manga');
            setPinchZoom(true);
            applyMangaPageStyle();
          } else {
            document.body.classList.remove('is-manga');
            setPinchZoom(false);
          }
          attachViewListeners();
          if (style) applyStyle(style);
          // Enable foliate's built-in smooth-scroll animation for programmatic
          // navigation. Without the animated attribute, view.next/prev and
          // goTo() snap to the new offset instantly -- which reads as
          // "teleporting" in scrolled mode. With it, foliate animates the
          // scroll over ~300ms via easeOutQuad. Free finger-scrolling stays
          // native and untouched (this only affects programmatic moves).
          // Also dial in per-book-type outer margin/gap.
          var outerMargin = bookType === 'novel' ? NOVEL_OUTER_MARGIN : TEXT_OUTER_MARGIN;
          var outerGap    = bookType === 'novel' ? NOVEL_OUTER_GAP    : TEXT_OUTER_GAP;
          try {
            if (view.renderer && view.renderer.tagName &&
                view.renderer.tagName.toLowerCase() === 'foliate-paginator') {
              view.renderer.setAttribute('animated', '');
              view.renderer.setAttribute('margin', outerMargin);
              view.renderer.setAttribute('gap', outerGap);
            }
          } catch (e) { /* swallow */ }
          // Bootstrap nav. RN applies the user's layout/direction pref via a
          // setViewMode message AFTER receiving 'ready' -- doing it here
          // races foliate's renderer init and silently fails (the renderer
          // accepts the attribute change but never re-renders before the
          // first paint, so scrolled never engages).
          //
          // Each branch is isolated in its own try/catch so a stale/invalid
          // stored CFI can't kill the whole load -- we fall back to
          // renderer.next() and the user lands at the start of the book
          // instead of staring at "Loading..." forever.
          if (pendingStartCfi) {
            try {
              await view.goTo(pendingStartCfi);
            } catch (e) {
              err('bootstrap goTo', e);
              try { await view.renderer.next(); } catch (e2) { err('bootstrap fallback', e2); }
            }
          } else {
            try { await view.renderer.next(); } catch (e) { err('bootstrap', e); }
          }

          // bookType + direction already detected above (before applying
          // renderer attributes). No need to re-detect.

          var statusEl = document.getElementById('status');
          if (statusEl) statusEl.style.display = 'none';

          post({
            type: 'ready',
            toc: tocItems,
            bookType: bookType,
            direction: direction,
            spineCount: spineTotal,
          });

          // Replay highlights from RN. Each becomes a foliate annotation;
          // the draw-annotation listener paints them with the stored color.
          if (highlights && highlights.length) {
            for (var i = 0; i < highlights.length; i++) {
              var h = highlights[i];
              addHighlight(h.id, h.cfi, h.color);
            }
          }
        } catch (e) {
          // Hide the in-WebView loading overlay even on hard failure so the
          // RN error UI (if any) isn't masked by stale "Loading..." text.
          var s = document.getElementById('status');
          if (s) s.style.display = 'none';
          err('load', e);
        }
      }

      function handleInbound(raw) {
        var msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        if (!msg || !msg.type) return;
        if (msg.type === 'load') return loadBook(msg.base64, msg.cfi, msg.style, msg.highlights, msg.viewport);
        if (!view) return;
        if (msg.type === 'next') return nav('next');
        if (msg.type === 'prev') return nav('prev');
        if (msg.type === 'goToCfi') return nav('goTo', msg.cfi);
        if (msg.type === 'goToSpine') {
          var s = book && book.sections && book.sections[msg.index];
          if (s && s.href) nav('goTo', s.href);
          return;
        }
        if (msg.type === 'setStyle') return applyStyle(msg.style);
        if (msg.type === 'setViewMode') return setViewMode(msg.mode);
        if (msg.type === 'setSize') {
          viewportW = msg.width; viewportH = msg.height;
          // foliate's paginator watches container size via ResizeObserver,
          // so the WebView View's onLayout-driven size change reflows
          // automatically. No explicit call needed.
          return;
        }
        if (msg.type === 'addHighlight') return addHighlight(msg.id, msg.cfi, msg.color);
        if (msg.type === 'removeHighlight') return removeHighlight(msg.cfi);
      }

      document.addEventListener('message', function (e) { handleInbound(e.data); });
      window.addEventListener('message', function (e) { handleInbound(e.data); });
    })();
  </script>
</body>
</html>
`;
