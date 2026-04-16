/**
 * WebView viewer HTML templates.
 *
 * Both readers follow the same pattern: base64-encode the picked file on the
 * RN side, inline the base64 into the generated HTML, then load the HTML
 * into a WebView. The viewer JS decodes the base64, hands the bytes to
 * pdf.js or epub.js (loaded from CDN), and communicates back to RN via
 * `window.ReactNativeWebView.postMessage(JSON.stringify(...))`.
 *
 * Messages from RN → WebView are dispatched as document 'message' events
 * (and window 'message' on iOS) with a JSON string payload.
 *
 * Known tradeoffs of the CDN + base64 approach:
 *   - First load requires internet (pdf.js / epub.js are fetched remotely).
 *   - Files above ~20–30 MB may be slow to parse through a base64 string.
 *
 * Selection & annotation contract
 * ───────────────────────────────
 * Both readers emit `{ type: 'selection', text, ... }` on text selection:
 *   EPUB — also includes `cfi` so the parent can persist an anchor.
 *   PDF  — also includes `page` so the parent can anchor a bookmark.
 *
 * EPUB supports runtime highlight commands from the parent:
 *   { type: 'addHighlight',    id, cfi, color }
 *   { type: 'removeHighlight', id, cfi }
 *   { type: 'goToCfi',         cfi }
 *
 * PDF currently has no highlight API (pdf.js textLayer span positions
 * aren't stable enough to persist) — only `goToPage` / `setScale`.
 */

const PDF_JS_VERSION  = '3.11.174';
const EPUB_JS_VERSION = '0.3.93';

export type HighlightInit = { id: string; cfi: string; color: string };

/** Build the pdf.js WebView HTML for a given file. */
export function pdfViewerHtml(base64: string, initialPage: number): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; img-src * blob: data:; style-src 'self' 'unsafe-inline';">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin:0; padding:0; background:#F8F9FA; width:100%; min-height:100%; overflow-x:hidden; font-family:-apple-system,system-ui,sans-serif; }
  #page { position:relative; margin:8px auto; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.15); }
  canvas { display:block; }
  .textLayer { position:absolute; left:0; top:0; right:0; bottom:0; overflow:hidden; opacity:0.2; line-height:1; }
  .textLayer > span { color:transparent; position:absolute; white-space:pre; cursor:text; transform-origin:0% 0%; }
  .textLayer ::selection { background:rgba(255,195,0,0.45); }
  #err { color:#9E2A2B; padding:16px; font-size:13px; }
  #loading { padding:32px; text-align:center; color:#748CAB; font-size:13px; }
</style>
</head><body>
<div id="loading">Loading PDF…</div>
<div id="page" style="display:none"><canvas id="canvas"></canvas><div id="textLayer" class="textLayer"></div></div>
<div id="err"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.min.js"></script>
<script>
(function(){
  var post = function(m){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch(e){} };
  if (!window.pdfjsLib) { document.getElementById('loading').style.display='none'; document.getElementById('err').textContent='Failed to load pdf.js. Check internet connection.'; post({type:'error',error:'pdfjs_missing'}); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js';

  var B64 = ${JSON.stringify(base64)};
  var raw = atob(B64);
  var bytes = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  var pdf = null;
  var currentPage = ${initialPage};
  var scale = 1;
  var rendering = false;
  var queued = false;

  function render(){
    if (!pdf) return;
    if (rendering) { queued = true; return; }
    rendering = true;
    pdf.getPage(currentPage).then(function(page){
      var vp1 = page.getViewport({ scale: 1 });
      var fitWidth = window.innerWidth - 16;
      var baseScale = fitWidth / vp1.width;
      var vp = page.getViewport({ scale: baseScale * scale });
      // Render at device-pixel resolution for crispness on retina/HiDPI
      // screens, then shrink via CSS so layout size stays the same.
      var dpr = window.devicePixelRatio || 1;
      var canvas = document.getElementById('canvas');
      var tl = document.getElementById('textLayer');
      var box = document.getElementById('page');
      canvas.width  = Math.floor(vp.width  * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width  = vp.width  + 'px';
      canvas.style.height = vp.height + 'px';
      tl.style.width  = vp.width  + 'px';
      tl.style.height = vp.height + 'px';
      tl.innerHTML = '';
      box.style.width  = vp.width  + 'px';
      box.style.height = vp.height + 'px';
      var ctx = canvas.getContext('2d');
      var transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;
      return page.render({ canvasContext: ctx, viewport: vp, transform: transform }).promise.then(function(){
        return page.getTextContent().then(function(tc){
          pdfjsLib.renderTextLayer({ textContentSource: tc, container: tl, viewport: vp, textDivs: [] });
          post({ type: 'rendered', page: currentPage, numPages: pdf.numPages, scale: scale });
          window.scrollTo(0, 0);
        });
      });
    }).catch(function(e){
      post({ type: 'error', error: String(e && e.message || e) });
    }).then(function(){
      rendering = false;
      if (queued) { queued = false; render(); }
    });
  }

  pdfjsLib.getDocument({ data: bytes }).promise.then(function(doc){
    pdf = doc;
    document.getElementById('loading').style.display = 'none';
    document.getElementById('page').style.display = 'block';
    if (currentPage > pdf.numPages) currentPage = 1;
    if (currentPage < 1) currentPage = 1;
    post({ type: 'loaded', numPages: pdf.numPages });
    render();
  }).catch(function(e){
    document.getElementById('loading').style.display = 'none';
    document.getElementById('err').textContent = 'Error loading PDF: ' + (e && e.message || e);
    post({ type: 'error', error: String(e && e.message || e) });
  });

  function handle(data){
    try {
      var m = JSON.parse(data);
      if (!pdf) return;
      if (m.type === 'goTo' || m.type === 'goToPage') { currentPage = Math.max(1, Math.min(pdf.numPages, m.page|0)); render(); }
      else if (m.type === 'next') { if (currentPage < pdf.numPages) { currentPage++; render(); } }
      else if (m.type === 'prev') { if (currentPage > 1) { currentPage--; render(); } }
      else if (m.type === 'setScale') { scale = Math.max(0.5, Math.min(3, Number(m.scale) || 1)); render(); }
    } catch(e){}
  }
  function onWinMsg(e){ handle(e.data); }
  function onDocMsg(e){ handle(e.data); }
  window.addEventListener('message',   onWinMsg);
  document.addEventListener('message', onDocMsg);

  var selTimer = null;
  function onSelChange(){
    if (selTimer) clearTimeout(selTimer);
    selTimer = setTimeout(function(){
      var s = (window.getSelection && window.getSelection().toString() || '').trim();
      if (s) post({ type: 'selection', text: s, page: currentPage });
    }, 350);
  }
  document.addEventListener('selectionchange', onSelChange);

  // Cleanup on unload to prevent leaks if the WebView is reloaded.
  window.addEventListener('beforeunload', function(){
    if (selTimer) clearTimeout(selTimer);
    window.removeEventListener('message',   onWinMsg);
    document.removeEventListener('message', onDocMsg);
    document.removeEventListener('selectionchange', onSelChange);
    if (pdf) { pdf.destroy(); pdf = null; }
  });
})();
</script>
</body></html>`;
}

/**
 * Build the epub.js WebView HTML for a given file.
 *
 * `initialHighlights` are drawn as soon as the rendition is ready. New
 * highlights added post-load are applied via `{ type: 'addHighlight' }`
 * postMessage commands from the parent.
 */
export function epubViewerHtml(
  base64: string,
  initialCfi: string | undefined,
  fontSize: number,
  initialHighlights: HighlightInit[] = [],
): string {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net blob: data:; img-src * blob: data:; style-src 'self' 'unsafe-inline' blob:; font-src * blob: data:;">
<style>
  html, body { margin:0; padding:0; background:#fff; width:100%; height:100%; overflow:hidden; font-family:-apple-system,system-ui,sans-serif; }
  #viewer { position:absolute; inset:0; }
  #err { color:#9E2A2B; padding:16px; font-size:13px; }
  #loading { padding:32px; text-align:center; color:#748CAB; font-size:13px; }
</style>
</head><body>
<div id="loading">Loading EPUB…</div>
<div id="viewer"></div>
<div id="err"></div>
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/epubjs@${EPUB_JS_VERSION}/dist/epub.min.js"></script>
<script>
(function(){
  var post = function(m){ try { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch(e){} };
  if (!window.ePub) { document.getElementById('loading').style.display='none'; document.getElementById('err').textContent='Failed to load epub.js. Check internet connection.'; post({type:'error',error:'epubjs_missing'}); return; }

  var B64 = ${JSON.stringify(base64)};
  var raw = atob(B64);
  var buf = new ArrayBuffer(raw.length);
  var view = new Uint8Array(buf);
  for (var i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  var initialCfi = ${JSON.stringify(initialCfi ?? null)};
  var fontSize   = ${fontSize};
  var initialHighlights = ${JSON.stringify(initialHighlights)};
  // Map highlight id -> cfi, so the parent can say "remove id=abc" without
  // remembering which cfi it corresponds to.
  var highlightCfis = {};

  var book = ePub(buf);
  var rendition = book.renderTo('viewer', { width: '100%', height: '100%', flow: 'paginated', spread: 'none' });

  function applyHighlight(h) {
    try {
      rendition.annotations.highlight(
        h.cfi,
        { id: h.id },
        null,
        'hl-' + h.id,
        { fill: h.color, 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' }
      );
      highlightCfis[h.id] = h.cfi;
    } catch (e) { /* stale cfi — ignore */ }
  }

  function removeHighlight(id, cfi) {
    var anchor = cfi || highlightCfis[id];
    if (!anchor) return;
    try { rendition.annotations.remove(anchor, 'highlight'); } catch (e) {}
    delete highlightCfis[id];
  }

  book.ready.then(function(){
    rendition.themes.fontSize(fontSize + '%');
    return rendition.display(initialCfi || undefined);
  }).then(function(){
    document.getElementById('loading').style.display = 'none';
    for (var i = 0; i < initialHighlights.length; i++) applyHighlight(initialHighlights[i]);
    post({ type: 'loaded' });
  }).catch(function(e){
    document.getElementById('loading').style.display = 'none';
    document.getElementById('err').textContent = 'Error loading EPUB: ' + (e && e.message || e);
    post({ type: 'error', error: String(e && e.message || e) });
  });

  rendition.on('relocated', function(loc){
    if (loc && loc.start) {
      post({
        type: 'relocated',
        cfi: loc.start.cfi,
        page:  loc.start.displayed && loc.start.displayed.page,
        total: loc.start.displayed && loc.start.displayed.total,
      });
    }
  });

  rendition.on('selected', function(cfi, contents){
    try {
      var sel = contents.window.getSelection();
      var text = sel ? sel.toString().trim() : '';
      if (text) post({ type: 'selection', text: text, cfi: cfi });
    } catch(e){}
  });

  function handle(data){
    try {
      var m = JSON.parse(data);
      if (m.type === 'next') rendition.next();
      else if (m.type === 'prev') rendition.prev();
      else if (m.type === 'goTo' && m.cfi) rendition.display(m.cfi);
      else if (m.type === 'goToCfi' && m.cfi) rendition.display(m.cfi);
      else if (m.type === 'setFontSize') { fontSize = Number(m.size) || fontSize; rendition.themes.fontSize(fontSize + '%'); }
      else if (m.type === 'addHighlight')    applyHighlight({ id: m.id, cfi: m.cfi, color: m.color });
      else if (m.type === 'removeHighlight') removeHighlight(m.id, m.cfi);
    } catch(e){}
  }
  function onWinMsg(e){ handle(e.data); }
  function onDocMsg(e){ handle(e.data); }
  window.addEventListener('message',   onWinMsg);
  document.addEventListener('message', onDocMsg);

  // Cleanup on unload to prevent leaks.
  window.addEventListener('beforeunload', function(){
    window.removeEventListener('message',   onWinMsg);
    document.removeEventListener('message', onDocMsg);
    try { rendition.destroy(); } catch(e){}
    try { book.destroy(); } catch(e){}
  });
})();
</script>
</body></html>`;
}
