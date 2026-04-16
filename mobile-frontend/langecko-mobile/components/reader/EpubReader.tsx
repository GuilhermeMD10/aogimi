import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';
import { epubViewerHtml, type HighlightInit } from './viewerHtml';
import { HIGHLIGHT_COLORS, type EpubHighlight, type HighlightColor, type ReaderPrefs } from './useBookStorage';

export interface EpubSelectionPayload {
  text: string;
  cfi: string;
}

/** Imperative handle exposed to the parent (ReaderScreen) so toolbar actions
 *  outside the reader can drive the viewer — add/remove highlights, jump to
 *  a saved cfi, etc. — without prop-drilling every side-effect. */
export interface EpubReaderHandle {
  addHighlight: (text: string, cfi: string, color: HighlightColor) => EpubHighlight | null;
  removeHighlight: (id: string) => void;
  goToCfi: (cfi: string) => void;
  getCurrentCfi: () => string | undefined;
  getHighlights: () => EpubHighlight[];
}

interface EpubReaderProps {
  base64: string;
  filename: string;
  onSelection: (payload: EpubSelectionPayload) => void;
  /** Book storage — owned by ReaderScreen, passed down to avoid dual hooks. */
  loaded: boolean;
  lastCfi: string | undefined;
  prefs: ReaderPrefs;
  epubHighlights: EpubHighlight[];
  saveLastCfi: (cfi: string) => void;
  savePrefs: (prefs: Partial<ReaderPrefs>) => void;
  addEpubHighlight: (h: Omit<EpubHighlight, 'id' | 'createdAt'>) => EpubHighlight;
  removeEpubHighlight: (id: string) => void;
}

/**
 * EPUB viewer — epub.js in a WebView, paginated flow. Position (CFI), font
 * size, and highlights are persisted per filename. Text selection inside the
 * inner iframe is captured via `rendition.on('selected')` and surfaced to the
 * parent (which then shows the SelectionActionSheet).
 */
export const EpubReader = forwardRef<EpubReaderHandle, EpubReaderProps>(function EpubReader(
  {
    base64,
    filename,
    onSelection,
    loaded,
    lastCfi,
    prefs,
    epubHighlights,
    saveLastCfi,
    savePrefs,
    addEpubHighlight,
    removeEpubHighlight,
  },
  ref,
) {
  const styles = useThemedStyles(createStyles);

  const webRef = useRef<WebView>(null);
  // Mirror last CFI from the relocated event so `getCurrentCfi()` is cheap.
  // Sync from storage when lastCfi changes (e.g. file switch).
  const currentCfiRef = useRef<string | undefined>(lastCfi);
  useEffect(() => { currentCfiRef.current = lastCfi; }, [lastCfi]);

  const html = useMemo(() => {
    if (!loaded) return null;
    const init: HighlightInit[] = epubHighlights.map((h) => ({
      id: h.id,
      cfi: h.cfi,
      color: HIGHLIGHT_COLORS[h.color],
    }));
    return epubViewerHtml(base64, lastCfi, prefs.fontSize, init);
    // Only rebuild on file change — font size / highlight updates are
    // pushed via postMessage so we don't lose reading position on mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, base64]);

  const postToWeb = (msg: Record<string, unknown>) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  };

  const bumpFontSize = (delta: number) => {
    const next = Math.max(70, Math.min(200, prefs.fontSize + delta));
    savePrefs({ fontSize: next });
    postToWeb({ type: 'setFontSize', size: next });
  };

  useImperativeHandle(
    ref,
    () => ({
      addHighlight: (text, cfi, color) => {
        if (!text || !cfi) return null;
        const h = addEpubHighlight({ text, cfi, color, note: '' });
        postToWeb({ type: 'addHighlight', id: h.id, cfi, color: HIGHLIGHT_COLORS[color] });
        return h;
      },
      removeHighlight: (id) => {
        const h = epubHighlights.find((x) => x.id === id);
        removeEpubHighlight(id);
        postToWeb({ type: 'removeHighlight', id, cfi: h?.cfi });
      },
      goToCfi: (cfi) => postToWeb({ type: 'goToCfi', cfi }),
      getCurrentCfi: () => currentCfiRef.current,
      getHighlights: () => epubHighlights,
    }),
    [addEpubHighlight, removeEpubHighlight, epubHighlights],
  );

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data) as
        | { type: 'loaded' }
        | { type: 'relocated'; cfi: string; page?: number; total?: number }
        | { type: 'selection'; text: string; cfi?: string }
        | { type: 'error'; error: string };

      if (data.type === 'relocated' && data.cfi) {
        currentCfiRef.current = data.cfi;
        saveLastCfi(data.cfi);
      } else if (data.type === 'selection' && data.text) {
        onSelection({ text: data.text, cfi: data.cfi ?? '' });
      }
    } catch { /* ignore */ }
  };

  if (!html) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
      />
      <View style={styles.bar}>
        <NavBtn label="‹ Prev" onPress={() => postToWeb({ type: 'prev' })} styles={styles} />
        <NavBtn label="Next ›" onPress={() => postToWeb({ type: 'next' })} styles={styles} />
        <View style={styles.spacer} />
        <NavBtn label="A−" onPress={() => bumpFontSize(-10)} styles={styles} />
        <Text style={styles.size}>{prefs.fontSize}%</Text>
        <NavBtn label="A+" onPress={() => bumpFontSize(+10)} styles={styles} />
      </View>
    </View>
  );
});

type Styles = ReturnType<typeof createStyles>;

function NavBtn({ label, onPress, disabled, styles }: { label: string; onPress: () => void; disabled?: boolean; styles: Styles }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.navBtn,
        pressed && !disabled && { opacity: 0.7 },
        disabled && { opacity: 0.3 },
      ]}
    >
      <Text style={styles.navBtnLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  container: { flex: 1 },
  web:       { flex: 1, backgroundColor: c.bgBase },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  navBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  navBtnLabel: { fontSize: fontSize.sm, color: c.textPrimary, fontWeight: '500' },
  spacer:      { flex: 1 },
  size:        { fontSize: fontSize.xs, color: c.textSecondary, minWidth: 40, textAlign: 'center' },
});
