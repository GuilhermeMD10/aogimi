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
import type { ReaderDirection, ReaderLayout } from '@/lib/readerLayout';
import type { EpubBookmark, EpubHighlight, ReaderPrefs } from '@/lib/readerStorage';
import type { EpubTocItem } from './foliateHtml';
import { TocPane } from './dock/TocPane';
import { AnnotationsPane } from './dock/AnnotationsPane';
import { SettingsPane } from './dock/SettingsPane';

// ─────────────────────────────────────────────────────────────────────────────
// One container, five visual modes. The dock owns its own mode, animates the
// container shape (width / height / position / radius) between modes, and
// renders the appropriate content pane inside.
//
//   pill         · idle grip, small centered capsule
//   toolbar      · expanded, page-nav row + action row
//   toc          · chapter list (taller, backdrop-dimmed)
//   annotations  · bookmarks + highlights (taller, backdrop-dimmed)
//   settings     · typography + layout controls (taller, no dim)
//
// Step-back semantics: swipe-down on the handle, tap on the backdrop, or tap
// outside the dock collapses one level (pane → toolbar → pill).
// ─────────────────────────────────────────────────────────────────────────────

export type DockMode = 'pill' | 'toolbar' | 'toc' | 'annotations' | 'settings';

type Props = {
  title: string;
  progress: number; // 0..100
  bookmarked?: boolean;
  layout: ReaderLayout;
  direction: ReaderDirection;

  // Manga variant: hides the TYPE / SCROLL / HORIZ controls (irrelevant for
  // fixed-layout pages) and swaps the page-row "X%" for "page N/total". The
  // page/totalPages props are only read when variant === 'manga'.
  variant?: 'default' | 'manga';
  page?: number;
  totalPages?: number;
  // Manga only: which renderer is active. The toolbar exposes a toggle
  // between the vertical scroll view (continuous stream) and the paged
  // view (horizontal swipe per page). Toggle is a no-op when undefined.
  mangaMode?: 'scroll' | 'pages';
  onToggleMangaMode?: () => void;

  // Pane data
  toc: EpubTocItem[];
  bookmarks: EpubBookmark[];
  highlights: EpubHighlight[];
  prefs: ReaderPrefs;

  // Actions
  onPrev: () => void;
  onNext: () => void;
  onToggleBookmark: () => void;
  onNavigate: (href: string) => void;
  onJumpBookmark: (b: EpubBookmark) => void;
  onJumpHighlight: (h: EpubHighlight) => void;
  onDeleteBookmark: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
  onChangePrefs: (patch: Partial<ReaderPrefs>) => void;
  onChangeLayout: (patch: { layout?: ReaderLayout; direction?: ReaderDirection }) => void;
};

// ─── Layout per mode ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const PILL_WIDTH = Math.min(SCREEN_W - 48, 320);
const PILL_HEIGHT = 38;
const PILL_BOTTOM = 22;
const PILL_RADIUS = 999;

const TOOLBAR_HEIGHT = 168;
const PANE_HEIGHT = Math.round(SCREEN_H * 0.7);

const SHEET_WIDTH = SCREEN_W;
const SHEET_BOTTOM = 0;
const SHEET_RADIUS = 22;

const MODES: Record<DockMode, {
  width: number;
  height: number;
  bottom: number;
  radius: number;
  backdrop: boolean;
}> = {
  pill:        { width: PILL_WIDTH,  height: PILL_HEIGHT,    bottom: PILL_BOTTOM,  radius: PILL_RADIUS, backdrop: false },
  toolbar:     { width: SHEET_WIDTH, height: TOOLBAR_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: false },
  toc:         { width: SHEET_WIDTH, height: PANE_HEIGHT,    bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: true  },
  annotations: { width: SHEET_WIDTH, height: PANE_HEIGHT,    bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: true  },
  settings:    { width: SHEET_WIDTH, height: PANE_HEIGHT,    bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: false },
};

const ANIM_MS = 280;
const CONTENT_FADE_MS = 140;

// Swipe-down close thresholds.
const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 60;

export function ReaderBottomDock(props: Props) {
  const c = useColors();

  // Target mode the user has requested. `renderMode` is what's currently
  // visible — diverges from `mode` only during the content cross-fade.
  const [mode, setMode] = useState<DockMode>('pill');
  const [renderMode, setRenderMode] = useState<DockMode>('pill');

  // ── Animated values ──────────────────────────────────────────────────
  const widthA = useRef(new Animated.Value(MODES.pill.width)).current;
  const heightA = useRef(new Animated.Value(MODES.pill.height)).current;
  const bottomA = useRef(new Animated.Value(MODES.pill.bottom)).current;
  const radiusA = useRef(new Animated.Value(MODES.pill.radius)).current;
  const backdropA = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const contentA = useRef(new Animated.Value(1)).current;

  // ── Mode → animation ─────────────────────────────────────────────────
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
      Animated.timing(backdropA, {
        toValue: target.backdrop ? 0.35 : 0, duration: ANIM_MS, useNativeDriver: true,
      }),
    ]).start();

    // Content cross-fade: fade out → swap renderMode → fade back in.
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
    // Exclude renderMode/contentA — re-running on the swap would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Step-back ────────────────────────────────────────────────────────
  // Single rule: collapse one level. Pane → toolbar → pill.
  const stepBack = useCallback(() => {
    setMode((curr) => {
      if (curr === 'toc' || curr === 'annotations' || curr === 'settings') return 'toolbar';
      if (curr === 'toolbar') return 'pill';
      return curr;
    });
  }, []);

  // ── Swipe-down on the handle ─────────────────────────────────────────
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
  const showBackdrop = MODES[mode].backdrop;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {/* Backdrop — visible only for toc/annotations. Tap dismisses. */}
      <Animated.View
        pointerEvents={showBackdrop ? 'auto' : 'none'}
        style={[styles.backdrop, { opacity: backdropA }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={stepBack} />
      </Animated.View>

      {/* Outside-tap zone — fills the area above the dock when expanded
          without a backdrop (toolbar / settings). */}
      {expanded && !showBackdrop && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={stepBack}
          accessibilityLabel="Close reader controls"
        />
      )}

      {/* Animated container. */}
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
          {renderMode === 'pill' && (
            <PillContent
              colors={c}
              title={props.title}
              progress={props.progress}
              onPress={() => setMode('toolbar')}
            />
          )}
          {renderMode === 'toolbar' && (
            <ToolbarContent
              colors={c}
              title={props.title}
              progress={props.progress}
              bookmarked={props.bookmarked}
              layout={props.layout}
              direction={props.direction}
              variant={props.variant ?? 'default'}
              page={props.page}
              totalPages={props.totalPages}
              mangaMode={props.mangaMode}
              onToggleMangaMode={props.onToggleMangaMode}
              onPrev={props.onPrev}
              onNext={props.onNext}
              onOpenToc={() => setMode('toc')}
              onOpenAnnotations={() => setMode('annotations')}
              onOpenSettings={() => setMode('settings')}
              onToggleBookmark={props.onToggleBookmark}
              onChangeLayout={props.onChangeLayout}
            />
          )}
          {renderMode === 'toc' && (
            <TocPane
              toc={props.toc}
              onNavigate={(href) => {
                props.onNavigate(href);
                setMode('pill');
              }}
            />
          )}
          {renderMode === 'annotations' && (
            <AnnotationsPane
              bookmarks={props.bookmarks}
              highlights={props.highlights}
              onJumpBookmark={(b) => {
                props.onJumpBookmark(b);
                setMode('pill');
              }}
              onJumpHighlight={(h) => {
                props.onJumpHighlight(h);
                setMode('pill');
              }}
              onDeleteBookmark={props.onDeleteBookmark}
              onDeleteHighlight={props.onDeleteHighlight}
            />
          )}
          {renderMode === 'settings' && (
            <SettingsPane
              prefs={props.prefs}
              layout={props.layout}
              direction={props.direction}
              onChange={props.onChangePrefs}
              onLayoutChange={props.onChangeLayout}
            />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill content (A1)
// ─────────────────────────────────────────────────────────────────────────────

function PillContent({
  colors: c,
  title,
  progress,
  onPress,
}: {
  colors: ReturnType<typeof useColors>;
  title: string;
  progress: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open reader controls — ${title}, ${Math.round(progress)}%`}
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
      <Text style={[styles.pillProgress, { color: c.fgMuted, fontVariant: ['tabular-nums'] }]}>
        {Math.round(progress)}%
      </Text>
      <Feather name="chevron-up" size={12} color={c.fgMuted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar content (A2)
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarContent({
  colors: c,
  title,
  progress,
  bookmarked,
  layout,
  direction,
  variant,
  page,
  totalPages,
  mangaMode,
  onToggleMangaMode,
  onPrev,
  onNext,
  onOpenToc,
  onOpenAnnotations,
  onOpenSettings,
  onToggleBookmark,
  onChangeLayout,
}: {
  colors: ReturnType<typeof useColors>;
  title: string;
  progress: number;
  bookmarked?: boolean;
  layout: ReaderLayout;
  direction: ReaderDirection;
  variant: 'default' | 'manga';
  page?: number;
  totalPages?: number;
  mangaMode?: 'scroll' | 'pages';
  onToggleMangaMode?: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenToc: () => void;
  onOpenAnnotations: () => void;
  onOpenSettings: () => void;
  onToggleBookmark: () => void;
  onChangeLayout: (patch: { layout?: ReaderLayout; direction?: ReaderDirection }) => void;
}) {
  const flowNext: ReaderLayout = layout === 'continuous' ? 'pages' : 'continuous';
  const dirNext: ReaderDirection = direction === 'horizontal' ? 'vertical' : 'horizontal';
  const isManga = variant === 'manga';
  const meta =
    isManga && totalPages && totalPages > 0
      ? `${page ?? 1}/${totalPages}`
      : `${Math.round(progress)}%`;

  return (
    <View style={styles.toolbar}>
      {/* Page-nav row. Chevrons drive prev/next; tapping the title opens
          the chapter list. */}
      <View style={[styles.pageRow, { borderBottomColor: c.border }]}>
        <NavCell colors={c} icon="chevron-left" onPress={onPrev} ariaLabel="Previous page" />

        <Pressable
          onPress={onOpenToc}
          accessibilityLabel="Open chapter list"
          style={styles.pageMeta}
          hitSlop={6}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.pageMetaText, { color: c.fg, fontFamily: fontFamily.jp }]}
          >
            {title}
            <Text style={{ color: c.fgMuted }}>{` · ${meta}`}</Text>
          </Text>
        </Pressable>

        <NavCell colors={c} icon="chevron-right" onPress={onNext} ariaLabel="Next page" />
      </View>

      {/* Action row. Manga trims to NOTES + MARK + a mode toggle that swaps
          between vertical scroll (continuous stream) and horizontal paged
          (one-page-at-a-time pinch-zoom gallery). */}
      <View style={styles.actionRow}>
        <ToolCol colors={c} icon="edit-3" label="NOTES" onPress={onOpenAnnotations} />
        <ToolCol
          colors={c}
          icon="bookmark"
          label="MARK"
          active={!!bookmarked}
          onPress={onToggleBookmark}
        />
        {isManga && onToggleMangaMode && (
          <ToolCol
            colors={c}
            icon={mangaMode === 'pages' ? 'menu' : 'file-text'}
            label={mangaMode === 'pages' ? 'SCROLL' : 'PAGES'}
            onPress={onToggleMangaMode}
          />
        )}
        {!isManga && (
          <>
            <ToolCol colors={c} icon="type" label="TYPE" onPress={onOpenSettings} />
            <ToolCol
              colors={c}
              icon={layout === 'continuous' ? 'menu' : 'file-text'}
              label={layout === 'continuous' ? 'SCROLL' : 'PAGES'}
              onPress={() => onChangeLayout({ layout: flowNext })}
            />
            <ToolCol
              colors={c}
              icon={direction === 'horizontal' ? 'columns' : 'align-left'}
              label={direction === 'horizontal' ? 'HORIZ' : 'VERT'}
              onPress={() => onChangeLayout({ direction: dirNext })}
            />
          </>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────────────

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

function ToolCol({
  colors: c,
  icon,
  label,
  active,
  onPress,
}: {
  colors: ReturnType<typeof useColors>;
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.tool,
        active && { backgroundColor: c.bgSunken },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Feather name={icon} size={18} color={active ? c.fg : c.fgMuted} />
      <Text
        style={[
          styles.toolLabel,
          {
            color: active ? c.fg : c.fgMuted,
            fontWeight: active ? '600' : '500',
            fontFamily: fontFamily.ui,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
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

  // Handle (expanded modes)
  handleArea: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
  },
  handle: { width: 40, height: 5, borderRadius: 99 },

  // Pill
  pillRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  pillTitle: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  pillProgress: { fontSize: 10, letterSpacing: 0.4 },

  // Toolbar
  toolbar: { flex: 1, paddingHorizontal: 8, paddingBottom: 16 },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navCell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageMeta: { flex: 1, alignItems: 'center' },
  pageMetaText: {
    fontSize: 14,
    fontWeight: '500',
    maxWidth: '100%',
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
  toolLabel: { fontSize: 9, letterSpacing: 0.8 },
});
