import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
// expo-image instead of RN's <Image>: better caching, smarter downsampling
// at zoom, lower memory pressure on large manga pages.
import { Image } from 'expo-image';
// FlatList must come from gesture-handler (not react-native) so its inner
// ScrollView is wrapped in NativeViewGestureHandler. Without this, Android's
// native scroll claims touches before the parent GestureDetector can see
// them, and pinch never fires. iOS forwards multi-touch up regardless, which
// is why the stock FlatList "worked" there.
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  // runOnJS is deprecated in reanimated v4 (replacement is the auto-bridge
  // from worklet -> JS), but still works and the alternative isn't a clean
  // drop-in here. Suppress the hint via eslint pragma when needed.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { extractMangaPage, type MangaSpineEntry, type MangaSpineHandle } from '@/lib/mangaPages';

export type MangaScrollViewHandle = {
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

// Page aspect estimate used both for placeholder sizing and FlatList's
// getItemLayout (so virtualization + scrollToIndex work without measuring
// every page upfront). Manga is consistently around 1.4:1 height-to-width.
const PAGE_ASPECT = 1.4;
const GAP = 40;
const SIDE_PAD = 5;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export const MangaScrollView = forwardRef<MangaScrollViewHandle, Props>(function MangaScrollView(
  { handle, loading, error, shellBg, initialSpineIndex, onSpineChange },
  ref,
) {
  const listRef = useRef<FlatList<MangaSpineEntry>>(null);
  const screenWidth = Dimensions.get('window').width - SIDE_PAD * 2;
  const estimatedItemHeight = Math.round(screenWidth * PAGE_ASPECT + GAP);

  useImperativeHandle(
    ref,
    () => ({
      scrollToSpine: (spineIndex, animated = false) => {
        const idx = handle?.entries.findIndex((e) => e.spineIndex === spineIndex) ?? -1;
        if (idx < 0) return;
        listRef.current?.scrollToIndex({ index: idx, animated });
      },
    }),
    [handle],
  );

  // Notify parent when the middle-most viewable page changes, and pre-fetch
  // a few pages beyond the visible window so the user rarely waits for the
  // next page's image to decompress. The callback is wrapped in a ref so
  // FlatList sees a stable identity (it warns when onViewableItemsChanged
  // changes between renders).
  const lastEmittedRef = useRef<number>(-1);
  const prefetchedRef = useRef<Set<number>>(new Set());
  const handleRef = useRef(handle);
  const onSpineChangeRef = useRef(onSpineChange);
  useEffect(() => {
    handleRef.current = handle;
    onSpineChangeRef.current = onSpineChange;
  }, [handle, onSpineChange]);

  const PREFETCH_AHEAD = 10;
  const INITIAL_PREFETCH = 20;

  // Kick off the initial pre-fetch window as soon as the handle resolves
  // so the first scroll is already drawing from disk.
  useEffect(() => {
    if (!handle) return;
    for (let i = 0; i < Math.min(INITIAL_PREFETCH, handle.entries.length); i++) {
      const entry = handle.entries[i];
      if (!entry || prefetchedRef.current.has(entry.spineIndex)) continue;
      prefetchedRef.current.add(entry.spineIndex);
      extractMangaPage(handle, entry.spineIndex).catch(() => {
        /* ignore; PageItem will retry on mount */
      });
    }
  }, [handle]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<MangaSpineEntry>[] }) => {
      if (viewableItems.length === 0) return;
      const middle = viewableItems[Math.floor(viewableItems.length / 2)];
      const idx = middle?.item?.spineIndex;
      if (idx != null && idx !== lastEmittedRef.current) {
        lastEmittedRef.current = idx;
        onSpineChangeRef.current?.(idx);
      }
      // Pre-fetch beyond the last visible item so scrolling forward
      // doesn't reveal placeholders.
      const h = handleRef.current;
      if (!h) return;
      const last = viewableItems[viewableItems.length - 1]?.item;
      if (!last) return;
      const lastPos = h.entries.findIndex((e) => e.spineIndex === last.spineIndex);
      if (lastPos < 0) return;
      for (let i = 1; i <= PREFETCH_AHEAD; i++) {
        const next = h.entries[lastPos + i];
        if (!next || prefetchedRef.current.has(next.spineIndex)) continue;
        prefetchedRef.current.add(next.spineIndex);
        extractMangaPage(h, next.spineIndex).catch(() => {
          /* ignore; PageItem will retry on mount */
        });
      }
    },
  ).current;

  // Cross-platform pinch zoom + 2D pan via gesture-handler.
  //
  // - Scale is hard-clamped at MIN_ZOOM=1 (no rubber-band below default);
  //   pinching out past 1 has no effect.
  // - When zoomed in, the pan gesture activates on any direction (X or Y)
  //   and translates the content in 2D so the user can drag diagonally to
  //   inspect different corners of the page.
  // - FlatList scroll is disabled whenever pinch is active OR scale > ~1.
  //   Disabling on pinchActive (not just scale crossing 1.01) is what lets
  //   a 2-finger pinch interrupt an ongoing page scroll — the moment
  //   pinch's onStart fires we kill the scroll so momentum stops and the
  //   touch sequence becomes a zoom instead of a scroll.
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const pinchActive = useSharedValue(false);
  const fullScreenWidth = Dimensions.get('window').width;
  const fullScreenHeight = Dimensions.get('window').height;

  const SPRING = { damping: 18, stiffness: 140 };

  const clampX = (value: number, currentScale: number) => {
    'worklet';
    if (currentScale <= 1) return 0;
    const max = ((currentScale - 1) * fullScreenWidth) / 2;
    return Math.max(-max, Math.min(max, value));
  };

  const clampY = (value: number, currentScale: number) => {
    'worklet';
    if (currentScale <= 1) return 0;
    const max = ((currentScale - 1) * fullScreenHeight) / 2;
    return Math.max(-max, Math.min(max, value));
  };

  // FlatList scroll has to switch off while we're zoomed, otherwise the
  // pan gesture and FlatList's own pan responder fight over vertical drags.
  // We drive this via setNativeProps on the FlatList ref instead of React
  // state so flipping it doesn't re-render the FlatList — re-rendering is
  // what caused the noticeable freeze on zoom-out before, since the whole
  // gesture detector + virtualization tree had to rebuild.
  const setScrollNative = useCallback((enabled: boolean) => {
    listRef.current?.setNativeProps({ scrollEnabled: enabled });
  }, []);

  useAnimatedReaction(
    () => pinchActive.value || scale.value > 1.01,
    (locked, prev) => {
      if (locked === prev) return;
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      runOnJS(setScrollNative)(!locked);
    },
  );

  // Memoize gestures so they keep stable identity across renders. Without
  // this, every parent re-render creates new Gesture objects and the
  // GestureDetector reconfigures its native handlers — visible as a
  // sub-second freeze when transitioning out of zoom.
  const composedGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        'worklet';
        // Flip pinchActive so the useAnimatedReaction above disables the
        // FlatList scroll immediately, interrupting any in-flight page
        // scroll before pinch's onUpdate starts changing scale.
        pinchActive.value = true;
      })
      .onUpdate((e) => {
        const next = savedScale.value * e.scale;
        // Hard clamp at MIN_ZOOM (no rubber-band below default). Top still
        // gets a small rubber-band overshoot before snap-back.
        scale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM * 1.2, next));
        translateX.value = clampX(translateX.value, scale.value);
        translateY.value = clampY(translateY.value, scale.value);
      })
      .onEnd(() => {
        pinchActive.value = false;
        if (scale.value > MAX_ZOOM) {
          scale.value = withSpring(MAX_ZOOM, SPRING);
          savedScale.value = MAX_ZOOM;
        } else {
          savedScale.value = scale.value;
        }
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const pan = Gesture.Pan()
      .activeOffsetX([-12, 12])
      .activeOffsetY([-12, 12])
      .onUpdate((e) => {
        if (scale.value <= 1) return;
        translateX.value = clampX(savedTranslateX.value + e.translationX, scale.value);
        translateY.value = clampY(savedTranslateY.value + e.translationY, scale.value);
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    return Gesture.Simultaneous(pinch, pan);
    // The closures over scale / translates / clampX / clampY are all
    // worklet-friendly references that don't change identity, so we can
    // safely create the gesture once. Adding them to the deps array would
    // bypass the memo (they'd flag as "missing dep" but they're stable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const renderItem = useCallback(
    ({ item }: { item: MangaSpineEntry }) =>
      handle ? <PageItem entry={item} handle={handle} width={screenWidth} /> : null,
    [handle, screenWidth],
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: estimatedItemHeight,
      offset: estimatedItemHeight * index + SIDE_PAD,
      index,
    }),
    [estimatedItemHeight],
  );

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
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.zoomHost, { backgroundColor: shellBg }, animatedStyle]}>
        <FlatList
          ref={listRef}
          data={handle.entries}
          keyExtractor={(item) => String(item.spineIndex)}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          initialScrollIndex={
            initialSpineIndex != null
              ? handle.entries.findIndex((e) => e.spineIndex === initialSpineIndex)
              : undefined
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </GestureDetector>
  );
});

// Each item lazy-extracts its image on mount via the spine handle. Virtual-
// ization keeps only a window of items mounted at any time, so we never
// have all N pages on disk-read simultaneously.
//
// IMPORTANT: every item is pinned to a constant `width * PAGE_ASPECT`
// height so the actual rendered layout exactly matches getItemLayout's
// claim. A previous version of this component drove the height off the
// image's real aspect ratio (settled via Image.getSize on load), which
// caused FlatList to reconcile its virtual offsets against a different
// real height — that reconciliation showed up as a ~5px scroll jitter
// when each page reached the visible window. Letterboxing rare odd-aspect
// pages via resizeMode="contain" is cheaper than continuously breaking
// FlatList's positioning model.
function PageItem({
  entry,
  handle,
  width,
}: {
  entry: MangaSpineEntry;
  handle: MangaSpineHandle;
  width: number;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const height = width * PAGE_ASPECT;

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

  // marginBottom (not contentContainerStyle.gap) so each item's footprint
  // is self-contained and matches getItemLayout's length exactly. Using
  // container gap caused FlatList virtualization to re-apply the gap on
  // mount, producing a one-time ~gap-sized jump as each item entered the
  // windowSize boundary.
  return (
    <View style={[styles.pageWrap, { width, height, marginBottom: GAP }]}>
      {uri ? (
        <Image source={uri} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
      ) : (
        <ActivityIndicator color="#FFFFFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zoomHost: { flex: 1 },
  content: {
    paddingHorizontal: SIDE_PAD,
    paddingTop: SIDE_PAD,
    paddingBottom: 80,
  },
  pageWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  statusText: { color: '#FFFFFF', fontSize: 13 },
});
