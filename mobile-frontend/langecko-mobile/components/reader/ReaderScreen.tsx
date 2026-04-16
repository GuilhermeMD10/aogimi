import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Button } from '@/components/ui/Button';
import { useThemedStyles, useColors, type Colors } from '@/theme/ThemeContext';
import { fontFamily, fontSize, radius, spacing } from '@/theme/tokens';
import { useDictionaryDrawer } from '@/components/layout/DictionaryDrawerContext';
import { useReaderState } from '@/components/providers/ReaderStateContext';
import { EpubReader, type EpubReaderHandle, type EpubSelectionPayload } from './EpubReader';
import { PdfReader,  type PdfReaderHandle,  type PdfSelectionPayload }  from './PdfReader';
import { SelectionActionSheet, type SelectionContext } from './SelectionActionSheet';
import { AnnotationsPanel } from './AnnotationsPanel';
import { useBookStorage, type HighlightColor } from './useBookStorage';

type Mode = 'epub' | 'pdf';

interface LoadedFile {
  base64: string;
  filename: string;
}

const MAX_EPUB_BYTES = 50  * 1024 * 1024;
const MAX_PDF_BYTES  = 100 * 1024 * 1024;
// Warn above this — large files take a long time to base64-shuttle into the
// WebView and may OOM on older devices.
const SOFT_WARN_BYTES = 20 * 1024 * 1024;

/**
 * EPUB / PDF reader screen.
 *
 * Mobile implementation uses `react-native-webview` to host pdf.js and
 * epub.js — see {@link ./viewerHtml.ts} for the viewer HTML. Selecting text
 * inside the viewer surfaces a `SelectionActionSheet` with five actions:
 * Dictionary, Add card, Translate, Highlight (EPUB only), Bookmark. Each
 * action targets either the appropriate per-book store (bookmarks/highlights
 * via `useBookStorage`) or the cross-tab handoff (pendingCardWord, the
 * DictionaryDrawer) depending on what the user picked.
 */
export function ReaderScreen() {
  const styles = useThemedStyles(createStyles);
  const c = useColors();

  const [mode, setMode] = useState<Mode>('epub');
  const [epubFile, setEpubFile] = useState<LoadedFile | null>(null);
  const [pdfFile,  setPdfFile]  = useState<LoadedFile | null>(null);
  const [loading, setLoading] = useState(false);

  const [selection, setSelection] = useState<SelectionContext | null>(null);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);

  const epubRef = useRef<EpubReaderHandle>(null);
  const pdfRef  = useRef<PdfReaderHandle>(null);

  const current = mode === 'epub' ? epubFile : pdfFile;
  const currentFilename = current?.filename ?? null;

  // Single source of truth for per-file reader state. Data is passed down
  // to EpubReader / PdfReader as props — no duplicate hook calls.
  const bookStorage = useBookStorage(currentFilename);
  const {
    loaded: bookLoaded,
    lastCfi,
    lastPage,
    prefs,
    epubHighlights,
    epubBookmarks,
    pdfBookmarks,
    saveLastCfi,
    saveLastPage,
    savePrefs,
    addEpubHighlight,
    removeEpubHighlight,
    addEpubBookmark,
    removeEpubBookmark,
    addPdfBookmark,
    removePdfBookmark,
  } = bookStorage;

  const { open: openDictDrawer } = useDictionaryDrawer();
  const { setPendingCardWord } = useReaderState();

  const pick = async () => {
    const isEpub = mode === 'epub';
    try {
      const res = await DocumentPicker.getDocumentAsync({
        // EPUB MIME reporting is inconsistent across iOS/Android — accept
        // anything and validate by extension below.
        type: isEpub ? '*/*' : 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];

      if (isEpub && !asset.name.toLowerCase().endsWith('.epub')) {
        Alert.alert('Invalid file', 'Please select an EPUB file.');
        return;
      }
      if (!isEpub && !asset.name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Invalid file', 'Please select a PDF file.');
        return;
      }

      const limit = isEpub ? MAX_EPUB_BYTES : MAX_PDF_BYTES;
      if (asset.size && asset.size > limit) {
        Alert.alert('File too large', `Maximum size is ${limit / (1024 * 1024)} MB.`);
        return;
      }
      if (asset.size && asset.size > SOFT_WARN_BYTES) {
        Alert.alert(
          'Large file',
          `This file is ${(asset.size / (1024 * 1024)).toFixed(1)} MB. Loading may take a while.`,
        );
      }

      setLoading(true);
      const base64 = await new File(asset.uri).base64();
      const loaded: LoadedFile = { base64, filename: asset.name };
      if (isEpub) setEpubFile(loaded);
      else        setPdfFile(loaded);
    } catch (e) {
      Alert.alert('Failed to open file', e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const closeCurrent = () => {
    if (mode === 'epub') setEpubFile(null);
    else                 setPdfFile(null);
  };

  // ── Selection → action bridges ─────────────────────────────────────────────
  const onEpubSelection = (p: EpubSelectionPayload) => {
    setSelection({ text: p.text, cfi: p.cfi });
  };
  const onPdfSelection = (p: PdfSelectionPayload) => {
    setSelection({ text: p.text, page: p.page });
  };

  const handleLookup = (text: string) => {
    openDictDrawer(text);
  };

  const handleAddCard = (text: string) => {
    setPendingCardWord(text);
  };

  const handleHighlight = (text: string, cfi: string, color: HighlightColor) => {
    epubRef.current?.addHighlight(text, cfi, color);
  };

  const handleBookmark = (sel: SelectionContext) => {
    // Use the first ~60 chars of the selection as a human label.
    const label = sel.text.trim().slice(0, 60) || 'Untitled';
    if (mode === 'epub' && sel.cfi) {
      addEpubBookmark({ cfi: sel.cfi, label });
    } else if (mode === 'pdf' && sel.page != null) {
      addPdfBookmark({ page: sel.page, label });
    }
  };

  const bookmarkCurrentPosition = () => {
    if (mode === 'epub') {
      const cfi = epubRef.current?.getCurrentCfi();
      if (!cfi) {
        Alert.alert('Bookmark', 'Waiting for reader to hydrate — try again in a moment.');
        return;
      }
      addEpubBookmark({ cfi, label: `Page ${new Date().toLocaleTimeString()}` });
    } else {
      const page = pdfRef.current?.getCurrentPage();
      if (!page) return;
      addPdfBookmark({ page, label: `Page ${page}` });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Reader</Text>
        <View style={styles.modeGroup}>
          <ModeButton label="EPUB" active={mode === 'epub'} onPress={() => setMode('epub')} styles={styles} />
          <ModeButton label="PDF"  active={mode === 'pdf'}  onPress={() => setMode('pdf')}  styles={styles} />
        </View>
      </View>

      <View style={styles.fileBar}>
        <Text style={styles.filename} numberOfLines={1}>
          {current ? current.filename : `No ${mode.toUpperCase()} file open`}
        </Text>
        {current
          ? <Button label="Close" onPress={closeCurrent} />
          : <Button label={`Open ${mode.toUpperCase()}`} variant="primary" onPress={pick} />
        }
      </View>

      {current ? (
        <View style={styles.toolBar}>
          <ToolBtn label="Bookmark" onPress={bookmarkCurrentPosition} styles={styles} rippleColor={c.border} />
          <ToolBtn
            label={`Annotations${
              mode === 'epub'
                ? ` · ${epubHighlights.length + epubBookmarks.length}`
                : ` · ${pdfBookmarks.length}`
            }`}
            onPress={() => setAnnotationsOpen(true)}
            styles={styles}
            rippleColor={c.border}
          />
        </View>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.textPrimary} />
            <Text style={styles.loadingText}>Reading file…</Text>
          </View>
        ) : current ? (
          mode === 'epub' ? (
            <EpubReader
              ref={epubRef}
              base64={current.base64}
              filename={current.filename}
              onSelection={onEpubSelection}
              loaded={bookLoaded}
              lastCfi={lastCfi}
              prefs={prefs}
              epubHighlights={epubHighlights}
              saveLastCfi={saveLastCfi}
              savePrefs={savePrefs}
              addEpubHighlight={addEpubHighlight}
              removeEpubHighlight={removeEpubHighlight}
            />
          ) : (
            <PdfReader
              ref={pdfRef}
              base64={current.base64}
              filename={current.filename}
              onSelection={onPdfSelection}
              loaded={bookLoaded}
              lastPage={lastPage}
              prefs={prefs}
              saveLastPage={saveLastPage}
              savePrefs={savePrefs}
            />
          )
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyHint}>
              Pick an {mode.toUpperCase()} file to start reading.
            </Text>
            <View style={{ height: spacing.md }} />
            <Button label={`Open ${mode.toUpperCase()} file`} variant="primary" onPress={pick} />
          </View>
        )}
      </View>

      <SelectionActionSheet
        selection={selection}
        canHighlight={mode === 'epub'}
        onClose={() => setSelection(null)}
        onLookup={handleLookup}
        onAddCard={handleAddCard}
        onHighlight={handleHighlight}
        onBookmark={handleBookmark}
      />

      <AnnotationsPanel
        visible={annotationsOpen}
        onClose={() => setAnnotationsOpen(false)}
        epubHighlights={epubHighlights}
        epubBookmarks={epubBookmarks}
        pdfBookmarks={pdfBookmarks}
        onJumpEpubHighlight={(h) => { epubRef.current?.goToCfi(h.cfi); setAnnotationsOpen(false); }}
        onDeleteEpubHighlight={(id) => {
          // EpubReader owns the WebView highlight lifecycle — go through its
          // handle so the visual highlight is erased alongside the store.
          epubRef.current?.removeHighlight(id);
          // The handle's removeHighlight also calls the store's remove; this
          // local store call catches the case where the reader isn't mounted
          // yet (e.g. file was just closed) so the state stays consistent.
          removeEpubHighlight(id);
        }}
        onJumpEpubBookmark={(b) => { epubRef.current?.goToCfi(b.cfi); setAnnotationsOpen(false); }}
        onDeleteEpubBookmark={(id) => removeEpubBookmark(id)}
        onJumpPdfBookmark={(b) => { pdfRef.current?.goToPage(b.page); setAnnotationsOpen(false); }}
        onDeletePdfBookmark={(id) => removePdfBookmark(id)}
      />
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof createStyles>;

function ModeButton({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: Styles }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeBtn,
        active && styles.modeBtnActive,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.modeBtnLabel, active && styles.modeBtnLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function ToolBtn({ label, onPress, styles, rippleColor }: { label: string; onPress: () => void; styles: Styles; rippleColor: string }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: rippleColor }}
      style={({ pressed }) => [styles.toolBtn, pressed && { opacity: 0.75 }]}
    >
      <Text style={styles.toolBtnLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (c: Colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bgBase },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title:     { fontSize: fontSize.xl, fontFamily: fontFamily.serifSemiBold, fontWeight: '600', color: c.textPrimary },
  modeGroup: { flexDirection: 'row', gap: spacing.xs },
  modeBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  modeBtnActive:      { backgroundColor: c.accent, borderColor: c.accent },
  modeBtnLabel:       { fontSize: fontSize.sm, color: c.textPrimary, fontWeight: '500' },
  modeBtnLabelActive: { color: c.accentOn },
  fileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: c.border,
  },
  filename:    { flex: 1, fontSize: fontSize.sm, color: c.textSecondary },
  toolBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  toolBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgBase,
  },
  toolBtnLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: c.textPrimary,
  },
  body:        { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { marginTop: spacing.sm, fontSize: fontSize.sm, color: c.textSecondary },
  emptyHint:   { fontSize: fontSize.sm, color: c.textSecondary, textAlign: 'center' },
});
