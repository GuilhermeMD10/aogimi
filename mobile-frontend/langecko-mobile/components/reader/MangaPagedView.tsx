import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Gallery, { type GalleryRef } from 'react-native-awesome-gallery';
import { extractMangaPage, type MangaSpineEntry, type MangaSpineHandle } from '@/lib/mangaPages';

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
  { handle, loading, error, shellBg, initialSpineIndex, onSpineChange },
  ref,
) {
  const galleryRef = useRef<GalleryRef>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToSpine: (spineIndex, animated = false) => {
        const idx = handle?.entries.findIndex((e) => e.spineIndex === spineIndex) ?? -1;
        if (idx < 0) return;
        galleryRef.current?.setIndex(idx, animated);
      },
    }),
    [handle],
  );

  // Map gallery's positional index back to the spine index we report to
  // the parent. `entries` may be shorter than the raw spine if some
  // sections lack an image, so position !== spineIndex in general.
  const initialIndex = useMemo(() => {
    if (!handle || initialSpineIndex == null) return 0;
    const idx = handle.entries.findIndex((e) => e.spineIndex === initialSpineIndex);
    return idx < 0 ? 0 : idx;
  }, [handle, initialSpineIndex]);

  const onIndexChange = useCallback(
    (idx: number) => {
      if (!handle || !onSpineChange) return;
      const entry = handle.entries[idx];
      if (entry) onSpineChange(entry.spineIndex);
    },
    [handle, onSpineChange],
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
        data={handle.entries}
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
