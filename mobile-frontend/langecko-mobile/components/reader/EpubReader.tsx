import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { File } from 'expo-file-system';
import { bookFilePath } from '@/lib/bookFiles';
import { useColors } from '@/theme/ThemeContext';
import { EPUB_HTML, type EpubBridgeInbound, type EpubBridgeOutbound } from './epubHtml';

export type EpubReaderHandle = {
  setFontPx: (px: number) => void;
  goTo: (cfi: string) => void;
  next: () => void;
  prev: () => void;
};

type Props = {
  filename: string;
  startCfi?: string | null;
  onSelection?: (payload: { text: string; pageX: number; pageY: number }) => void;
  onLocation?: (payload: { cfi: string; progress: number }) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
};

export const EpubReader = forwardRef<EpubReaderHandle, Props>(function EpubReader(
  { filename, startCfi, onSelection, onLocation, onReady, onError },
  ref,
) {
  const webviewRef = useRef<WebView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const c = useColors();

  useImperativeHandle(
    ref,
    () => ({
      setFontPx: (px) => post(webviewRef.current, { type: 'setFontPx', value: px }),
      goTo: (cfi) => post(webviewRef.current, { type: 'goToCfi', cfi }),
      next: () => post(webviewRef.current, { type: 'next' }),
      prev: () => post(webviewRef.current, { type: 'prev' }),
    }),
    [],
  );

  // When the WebView has finished loading the HTML shell, read the book
  // file as base64 and send it into the WebView for epub.js to open.
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const file = new File(bookFilePath(filename));
        if (!file.exists) throw new Error('Book file missing on device');
        const base64 = await file.base64();
        if (cancelled) return;
        post(webviewRef.current, { type: 'load', base64, cfi: startCfi ?? null });
      } catch (err) {
        if (!cancelled) onError?.(err instanceof Error ? err.message : 'Failed to open EPUB');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, filename, startCfi, onError]);

  const handleMessage = (e: WebViewMessageEvent) => {
    let msg: EpubBridgeOutbound;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') onReady?.();
    else if (msg.type === 'error') onError?.(msg.message);
    else if (msg.type === 'relocated') onLocation?.({ cfi: msg.cfi, progress: msg.progress });
    else if (msg.type === 'selection')
      onSelection?.({ text: msg.text, pageX: msg.pageX, pageY: msg.pageY });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: EPUB_HTML }}
        onLoadEnd={() => setLoaded(true)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        style={{ backgroundColor: c.bg }}
      />
    </View>
  );
});

function post(ref: WebView | null, msg: EpubBridgeInbound) {
  if (!ref) return;
  const script = `(function(){var m=${JSON.stringify(JSON.stringify(msg))};window.postMessage(m);document.dispatchEvent(new MessageEvent('message',{data:m}));})();true;`;
  ref.injectJavaScript(script);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
