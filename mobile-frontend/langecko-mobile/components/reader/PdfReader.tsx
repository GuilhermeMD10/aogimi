import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useThemedStyles, type Colors } from '@/theme/ThemeContext';
import { fontSize, radius, spacing } from '@/theme/tokens';
import { pdfViewerHtml } from './viewerHtml';
import type { ReaderPrefs } from './useBookStorage';

export interface PdfSelectionPayload {
  text: string;
  /** 1-based page number the selection was made on. */
  page: number;
}

/** Imperative handle exposed to the parent (ReaderScreen) so toolbar actions
 *  outside the reader can drive the viewer (jump to a bookmark page). */
export interface PdfReaderHandle {
  goToPage: (page: number) => void;
  getCurrentPage: () => number;
}

interface PdfReaderProps {
  base64: string;
  filename: string;
  onSelection: (payload: PdfSelectionPayload) => void;
  /** Book storage — owned by ReaderScreen. */
  loaded: boolean;
  lastPage: number | undefined;
  prefs: ReaderPrefs;
  saveLastPage: (page: number) => void;
  savePrefs: (prefs: Partial<ReaderPrefs>) => void;
}

/**
 * PDF viewer — pdf.js in a WebView. State (page, scale) is persisted per
 * filename so reopening a file resumes where the user left off. Text
 * selection inside the WebView is forwarded back to the parent along with
 * the current page number so bookmarks land on the right page.
 */
export const PdfReader = forwardRef<PdfReaderHandle, PdfReaderProps>(function PdfReader(
  { base64, filename, onSelection, loaded, lastPage, prefs, saveLastPage, savePrefs },
  ref,
) {
  const styles = useThemedStyles(createStyles);
  const webRef = useRef<WebView>(null);

  const [numPages, setNumPages] = useState<number | null>(null);
  // Single string state for the page input — parse on demand.
  // Lazy-initialized from lastPage so there's no double render.
  const [pageInput, setPageInput] = useState(() => String(lastPage ?? 1));
  const pageRef = useRef(lastPage ?? 1);

  // Don't build the viewer HTML until storage has hydrated — prevents
  // rendering page 1 momentarily before restoring the saved position.
  const html = useMemo(
    () => (loaded ? pdfViewerHtml(base64, lastPage ?? 1) : null),
    [loaded, base64, lastPage],
  );

  const postToWeb = (msg: Record<string, unknown>) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  };

  const goTo = useCallback((target: number) => {
    if (!numPages) return;
    const clamped = Math.max(1, Math.min(numPages, target));
    pageRef.current = clamped;
    setPageInput(String(clamped));
    saveLastPage(clamped);
    postToWeb({ type: 'goTo', page: clamped });
  }, [numPages, saveLastPage]);

  const bumpScale = (delta: number) => {
    const next = Math.round(Math.max(0.5, Math.min(3, prefs.scale + delta)) * 10) / 10;
    savePrefs({ scale: next });
    postToWeb({ type: 'setScale', scale: next });
  };

  useImperativeHandle(
    ref,
    () => ({
      goToPage: (n) => goTo(n),
      getCurrentPage: () => pageRef.current,
    }),
    [goTo],
  );

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(e.nativeEvent.data) as
        | { type: 'loaded'; numPages: number }
        | { type: 'rendered'; page: number; numPages: number }
        | { type: 'selection'; text: string; page?: number }
        | { type: 'error'; error: string };

      if (data.type === 'loaded') {
        setNumPages(data.numPages);
        if (prefs.scale !== 1) postToWeb({ type: 'setScale', scale: prefs.scale });
      } else if (data.type === 'rendered') {
        setNumPages(data.numPages);
        pageRef.current = data.page;
        setPageInput(String(data.page));
        saveLastPage(data.page);
      } else if (data.type === 'selection' && data.text) {
        onSelection({ text: data.text, page: data.page ?? pageRef.current });
      }
    } catch { /* ignore */ }
  }, [prefs.scale, saveLastPage, onSelection]);

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
        <NavBtn label="‹" onPress={() => goTo(pageRef.current - 1)} disabled={pageRef.current <= 1} styles={styles} />
        <View style={styles.pageBox}>
          <TextInput
            style={styles.pageInput}
            value={pageInput}
            onChangeText={setPageInput}
            onEndEditing={() => {
              const n = parseInt(pageInput, 10);
              if (!isNaN(n)) goTo(n);
              else setPageInput(String(pageRef.current));
            }}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <Text style={styles.pageTotal}>/ {numPages ?? '...'}</Text>
        </View>
        <NavBtn label="›" onPress={() => goTo(pageRef.current + 1)} disabled={!!numPages && pageRef.current >= numPages} styles={styles} />
        <View style={styles.spacer} />
        <NavBtn label="−" onPress={() => bumpScale(-0.1)} styles={styles} />
        <Text style={styles.scale}>{Math.round(prefs.scale * 100)}%</Text>
        <NavBtn label="+" onPress={() => bumpScale(+0.1)} styles={styles} />
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
    minWidth: 36,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  navBtnLabel: { fontSize: fontSize.md, color: c.textPrimary, fontWeight: '500' },
  pageBox:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs },
  pageInput: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: c.textPrimary,
    padding: 0,
  },
  pageTotal: { fontSize: fontSize.sm, color: c.textSecondary, marginLeft: 4 },
  spacer:    { flex: 1 },
  scale:     { fontSize: fontSize.xs, color: c.textSecondary, minWidth: 40, textAlign: 'center' },
});
