import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { bookFilePath } from '@/lib/bookFiles';
import {
  EPUB_HTML,
  type BookType,
  type EpubBridgeInbound,
  type EpubBridgeOutbound,
  type EpubTocItem,
  type HighlightStyle,
  type ReaderThemeStyle,
  type ReaderViewMode,
} from '../epubHtml';

export type EpubReaderHandle = {
  setStyle: (style: ReaderThemeStyle) => void;
  setViewMode: (mode: ReaderViewMode) => void;
  goTo: (cfi: string) => void;
  goToSpine: (index: number) => void;
  next: () => void;
  prev: () => void;
  addHighlight: (id: string, cfi: string, color: string) => void;
  removeHighlight: (cfi: string) => void;
};

export type ReadyPayload = {
  toc: EpubTocItem[];
  bookType: BookType;
  direction: 'ltr' | 'rtl';
  spineCount: number;
};

export type RelocatedPayload = {
  cfi: string;
  progress: number;
  page: number;
  totalPages: number;
  spineIndex: number;
  spineTotal: number;
  chapterHref?: string;
  chapterLabel?: string;
};

export type SelectionPayload = {
  text: string;
  cfi: string;
  pageX: number;
  pageY: number;
};

export type CustomMenuKey = 'dict' | 'card' | 'deepl' | 'highlight' | 'copy';

export type CustomMenuEvent = {
  key: CustomMenuKey;
  selectedText: string;
};

const MENU_ITEMS: { key: CustomMenuKey; label: string }[] = [
  { key: 'dict', label: 'Dictionary' },
  { key: 'card', label: 'Card' },
  { key: 'deepl', label: 'DeepL' },
  { key: 'highlight', label: 'Highlight' },
  { key: 'copy', label: 'Copy' },
];

type Props = {
  filename: string;
  startCfi?: string | null;
  initialStyle: ReaderThemeStyle;
  initialHighlights: HighlightStyle[];
  bgColor: string;
  onReady?: (payload: ReadyPayload) => void;
  onRelocated?: (payload: RelocatedPayload) => void;
  onSelection?: (payload: SelectionPayload) => void;
  onCustomMenu?: (event: CustomMenuEvent) => void;
  onError?: (message: string) => void;
};

export const EpubReader = forwardRef<EpubReaderHandle, Props>(function EpubReader(
  {
    filename,
    startCfi,
    initialStyle,
    initialHighlights,
    bgColor,
    onReady,
    onRelocated,
    onSelection,
    onCustomMenu,
    onError,
  },
  ref,
) {
  const webviewRef = useRef<WebView | null>(null);
  const [shellLoaded, setShellLoaded] = useState(false);
  // Pixel viewport measured from the WebView's container. epub.js paginates
  // against this, so we defer the `load` message until it's > 0 and re-post
  // `setSize` whenever it changes (rotation, layout reflow).
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const loadedRef = useRef(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setViewport((prev) => {
      if (prev && prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  const post = useCallback((msg: EpubBridgeInbound) => {
    const wv = webviewRef.current;
    if (!wv) return;
    const json = JSON.stringify(msg);
    const safe = JSON.stringify(json);
    wv.injectJavaScript(
      `(function(){var m=${safe};` + `document.dispatchEvent(new MessageEvent('message',{data:m}));` + `})();true;`,
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      setStyle: (style) => post({ type: 'setStyle', style }),
      setViewMode: (mode) => post({ type: 'setViewMode', mode }),
      goTo: (cfi) => post({ type: 'goToCfi', cfi }),
      goToSpine: (index) => post({ type: 'goToSpine', index }),
      next: () => post({ type: 'next' }),
      prev: () => post({ type: 'prev' }),
      addHighlight: (id, cfi, color) => post({ type: 'addHighlight', id, cfi, color }),
      removeHighlight: (cfi) => post({ type: 'removeHighlight', cfi }),
    }),
    [post],
  );

  useEffect(() => {
    if (!shellLoaded || !viewport || loadedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const file = new File(bookFilePath(filename));
        if (!file.exists) throw new Error('Book file missing on device');
        const base64 = await file.base64();
        if (cancelled) return;
        loadedRef.current = true;
        post({
          type: 'load',
          base64,
          cfi: startCfi ?? null,
          style: initialStyle,
          highlights: initialHighlights,
          viewport,
        });
      } catch (err) {
        if (!cancelled) onError?.(err instanceof Error ? err.message : 'Failed to open EPUB');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellLoaded, viewport, filename]);

  // After the initial load, container resizes (rotation, sheet open/close)
  // reflow the rendition via setSize so text never paginates against stale
  // dimensions.
  useEffect(() => {
    if (!loadedRef.current || !viewport) return;
    post({ type: 'setSize', width: viewport.width, height: viewport.height });
  }, [viewport, post]);

  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: EpubBridgeOutbound;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'ready')
        onReady?.({
          toc: msg.toc,
          bookType: msg.bookType,
          direction: msg.direction,
          spineCount: msg.spineCount,
        });
      else if (msg.type === 'error') onError?.(msg.message);
      else if (msg.type === 'relocated') onRelocated?.(msg);
      else if (msg.type === 'selection') onSelection?.(msg);
    },
    [onReady, onError, onRelocated, onSelection],
  );

  const handleCustomMenu = useCallback(
    (e: { nativeEvent: { key: string; label: string; selectedText: string } }) => {
      const { key, selectedText } = e.nativeEvent;
      if (key === 'dict' || key === 'card' || key === 'deepl' || key === 'highlight' || key === 'copy') {
        onCustomMenu?.({ key: key as CustomMenuKey, selectedText });
      }
    },
    [onCustomMenu],
  );

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]} onLayout={onLayout}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: EPUB_HTML }}
        onLoadEnd={() => setShellLoaded(true)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        menuItems={MENU_ITEMS}
        onCustomMenuSelection={handleCustomMenu}
        suppressMenuItems={[
          'cut',
          'paste',
          'replace',
          'bold',
          'italic',
          'underline',
          'select',
          'selectAll',
          'translate',
          'lookup',
          'share',
        ]}
        style={{ backgroundColor: bgColor }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
