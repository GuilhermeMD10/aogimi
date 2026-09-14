// HTML template for the foliate-js WebView reader (next-gen path).
//
// Same architectural shape as epubHtml.ts -- a single WebView shell, one
// custom element (<foliate-view>) that handles rendering/pagination, and a
// JSON message bridge to/from RN. The wire format is intentionally identical
// to the epubjs bridge so FoliateReader.tsx is a drop-in replacement for
// EpubReader.tsx once we flip the flag in ReaderScreen.
//
// Layout is deliberately untouched: no flow, margin, gap or column-count
// attribute is ever set on foliate's renderer, so a reflowable book gets its
// stock paginated behaviour and its stock chapter crossing. What this shell
// does own is typography (the setStyle path), the vertical-rl writing mode
// for JP novels, and the selection bridge.

import { FOLIATE_SOURCE } from './foliateLibs';
import { TAP_TO_SELECT_FN } from './native-selection';

// ── Bridge types (kept identical to epubHtml.ts so RN doesn't care which
//    engine is running) ────────────────────────────────────────────────────

export type BookType = 'text' | 'novel' | 'manga';

export type ReaderThemeStyle = {
  bg: string;
  fg: string;
  fontFamily: string;
  fontPx: number;
  lineHeight: number;
  vertical: boolean;
  /** The selection band, as a CSS colour. Part of the *style* rather than a
   *  build-time constant so changing it in settings re-applies live, through
   *  the same setStyle message every other typography change already uses. */
  highlight: string;
};

export type EpubTocItem = { label: string; href: string };

export type FoliateBridgeInbound =
  | {
      type: 'load';
      base64: string;
      cfi?: string | null;
      style: ReaderThemeStyle;
      viewport: { width: number; height: number };
    }
  | { type: 'setStyle'; style: ReaderThemeStyle }
  | { type: 'setSize'; width: number; height: number }
  | { type: 'goToCfi'; cfi: string }
  | { type: 'goToSpine'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'clearSelection' };

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
  | {
      type: 'selection';
      text: string;
      cfi: string;
      pageX: number;
      pageY: number;
      rect: { top: number; bottom: number; left: number; right: number };
    }
  /** Selection touch feedback. The WebView cannot vibrate on iOS at all, so
   *  the gesture asks RN to do it: 'start' when the band engages, 'tick' for
   *  each character it gains or loses. See TAP_TO_SELECT_FN's `haptic`. */
  | { type: 'haptic'; kind: 'start' | 'tick' };

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

    /* The whole-book canvas. One scroll container holding every spine
       section; see the canvas renderer below for why it exists.
         .axis-y  western text  — sections stack downwards, scrolls vertically
         .axis-x  JP vertical-rl — sections stack leftwards, scrolls sideways */
    /* display lives ONLY on the axis classes below, never as an inline
       style. An inline display would outrank the stylesheet, and setting
       'block' to reveal the canvas silently cancelled axis-x's flex: the
       chapters fell back to block layout, stacked downwards inside a
       container with overflow-y hidden, and everything past chapter one sat
       below the clipped edge where no scroll could reach it. The canvas is
       revealed by gaining an axis class, so the two cannot disagree. */
    /* Laid out but not painted until the book has been placed. Measuring
       needs real geometry, so display:none is not an option here -- slots
       would all measure zero. visibility keeps the layout and withholds the
       paint, which is exactly the distinction needed: without it the reader
       watched page one appear and then jump to wherever they actually were. */
    #canvas.placing { visibility: hidden; }
    #canvas {
      position: absolute; inset: 0; display: none;
      /* The canvas corrects its own scroll offset whenever a slot behind the
         reader is re-measured (resizeSlot). Chrome's automatic scroll
         anchoring would apply a second, competing correction for the same
         event, so it is turned off here rather than fought. */
      overflow-anchor: none;
    }
    #canvas.axis-y {
      display: block;
      overflow-y: auto; overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }
    #canvas.axis-y .slot { display: block; width: 100%; }
    /* A flex row rather than a run of inline-blocks: inline layout brings
       baseline alignment, collapsible whitespace and line-height into a place
       that wants none of them, and any one of those shows up as a seam
       between two chapters. direction:rtl puts main-start at the RIGHT edge,
       so section 0 sits rightmost and each following chapter continues
       leftwards -- which is simply what vertical-rl reading is. */
    #canvas.axis-x {
      display: flex; flex-direction: row; direction: rtl;
      overflow-x: auto; overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
    }
    #canvas.axis-x .slot { flex: 0 0 auto; height: 100%; }
    #canvas .slot { position: relative; }
    #canvas .slot > iframe {
      display: block; width: 100%; height: 100%; border: 0;
    }
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
  <div id="canvas"></div>

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
      // ─── Native selection helpers (hold-to-select-word) ─────────────────
      // Injected from components/reader/utils/native-selection. Defines
      // attachHoldSelect(doc) and selectWordAt(doc, x, y); we call the
      // attach helper from attachSelectionListener on each chapter doc.
      ${TAP_TO_SELECT_FN}

      // The selection band colour, as the reader's setting chose it. The
      // gesture reads this through readerBand() on every repaint, so changing
      // the colour re-tints a band that is already on screen.
      var readerBandColor = 'rgba(80, 160, 255, 0.35)';

      // What the reader's font-size control has to beat, and why it is shaped
      // like this.
      //
      // Forcing font-size on the body alone does not reach the text: a direct
      // rule on a descendant beats an inherited value. Japanese ebooks lean on
      // that constantly -- an html { font-size: 62.5% } root with rem-sized
      // paragraphs, dialogue classes at 88%, nested spans multiplying it.
      //
      // An element-level !important rule fixes the ordinary cases and loses the
      // ones that actually bite. Measured in a browser, against a publisher
      // stylesheet using !important, with the reader asking for 24px:
      //
      //   p.honbun { 1.6rem }                       -> 24px  (obeys)
      //   p.bang   { 1.6rem !important }            -> 16px  (ignores)
      //   #wrap p.deep { 12px !important }          -> 12px  (ignores)
      //   div.box p.nested { 9px !important }       ->  9px  (ignores)
      //
      // That split is the bug as the reader experiences it: part of the page
      // tracks the size control and part of it sits fixed, so turning the size
      // up walks the obedient text towards the pinned text until they happen to
      // match. Importance alone cannot fix it -- among !important author
      // declarations, specificity still decides -- so this has to outrank a
      // publisher's most specific rule. The two :not(#id) arms carry the
      // weight: :not() takes the specificity of its argument, so they read as
      // two IDs and beat any single-ID selector no matter how many classes
      // follow it. No element has these ids, so nothing is actually excluded
      // by them.
      //
      // Universal-with-exclusions rather than a list of element names, because
      // a list is a guess about a book's markup. The exclusions are the sizes
      // that carry meaning: html/body must keep the size the reader set (a
      // universal rule would otherwise make body inherit from html and break
      // the control outright), h1-h6 stay heading-sized, rt/rp stay
      // furigana-small, and sup/sub/small/figcaption keep theirs. Descendants
      // of an excluded element still match, and inherit from it, so a span
      // inside a heading stays heading-sized.
      var SIZE_RESET_SELECTOR =
        ':not(html):not(body)' +
        ':not(h1):not(h2):not(h3):not(h4):not(h5):not(h6)' +
        ':not(rt):not(rp):not(sup):not(sub):not(small):not(figcaption)' +
        ':not(#_):not(#__)';

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

      // Whether this book reads vertically, as the BOOK says rather than as
      // the last setStyle happened to claim.
      //
      // RN cannot know this when it sends the load message: it derives the
      // flag from a bookType this shell has not reported yet, so the first
      // style to arrive always says vertical:false. That value used to decide
      // the canvas axis, which is why a JP novel laid its chapters out as a
      // vertical stack and only started flowing its text sideways once the
      // late setStyle landed -- text going one way, chapters the other.
      //
      // detectBookType has read the spine's page-progression-direction by the
      // time anything is drawn, so every consumer is routed through here and
      // the ordering stops mattering.
      function isVerticalBook() {
        return bookType === 'novel';
      }

      // Force a style object to agree with the book before it is used for
      // anything. Mutating rather than copying is deliberate: currentStyle is
      // handed around and stored, and one normalised object beats remembering
      // which copy was the corrected one.
      function normalizeStyle(style) {
        if (style) style.vertical = isVerticalBook();
        return style;
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
        // No ::selection rule, deliberately.
        //
        // iOS never paints a script-created selection -- the band there is
        // drawn by UIKit, not the web engine -- so styling the pseudo-element
        // could not colour our band however it was written, opaque or not. The
        // gesture in native-selection draws the band itself from its own
        // Range, which is what makes the reader's chosen colour actually
        // appear, identically on both platforms.
        var selectionRules = '';
        // Neutralise the book's own font sizing. See SIZE_RESET_SELECTOR.
        var sizeReset = SIZE_RESET_SELECTOR + '{ font-size: inherit !important; }';
        var common =
          selectionRules +
          'html, body {' +
            'background: ' + style.bg + ' !important;' +
            'color: ' + style.fg + ' !important;' +
          '}' +
          'body {' +
            'font-size: ' + style.fontPx + 'px !important;' +
            'line-height: ' + style.lineHeight + ' !important;' +
            'font-family: ' + style.fontFamily + ' !important;' +
          '}' +
          sizeReset +
          'p, div, span, li, h1, h2, h3, h4, h5, h6, a, blockquote, td, th, figcaption {' +
            'color: ' + style.fg + ' !important;' +
            // Unselectable, on both platforms. Nothing needs the engine's
            // own selection any more -- the band is drawn from a Range the
            // gesture owns -- and user-select: none is what stops iOS from
            // starting its *native* selection on a long press and painting a
            // tint we cannot restyle over the top of ours.
            '-webkit-user-select: none !important;' +
            'user-select: none !important;' +
            '-webkit-touch-callout: none !important;' +
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
        normalizeStyle(style);
        currentStyle = style;
        if (style && style.highlight) readerBandColor = style.highlight;
        loadedDocs.forEach(function (doc) {
          try { repaintReaderSelection(doc); } catch (e) {}
        });
        // Mirror the bg into the WebView shell so the area outside the
        // iframe matches the theme (otherwise you see white during loads).
        document.documentElement.style.setProperty('--reader-bg', style.bg);
        document.documentElement.style.setProperty('--reader-fg', style.fg);
        // For manga, the .is-manga body class wins via --manga-shell-bg;
        // the shell color comes from style.bg too (RN sends a darker value
        // for manga so the page art pops off the surround).
        document.documentElement.style.setProperty('--manga-shell-bg', style.bg);
        document.body.style.background = style.bg;
        if (isCanvasPath()) {
          // Type metrics just changed, so every measured extent is stale.
          // remeasureCanvas re-injects the section CSS before measuring.
          remeasureCanvas();
          return;
        }
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


      // The selected text, with furigana dropped.
      //
      // A Japanese book annotates kanji as <ruby>漢字<rt>かんじ</rt></ruby>, and
      // sel.toString() walks the DOM in document order — so it returns
      // "漢字かんじ", base and reading run together. That string is what goes
      // out as selection.text, which becomes the dictionary lookup term, the
      // clipboard copy, and the front of a card made straight from a
      // selection: a lookup of "漢字かんじ" matches nothing, and a card keeps the
      // reading welded to the word forever.
      //
      // Cloning the range and removing the annotation nodes is the same rule
      // the web reader applies in lib/selectionText.ts. Books omit <rp> (it is
      // a fallback for renderers with no ruby support), which is why the leak
      // shows up with no parentheses around the kana.
      function selectionText(range) {
        try {
          var frag = range.cloneContents();
          var ann = frag.querySelectorAll('rt, rp');
          for (var i = 0; i < ann.length; i++) {
            if (ann[i].parentNode) ann[i].parentNode.removeChild(ann[i]);
          }
          return (frag.textContent || '').trim();
        } catch (e) {
          // A range that will not clone is still better read than not read.
          return (range.toString() || '').trim();
        }
      }

      // The selection rect, in the WebView's own viewport coordinates.
      //
      // range.getBoundingClientRect() is measured against the *chapter
      // iframe's* viewport, and that is not the WebView's. In paginated flow
      // foliate sizes the iframe to the full columnised width of the chapter
      // and scrolls the container around it, so the iframe's origin sits
      // hundreds or thousands of px left of the screen; in scrolled flow it
      // sits above it. Handing those numbers to RN as if they were screen
      // coordinates is what put the selection menu somewhere unrelated to
      // the selected words.
      //
      // Adding the iframe element's own client rect -- which the OUTER
      // document measures, so it is already in WebView coordinates -- undoes
      // exactly that offset, transforms included. The clamp then keeps a
      // selection running across a column break anchored to the part the
      // reader can actually see.
      function viewportRect(doc, range) {
        var r = range.getBoundingClientRect();
        if (!r) return null;
        var top = r.top, bottom = r.bottom, left = r.left, right = r.right;
        try {
          var frame = doc.defaultView && doc.defaultView.frameElement;
          if (frame) {
            var f = frame.getBoundingClientRect();
            top += f.top; bottom += f.top; left += f.left; right += f.left;
          }
        } catch (e) { /* same-origin always; fall through to the raw rect */ }
        var w = viewportW > 0 ? viewportW : window.innerWidth;
        var h = viewportH > 0 ? viewportH : window.innerHeight;
        return {
          top: Math.max(0, Math.min(h, top)),
          bottom: Math.max(0, Math.min(h, bottom)),
          left: Math.max(0, Math.min(w, left)),
          right: Math.max(0, Math.min(w, right)),
        };
      }

      // The gesture calls this on release, once per selection.
      //
      // Replaces a selectionchange listener, which is the right tool only when
      // the engine owns the selection. It does not here: the band is a Range
      // the gesture owns and the OS is kept out of it entirely, so the one
      // moment worth reporting is the one the gesture already knows about.
      // Nothing is emitted mid-drag either, which is what the old
      // __readerInDrag gate existed to suppress.
      function onSelectionSettled(doc, index, range) {
        try {
          var text = selectionText(range);
          if (!text) return;
          var rect = viewportRect(doc, range);
          if (!rect) return;
          var cfi = '';
          try { cfi = view.getCFI(index, range); } catch (e) { /* keep blank */ }
          post({
            type: 'selection',
            text: text,
            cfi: cfi,
            pageX: (rect.left + rect.right) / 2,
            pageY: rect.top,
            rect: rect,
          });
        } catch (e) { /* swallow; non-fatal */ }
      }

      function attachSelectionListener(doc, index) {
        if (!doc || loadedDocs.get(index) === doc) return;
        loadedDocs.set(index, doc);
        try { attachHoldSelect(doc, index); } catch (e) { err('attachHoldSelect', e); }
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
      }

      // Manga scroll mode is now rendered on the RN side (a ScrollView of
      // Image components driven by jszip-extracted page files). The WebView
      // only owns page-mode rendering -- the RN overlay covers it while
      // scroll mode is active.


      // ═══ Whole-book canvas ══════════════════════════════════════════════
      //
      // foliate's paginator renders ONE spine section at a time, which is what
      // made a chapter boundary a wall: the scroll ran out and the reader had
      // to ask for the next section. This renders the whole book instead --
      // every section is a slot in a single scroll container, so one gesture
      // carries the reader from the first page to the last and a chapter end
      // is just more text arriving.
      //
      // foliate is still doing the hard parts. view.open(file) gives us the
      // parsed Book without drawing anything (it only renders once something
      // calls renderer.next/goTo, which the reflowable path never does), so we
      // keep its resource loader, its TOC, its href/CFI resolution and its
      // getCFI -- which means the CFIs this emits are the same CFIs foliate
      // emitted, and the positions already stored on the device and synced to
      // the backend keep resolving.
      //
      // ── The two axes ──────────────────────────────────────────────────
      // A JP novel is vertical-rl: its lines run top-to-bottom and its columns
      // run right-to-left, so the book extends sideways and the canvas scrolls
      // horizontally, starting at the right. A western book extends downwards
      // and the canvas scrolls vertically. The book picks; there is no setting.
      //
      // ── Why slots, and why they are lazy ──────────────────────────────
      // Every section gets a slot up front -- a sized, empty div -- so the
      // scroll range is the whole book from the first frame. Only the slots
      // near the viewport actually hold an iframe; the rest keep their size
      // and nothing else. A 400-chapter book therefore costs 400 divs and a
      // handful of live documents rather than 400 documents.
      //
      // A slot that has never been mounted is sized by a guess from the
      // section's byte count. resizeSlot fixes the guess the first time the
      // section is really measured, and compensates the scroll offset when the
      // correction lands behind the reader -- otherwise every correction would
      // tug the page they are reading out from under them.

      var canvasEl = null;
      var canvasReady = false;
      // Reporting stays shut until the book has been placed at its stored
      // position. Every relocated message RN receives is written to storage,
      // so a message sent while the canvas is still at the top -- which it is
      // for the whole of buildCanvas and the first remeasure -- overwrites a
      // perfectly good saved position with zero. Backing out of a book during
      // that window used to lose the place entirely.
      var bootstrapped = false;
      var canvasVertical = false;  // true = JP vertical-rl, scrolls sideways
      var canvasTotal = 0;         // full book extent, px
      var slots = [];              // one per spine section, in spine order
      var sizeWeights = [];        // each section's share of the book, 0..1
      var sizeOffsets = [];        // cumulative share before each section

      // Sizing a section we have never rendered.
      //
      // The seed is only a seed. Bytes-to-pixels depends on the script (a
      // Japanese character is 3 UTF-8 bytes and one square of column), on the
      // font size the reader chose and on the size of their screen, so no
      // constant is right for long. What IS right is the book itself: once a
      // few sections have been measured for real, their own ratio predicts the
      // rest far better than any constant, because it is the same book at the
      // same settings on the same screen. So the seed gets us to the first
      // paint and measurement takes over from there.
      var EST_PX_PER_BYTE_SEED = 0.2;
      var measuredPxTotal = 0;
      var measuredByteTotal = 0;
      var sectionBytes = [];

      function pxPerByte() {
        return measuredByteTotal > 0
          ? (measuredPxTotal / measuredByteTotal)
          : EST_PX_PER_BYTE_SEED;
      }

      function estimateFor(index) {
        var vp = viewportExtent() || 600;
        return Math.max(vp, Math.ceil((sectionBytes[index] || 0) * pxPerByte()));
      }

      // Re-estimate every slot that has never been measured, using whatever
      // the book has taught us so far.
      //
      // One pass, one relayout, one scroll correction. Routing each slot
      // through resizeSlot would relayout once per slot -- O(sections squared)
      // on every single measurement -- so the deltas that land behind the
      // reader are accumulated instead and paid back in a single adjustment at
      // the end, which is the same arithmetic without the quadratic.
      function reestimateUnmeasured() {
        var pos = scrollPos();
        var behindDelta = 0;
        var touched = false;
        for (var i = 0; i < slots.length; i++) {
          var s = slots[i];
          if (s.measured) continue;
          var next = estimateFor(i);
          var delta = next - s.size;
          if (Math.abs(delta) < 2) continue;
          if ((s.start + s.size) <= pos) behindDelta += delta;
          s.size = next;
          applySlotSize(s);
          touched = true;
        }
        if (!touched) return;
        relayout();
        if (behindDelta !== 0) setScrollPos(scrollPos() + behindDelta);
      }
      // How far past the viewport a slot still keeps its iframe. A screen and a
      // half either way: far enough that a flick stays ahead of the mount, near
      // enough that only a few documents are ever live.
      var MOUNT_MARGIN = 1.5;
      var SECTION_STYLE_ID = 'aogimi-reader-style';

      // Breathing room around the text, in px.
      //
      // Expressed against the LOGICAL axes rather than physical sides, so one
      // pair of numbers serves both books. The inline axis is the one the
      // lines run along -- across the screen in a western book, down it in a
      // vertical-rl one -- so padding-inline is always the rail the text would
      // otherwise run into, and padding-block is always the space between the
      // end of one chapter and the start of the next.
      var RAIL_PX = 22;
      var CHAPTER_GAP_PX = 18;

      function viewportExtent() {
        if (!canvasEl) return 0;
        var n = canvasVertical ? canvasEl.clientWidth : canvasEl.clientHeight;
        return n > 0 ? n : (canvasVertical ? viewportW : viewportH);
      }

      // Reading distance from the start of the book, always >= 0.
      //
      // vertical-rl scrolls right-to-left, and the engine reports that as a
      // NEGATIVE scrollLeft growing away from zero at the right edge. Folding
      // the sign away here is the same normalisation foliate's own paginator
      // does (Math.abs on its scroll prop), and it is what lets every other
      // calculation in this file be written once for both axes.
      function scrollPos() {
        if (!canvasEl) return 0;
        return canvasVertical ? Math.abs(canvasEl.scrollLeft) : canvasEl.scrollTop;
      }
      function setScrollPos(pos) {
        if (!canvasEl) return;
        var clamped = Math.max(0, pos);
        if (canvasVertical) canvasEl.scrollLeft = -clamped;
        else canvasEl.scrollTop = clamped;
      }

      function applySlotSize(slot) {
        if (canvasVertical) slot.el.style.width = slot.size + 'px';
        else slot.el.style.height = slot.size + 'px';
      }

      // Recompute where every slot starts. Cheap enough to just redo whole --
      // a book is a few hundred sections at the very worst -- and a single
      // source of truth beats trying to patch offsets incrementally.
      function relayout() {
        var pos = 0;
        for (var i = 0; i < slots.length; i++) {
          slots[i].start = pos;
          pos += slots[i].size;
        }
        canvasTotal = pos;
      }

      // Per-section CSS. The theme rules are the same ones the paginator used
      // to inject; the sizing rules are new, and they are what make a section
      // lay itself out at its natural extent instead of scrolling internally.
      function sectionSizingCss() {
        // Never scroll inside a section: the canvas owns scrolling, and the
        // slot is sized to whatever this comes out to.
        var common =
          'html,body{margin:0!important;overflow:visible!important;' +
          'box-sizing:border-box!important;}';
        // vertical-rl: the column height is the screen and the text runs off
        // sideways for as long as the chapter lasts. Western: the column width
        // is the screen and it runs downwards. Either way one axis is pinned
        // to the viewport and the other is free.
        var sizing = canvasVertical
          ? 'html,body{height:100%!important;width:auto!important;}'
          : 'html,body{width:100%!important;height:auto!important;}';
        // Rails on the body only -- putting them on html as well would pay the
        // padding twice. border-box above is what keeps the pinned axis at one
        // viewport once the padding is taken out of it, instead of overflowing
        // by the size of the rails.
        var rails =
          'body{padding-inline:' + RAIL_PX + 'px!important;' +
          'padding-block:' + CHAPTER_GAP_PX + 'px!important;}';
        return common + sizing + rails + mediaCss();
      }

      // Keep a picture inside the screen.
      //
      // Nothing constrained media before, so a plate larger than the display
      // drew at its natural size and ran off the edge -- the reader got the
      // top half of an illustration and had to scroll past the rest of it.
      // foliate's own renderer caps every img/svg/video for exactly this
      // reason, and this is the same cap expressed for the canvas.
      //
      // The pinned axis is capped at 100%, which is already the padded content
      // box. The free axis has no such reference -- a slot on that axis is as
      // long as the chapter -- so it is capped against the real screen size RN
      // reports, minus the rails. object-fit keeps the aspect ratio once a
      // picture meets either cap.
      function mediaCss() {
        var freeCap = canvasVertical
          ? Math.max(1, viewportW - CHAPTER_GAP_PX * 2)
          : Math.max(1, viewportH - CHAPTER_GAP_PX * 2);
        var pinned = canvasVertical ? 'max-height:100%' : 'max-width:100%';
        var free = canvasVertical
          ? 'max-width:' + freeCap + 'px'
          : 'max-height:' + freeCap + 'px';
        return 'img,svg,video,image{' +
          pinned + '!important;' + free + '!important;' +
          'object-fit:contain!important;' +
          'box-sizing:border-box!important;' +
          'break-inside:avoid!important;' +
        '}';
      }

      function injectSectionStyle(doc) {
        if (!doc || !currentStyle) return;
        try {
          var head = doc.head || doc.documentElement;
          if (!head) return;
          var el = doc.getElementById(SECTION_STYLE_ID);
          if (!el) {
            el = doc.createElement('style');
            el.id = SECTION_STYLE_ID;
            head.appendChild(el);
          }
          el.textContent = buildThemeCss(currentStyle) + sectionSizingCss();
        } catch (e) { /* a section that will not take styling still reads */ }
      }

      // The section's real extent along the scroll axis.
      // The section's real extent along the scroll axis.
      //
      // Measured off the BODY BOX, never documentElement.scrollHeight.
      // scrollHeight on the root can never report less than the frame's own
      // viewport, and the frame is sized to the slot -- which starts life as
      // an estimate. So a root measurement could only ever grow a slot, never
      // shrink one: a chapter whose text ran shorter than its estimate kept
      // the difference as blank scrollable space, and the reader had to wade
      // through it to reach the next chapter.
      //
      // The body box has no such floor. Its size on the free axis is its
      // content (the sizing CSS pins one axis and leaves the other auto), so
      // it shrinks as readily as it grows. scrollWidth/Height stay in as a
      // floor for content that overflows the body rather than extending it.
      function measuredExtent(doc) {
        var b = doc && doc.body;
        if (!b) return 0;
        var rect = null;
        try { rect = b.getBoundingClientRect(); } catch (e) { rect = null; }
        var n = canvasVertical
          ? Math.max(rect ? rect.width : 0, b.scrollWidth || 0)
          : Math.max(rect ? rect.height : 0, b.scrollHeight || 0);
        return Math.max(1, Math.ceil(n));
      }

      // Give a slot a new size and keep the reader where they were.
      //
      // Correcting a slot that sits entirely BEHIND the reading position moves
      // everything after it by the same delta -- including the words on screen.
      // Adding the delta back to the scroll offset cancels that exactly, which
      // is the whole trick behind a lazily-measured infinite scroll that does
      // not jitter.
      function resizeSlot(slot, next, exact) {
        var delta = next - slot.size;
        if (delta === 0) { if (exact) slot.measured = true; return; }
        var behind = (slot.start + slot.size) <= scrollPos();
        slot.size = next;
        if (exact) slot.measured = true;
        applySlotSize(slot);
        relayout();
        if (behind) setScrollPos(scrollPos() + delta);
      }

      function measureSlot(slot) {
        if (!slot.doc) return;
        var next = measuredExtent(slot.doc);
        if (slot.measured && Math.abs(next - slot.size) < 2) return;
        var wasMeasured = slot.measured;
        var prevPx = slot.measuredPx || 0;
        resizeSlot(slot, next, true);
        // Teach the estimator. A section that is measured twice (fonts, then
        // images) replaces its own earlier contribution rather than counting
        // itself twice.
        var bytes = sectionBytes[slot.index] || 0;
        if (bytes > 0) {
          if (wasMeasured) measuredPxTotal -= prevPx;
          else measuredByteTotal += bytes;
          measuredPxTotal += next;
          slot.measuredPx = next;
          reestimateUnmeasured();
        }
        // The section just changed shape. If the reader is being held at a
        // position inside it, that position moved with it.
        if (pendingAnchor && pendingAnchor.index === slot.index) {
          if (applyAnchor() === 'fail') releaseAnchor();
        }
      }

      function mountSlot(slot) {
        if (slot.iframe || slot.mounting) return;
        var section = book && book.sections && book.sections[slot.index];
        if (!section) return;
        slot.mounting = true;
        Promise.resolve()
          .then(function () { return section.load(); })
          .then(function (url) {
            // Unmounted again while the resource was resolving.
            if (!slot.mounting) return;
            var iframe = document.createElement('iframe');
            // Same attributes foliate's own paginator gives its section
            // iframe. allow-scripts is not optional: without it WebKit does
            // not deliver events inside the frame at all (webkit bug 218086),
            // and the hold-to-select gesture lives on those events.
            iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts');
            iframe.setAttribute('scrolling', 'no');
            iframe.setAttribute('part', 'filter');
            iframe.style.overflow = 'hidden';
            iframe.style.border = '0';
            iframe.onload = function () { onSlotLoaded(slot); };
            iframe.src = url;
            slot.el.appendChild(iframe);
            slot.iframe = iframe;
          })
          .catch(function (e) { slot.mounting = false; err('mountSlot', e); });
      }

      function onSlotLoaded(slot) {
        var doc = null;
        try { doc = slot.iframe && slot.iframe.contentDocument; } catch (e) { return; }
        if (!doc) { slot.mounting = false; return; }
        slot.mounting = false;
        slot.doc = doc;
        injectSectionStyle(doc);
        measureSlot(slot);
        attachSelectionListener(doc, slot.index);
        // Web fonts and images land after load and change the extent, so the
        // first measurement is provisional. Both re-measures go through
        // resizeSlot, so both keep the reading position.
        try {
          if (doc.fonts && doc.fonts.ready) {
            doc.fonts.ready.then(function () { measureSlot(slot); });
          }
        } catch (e) { /* no font API; the load measurement stands */ }
        try {
          var imgs = doc.images || [];
          for (var i = 0; i < imgs.length; i++) {
            if (!imgs[i].complete) {
              imgs[i].addEventListener('load', function () { measureSlot(slot); });
            }
          }
        } catch (e) { /* ditto */ }
      }

      function unmountSlot(slot) {
        slot.mounting = false;
        if (slot.doc) {
          // Drop the selection wiring's record too, so a remount re-attaches
          // rather than skipping on a stale identity check.
          loadedDocs.delete(slot.index);
          slot.doc = null;
          // The cached text nodes belong to the document that is going away.
          slot.textNodes = null;
        }
        if (slot.iframe) {
          try { slot.el.removeChild(slot.iframe); } catch (e) {}
          slot.iframe = null;
        }
        try { book.sections[slot.index].unload(); } catch (e) {}
        // The measured size stays put, so nothing after this slot moves.
      }

      // Mount what is near, drop what is not. O(sections) and it runs at most
      // once a frame, which is cheaper than it sounds and far more predictable
      // than an IntersectionObserver over a list whose sizes keep changing.
      function updateMounts() {
        if (!canvasReady) return;
        var pos = scrollPos();
        var vp = viewportExtent();
        var lo = pos - vp * MOUNT_MARGIN;
        var hi = pos + vp * (1 + MOUNT_MARGIN);
        for (var i = 0; i < slots.length; i++) {
          var s = slots[i];
          var near = (s.start + s.size) >= lo && s.start <= hi;
          if (near) mountSlot(s);
          else if (s.iframe) unmountSlot(s);
        }
      }

      function slotAt(pos) {
        for (var i = 0; i < slots.length; i++) {
          if (pos < slots[i].start + slots[i].size) return slots[i];
        }
        return slots.length ? slots[slots.length - 1] : null;
      }

      // ── Where the reader is, as a range ─────────────────────────────────
      //
      // This is the one number everything else hangs off: the CFI we save, and
      // therefore the place the book reopens at.
      //
      // foliate never had to work this out. Its renderer draws the section
      // itself, so it always knows which range is on screen and hands one to
      // getCFI. The canvas draws the section as a plain iframe and has no such
      // record, and the first two attempts at replacing it both guessed by
      // coordinate -- ask the document for the caret at a point near the
      // reading edge. That is fragile in a way that is easy to miss, because
      // the failure is silent: getCFI falls back to the SECTION BASE CFI when
      // it has no range, so a probe that lands on padding, a margin, a float
      // or the gap between two paragraphs does not error -- it quietly saves
      // "the start of this chapter" instead of where the reader was.
      //
      // So: no probing. Walk the section's own text and take the first node
      // that reaches the reading edge. A text node either reaches it or it
      // does not; there is nowhere for the answer to fall through.

      // Text nodes in document order, cached per slot -- the list only changes
      // if the document does, and restyling does not change it. Rects are read
      // live on every query, so a re-measure needs no invalidation here.
      function collectTextNodes(doc) {
        var out = [];
        try {
          var walker = doc.createTreeWalker(doc.body, 4 /* SHOW_TEXT */, null);
          var n;
          while ((n = walker.nextNode())) {
            if (n.nodeValue && /\S/.test(n.nodeValue)) out.push(n);
          }
        } catch (e) { err('collectTextNodes', e); }
        return out;
      }

      // How far from the START of the section this node reaches, along the
      // scroll axis. -1 for a node that is not laid out at all (display:none,
      // an empty inline), which the search steps over.
      function nodeReach(doc, node, extent) {
        var r;
        try {
          var range = doc.createRange();
          range.selectNodeContents(node);
          r = range.getBoundingClientRect();
        } catch (e) { return -1; }
        if (!r || (r.width === 0 && r.height === 0)) return -1;
        // vertical-rl runs right-to-left from the section's right edge, so
        // distance travelled is measured back from it.
        return canvasVertical ? (extent - r.left) : r.bottom;
      }

      // Index of the first node that reaches into, or -1.
      //
      // Binary search, because reach only grows through the document and a
      // chapter can hold thousands of nodes that would otherwise all be
      // measured on every scroll frame.
      //
      // The subtlety is nodes with no layout box at all -- inside display:none,
      // an empty inline, hidden ruby. They cannot answer "how far do you
      // reach", and the first version of this treated that as "not far enough"
      // and moved lo past mid, discarding the whole left half on the word of a
      // node that had no opinion. One hidden block early in a chapter was
      // enough to send the search past the real answer, or off the end of it
      // entirely -- which is the chapter-start CFI again, by a different road.
      //
      // So an unmeasurable probe steps FORWARD to the nearest node that can
      // answer, and only if the rest of the window is unmeasurable too does it
      // conclude the answer lies to the left.
      function firstNodeReaching(doc, nodes, into, extent) {
        var lo = 0, hi = nodes.length - 1, best = -1;
        while (lo <= hi) {
          var mid = (lo + hi) >> 1;
          var probe = mid, reach = -1;
          while (probe <= hi) {
            reach = nodeReach(doc, nodes[probe], extent);
            if (reach >= 0) break;
            probe++;
          }
          if (reach < 0) { hi = mid - 1; continue; }
          if (reach >= into) { best = probe; hi = mid - 1; }
          else lo = probe + 1;
        }
        return best;
      }

      function leadingRange(slot) {
        var doc = slot && slot.doc;
        if (!doc || !doc.body) return null;
        if (!slot.textNodes) slot.textNodes = collectTextNodes(doc);
        var nodes = slot.textNodes;
        if (!nodes.length) return null;

        var into = Math.max(0, scrollPos() - slot.start);
        var extent = canvasVertical ? measuredExtent(doc) : 0;

        var best = firstNodeReaching(doc, nodes, into, extent);
        // Past the last laid-out node: the reader is at the very end of the
        // section, so the last node is the honest answer.
        if (best < 0) best = nodes.length - 1;

        try {
          var out = doc.createRange();
          out.setStart(nodes[best], 0);
          out.collapse(true);
          return out;
        } catch (e) { return null; }
      }

      function emitCanvasLocation() {
        if (!canvasReady || !bootstrapped) return;
        var slot = slotAt(scrollPos());
        if (!slot) return;
        var within = slot.size > 0
          ? Math.min(1, Math.max(0, (scrollPos() - slot.start) / slot.size))
          : 0;
        var w = sizeWeights[slot.index] || 0;
        var frac = (sizeOffsets[slot.index] || 0) + within * w;
        var cfi = '';
        try {
          cfi = view.getCFI(slot.index, leadingRange(slot));
        } catch (e) { /* a sectionless CFI is still better than none */ }
        currentChapterIndex = slot.index;
        post({
          type: 'relocated',
          cfi: cfi,
          progress: Math.round(Math.min(1, Math.max(0, frac)) * 100),
          page: 0,
          totalPages: 0,
          spineIndex: slot.index,
          spineTotal: spineTotal,
          chapterHref: '',
          chapterLabel: '',
        });
      }

      // ── Holding a restored position ─────────────────────────────────────
      //
      // Landing on a stored position is not a single act. The section is
      // measured, scrolled to -- and then its web fonts arrive, its images
      // decode, and the whole chapter re-lays-out underneath the reader. The
      // offset computed a moment earlier now points somewhere else, and since
      // the canvas reports its position continuously, that drifted spot is
      // what gets saved. Which means the error does not just show once: it is
      // written back, and the book opens further out every time.
      //
      // So a restore is held rather than performed. The anchor is kept and
      // re-applied after every re-measure of its own section, until the reader
      // touches the page -- at which point where they are is their business
      // and the anchor is dropped.
      var pendingAnchor = null;   // { index: number, anchor: fn }

      function releaseAnchor() { pendingAnchor = null; }

      // Where an anchor sits, in the section document's own coordinates.
      //
      // The anchor that comes back from a CFI is usually a COLLAPSED range --
      // a caret between two characters, because that is exactly what the saved
      // position is. getBoundingClientRect on a collapsed range is allowed to
      // report all zeroes, and in WebKit it does. Treating that as "no rect
      // yet" is what made every text position fail to restore while picture
      // pages, which take a different path entirely, appeared to work.
      //
      // So: ask three ways before giving up. The bounding rect, then the first
      // client rect (which a collapsed range still reports, being a caret with
      // a height), then the element the range starts in.
      function anchorRect(a) {
        var r = null;
        try { r = a.getBoundingClientRect ? a.getBoundingClientRect() : null; } catch (e) { r = null; }
        if (r && (r.width || r.height)) return r;
        try {
          var rects = a.getClientRects ? a.getClientRects() : null;
          if (rects && rects.length) return rects[0];
        } catch (e) { /* fall through */ }
        var node = a.startContainer || a;
        if (node && node.nodeType === 3) node = node.parentNode;
        try {
          if (node && node.getBoundingClientRect) {
            var er = node.getBoundingClientRect();
            if (er && (er.width || er.height)) return er;
          }
        } catch (e) { /* fall through */ }
        return null;
      }

      // Scroll so the anchored node sits at the reading edge.
      //
      // Three outcomes, and keeping them apart matters: 'wait' means the
      // section is not mounted yet and the hold should continue; 'fail' means
      // this anchor will never resolve and the caller should fall back to the
      // start of the section; 'ok' means done. Collapsing 'fail' into 'wait'
      // is what left the reader sitting at the top of the book with nothing
      // having moved at all.
      function applyAnchor() {
        if (!pendingAnchor) return 'fail';
        var slot = slots[pendingAnchor.index];
        var doc = slot && slot.doc;
        if (!doc) return 'wait';
        var offset = 0;
        try {
          var a = typeof pendingAnchor.anchor === 'function'
            ? pendingAnchor.anchor(doc)
            : pendingAnchor.anchor;
          if (typeof a === 'number') {
            offset = a * slot.size;
          } else if (a) {
            var r = anchorRect(a);
            if (!r) return 'fail';
            offset = canvasVertical ? (measuredExtent(doc) - r.right) : r.top;
          } else {
            return 'fail';
          }
        } catch (e) { return 'fail'; }
        setScrollPos(slot.start + Math.max(0, offset));
        return 'ok';
      }

      var scrollRaf = 0;
      function onCanvasScroll() {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(function () {
          scrollRaf = 0;
          updateMounts();
          emitCanvasLocation();
        });
      }

      function waitForSlotDoc(slot, tries) {
        var left = tries == null ? 60 : tries;
        return new Promise(function (resolve) {
          (function poll() {
            if (slot.doc) return resolve(slot.doc);
            if (left-- <= 0) return resolve(null);
            setTimeout(poll, 25);
          })();
        });
      }

      // Scroll to a resolved navigation target. anchor is foliate's own
      // shape: a function of the section document returning either a Range, an
      // Element, or a 0..1 fraction of the section.
      // hold: keep re-applying this position as the section settles. True for
      // the restore on open, where fonts and images are still to come; false
      // for a TOC jump, where the reader is already looking at a settled book
      // and asked to be moved.
      function canvasGoTo(index, anchor, hold) {
        var slot = slots[index];
        if (!slot) return Promise.resolve();
        mountSlot(slot);
        return waitForSlotDoc(slot).then(function (doc) {
          if (!doc) { setScrollPos(slot.start); onCanvasScroll(); return; }
          measureSlot(slot);
          pendingAnchor = { index: index, anchor: anchor };
          var outcome = applyAnchor();
          // An anchor that cannot resolve still means the right CHAPTER, so
          // land there rather than leaving the reader at the top of the book.
          if (outcome === 'fail') { setScrollPos(slot.start); releaseAnchor(); }
          else if (!hold) releaseAnchor();
          updateMounts();
          emitCanvasLocation();
        });
      }

      function canvasNav(kind) {
        releaseAnchor();
        var vp = viewportExtent();
        // Just under a screen, so the line you stopped on is still there to
        // pick the thread back up from.
        var step = Math.max(1, Math.round(vp * 0.9));
        var max = Math.max(0, canvasTotal - vp);
        if (kind === 'next') setScrollPos(Math.min(max, scrollPos() + step));
        else setScrollPos(Math.max(0, scrollPos() - step));
        onCanvasScroll();
      }

      // Re-measure everything after something that changes type metrics (a
      // font, a size, a rotation). Sizes computed under the old metrics are
      // all wrong, so mounted slots are measured again and unmounted ones go
      // back to being estimates. The reader is held at the same point of the
      // same section rather than the same pixel, since the pixel moved.
      function remeasureCanvas() {
        if (!canvasReady) return;
        // Re-inject before measuring. The section CSS is not static: the
        // media caps are computed from the screen size RN last reported, so
        // after a rotation the rules themselves are stale, and measuring
        // against stale rules would just record the old layout.
        for (var n = 0; n < slots.length; n++) {
          if (slots[n].doc) injectSectionStyle(slots[n].doc);
        }
        var slot = slotAt(scrollPos());
        var within = slot && slot.size > 0
          ? (scrollPos() - slot.start) / slot.size
          : 0;
        measuredPxTotal = 0;
        measuredByteTotal = 0;
        for (var i = 0; i < slots.length; i++) {
          var s = slots[i];
          if (s.doc) {
            s.size = measuredExtent(s.doc);
            s.measured = true;
            s.measuredPx = s.size;
            var b = sectionBytes[i] || 0;
            if (b > 0) { measuredByteTotal += b; measuredPxTotal += s.size; }
          } else {
            s.measured = false;
            s.measuredPx = 0;
          }
          applySlotSize(s);
        }
        // Anything still unmeasured is re-estimated at the new ratio.
        for (var j = 0; j < slots.length; j++) {
          if (!slots[j].measured) slots[j].size = estimateFor(j);
          applySlotSize(slots[j]);
        }
        relayout();
        if (slot) setScrollPos(slot.start + within * slot.size);
        // A held anchor outranks the proportional restore above: it knows the
        // node the reader was on, where the fraction only knows roughly how
        // far down they were.
        if (pendingAnchor && applyAnchor() === 'fail') releaseAnchor();
        updateMounts();
        emitCanvasLocation();
      }

      function buildCanvas(style) {
        normalizeStyle(style);
        canvasVertical = isVerticalBook();
        canvasEl = document.getElementById('canvas');
        if (!canvasEl) throw new Error('canvas host missing');
        // The axis class is what reveals the canvas AND what sets its
        // display. Assigning display here instead would override the
        // stylesheet and undo axis-x's flex row.
        canvasEl.className = (canvasVertical ? 'axis-x' : 'axis-y') + ' placing';
        var viewEl = document.getElementById('view');
        if (viewEl) viewEl.style.display = 'none';

        var secs = (book && book.sections) || [];

        // Share-of-book by byte size -- the same signal foliate's own progress
        // model uses, so the percentage reported here stays comparable with
        // what the web reader has already written for this book.
        var sizes = [];
        var total = 0;
        for (var i = 0; i < secs.length; i++) {
          var sz = (secs[i].linear !== 'no' && secs[i].size > 0) ? secs[i].size : 0;
          sizes.push(sz);
          total += sz;
        }
        sectionBytes = sizes;
        measuredPxTotal = 0;
        measuredByteTotal = 0;
        sizeWeights = [];
        sizeOffsets = [];
        var acc = 0;
        for (var j = 0; j < sizes.length; j++) {
          var w = total > 0 ? sizes[j] / total : 0;
          sizeOffsets.push(acc);
          sizeWeights.push(w);
          acc += w;
        }

        var vp = viewportExtent() || 600;
        slots = [];
        for (var k = 0; k < secs.length; k++) {
          var el = document.createElement('div');
          el.className = 'slot';
          var slot = {
            index: k,
            el: el,
            iframe: null,
            doc: null,
            size: Math.max(vp, Math.ceil((sizes[k] || 0) * EST_PX_PER_BYTE_SEED)),
            measured: false,
            measuredPx: 0,
            mounting: false,
            start: 0,
            textNodes: null,
          };
          applySlotSize(slot);
          canvasEl.appendChild(el);
          slots.push(slot);
        }
        relayout();
        canvasEl.addEventListener('scroll', onCanvasScroll, { passive: true });
        // Touching the page ends any hold: from here the position is the
        // reader's, not the one we were restoring.
        canvasEl.addEventListener('touchstart', releaseAnchor, { passive: true });
        canvasReady = true;
      }

      function revealCanvas() {
        if (!canvasEl) return;
        canvasEl.className = canvasEl.className.replace(/\s*placing\b/, '');
      }

      function isCanvasPath() { return canvasReady && bookType !== 'manga'; }

      // Foliate's renderer serializes navigation internally and handles
      // cross-spine prev/next without help. The epubjs path needed an outer
      // navInFlight guard because epub.js dropped concurrent display() calls
      // silently; foliate does not, so we just hand each call straight
      // through and let promise rejections (e.g. nothing-to-go-to) flow.
      function nav(kind, target) {
        if (!view) return;
        if (isCanvasPath()) {
          if (kind === 'next' || kind === 'prev') return canvasNav(kind);
          if (kind === 'goTo') {
            // resolveNavigation turns a CFI or an href into foliate's
            // { index, anchor } pair -- the same resolution its own goTo
            // performs, minus the rendering we are doing ourselves.
            return Promise.resolve()
              .then(function () { return view.resolveNavigation(target); })
              .then(function (r) { if (r) return canvasGoTo(r.index, r.anchor); })
              .catch(function (e) { err('nav goTo', e); });
          }
          return;
        }
        try {
          if (kind === 'next') view.next();
          else if (kind === 'prev') view.prev();
          else if (kind === 'left') view.goLeft();   // direction-aware tap
          else if (kind === 'right') view.goRight(); // direction-aware tap
          else if (kind === 'goTo') view.goTo(target);
        } catch (e) { err('nav', e); }
      }

      async function loadBook(base64, cfi, style, viewport) {
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
          // Detect book type early -- manga takes a different shell (pinch
          // zoom, page styling) and the style pass below needs to know
          // whether this book is vertical-rl.
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
          if (bookType === 'manga') {
            attachViewListeners();
            // Fixed-layout keeps foliate's own renderer: its pages are
            // pre-paginated art, there is nothing to flow into a canvas, and
            // foliate-fxl already does the right thing with them.
            if (style) applyStyle(style);
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
          } else {
            // Reflowable: the whole book goes into one scrolling canvas.
            // foliate's renderer is left idle and hidden -- we never call
            // renderer.next or view.goTo on this path, so it draws nothing,
            // while view.book / view.getCFI / view.resolveNavigation stay
            // available as the parsing and position service.
            currentStyle = style || currentStyle;
            buildCanvas(currentStyle);
            if (style) applyStyle(style);
            // Land on the stored position before the first paint where we
            // can. A CFI that no longer resolves is not fatal: the canvas is
            // already sitting at the start of the book.
            if (pendingStartCfi) {
              try {
                var target = await view.resolveNavigation(pendingStartCfi);
                if (target) {
                  bootstrapped = true;
                  await canvasGoTo(target.index, target.anchor, true);
                }
              } catch (e) { err('bootstrap goTo', e); }
            } else {
              mountSlot(slots[0]);
            }
            // Only now does the canvas start reporting where it is, and only
            // now is it shown. Anything emitted -- or painted -- before this
            // point would have been a position the reader never chose.
            bootstrapped = true;
            revealCanvas();
            updateMounts();
            emitCanvasLocation();
          }

          // bookType + direction were already detected above. No re-detect.

          var statusEl = document.getElementById('status');
          if (statusEl) statusEl.style.display = 'none';

          post({
            type: 'ready',
            toc: tocItems,
            bookType: bookType,
            direction: direction,
            spineCount: spineTotal,
          });
        } catch (e) {
          // Hide the in-WebView loading overlay even on hard failure so the
          // RN error UI (if any) isn't masked by stale "Loading..." text, and
          // reveal the canvas: a book that failed half-open is still better
          // seen than a permanently blank frame.
          var s = document.getElementById('status');
          if (s) s.style.display = 'none';
          bootstrapped = true;
          revealCanvas();
          err('load', e);
        }
      }

      function handleInbound(raw) {
        var msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        if (!msg || !msg.type) return;
        if (msg.type === 'load') return loadBook(msg.base64, msg.cfi, msg.style, msg.viewport);
        if (!view) return;
        if (msg.type === 'next') return nav('next');
        if (msg.type === 'prev') return nav('prev');
        if (msg.type === 'goToCfi') return nav('goTo', msg.cfi);
        if (msg.type === 'goToSpine') {
          if (isCanvasPath()) { canvasGoTo(msg.index, null); return; }
          var s = book && book.sections && book.sections[msg.index];
          if (s && s.id) nav('goTo', s.id);
          return;
        }
        if (msg.type === 'setStyle') return applyStyle(msg.style);
        if (msg.type === 'setSize') {
          viewportW = msg.width; viewportH = msg.height;
          // foliate's paginator watches container size via ResizeObserver and
          // reflows itself. The canvas does not: its slot sizes were measured
          // against the old viewport, so they all have to be taken again.
          if (isCanvasPath()) remeasureCanvas();
          return;
        }
        if (msg.type === 'clearSelection') return clearSelectionInAllDocs();
      }

      // Called when the reader taps outside the custom selection menu, or
      // picks an action from it — the band disappears alongside the menu.
      function clearSelectionInAllDocs() {
        loadedDocs.forEach(function (doc) {
          try { clearReaderSelection(doc); } catch (_) {}
        });
      }

      document.addEventListener('message', function (e) { handleInbound(e.data); });
      window.addEventListener('message', function (e) { handleInbound(e.data); });
    })();
  </script>
</body>
</html>
`;
