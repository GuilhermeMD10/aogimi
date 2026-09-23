import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Pdf, { type PdfRef } from 'react-native-pdf';
import { usePalette, useTheme, spacing, type } from '@/theme';
import type { BookRecord } from '@/features/books/types';
import { bookFilePath } from '@/features/books/lib/bookPaths';
import { ReaderTopBar } from '../ReaderTopBar';
import { ReaderDock } from '../ReaderDock';

type ProgressSnapshot = {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

/**
 * Native PDF reader. Renders the file with react-native-pdf and takes the two
 * pieces of shared reader chrome: `ReaderTopBar` for the title, the percentage
 * and the way out, and `ReaderDock` for the dictionary.
 *
 * ── It has the same dock as every other reader now ─────────────────────────
 * PDFs used to have `PdfDock`, a near-copy of the old reader dock with its own
 * pill, its own swipe-to-close and its own toolbar carrying the title, a page
 * counter and prev/next chevrons. All four are gone: the title and the
 * percentage live in the top bar, the redesign drops page-turn buttons from
 * every reader, and what is left — open the dictionary — is one shortcut in the
 * shared dock. So the second implementation went with it.
 *
 * The dock's material follows the *page*, and a PDF has no reader theme of its
 * own: it renders on the app canvas. So it is handed the app's polarity rather
 * than a stored preference, which is the one case `ReaderDock.theme` is not
 * literally the book's theme.
 *
 * The native renderer surfaces no text selection, so there is no tap-a-word
 * path here and the dock is never in its selected state. The dictionary opens
 * with an empty query — the user types the word, and adding to a deck runs
 * through the same drawer the EPUB reader uses.
 *
 * Progress is reported as `page-N` in the cfi slot so it lands in the same
 * book_progress.cfi_position column the EPUB reader uses.
 */
export function PdfReaderShell({
  book,
  initialCfi,
  onBack,
  onPageChange,
  onOpenDictionary,
}: {
  book: BookRecord;
  initialCfi?: string | null;
  onBack: () => void;
  onPageChange: (snapshot: ProgressSnapshot) => void;
  onOpenDictionary: () => void;
}) {
  const p = usePalette();
  const { themeName } = useTheme();
  const pdfRef = useRef<PdfRef>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const lastReportedRef = useRef<number>(0);

  const initialPage = useMemo(() => {
    if (!initialCfi) return 1;
    const m = /^page-(\d+)$/.exec(initialCfi);
    return m ? Math.max(1, parseInt(m[1]!, 10)) : 1;
  }, [initialCfi]);

  // react-native-pdf's iOS path resolution is finicky with the `file://`
  // scheme prefix that expo-file-system writes into `File.uri`. Strip it on
  // iOS to feed the native CGPDFDocument loader a raw absolute path; Android
  // keeps the URI as-is because PdfRenderer expects a scheme.
  const sourceUri = useMemo(() => {
    const raw = bookFilePath(book.filename);
    if (Platform.OS === 'ios') return raw.replace(/^file:\/\//, '');
    return raw;
  }, [book.filename]);

  const handleLoadComplete = useCallback(
    (pages: number) => {
      setTotalPages(pages);
      if (currentPage === 0) setCurrentPage(initialPage);
    },
    [currentPage, initialPage],
  );

  const handlePageChanged = useCallback(
    (page: number, total: number) => {
      setCurrentPage(page);
      setTotalPages(total);
      if (page === lastReportedRef.current) return;
      lastReportedRef.current = page;
      onPageChange({
        cfi: `page-${page}`,
        progress: total > 0 ? Math.round((page / total) * 100) : 0,
        spineIndex: page,
        totalSpineItems: total,
      });
    },
    [onPageChange],
  );

  // Mirror the EPUB structure: ReaderTopBar / body / dock are *siblings*
  // of the outer SafeAreaView in ReaderScreen, not nested inside an extra
  // View. The extra wrapper was blocking touch propagation through the
  // dock's absoluteFill host, so the chevron tap never fired router.back().
  return (
    <Fragment>
      <ReaderTopBar
        title={book.title}
        progress={totalPages > 0 ? (currentPage / totalPages) * 100 : 0}
        onBack={onBack}
      />

      <View style={[styles.body, { backgroundColor: p.bg }]}>
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorText, { color: p.ink }]}>{error}</Text>
          </View>
        ) : (
          <Pdf
            ref={pdfRef}
            source={{ uri: sourceUri, cache: true }}
            page={initialPage}
            horizontal={false}
            enablePaging={false}
            fitPolicy={0}
            spacing={8}
            trustAllCerts={false}
            onLoadComplete={handleLoadComplete}
            onPageChanged={handlePageChanged}
            onError={(e: unknown) => {
              const msg = e instanceof Error ? e.message : String(e);
              setError(msg || 'Failed to load PDF');
            }}
            style={[styles.pdf, { backgroundColor: p.paperTile }]}
            renderActivityIndicator={() => <ActivityIndicator color={p.muted} />}
          />
        )}
      </View>

      <ReaderDock
        theme={themeName === 'night' ? 'dark' : 'light'}
        onOpenDictionary={onOpenDictionary}
      />
    </Fragment>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  pdf: { flex: 1, width: '100%', height: '100%' },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  errorText: { ...type.bodySm, textAlign: 'center' },
});
