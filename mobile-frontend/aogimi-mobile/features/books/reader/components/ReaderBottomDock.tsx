import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, palette } from '@/theme/tokens';
import type { MangaPageDir, ReaderDirection, ReaderLayout } from '../lib/readerLayout';
import type { EpubBookmark, EpubHighlight, ReaderPrefs } from '../lib/readerStorage';
import type { EpubTocItem } from '../lib/foliateHtml';
import { TocPane } from './dock/TocPane';
import { AnnotationsPane } from './dock/AnnotationsPane';
import { SettingsPane } from './dock/SettingsPane';

// ─────────────────────────────────────────────────────────────────────────────
// One container, five visual modes. The dock owns its own mode, takes the
// container shape (width / height / position / radius) from that mode, and
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
//
// No motion: mode changes are instant and the backdrop is a flat scrim that is
// either there or not. Every gesture still works — swipe-down, backdrop tap,
// outside tap. With no cross-fade there is no second `renderMode` state, since
// the rendered contents never lag the mode.
// ─────────────────────────────────────────────────────────────────────────────

export type DockMode = 'pill' | 'toolbar' | 'toc' | 'annotations' | 'settings';

type Props = {
  bookmarked?: boolean;
  layout: ReaderLayout;
  direction: ReaderDirection;

  // Manga variant: hides the TYPE / SCROLL / HORIZ controls (irrelevant for
  // fixed-layout pages). Title + progress live in the top bar now, so the
  // toolbar doesn't carry per-page metadata anymore.
  variant?: 'default' | 'manga';
  // Manga only: which renderer is active. The toolbar exposes a toggle
  // between the vertical scroll view (continuous stream) and the paged
  // view (horizontal swipe per page). Toggle is a no-op when undefined.
  mangaMode?: 'scroll' | 'pages';
  onToggleMangaMode?: () => void;
  // Manga only: page-flip direction (RTL traditional, LTR western).
  mangaPageDir?: MangaPageDir;
  onToggleMangaPageDir?: () => void;

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
  // Fires whenever the dock's internal mode changes. The reader uses this
  // to slide the floating back chevron out of the way when the dock
  // expands beyond the pill.
  onModeChange?: (mode: DockMode) => void;
};

// ─── Layout per mode ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const PILL_WIDTH = 80;
const PILL_HEIGHT = 38;
const PILL_BOTTOM = 22;
const PILL_RADIUS = 999;

const TOOLBAR_HEIGHT = 168;
const PANE_HEIGHT = Math.round(SCREEN_H * 0.7);

const SHEET_WIDTH = SCREEN_W;
const SHEET_BOTTOM = 0;
const SHEET_RADIUS = 22;

const MODES: Record<
  DockMode,
  {
    width: number;
    height: number;
    bottom: number;
    radius: number;
    backdrop: boolean;
  }
> = {
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, bottom: PILL_BOTTOM, radius: PILL_RADIUS, backdrop: false },
  toolbar: { width: SHEET_WIDTH, height: TOOLBAR_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: false },
  toc: { width: SHEET_WIDTH, height: PANE_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: true },
  annotations: { width: SHEET_WIDTH, height: PANE_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: true },
  settings: { width: SHEET_WIDTH, height: PANE_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: false },
};

// Swipe-down close thresholds.
const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 60;

export function ReaderBottomDock(props: Props) {
  const c = useColors();

  const [mode, setMode] = useState<DockMode>('pill');
  const box = MODES[mode];

  const onModeChange = props.onModeChange;
  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

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
      onPanResponderRelease: (_, gs) => {
        if (gs.vy > SWIPE_CLOSE_VELOCITY || gs.dy > SWIPE_CLOSE_DISTANCE) stepBack();
      },
    }),
  ).current;

  const expanded = mode !== 'pill';
  const showBackdrop = box.backdrop;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {/* Backdrop — visible only for toc/annotations. Tap dismisses. */}
      {showBackdrop && (
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={stepBack} />
        </View>
      )}

      {/* Outside-tap zone — fills the area above the dock when expanded
          without a backdrop (toolbar / settings). */}
      {expanded && !showBackdrop && (
        <Pressable style={StyleSheet.absoluteFill} onPress={stepBack} accessibilityLabel="Close reader controls" />
      )}

      {/* The container. */}
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
          {mode === 'pill' && <PillContent colors={c} onPress={() => setMode('toolbar')} />}
          {mode === 'toolbar' && (
            <ToolbarContent
              colors={c}
              bookmarked={props.bookmarked}
              layout={props.layout}
              direction={props.direction}
              variant={props.variant ?? 'default'}
              mangaMode={props.mangaMode}
              onToggleMangaMode={props.onToggleMangaMode}
              mangaPageDir={props.mangaPageDir}
              onToggleMangaPageDir={props.onToggleMangaPageDir}
              onPrev={props.onPrev}
              onNext={props.onNext}
              onOpenToc={() => setMode('toc')}
              onOpenAnnotations={() => setMode('annotations')}
              onOpenSettings={() => setMode('settings')}
              onToggleBookmark={props.onToggleBookmark}
              onChangeLayout={props.onChangeLayout}
            />
          )}
          {mode === 'toc' && (
            <TocPane
              toc={props.toc}
              onNavigate={(href) => {
                props.onNavigate(href);
                setMode('pill');
              }}
            />
          )}
          {mode === 'annotations' && (
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
          {mode === 'settings' && (
            <SettingsPane
              prefs={props.prefs}
              layout={props.layout}
              direction={props.direction}
              onChange={props.onChangePrefs}
              onLayoutChange={props.onChangeLayout}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill content (A1)
// ─────────────────────────────────────────────────────────────────────────────

function PillContent({ colors: c, onPress }: { colors: ReturnType<typeof useColors>; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open reader controls"
      hitSlop={8}
      style={styles.pillRow}
    >
      <Text style={[styles.pillDots, { color: c.fgMuted }]}>•••</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar content (A2)
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarContent({
  colors: c,
  bookmarked,
  layout,
  direction,
  variant,
  mangaMode,
  onToggleMangaMode,
  mangaPageDir,
  onToggleMangaPageDir,
  onPrev,
  onNext,
  onOpenToc,
  onOpenAnnotations,
  onOpenSettings,
  onToggleBookmark,
  onChangeLayout,
}: {
  colors: ReturnType<typeof useColors>;
  bookmarked?: boolean;
  layout: ReaderLayout;
  direction: ReaderDirection;
  variant: 'default' | 'manga';
  mangaMode?: 'scroll' | 'pages';
  onToggleMangaMode?: () => void;
  mangaPageDir?: MangaPageDir;
  onToggleMangaPageDir?: () => void;
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
  return (
    <View style={styles.toolbar}>
      {/* Page-nav row. Chevrons drive prev/next; the center icon opens
          the chapter list (title + progress moved up to the top bar). */}
      <View style={[styles.pageRow, { borderBottomColor: c.border }]}>
        <NavCell colors={c} icon="chevron-left" onPress={onPrev} ariaLabel="Previous page" />

        <Pressable onPress={onOpenToc} accessibilityLabel="Open chapter list" style={styles.pageMeta} hitSlop={6}>
          <Feather name="list" size={18} color={c.fgMuted} />
        </Pressable>

        <NavCell colors={c} icon="chevron-right" onPress={onNext} ariaLabel="Next page" />
      </View>

      {/* Action row. Manga trims to NOTES + MARK + a mode toggle that swaps
          between vertical scroll (continuous stream) and horizontal paged
          (one-page-at-a-time pinch-zoom gallery). */}
      <View style={styles.actionRow}>
        <ToolCol colors={c} icon="edit-3" label="NOTES" onPress={onOpenAnnotations} />
        <ToolCol colors={c} icon="bookmark" label="MARK" active={!!bookmarked} onPress={onToggleBookmark} />
        {isManga && onToggleMangaMode && (
          <ToolCol
            colors={c}
            icon={mangaMode === 'pages' ? 'menu' : 'file-text'}
            label={mangaMode === 'pages' ? 'SCROLL' : 'PAGES'}
            onPress={onToggleMangaMode}
          />
        )}
        {isManga && mangaMode === 'pages' && onToggleMangaPageDir && (
          <ToolCol
            colors={c}
            // Reading direction only matters in pages mode; in scroll mode
            // pages stack top-to-bottom regardless.
            icon={mangaPageDir === 'rtl' ? 'arrow-left' : 'arrow-right'}
            label={mangaPageDir === 'rtl' ? 'RTL' : 'LTR'}
            onPress={onToggleMangaPageDir}
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
      style={[styles.navCell, { backgroundColor: c.bgSunken }]}
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
      style={[styles.tool, active && { backgroundColor: c.bgSunken }]}
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
    // The one scrim token, same as `BottomSheet`. Was `rgba(0,0,0,0.35)` behind
    // an animated 0→0.35 opacity, i.e. ~12% at full strength — barely a dim.
    backgroundColor: palette.scrim,
  },
  container: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
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
  pillDots: { fontSize: 18, fontWeight: '500', lineHeight: 18, letterSpacing: 2 },

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
