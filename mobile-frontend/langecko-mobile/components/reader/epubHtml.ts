// HTML template for the WebView-based EPUB renderer.
// Loads epub.js from unpkg at runtime. The native side passes the EPUB as
// a base64 string via postMessage; the WebView decodes it into an
// ArrayBuffer and opens it with epub.js. All user events (page change,
// selection, ready) are relayed back to RN via window.ReactNativeWebView.

export type EpubBridgeInbound =
  | { type: 'load'; base64: string; cfi?: string | null }
  | { type: 'setFontPx'; value: number }
  | { type: 'setVertical'; value: boolean }
  | { type: 'goToCfi'; cfi: string }
  | { type: 'next' }
  | { type: 'prev' };

export type EpubBridgeOutbound =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'relocated'; cfi: string; progress: number }
  | { type: 'selection'; text: string; pageX: number; pageY: number };

export const EPUB_HTML = String.raw`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="https://unpkg.com/jszip@3.7.1/dist/jszip.min.js"></script>
  <script src="https://unpkg.com/epubjs@0.3.93/dist/epub.min.js"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
      background: var(--bg, #FAFAF9);
      color: var(--fg, #1A1918);
      font-family: -apple-system, "SF Pro Text", system-ui, sans-serif;
    }
    #viewer {
      position: absolute;
      inset: 0;
    }
    .tap-layer {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 30%;
      z-index: 10;
    }
    .tap-prev { left: 0; }
    .tap-next { right: 0; }
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
  <div class="tap-layer tap-prev" id="tap-prev"></div>
  <div class="tap-layer tap-next" id="tap-next"></div>
  <div class="status" id="status">Loading…</div>

  <script>
    (function () {
      var rendition = null;
      var book = null;

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

      function loadBook(base64, cfi) {
        try {
          var buffer = base64ToArrayBuffer(base64);
          book = ePub(buffer);
          rendition = book.renderTo('viewer', {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'paginated',
            manager: 'default',
          });
          rendition.themes.default({
            body: {
              'font-size': (window.__fontPx || 18) + 'px',
              'line-height': '1.75',
            },
            p: { 'margin-bottom': '1em' },
          });
          var start = cfi || undefined;
          rendition.display(start).then(function () {
            document.getElementById('status').style.display = 'none';
            post({ type: 'ready' });
          }).catch(function (err) {
            post({ type: 'error', message: String((err && err.message) || err) });
          });

          rendition.on('relocated', function (location) {
            var progress = 0;
            try {
              progress = Math.round((book.locations && book.locations.percentageFromCfi(location.start.cfi) || 0) * 100);
            } catch (e) {}
            post({ type: 'relocated', cfi: location.start.cfi, progress: progress });
          });

          rendition.on('selected', function (cfiRange, contents) {
            try {
              var text = rendition.getRange(cfiRange).toString();
              var sel = contents.window.getSelection();
              var rect = { x: 0, y: 0 };
              if (sel && sel.rangeCount > 0) {
                var r = sel.getRangeAt(0).getBoundingClientRect();
                rect = { x: r.left + r.width / 2, y: r.top };
              }
              post({ type: 'selection', text: text, pageX: rect.x, pageY: rect.y });
            } catch (e) {
              post({ type: 'error', message: 'selection: ' + e });
            }
          });

          // Generate locations lazily for progress percentages
          if (book.locations) {
            book.ready.then(function () {
              book.locations.generate(1000).catch(function () {});
            });
          }
        } catch (err) {
          post({ type: 'error', message: String((err && err.message) || err) });
        }
      }

      document.getElementById('tap-prev').addEventListener('click', function () {
        if (rendition) rendition.prev();
      });
      document.getElementById('tap-next').addEventListener('click', function () {
        if (rendition) rendition.next();
      });

      function handleInbound(raw) {
        var msg;
        try { msg = JSON.parse(raw); } catch (e) { return; }
        if (!msg || !msg.type) return;
        if (msg.type === 'load') return loadBook(msg.base64, msg.cfi);
        if (!rendition) return;
        if (msg.type === 'next') rendition.next();
        else if (msg.type === 'prev') rendition.prev();
        else if (msg.type === 'goToCfi') rendition.display(msg.cfi);
        else if (msg.type === 'setFontPx') {
          window.__fontPx = msg.value;
          rendition.themes.override('font-size', msg.value + 'px');
        }
      }

      document.addEventListener('message', function (e) { handleInbound(e.data); });
      window.addEventListener('message', function (e) { handleInbound(e.data); });
    })();
  </script>
</body>
</html>
`;
