import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily } from '@/theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Bottom dock used exclusively by the PDF reader. Mirrors the outer shell of
// ReaderBottomDock — pill ↔ toolbar container, swipe-down to close, tap-outside
// to step back — but ships only two modes and a trimmed content surface. The
// pill carries the file title and N/total counter; the toolbar adds prev/next
// chevrons plus a DICT action that opens the reader's lookup sheet. PDF has no
// notes / marks / settings panes.
//
// No pill↔toolbar morph: the box is read straight out of `MODES[mode]` and the
// switch is instant. Swipe-down-to-close and tap-outside still work — the
// gestures are behaviour, independent of motion. With no cross-fade there is no
// second `renderMode` state, since the rendered contents never lag the mode.
// ─────────────────────────────────────────────────────────────────────────────

type Mode = 'pill' | 'toolbar';

type Props = {
  title: string;
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  /** Opens the reader's dictionary sheet with an empty query. The PDF
   *  renderer surfaces no selection, so this is the only way in. */
  onOpenDictionary: () => void;
};

const SCREEN_W = Dimensions.get('window').width;

const PILL_WIDTH = Math.min(SCREEN_W - 48, 320);
const PILL_HEIGHT = 38;
const PILL_BOTTOM = 22;
const PILL_RADIUS = 999;

const SHEET_WIDTH = SCREEN_W;
const TOOLBAR_HEIGHT = 150;
const SHEET_BOTTOM = 0;
const SHEET_RADIUS = 22;

const MODES: Record<Mode, { width: number; height: number; bottom: number; radius: number }> = {
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, bottom: PILL_BOTTOM, radius: PILL_RADIUS },
  toolbar: { width: SHEET_WIDTH, height: TOOLBAR_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS },
};

const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 60;

export function PdfDock({ title, page, totalPages, onPrev, onNext, onOpenDictionary }: Props) {
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
        <PressableBackdrop style={StyleSheet.absoluteFill} onPress={stepBack} />
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
            <Touchable
              minTarget={false}
              hitSlop={8}
              onPress={() => setMode('toolbar')}
              accessibilityRole="button"
              accessibilityLabel={`Open PDF controls — ${title}, ${counter}`}
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
            </Touchable>
          ) : (
            <View style={styles.toolbar}>
              <View style={[styles.pageRow, { borderBottomColor: c.border }]}>
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

              {/* Action row. One action: the lookup sheet. Collapsing to the
                  pill first keeps the toolbar from sitting behind the sheet. */}
              <View style={styles.actionRow}>
                <ToolCol
                  colors={c}
                  icon="book-open"
                  label="DICT"
                  onPress={() => {
                    setMode('pill');
                    onOpenDictionary();
                  }}
                />
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
    <Touchable
      surface="glass"
      minTarget={false}
      hitSlop={8}
      onPress={onPress}
      accessibilityLabel={ariaLabel}
      style={styles.navCell}
    >
      <Feather name={icon} size={20} color={c.fg} />
    </Touchable>
  );
}

function ToolCol({
  colors: c,
  icon,
  label,
  onPress,
}: {
  colors: ReturnType<typeof useColors>;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      minTarget={false}
      hitSlop={6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.tool}
    >
      <Feather name={icon} size={18} color={c.fgMuted} />
      <Text style={[styles.toolLabel, { color: c.fgMuted, fontFamily: fontFamily.ui }]}>
        {label}
      </Text>
    </Touchable>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  tool: {
    minWidth: 44,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  toolLabel: { fontSize: 9, letterSpacing: 0.8, fontWeight: '500' },
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
