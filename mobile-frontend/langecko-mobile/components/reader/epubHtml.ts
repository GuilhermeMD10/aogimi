// HTML template for the WebView-based EPUB renderer.
//
// One WebView is shared by every reader type. After opening the EPUB we
// detect its layout/direction from package metadata and post the resulting
// bookType back to RN, which renders the matching overlay shell.
//
// jszip + epubjs are inlined from `epubLibs.ts` so the reader works without
// network (cold launch with no connectivity used to leave the WebView stuck
// on "Loading…" because the CDN scripts never resolved). Re-run
// `npm run gen-reader-libs` after bumping either package version.

import { EPUBJS_SOURCE, JSZIP_SOURCE } from './epubLibs';

export type BookType = 'text' | 'novel' | 'manga';

export type ReaderViewMode = 'single' | 'double' | 'scroll';

export type ReaderThemeStyle = {
  bg: string;
  fg: string;
  fontFamily: string;
  fontPx: number;
  lineHeight: number;
  /** When true, applies CSS writing-mode: vertical-rl (JP novel mode). */
  vertical: boolean;
};

export type EpubTocItem = {
  label: string;
  href: string;
};

export type HighlightStyle = { id: string; cfi: string; color: string };

export type EpubBridgeInbound =
  | {
      type: 'load';
      base64: string;
      cfi?: string | null;
      style: ReaderThemeStyle;
      highlights: HighlightStyle[];
      /** Pixel size of the WebView's parent container measured on the RN side.
       *  Passed in explicitly so epub.js paginates against a deterministic
       *  viewport instead of guessing via `width: 100%` at mount time. */
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

export type EpubBridgeOutbound =
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
  | {
      type: 'selection';
      text: string;
      cfi: string;
      pageX: number;
      pageY: number;
    };

export const EPUB_HTML = String.raw`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script>${JSZIP_SOURCE}</script>
  <script>${EPUBJS_SOURCE}</script>
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
    #viewer { position: absolute; inset: 0; }
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
  <div id="viewer"></div>
  <div class="status" id="status">Loading…</div>

  <script>
    (function () {
      var rendition = null;
      var book = null;
      var bookBuffer = null;          // kept so we can recreate rendition on view-mode switch
      var locationsReady = false;
      var totalLocations = 0;
      var spineTotal = 0;
      var currentStyle = null;
      var tocItems = [];
      var bookType = 'text';
      var direction = 'ltr';
      var viewMode = 'single';
      var currentHighlights = [];
      var startCfi = null;
      // Pixel viewport supplied by RN via onLayout. epub.js paginates against
      // this at renderTo time and resize() afterwards on rotation / split-pane.
      var viewportW = 0;
      var viewportH = 0;
      // Navigation serialization. epub.js's next/prev/display are async; if a
      // second tap fires while the first display() is still pending we get
      // queued or dropped renders (the "page didn't load properly" symptom).
      // Subsequent navigation requests are dropped while one is in flight --
      // legitimate double-taps still work because the in-flight call clears
      // navInFlight as soon as relocated fires.
      var navInFlight = false;

      function post(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }

      function base64ToArrayBuffer(base64) {
        var binary = atob(base64);
        var len = binary.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
      }

      function applyStyle(style) {
        currentStyle = style;
        document.documentElement.style.setProperty('--reader-bg', style.bg);
        document.documentElement.style.setProperty('--reader-fg', style.fg);
        document.body.style.background = style.bg;
        if (!rendition) return;
        try {
          var bodyRule = {
            'background': style.bg + ' !important',
            'color': style.fg + ' !important',
            'font-size': style.fontPx + 'px !important',
            'line-height': style.lineHeight + ' !important',
            'font-family': style.fontFamily + ' !important',
          };
          if (style.vertical) {
            bodyRule['writing-mode'] = 'vertical-rl !important';
            bodyRule['-webkit-writing-mode'] = 'vertical-rl !important';
            bodyRule['text-orientation'] = 'mixed !important';
            bodyRule['-webkit-text-orientation'] = 'mixed !important';
            // CRITICAL: JP novels declare page-progression-direction="rtl",
            // which epubjs applies as direction: rtl on the iframe. Combined
            // with vertical-rl writing-mode that reverses the inline axis to
            // bottom-to-top, so sentence-final punctuation 。lands at the TOP
            // of each column instead of the bottom. Forcing direction: ltr on
            // body restores top-to-bottom flow within the column (columns
            // still progress right-to-left via writing-mode).
            bodyRule['direction'] = 'ltr !important';
            bodyRule['unicode-bidi'] = 'isolate !important';
          } else {
            bodyRule['writing-mode'] = 'horizontal-tb !important';
            bodyRule['-webkit-writing-mode'] = 'horizontal-tb !important';
          }
          // For vertical mode we also pin writing-mode/direction on every
          // text-bearing element so per-element publisher CSS can't override
          // them; otherwise a single rule like p { writing-mode: horizontal-tb }
          // in the book's CSS would un-rotate part of the page.
          var elementRule = {
            'color': style.fg + ' !important',
            '-webkit-user-select': 'text !important',
            'user-select': 'text !important',
          };
          if (style.vertical) {
            elementRule['writing-mode'] = 'vertical-rl !important';
            elementRule['-webkit-writing-mode'] = 'vertical-rl !important';
            elementRule['direction'] = 'ltr !important';
            elementRule['unicode-bidi'] = 'isolate !important';
          }
          rendition.themes.default({
            'html, body': {
              'background': style.bg + ' !important',
              'color': style.fg + ' !important',
            },
            'body': bodyRule,
            'p, div, span, li, h1, h2, h3, h4, h5, h6, a, blockquote, td, th, figcaption': elementRule,
          });
        } catch (e) { /* themes not ready */ }
      }

      function chapterFromHref(href) {
        if (!href || !tocItems.length) return null;
        var base = String(href).split('#')[0];
        for (var i = 0; i < tocItems.length; i++) {
          var ti = tocItems[i];
          if (!ti.href) continue;
          var tHref = ti.href.split('#')[0];
          if (tHref && base.indexOf(tHref) !== -1) return ti;
        }
        return null;
      }

      function flattenToc(nav) {
        var out = [];
        function walk(items) {
          if (!items) return;
          for (var i = 0; i < items.length; i++) {
            var it = items[i];
            out.push({ label: it.label ? String(it.label).trim() : '', href: it.href || '' });
            if (it.subitems && it.subitems.length) walk(it.subitems);
          }
        }
        walk(nav);
        return out;
      }

      function detectType(b) {
        try {
          var meta = b.package && b.package.metadata;
          var dir = (meta && meta.direction) ? String(meta.direction).toLowerCase() : '';
          var layout = (meta && meta.layout) ? String(meta.layout).toLowerCase() : '';
          var fxlOpts = b.displayOptions && b.displayOptions.fixedLayout;
          var isFxl = layout === 'pre-paginated' || fxlOpts === 'true' || fxlOpts === true;
          var t = isFxl ? 'manga' : (dir === 'rtl' ? 'novel' : 'text');
          return { bookType: t, direction: (dir === 'rtl' ? 'rtl' : 'ltr') };
        } catch (e) {
          return { bookType: 'text', direction: 'ltr' };
        }
      }

      function emitRelocated(loc) {
        if (!loc || !loc.start) return;
        var cfi = loc.start.cfi;
        var pct = 0;
        var page = 0;
        var spineIdx = 0;
        try {
          if (locationsReady && book.locations) {
            pct = Math.round((book.locations.percentageFromCfi(cfi) || 0) * 100);
            var idx = book.locations.locationFromCfi(cfi);
            page = (typeof idx === 'number' && idx >= 0) ? idx + 1 : 0;
          } else {
            pct = Math.round(((loc.start.percentage || 0) * 100));
          }
          var section = book.spine && book.spine.get && book.spine.get(cfi);
          if (section && typeof section.index === 'number') spineIdx = section.index;
        } catch (e) {}
        var chapter = chapterFromHref(loc.start.href);
        post({
          type: 'relocated',
          cfi: cfi,
          progress: pct,
          page: page,
          totalPages: totalLocations,
          spineIndex: spineIdx,
          spineTotal: spineTotal,
          chapterHref: loc.start.href || '',
          chapterLabel: chapter ? chapter.label : '',
        });
      }

      // Inside-iframe tap-to-page: left edge = prev, right edge = next.
      // For RTL books (manga, JP novels) the directions are swapped so the
      // tap matches reading direction.
      function attachTapNav(contents) {
        try {
          var doc = contents.document;
          var win = contents.window;
          doc.addEventListener('click', function (ev) {
            var sel = win && win.getSelection && win.getSelection();
            if (sel && String(sel).trim().length > 0) return;
            var w = win.innerWidth || doc.documentElement.clientWidth || 0;
            var x = ev.clientX;
            var rtl = (direction === 'rtl');
            if (x < w * 0.28) {
              ev.preventDefault();
              nav(rtl ? 'next' : 'prev');
            } else if (x > w * 0.72) {
              ev.preventDefault();
              nav(rtl ? 'prev' : 'next');
            }
          }, true);
        } catch (e) {}
      }

      function buildRenditionOptions() {
        // Use the explicit pixel viewport supplied by RN. Falls back to '100%'
        // only if a setSize landed before viewportW/H were ever populated --
        // shouldn't happen in practice but keeps the rendition usable.
        var opts = {
          width: viewportW > 0 ? viewportW : '100%',
          height: viewportH > 0 ? viewportH : '100%',
          allowScriptedContent: true,
        };
        if (bookType === 'manga') {
          opts.flow = (viewMode === 'scroll') ? 'scrolled' : 'paginated';
          opts.spread = (viewMode === 'double') ? 'auto' : 'none';
          opts.manager = 'default';
        } else {
          opts.flow = 'paginated';
          opts.spread = 'none';
          opts.manager = 'default';
        }
        return opts;
      }

      function applySize(w, h) {
        viewportW = w;
        viewportH = h;
        if (!rendition) return;
        try { rendition.resize(w, h); } catch (e) {}
      }

      // Single funnel for every navigation request (toolbar taps, in-iframe
      // edge taps, deep-link goTo). Drops requests while one is in flight.
      function nav(kind, target) {
        if (!rendition || navInFlight) return;
        var p;
        try {
          if (kind === 'next') p = rendition.next();
          else if (kind === 'prev') p = rendition.prev();
          else if (kind === 'display') p = rendition.display(target);
          else return;
        } catch (e) {
          post({ type: 'error', message: 'nav: ' + e });
          return;
        }
        navInFlight = true;
        Promise.resolve(p).then(
          function () { navInFlight = false; },
          function () { navInFlight = false; }
        );
      }

      function buildRendition(initialCfi) {
        rendition = book.renderTo('viewer', buildRenditionOptions());
        applyStyle(currentStyle);

        rendition.hooks.content.register(function (contents) {
          attachTapNav(contents);
        });

        rendition.display(initialCfi || undefined).then(function () {
          var statusEl = document.getElementById('status');
          if (statusEl) statusEl.style.display = 'none';
          if (currentStyle) applyStyle(currentStyle);
          for (var i = 0; i < currentHighlights.length; i++) {
            addHighlightAnnotation(
              currentHighlights[i].id,
              currentHighlights[i].cfi,
              currentHighlights[i].color
            );
          }
        }).catch(function (err) {
          post({ type: 'error', message: String((err && err.message) || err) });
        });

        rendition.on('relocated', emitRelocated);

        rendition.on('selected', function (cfiRange, contents) {
          try {
            var range = rendition.getRange(cfiRange);
            var text = range ? range.toString() : '';
            text = (text || '').trim();
            if (!text) return;
            var rect = { x: 0, y: 0 };
            try {
              var sel = contents.window.getSelection();
              if (sel && sel.rangeCount > 0) {
                var r = sel.getRangeAt(0).getBoundingClientRect();
                rect = { x: r.left + r.width / 2, y: r.top };
              }
            } catch (e) {}
            post({ type: 'selection', text: text, cfi: cfiRange, pageX: rect.x, pageY: rect.y });
          } catch (e) {
            post({ type: 'error', message: 'selection: ' + e });
          }
        });
      }

      function loadBook(base64, cfi, style, highlights, viewport) {
        try {
          bookBuffer = base64ToArrayBuffer(base64);
          book = ePub(bookBuffer);
          startCfi = cfi || null;
          currentHighlights = (highlights || []).slice();
          currentStyle = style;
          if (viewport && viewport.width > 0 && viewport.height > 0) {
            viewportW = viewport.width;
            viewportH = viewport.height;
          }

          book.ready.then(function () {
            try {
              tocItems = flattenToc(book.navigation && book.navigation.toc);
            } catch (e) { tocItems = []; }
            try {
              spineTotal = (book.spine && book.spine.spineItems && book.spine.spineItems.length) || 0;
            } catch (e) { spineTotal = 0; }

            var detected = detectType(book);
            bookType = detected.bookType;
            direction = detected.direction;
            // Default manga view-mode to single. The user can change later.
            viewMode = (bookType === 'manga') ? 'single' : 'single';

            // Now build the rendition with type-appropriate options
            buildRendition(startCfi);

            post({
              type: 'ready',
              toc: tocItems,
              bookType: bookType,
              direction: direction,
              spineCount: spineTotal,
            });

            if (book.locations) {
              book.locations.generate(1024).then(function (cfis) {
                locationsReady = true;
                totalLocations = (cfis && cfis.length) || 0;
              }).catch(function () {});
            }
          });
        } catch (err) {
          post({ type: 'error', message: String((err && err.message) || err) });
        }
      }

      // Live view-mode change. Previously this tore down the rendition and
      // re-created the book/rendition from scratch, which (a) lost the exact
      // CFI position, (b) thrashed epubjs's internal queues, and (c) was the
      // most likely source of "next page didn't load properly" bugs. epubjs
      // exposes flow() and spread() as runtime setters -- changing them in
      // place reflows the current page without dropping any state.
      function setViewMode(mode) {
        if (mode === viewMode) return;
        if (bookType !== 'manga') return;
        viewMode = mode;
        if (!rendition) return;
        try {
          if (mode === 'scroll') {
            rendition.flow('scrolled');
            rendition.spread('none');
          } else {
            rendition.flow('paginated');
            rendition.spread(mode === 'double' ? 'auto' : 'none');
          }
        } catch (e) {
          post({ type: 'error', message: 'setViewMode: ' + e });
        }
      }

      function addHighlightAnnotation(id, cfi, color) {
        if (!rendition || !rendition.annotations) return;
        try {
          rendition.annotations.add(
            'highlight', cfi, { id: id }, null,
            'reader-hl-' + id,
            { fill: color, 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' }
          );
        } catch (e) {}
      }

      function removeHighlightAnnotation(cfi) {
        if (!rendition || !rendition.annotations) return;
        try { rendition.annotations.remove(cfi, 'highlight'); } catch (e) {}
        currentHighlights = currentHighlights.filter(function (h) { return h.cfi !== cfi; });
      }

      function goToSpine(index) {
        if (!book) return;
        var items = book.spine && book.spine.spineItems;
        if (!items || index < 0 || index >= items.length) return;
        var item = items[index];
        if (item && rendition) nav('display', item.href);
      }

      function handleInbound(raw) {
        var msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        if (!msg || !msg.type) return;
        if (msg.type === 'load') return loadBook(msg.base64, msg.cfi, msg.style, msg.highlights, msg.viewport);
        if (msg.type === 'setViewMode') return setViewMode(msg.mode);
        if (msg.type === 'setSize') return applySize(msg.width, msg.height);
        if (!rendition) return;
        if (msg.type === 'next') nav('next');
        else if (msg.type === 'prev') nav('prev');
        else if (msg.type === 'goToCfi') nav('display', msg.cfi);
        else if (msg.type === 'goToSpine') goToSpine(msg.index);
        else if (msg.type === 'setStyle') applyStyle(msg.style);
        else if (msg.type === 'addHighlight') {
          currentHighlights.push({ id: msg.id, cfi: msg.cfi, color: msg.color });
          addHighlightAnnotation(msg.id, msg.cfi, msg.color);
        }
        else if (msg.type === 'removeHighlight') {
          removeHighlightAnnotation(msg.cfi);
        }
      }

      document.addEventListener('message', function (e) { handleInbound(e.data); });
      window.addEventListener('message', function (e) { handleInbound(e.data); });
    })();
  </script>
</body>
</html>
`;
