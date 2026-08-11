import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import Pdf, { type PdfRef } from 'react-native-pdf';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';
import type { BookRecord } from '@/features/books/types';
import { bookFilePath } from '@/features/books/lib/bookPaths';
import { ReaderTopBar } from '../ReaderTopBar';
import { FloatingBackButton } from '../FloatingBackButton';
import { PdfDock } from './PdfDock';

type ProgressSnapshot = {
  cfi: string;
  progress: number;
  spineIndex: number;
  totalSpineItems: number;
};

/**
 * Native PDF reader. Renders the file with react-native-pdf, reuses the
 * standard ReaderTopBar for the back chevron, and pins a PdfDock at the
 * bottom for title + page count + prev/next. No selection, highlights, or
 * dictionary integration — by design.
 *
 * Progress is reported as `page-N` in the cfi slot so it lands in the same
 * book_progress.cfi_position column the EPUB reader uses.
 */
export function PdfReaderShell({
  book,
  initialCfi,
  onBack,
  onPageChange,
}: {
  book: BookRecord;
  initialCfi?: string | null;
  onBack: () => void;
  onPageChange: (snapshot: ProgressSnapshot) => void;
}) {
  const c = useColors();
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

  const goToPage = useCallback(
    (target: number) => {
      if (totalPages <= 0) return;
      const clamped = Math.max(1, Math.min(totalPages, target));
      pdfRef.current?.setPage(clamped);
    },
    [totalPages],
  );

  const visiblePage = currentPage || initialPage;

  // Mirror the EPUB structure: ReaderTopBar / body / dock are *siblings*
  // of the outer SafeAreaView in ReaderScreen, not nested inside an extra
  // View. The extra wrapper was blocking touch propagation through the
  // dock's absoluteFill host, so the chevron tap never fired router.back().
  return (
    <Fragment>
      <ReaderTopBar
        title={book.title}
        progress={totalPages > 0 ? (currentPage / totalPages) * 100 : 0}
      />
      <FloatingBackButton onPress={onBack} />

      <View style={[styles.body, { backgroundColor: c.bg }]}>
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={[styles.errorText, { color: c.fg, fontFamily: fontFamily.ui }]}>
              {error}
            </Text>
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
            style={[styles.pdf, { backgroundColor: c.bgSunken }]}
            renderActivityIndicator={() => <ActivityIndicator color={c.fg} />}
          />
        )}
      </View>

      <PdfDock
        title={book.title}
        page={visiblePage}
        totalPages={totalPages}
        onPrev={() => goToPage(visiblePage - 1)}
        onNext={() => goToPage(visiblePage + 1)}
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
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
