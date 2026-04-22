import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useColors } from '@/theme/ThemeContext';
import { fetchBook, updateBookProgress } from '@/lib/api';
import type { BookRecord, WordDetails } from '@/lib/types';
import { seedChapterFor } from '@/lib/seedBookText';
import { bookFileExists, importEpub } from '@/lib/bookFiles';
import { File } from 'expo-file-system';
import { bookFilePath } from '@/lib/bookFiles';
import { DictDrawer } from '@/components/dictionary/DictDrawer';
import { FlashcardDrawer, type FlashcardPrefill } from '@/components/flashcards/FlashcardDrawer';
import { Button } from '@/components/ui/Button';
import { ReaderTopBar } from './ReaderTopBar';
import { ReaderBody, type SelectionAnchor } from './ReaderBody';
import { SelectionPopover, type SelectionAction } from './SelectionPopover';
import { ReaderToolbar, type ReaderSettings } from './ReaderToolbar';
import { EpubReader, type EpubReaderHandle } from './EpubReader';

type Props = { bookId: string };

const DEFAULT_SETTINGS: ReaderSettings = {
  fontPx: 18,
  lineHeightMul: 2.05,
  vertical: false,
};

type BodySource = 'epub' | 'seed' | 'missing';

export function ReaderScreen({ bookId }: Props) {
  const c = useColors();
  const router = useRouter();

  const [book, setBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [selection, setSelection] = useState<SelectionAnchor | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [dictTerm, setDictTerm] = useState<string | null>(null);
  const [flashcardPrefill, setFlashcardPrefill] = useState<FlashcardPrefill | null>(null);

  const epubRef = useRef<EpubReaderHandle | null>(null);
  const latestLocationRef = useRef<{ cfi: string; progress: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchBook(bookId);
        if (cancelled) return;
        setBook(data);
        setHasFile(bookFileExists(data.filename));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load book');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // Keep EpubReader font in sync with settings
  useEffect(() => {
    if (hasFile) epubRef.current?.setFontPx(settings.fontPx);
  }, [hasFile, settings.fontPx]);

  const seedChapter = book ? seedChapterFor(book.title) : null;
  const bodySource: BodySource = hasFile
    ? 'epub'
    : seedChapter
      ? 'seed'
      : 'missing';

  const handleSelectToken = useCallback((anchor: SelectionAnchor) => {
    setSelection(anchor);
    setToolbarExpanded(false);
  }, []);

  const dismissSelection = useCallback(() => setSelection(null), []);

  const handleAction = useCallback(
    (action: SelectionAction) => {
      if (!selection) return;
      const term = selection.text;
      if (action === 'copy') {
        Clipboard.setStringAsync(term);
        dismissSelection();
        return;
      }
      if (action === 'highlight') {
        dismissSelection();
        return;
      }
      if (action === 'define') {
        setDictTerm(term);
        dismissSelection();
        return;
      }
      if (action === 'flashcard') {
        setFlashcardPrefill({ front: term, reading: '', back: '' });
        dismissSelection();
      }
    },
    [selection, dismissSelection],
  );

  const handleAddFlashcardFromDict = useCallback((details: WordDetails) => {
    const w = details.word;
    setFlashcardPrefill({
      front: w.kanji[0] ?? w.readings[0] ?? '',
      reading: w.readings[0] ?? '',
      back:
        w.meanings
          .filter((m) => m.lang === 'eng' || m.lang === 'en')
          .slice(0, 2)
          .map((m) => m.meaning)
          .join('; ') ?? '',
    });
    setDictTerm(null);
  }, []);

  const handleEpubSelection = useCallback(
    (payload: { text: string; pageX: number; pageY: number }) => {
      handleSelectToken({
        paragraphIdx: -1,
        tokenIdx: -1,
        text: payload.text,
        pageX: payload.pageX,
        pageY: payload.pageY,
      });
    },
    [handleSelectToken],
  );

  const handleBack = useCallback(async () => {
    if (book && latestLocationRef.current) {
      try {
        await updateBookProgress(book.id, {
          cfiPosition: latestLocationRef.current.cfi,
          progress: latestLocationRef.current.progress,
        });
      } catch {
        /* best-effort — don't block the back action */
      }
    }
    router.back();
  }, [book, router]);

  async function handleImportMissingFile() {
    if (!book) return;
    const imported = await importEpub();
    if (!imported) return;
    // Use the existing record's filename so local file matches what backend knows.
    try {
      const local = new File(bookFilePath(imported.filename));
      if (imported.filename !== book.filename) {
        // User picked a different file; copy under the record's filename.
        local.copy(new File(bookFilePath(book.filename)));
        local.delete();
      }
      setHasFile(true);
    } catch {
      /* ignore — next open will retry */
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.fg} />
      </View>
    );
  }

  if (error || !book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.errorWrap}>
          <Text style={[styles.errorTitle, { color: c.fg }]}>{error ?? 'Book not found'}</Text>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[styles.back, { color: c.fgMuted }]}>‹ Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const topChapterLabel =
    bodySource === 'seed' && seedChapter ? seedChapter.label : '';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]} edges={['top']}>
      <ReaderTopBar
        chapterLabel={topChapterLabel}
        progress={book.progress}
        bookmarked={bookmarked}
        onBack={handleBack}
        onToggleBookmark={() => setBookmarked((b) => !b)}
      />

      <View style={styles.body}>
        {bodySource === 'epub' && (
          <EpubReader
            ref={epubRef}
            filename={book.filename}
            startCfi={book.cfi_position}
            onSelection={handleEpubSelection}
            onLocation={(loc) => {
              latestLocationRef.current = loc;
            }}
            onError={(msg) => setError(msg)}
          />
        )}
        {bodySource === 'seed' && seedChapter && (
          <ReaderBody
            paragraphs={seedChapter.paragraphs}
            fontPx={settings.fontPx}
            lineHeightMul={settings.lineHeightMul}
            selection={selection}
            onSelectToken={handleSelectToken}
            onDismissSelection={dismissSelection}
          />
        )}
        {bodySource === 'missing' && (
          <View style={styles.missingWrap}>
            <Text style={[styles.missingTitle, { color: c.fg }]}>
              File not on this device
            </Text>
            <Text style={[styles.missingBody, { color: c.fgMuted }]}>
              This book is in your library from another device. Import the EPUB
              file here to start reading.
            </Text>
            <Button label="Import EPUB" onPress={handleImportMissingFile} />
          </View>
        )}
      </View>

      {selection && (
        <SelectionPopover
          pageX={selection.pageX}
          pageY={selection.pageY}
          onAction={handleAction}
        />
      )}

      {!selection && bodySource !== 'missing' && (
        <ReaderToolbar
          expanded={toolbarExpanded}
          settings={settings}
          onToggleExpanded={() => setToolbarExpanded((v) => !v)}
          onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
        />
      )}

      <DictDrawer
        visible={dictTerm !== null}
        term={dictTerm ?? ''}
        onDismiss={() => setDictTerm(null)}
        onAddFlashcard={handleAddFlashcardFromDict}
      />

      <FlashcardDrawer
        visible={flashcardPrefill !== null}
        prefill={flashcardPrefill}
        onDismiss={() => setFlashcardPrefill(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorTitle: { fontSize: 16 },
  back: { fontSize: 15, fontWeight: '500' },
  missingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 32,
  },
  missingTitle: { fontSize: 18, fontWeight: '600' },
  missingBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
