import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Gallery, { type GalleryRef } from 'react-native-awesome-gallery';
import { extractMangaPage, type MangaSpineEntry, type MangaSpineHandle } from '@/components/books/utils/mangaPages';

export type MangaPagedViewHandle = {
  scrollToSpine: (spineIndex: number, animated?: boolean) => void;
};

type Props = {
  handle: MangaSpineHandle | null;
  loading: boolean;
  error?: string | null;
  shellBg: string;
  initialSpineIndex?: number;
  onSpineChange?: (spineIndex: number) => void;
  /** Page-flip direction. 'rtl' = traditional manga (swipe right advances).
   *  Implemented by feeding the gallery a reversed entries array so the
   *  swipe semantics flip naturally. Defaults to 'ltr'. */
  pageDir?: 'ltr' | 'rtl';
};

// One-page-at-a-time manga reader powered by react-native-awesome-gallery.
// awesome-gallery handles all the gesture coordination (pinch, pan when
// zoomed, swipe between pages, double-tap-to-zoom) on the UI thread via
// reanimated + gesture-handler, so we don't fight FlatList scroll vs
// pinch race conditions like we did in MangaScrollView.
//
// Pages are lazy-extracted to the disk cache by PagedItem just like in
// scroll mode; the gallery only mounts `numToRender` items at a time.
export const MangaPagedView = forwardRef<MangaPagedViewHandle, Props>(function MangaPagedView(
  { handle, loading, error, shellBg, initialSpineIndex, onSpineChange, pageDir = 'ltr' },
  ref,
) {
  const galleryRef = useRef<GalleryRef>(null);

  // For RTL we hand the gallery a reversed view of the spine. Swiping right
  // then decreases the array index, which corresponds to advancing through
  // the manga in the traditional reading order.
  const entries = useMemo(() => {
    if (!handle) return [];
    return pageDir === 'rtl' ? [...handle.entries].reverse() : handle.entries;
  }, [handle, pageDir]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToSpine: (spineIndex, animated = false) => {
        const idx = entries.findIndex((e) => e.spineIndex === spineIndex);
        if (idx < 0) return;
        galleryRef.current?.setIndex(idx, animated);
      },
    }),
    [entries],
  );

  // Map gallery's positional index back to the spine index we report to
  // the parent.
  const initialIndex = useMemo(() => {
    if (!handle || initialSpineIndex == null) return 0;
    const idx = entries.findIndex((e) => e.spineIndex === initialSpineIndex);
    return idx < 0 ? 0 : idx;
  }, [handle, initialSpineIndex, entries]);

  const onIndexChange = useCallback(
    (idx: number) => {
      if (!onSpineChange) return;
      const entry = entries[idx];
      if (entry) onSpineChange(entry.spineIndex);
    },
    [entries, onSpineChange],
  );

  const renderItem = useCallback(
    ({ item }: { item: MangaSpineEntry }) =>
      handle ? <PagedItem entry={item} handle={handle} /> : null,
    [handle],
  );

  const keyExtractor = useCallback((item: MangaSpineEntry) => String(item.spineIndex), []);

  if (loading || !handle) {
    return (
      <View style={[styles.center, { backgroundColor: shellBg }]}>
        <ActivityIndicator color="#FFFFFF" />
        <Text style={styles.statusText}>Preparing pages…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: shellBg }]}>
        <Text style={styles.statusText}>{error}</Text>
      </View>
    );
  }

  if (handle.entries.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: shellBg }]}>
        <Text style={styles.statusText}>No pages found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.host, { backgroundColor: shellBg }]}>
      <Gallery
        ref={galleryRef}
        data={entries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        initialIndex={initialIndex}
        onIndexChange={onIndexChange}
        numToRender={3}
        maxScale={4}
        doubleTapScale={2}
        loop={false}
        disableSwipeUp
        disableVerticalSwipe
      />
    </View>
  );
});

// Single page renderer. Lazy-extracts via the spine handle on mount; while
// the extract is in flight an ActivityIndicator stands in. The fixed
// aspect ratio matches the scroll view's PAGE_ASPECT so the on-disk cache
// is identical between modes.
function PagedItem({
  entry,
  handle,
}: {
  entry: MangaSpineEntry;
  handle: MangaSpineHandle;
}) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    extractMangaPage(handle, entry.spineIndex)
      .then((resolved) => {
        if (!cancelled) setUri(resolved);
      })
      .catch(() => {
        /* swallow per-page errors -- item stays as placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, [entry.spineIndex, handle]);

  if (!uri) {
    return (
      <View style={styles.pendingPage}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Image
      source={uri}
      style={styles.pageImage}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  pageImage: { width: '100%', height: '100%' },
  pendingPage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusText: { color: '#FFFFFF', fontSize: 13 },
});
