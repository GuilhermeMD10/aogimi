import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Bottom dock used exclusively by the PDF reader. Mirrors the outer shell of
// ReaderBottomDock — animated pill ↔ toolbar container, swipe-down to close,
// tap-outside to step back — but ships only two modes and a trimmed content
// surface. The pill carries the file title and N/total counter; the toolbar
// adds prev/next chevrons. PDF has no notes / marks / settings panes.
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'pill' | 'toolbar';

type Props = {
  title: string;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

const SCREEN_W = Dimensions.get('window').width;

const PILL_WIDTH = Math.min(SCREEN_W - 48, 320);
const PILL_HEIGHT = 38;
const PILL_BOTTOM = 22;
const PILL_RADIUS = 999;

const SHEET_WIDTH = SCREEN_W;
const TOOLBAR_HEIGHT = 96;
const SHEET_BOTTOM = 0;
const SHEET_RADIUS = 22;

const MODES: Record<Mode, { width: number; height: number; bottom: number; radius: number }> = {
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, bottom: PILL_BOTTOM, radius: PILL_RADIUS },
  toolbar: { width: SHEET_WIDTH, height: TOOLBAR_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS },
};

const ANIM_MS = 280;
const CONTENT_FADE_MS = 140;
const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 60;

export function PdfDock({ title, page, totalPages, onPrev, onNext }: Props) {
  const c = useColors();
  const [mode, setMode] = useState<Mode>('pill');
  const [renderMode, setRenderMode] = useState<Mode>('pill');

  const widthA = useRef(new Animated.Value(MODES.pill.width)).current;
  const heightA = useRef(new Animated.Value(MODES.pill.height)).current;
  const bottomA = useRef(new Animated.Value(MODES.pill.bottom)).current;
  const radiusA = useRef(new Animated.Value(MODES.pill.radius)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const contentA = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const target = MODES[mode];
    Animated.parallel([
      Animated.timing(widthA, {
        toValue: target.width, duration: ANIM_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.timing(heightA, {
        toValue: target.height, duration: ANIM_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.timing(bottomA, {
        toValue: target.bottom, duration: ANIM_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.timing(radiusA, {
        toValue: target.radius, duration: ANIM_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
    ]).start();

    if (renderMode !== mode) {
      Animated.timing(contentA, {
        toValue: 0, duration: CONTENT_FADE_MS, useNativeDriver: true,
      }).start(() => {
        setRenderMode(mode);
        Animated.timing(contentA, {
          toValue: 1, duration: CONTENT_FADE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const stepBack = useCallback(() => {
    setMode((curr) => (curr === 'toolbar' ? 'pill' : curr));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4 && gs.dy > 0,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) dragY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        const shouldClose = gs.vy > SWIPE_CLOSE_VELOCITY || gs.dy > SWIPE_CLOSE_DISTANCE;
        Animated.spring(dragY, {
          toValue: 0, useNativeDriver: false, bounciness: 0, speed: 18,
        }).start();
        if (shouldClose) stepBack();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0, useNativeDriver: false, bounciness: 0, speed: 18,
        }).start();
      },
    }),
  ).current;

  const expanded = mode !== 'pill';
  const counter = totalPages > 0 ? `${page}/${totalPages}` : '—';

  return (
    <View style={styles.host} pointerEvents="box-none">
      {expanded && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={stepBack}
          accessibilityLabel="Close PDF controls"
        />
      )}

      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: c.bgElev,
            borderColor: c.border,
            width: widthA,
            height: heightA,
            bottom: bottomA,
            borderRadius: radiusA,
            transform: [{ translateY: dragY }],
          },
        ]}
      >
        {expanded && (
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          </View>
        )}

        <Animated.View style={[styles.contentWrap, { opacity: contentA }]}>
          {renderMode === 'pill' ? (
            <Pressable
              onPress={() => setMode('toolbar')}
              accessibilityRole="button"
              accessibilityLabel={`Open PDF controls — ${title}, ${counter}`}
              hitSlop={8}
              style={styles.pillRow}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.pillTitle, { color: c.fg, fontFamily: fontFamily.jp }]}
              >
                {title}
              </Text>
              <Text style={[styles.pillCounter, { color: c.fgMuted, fontVariant: ['tabular-nums'] }]}>
                {counter}
              </Text>
              <Feather name="chevron-up" size={12} color={c.fgMuted} />
            </Pressable>
          ) : (
            <View style={styles.toolbar}>
              <View style={styles.pageRow}>
                <NavCell colors={c} icon="chevron-left" onPress={onPrev} ariaLabel="Previous page" />

                <View style={styles.pageMeta}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.pageMetaText, { color: c.fg, fontFamily: fontFamily.jp }]}
                  >
                    {title}
                    <Text style={{ color: c.fgMuted }}>{` · ${counter}`}</Text>
                  </Text>
                </View>

                <NavCell colors={c} icon="chevron-right" onPress={onNext} ariaLabel="Next page" />
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function NavCell({
  colors: c,
  icon,
  onPress,
  ariaLabel,
}: {
  colors: ReturnType<typeof useColors>;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  ariaLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={ariaLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.navCell,
        { backgroundColor: c.bgSunken, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={20} color={c.fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  contentWrap: { flex: 1 },
  handleArea: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: { width: 40, height: 5, borderRadius: 99 },
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  pillTitle: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  pillCounter: { fontSize: 10, letterSpacing: 0.4 },
  toolbar: { flex: 1, paddingHorizontal: 8, paddingBottom: 16 },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  navCell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageMeta: { flex: 1, alignItems: 'center' },
  pageMetaText: { fontSize: 14, fontWeight: '500', maxWidth: '100%' },
});
