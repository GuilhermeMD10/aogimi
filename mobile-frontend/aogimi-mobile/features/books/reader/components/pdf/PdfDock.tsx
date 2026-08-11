import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
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
// ReaderBottomDock — pill ↔ toolbar container, swipe-down to close, tap-outside
// to step back — but ships only two modes and a trimmed content surface. The
// pill carries the file title and N/total counter; the toolbar adds prev/next
// chevrons. PDF has no notes / marks / settings panes.
//
// **Strip-to-basics 2026-08-10.** The pill↔toolbar morph used to interpolate
// width/height/bottom/radius over 280ms and cross-fade the contents; the drag
// followed your finger and sprang back. All of it is gone: the box is now read
// straight out of `MODES[mode]` and the switch is instant. Swipe-down-to-close
// and tap-outside still work — the gestures are behaviour, only their motion
// went. The second `renderMode` state went with the cross-fade, since there is
// no longer a moment where the rendered contents lag the mode.
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

const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 60;

export function PdfDock({ title, page, totalPages, onPrev, onNext }: Props) {
  const c = useColors();
  const [mode, setMode] = useState<Mode>('pill');
  const box = MODES[mode];

  const stepBack = useCallback(() => {
    setMode((curr) => (curr === 'toolbar' ? 'pill' : curr));
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4 && gs.dy > 0,
      onPanResponderRelease: (_, gs) => {
        if (gs.vy > SWIPE_CLOSE_VELOCITY || gs.dy > SWIPE_CLOSE_DISTANCE) stepBack();
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

      <View
        style={[
          styles.container,
          {
            backgroundColor: c.bgElev,
            borderColor: c.border,
            width: box.width,
            height: box.height,
            bottom: box.bottom,
            borderRadius: box.radius,
          },
        ]}
      >
        {expanded && (
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          </View>
        )}

        <View style={styles.contentWrap}>
          {mode === 'pill' ? (
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
        </View>
      </View>
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
      style={[styles.navCell, { backgroundColor: c.bgSunken }]}
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
