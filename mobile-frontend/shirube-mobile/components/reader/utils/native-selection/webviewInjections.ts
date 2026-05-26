import { SELECTION_BAND_COLOR } from './constants';

// CSS appended to every chapter doc by foliateHtml's buildThemeCss. Sets
// the selection band; foreground is left to inherit so text contrast stays
// correct under every reader theme.
export function selectionCss(): string {
  return (
    '::selection { background: ' + SELECTION_BAND_COLOR + '; }' +
    '::-moz-selection { background: ' + SELECTION_BAND_COLOR + '; }'
  );
}

// Custom drag-select gesture that mimics the OS's long-press-and-drag
// selection feel, since user-select: none disables the OS path. Three
// states drive the visual + haptic feedback:
//
//   idle      → finger up, nothing on screen.
//   pressing  → finger down for < MIN_HOLD_MS. A small dim circle shows
//               under the finger so the user sees that the touch was
//               registered. Movement > MOVE_PX cancels (was a scroll).
//   selecting → MIN_HOLD_MS elapsed without moving. Vibrate once (Android
//               only — iOS WebKit has no navigator.vibrate; bridge to
//               expo-haptics if you ever want feedback there). The circle
//               grows + brightens. Selection becomes live: every touchmove
//               re-runs Selection.addRange from the start point to the
//               current finger position. On touchend the last range is
//               kept; the indicator fades out.
//
// All visual chrome lives inside the chapter iframe doc as an absolutely-
// positioned <div>; no RN-side overlay needed.
export const TAP_TO_SELECT_FN = `
  // Set true while the user is mid-drag. The selectionchange listener in
  // attachSelectionListener checks this and skips emitting selection events
  // to RN until the gesture releases — so the custom menu only appears on
  // touchend, not on every drag tick.
  var __readerInDrag = false;

  function attachHoldSelect(doc) {
    var MIN_HOLD_MS = 250;
    var MOVE_PX = 8;

    var startX = 0, startY = 0, startTime = 0;
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

    function showPressing() {
      var el = ensureIndicator();
      el.style.opacity = '1';
      el.style.transform = 'translate(-50%,-50%) scale(0.85)';
      el.style.background = 'rgba(0,0,0,0.18)';
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

    function haptic() {
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15);
      } catch (_) {}
    }

    function cancelHold() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
    }

    doc.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { cancelHold(); state = 'idle'; hideIndicator(); return; }
      var t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      startTime = Date.now();
      state = 'pressing';
      moveIndicator(startX, startY);
      showPressing();
      cancelHold();
      holdTimer = setTimeout(function () {
        holdTimer = 0;
        if (state !== 'pressing') return;
        state = 'selecting';
        __readerInDrag = true;
        haptic();
        showSelecting();
        // Seed the selection at the starting point so the user has visible
        // feedback before they begin dragging.
        selectBetween(doc, startX, startY, startX, startY);
      }, MIN_HOLD_MS);
    }, { passive: true });

    // touchmove is non-passive so we can preventDefault() during selecting,
    // which stops the WebView from interpreting the drag as a scroll/
    // overscroll (the "page bounces back" effect the user was seeing).
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
        moveIndicator(t.clientX, t.clientY);
        selectBetween(doc, startX, startY, t.clientX, t.clientY);
      }
    }, { passive: false });

    doc.addEventListener('touchend', function (e) {
      cancelHold();
      if (state === 'selecting') {
        var t = e.changedTouches && e.changedTouches[0];
        // Release the gate BEFORE the last selection mutation so the
        // selectionchange that follows actually emits to RN.
        __readerInDrag = false;
        if (t) selectBetween(doc, startX, startY, t.clientX, t.clientY);
      }
      __readerInDrag = false;
      state = 'idle';
      hideIndicator();
    }, { passive: true });

    doc.addEventListener('touchcancel', function () {
      cancelHold();
      __readerInDrag = false;
      state = 'idle';
      hideIndicator();
    }, { passive: true });

    // Block OS-initiated text selection (long-press path). 'selectstart'
    // fires for user gestures but NOT for programmatic Selection.addRange,
    // so preventing it here kills the OS path while leaving our drag-select
    // intact. Same for 'contextmenu' which fires on Android long-press.
    doc.addEventListener('selectstart', function (e) {
      try { e.preventDefault(); } catch (_) {}
    });
    doc.addEventListener('contextmenu', function (e) {
      try { e.preventDefault(); } catch (_) {}
    });
  }

  function selectBetween(doc, x1, y1, x2, y2) {
    var a = caretAt(doc, x1, y1);
    var b = caretAt(doc, x2, y2);
    if (!a || !b) return;

    var sel = doc.defaultView.getSelection();
    if (!sel) return;

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

      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {
      try { sel.removeAllRanges(); } catch (__) {}
    }
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
