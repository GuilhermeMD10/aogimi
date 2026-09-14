// Custom drag-select gesture for the reader's chapter documents.
//
// Three states drive the visual + haptic feedback:
//
//   idle      → finger up, nothing on screen.
//   pressing  → finger down for < MIN_HOLD_MS. No visuals (intentional —
//               we don't want a flash on quick taps).
//   selecting → MIN_HOLD_MS elapsed without moving. One haptic; a small
//               circle shows under the finger; the band becomes live, and
//               every touchmove re-derives it from the start point to the
//               current finger position. On touchend the last range is kept
//               and handed to the shell, which posts it to RN.
//
// ── Why this owns the range and paints the band itself ──────────────────────
//
// **Nothing here touches `window.getSelection()`, and that is the whole
// point.** On iOS a script-created DOM selection is never painted: the band a
// reader sees there is drawn by UIKit's text-interaction machinery, not by the
// web engine, so no `::selection` rule could colour it — holding long enough
// simply let the native selection take over and paint its own tint instead.
//
// Owning a `Range` and drawing the band from it makes the colour ours on both
// platforms, and collapses every difference between them at the same time:
// the text comes from `range.cloneContents()`, the band from
// `range.getClientRects()`, and the reader's CSS says `user-select: none` so
// neither OS starts a selection of its own to compete with.
//
// All visual chrome lives inside the chapter iframe as absolutely-positioned
// <div>s; no RN-side overlay is involved.
export const TAP_TO_SELECT_FN = `
  // The live selection: a Range this file owns outright, plus the flag the
  // shell reads to know a drag is in flight.
  var __readerRange = null;
  var __readerInDrag = false;

  // The band colour, set by the shell from ReaderThemeStyle.highlight. Read
  // through a function so a repaint always picks up the current value, and
  // guarded because the gesture is inlined above the shell's own declarations.
  function readerBand() {
    return (typeof readerBandColor === 'string' && readerBandColor)
      ? readerBandColor
      : 'rgba(80, 160, 255, 0.35)';
  }

  var BAND_LAYER_ID = '__reader_selection_bands';

  function bandLayer(doc) {
    var el = doc.getElementById(BAND_LAYER_ID);
    if (el) return el;
    el = doc.createElement('div');
    el.id = BAND_LAYER_ID;
    el.setAttribute('aria-hidden', 'true');
    // Zero-sized and fixed, so the container contributes nothing to layout or
    // to the columnised flow. Every band inside it is fixed too, which makes
    // the container's own position irrelevant.
    el.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;' +
      'margin:0;padding:0;border:0;pointer-events:none;';
    doc.body.appendChild(el);
    return el;
  }

  // Repaint the band for range, reusing the divs already on screen.
  //
  // position:fixed with the raw client rects, which is exact here rather than
  // approximate: foliate sizes each chapter iframe to its entire content and
  // scrolls the container *outside* it, so the iframe itself never scrolls and
  // client coordinates are document coordinates. The drag indicator below has
  // always been positioned the same way.
  //
  // One div per client rect, so a selection spanning lines or columns gets one
  // band per line rather than a single box swallowing the gaps.
  function paintBands(doc, range) {
    var layer = bandLayer(doc);
    var rects = range ? range.getClientRects() : [];
    var color = readerBand();
    var used = 0;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (!(r.width > 0) || !(r.height > 0)) continue;
      var band = layer.childNodes[used];
      if (!band) {
        band = doc.createElement('div');
        layer.appendChild(band);
      }
      band.style.cssText =
        'position:fixed;pointer-events:none;' +
        'left:' + r.left + 'px;top:' + r.top + 'px;' +
        'width:' + r.width + 'px;height:' + r.height + 'px;' +
        'background:' + color + ';';
      used++;
    }
    while (layer.childNodes.length > used) layer.removeChild(layer.lastChild);
  }

  // Drop the band and the range. Called when the reader dismisses the menu,
  // and again at the start of every new gesture.
  function clearReaderSelection(doc) {
    __readerRange = null;
    try {
      var layer = doc && doc.getElementById(BAND_LAYER_ID);
      if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    } catch (_) {}
  }

  // Repaint an existing band, e.g. after the reader changes the colour.
  function repaintReaderSelection(doc) {
    if (!__readerRange) return;
    try { paintBands(doc, __readerRange); } catch (_) {}
  }

  function attachHoldSelect(doc, index) {
    // **Deliberately below the platform's own long-press duration** (~500ms
    // on both iOS and Android), so this gesture claims the hold first and the
    // band appears while the reader is still expecting it to. Raising it to
    // the platform value made highlighting feel like it arrived late, which
    // is the whole reason it was tuned down here in the first place.
    //
    // The cost, so it is not rediscovered as a bug: a page swipe that begins
    // after a pause longer than this becomes a selection instead of a page
    // turn. A flick — finger down, straight into the drag — still pages,
    // because movement past MOVE_PX before the timer fires cancels the hold.
    // Raise this if slow swipes start feeling stolen; lower it if the band
    // feels late. The two pull in opposite directions and there is no value
    // that serves both.
    var MIN_HOLD_MS = 150;
    var MOVE_PX = 8;

    var startX = 0, startY = 0;
    var state = 'idle';
    var holdTimer = 0;
    var indicator = null;

    function ensureIndicator() {
      if (indicator) return indicator;
      var el = doc.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText =
        'position:fixed;' +
        'left:0;top:0;' +
        'width:18px;height:18px;' +
        'border-radius:50%;' +
        'background:rgba(0,0,0,0.18);' +
        'border:1.5px solid rgba(0,0,0,0.32);' +
        'pointer-events:none;' +
        'transform:translate(-50%,-50%) scale(0.85);' +
        'transform-origin:center center;' +
        'z-index:2147483647;' +
        'opacity:0;' +
        'transition:opacity 110ms ease, transform 140ms ease, background 140ms ease;';
      doc.body.appendChild(el);
      indicator = el;
      return el;
    }

    function moveIndicator(x, y) {
      var el = ensureIndicator();
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    }

    function showSelecting() {
      var el = ensureIndicator();
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-50%) scale(1.25)';
      el.style.background = 'rgba(0,0,0,0.32)';
    }

    function hideIndicator() {
      if (!indicator) return;
      indicator.style.opacity = '0';
      indicator.style.transform = 'translate(-50%,-50%) scale(0.85)';
    }

    // Selection haptics go out over the RN bridge.
    //
    // navigator.vibrate is Android-only -- iOS WebKit does not implement it
    // at all, so the gesture used to land silently on the platform it was
    // being tuned on. The post() helper is declared in the shell script this
    // file is inlined into (foliateHtml's IIFE) and hoists, so it is callable
    // from here; the reader screen turns each message into an expo-haptics call.
    function haptic(kind) {
      try {
        if (typeof post === 'function') post({ type: 'haptic', kind: kind });
      } catch (_) {}
    }

    // One tick per character the band gains or loses, so the strip's growth is
    // felt and not only seen. Counted in code points (Array.from), because a
    // JP text is full of characters that are two UTF-16 units wide and each is
    // still one character to the reader.
    //
    // Rate-limited because a fast drag can cross several characters inside one
    // frame: without the floor those collapse into a buzz, and each one would
    // also cost a bridge message.
    var TICK_MIN_GAP_MS = 30;
    var selLen = 0;
    var lastTickAt = 0;

    function bandLength() {
      if (!__readerRange) return 0;
      try { return Array.from(__readerRange.toString()).length; } catch (_) { return 0; }
    }

    function tickForSelection() {
      var len = bandLength();
      if (len === selLen) return;
      selLen = len;
      var now = Date.now();
      if (now - lastTickAt < TICK_MIN_GAP_MS) return;
      lastTickAt = now;
      haptic('tick');
    }

    // Re-derive the band from the hold point to (x, y) and paint it.
    function extendTo(x, y) {
      var range = rangeBetween(doc, startX, startY, x, y);
      if (!range) return;
      __readerRange = range;
      paintBands(doc, range);
    }

    function cancelHold() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
    }

    doc.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { cancelHold(); state = 'idle'; hideIndicator(); return; }
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      state = 'pressing';
      selLen = 0;
      // Indicator stays hidden during the pressing window so a brief tap
      // doesn't flash the circle. It only appears once the hold threshold
      // is met (i.e. when entering the 'selecting' state below).
      cancelHold();
      holdTimer = setTimeout(function () {
        holdTimer = 0;
        if (state !== 'pressing') return;
        state = 'selecting';
        __readerInDrag = true;
        haptic('start');
        moveIndicator(startX, startY);
        showSelecting();
        // A new gesture replaces whatever was selected before.
        clearReaderSelection(doc);
        // Seed the band at the starting point so there is something to see
        // before the finger has travelled anywhere.
        extendTo(startX, startY);
        // Seeded, not ticked: the first character arrives with the 'start'
        // haptic already firing, and two pulses on one event reads as a
        // stutter. Recording the length here makes the *next* character the
        // first tick.
        selLen = bandLength();
      }, MIN_HOLD_MS);
    }, { passive: true });

    // Non-passive so preventDefault() can stop the WebView treating the drag
    // as a scroll, and **capture-phase, which is what actually holds the page
    // still**.
    //
    // preventDefault() alone only stops *native* scrolling, and in paginated
    // flow the page does not move natively: foliate's own touchmove handler
    // reads the drag and calls scrollBy() itself, which no amount of
    // preventDefault can undo. It used to yield to a selection by checking
    // document.getSelection() for a non-collapsed range — a check that stopped
    // tripping the moment the band became a Range of our own, so a highlight
    // drag scrolled the text out from under itself.
    //
    // foliate listens on this same document in the bubble phase, and it
    // registers first (its load handler runs before ours), so ordering cannot
    // be won there. A capture listener on the document runs before any
    // bubble-phase listener on it, because the event target is a descendant —
    // so stopPropagation() here means foliate never sees the move at all.
    // Only while selecting: left alone otherwise, its swipe paging still works.
    doc.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (!t) return;
      if (state === 'pressing') {
        if (Math.abs(t.clientX - startX) > MOVE_PX || Math.abs(t.clientY - startY) > MOVE_PX) {
          // User is scrolling, not selecting — let the scroll go through.
          cancelHold();
          state = 'idle';
          hideIndicator();
        }
      } else if (state === 'selecting') {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopPropagation(); } catch (_) {}
        moveIndicator(t.clientX, t.clientY);
        extendTo(t.clientX, t.clientY);
        tickForSelection();
      }
    }, { capture: true, passive: false });

    doc.addEventListener('touchend', function (e) {
      cancelHold();
      var wasSelecting = state === 'selecting';
      if (wasSelecting) {
        var t = e.changedTouches && e.changedTouches[0];
        if (t) extendTo(t.clientX, t.clientY);
      }
      __readerInDrag = false;
      state = 'idle';
      hideIndicator();
      // The shell owns the wire format and the CFI, so it does the posting.
      if (wasSelecting && __readerRange && typeof onSelectionSettled === 'function') {
        try { onSelectionSettled(doc, index, __readerRange); } catch (_) {}
      }
    }, { passive: true });

    doc.addEventListener('touchcancel', function () {
      cancelHold();
      __readerInDrag = false;
      state = 'idle';
      hideIndicator();
    }, { passive: true });

    // Block the OS selection paths outright. The reader's CSS already sets
    // user-select: none, which stops the long-press selection on both
    // platforms; these two cover the rest (Android's context menu, and any
    // engine that would still start a selection from a gesture).
    doc.addEventListener('selectstart', function (e) {
      try { e.preventDefault(); } catch (_) {}
    });
    doc.addEventListener('contextmenu', function (e) {
      try { e.preventDefault(); } catch (_) {}
    });
  }

  // A Range from one point to another, ordered, and never empty.
  function rangeBetween(doc, x1, y1, x2, y2) {
    var a = caretAt(doc, x1, y1);
    var b = caretAt(doc, x2, y2);
    if (!a || !b) return null;

    try {
      // Order endpoints so setStart precedes setEnd in document order.
      var pa = doc.createRange();
      pa.setStart(a.node, a.offset);
      pa.setEnd(a.node, a.offset);
      var pb = doc.createRange();
      pb.setStart(b.node, b.offset);
      pb.setEnd(b.node, b.offset);
      var aFirst = pa.compareBoundaryPoints(Range.START_TO_START, pb) <= 0;
      var first = aFirst ? a : b;
      var last = aFirst ? b : a;

      var range = doc.createRange();
      range.setStart(first.node, first.offset);
      range.setEnd(last.node, last.offset);
      // Never leave the band collapsed while the gesture is live: the seed at
      // touch-down, and any drag shorter than one character, would otherwise
      // show nothing at all.
      if (range.collapsed) growByOneChar(range);
      return range;
    } catch (_) {
      return null;
    }
  }

  // Extend a collapsed range over one character — forward if there is room in
  // the end node, otherwise backward from the start. Mutates in place; leaves
  // the range collapsed only when the caret sits in an empty text node, which
  // is the one case with no character to take.
  function growByOneChar(range) {
    var end = range.endContainer;
    var endLen = end.nodeType === 3 ? end.length : end.childNodes.length;
    if (range.endOffset < endLen) {
      range.setEnd(end, range.endOffset + 1);
      return;
    }
    if (range.startOffset > 0) range.setStart(range.startContainer, range.startOffset - 1);
  }

  function caretAt(doc, x, y) {
    if (doc.caretRangeFromPoint) {
      var r = doc.caretRangeFromPoint(x, y);
      if (r) return { node: r.startContainer, offset: r.startOffset };
    } else if (doc.caretPositionFromPoint) {
      var p = doc.caretPositionFromPoint(x, y);
      if (p) return { node: p.offsetNode, offset: p.offset };
    }
    return null;
  }
`;
