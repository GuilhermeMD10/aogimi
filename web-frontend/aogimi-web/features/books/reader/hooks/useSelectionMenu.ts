'use client';

// Right-click-on-a-selection → the reader's two-action menu, for engines whose
// text lives in the **top document**. That's the PDF reader: pdf.js paints a
// real text layer into the page, so `window.getSelection()` is the whole story.
//
// The flowing EPUB reader deliberately does not use this. Its text is inside
// foliate's per-chapter iframes, so it has to bind listeners per chapter
// document as they load and translate iframe-relative coordinates — that
// bookkeeping lives in `useTextReaderEngine` alongside the rest of the foliate
// lifecycle. What the two share is `lib/selectionText`.

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  cleanSelectionText,
  extractSentenceFromSelection,
} from '@/features/books/reader/lib/selectionText';

/** Menu position, in viewport coordinates. */
type Anchor = { x: number; y: number };

export function useSelectionMenu(rootRef: RefObject<HTMLElement | null>) {
  const [selectedText, setSelectedText] = useState('');
  const [contextSentence, setContextSentence] = useState<string | undefined>(undefined);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // The selection is only read when the menu opens — unlike the EPUB engine,
  // nothing here needs to know about a selection before it's acted on.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onContextMenu = (e: MouseEvent) => {
      const sel = root.ownerDocument.defaultView?.getSelection() ?? null;
      const text = sel ? cleanSelectionText(sel) : '';
      // Nothing selected: leave the browser's own menu alone. Right-click is
      // still how you reach "save as", and suppressing it over blank page
      // margins would be taking something away for nothing.
      if (!text) return;
      e.preventDefault();
      setSelectedText(text);
      setContextSentence(sel ? extractSentenceFromSelection(sel) : undefined);
      setAnchor({ x: e.clientX + 8, y: e.clientY + 8 });
    };

    root.addEventListener('contextmenu', onContextMenu);
    return () => root.removeEventListener('contextmenu', onContextMenu);
  }, [rootRef]);

  // Any click outside the menu, and any scroll anywhere (the menu is anchored
  // to a viewport point, so scrolling the pages leaves it pointing at nothing).
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', close, true);
    };
  }, [anchor]);

  return {
    menuRef,
    anchor,
    selectedText,
    contextSentence,
    closeMenu: () => setAnchor(null),
  };
}
