import { useCallback, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import { PressableBackdrop, Touchable } from '@/shared/components/Touchable';
import Feather from '@expo/vector-icons/Feather';
import { useColors } from '@/theme/ThemeContext';
import { fontFamily, palette } from '@/theme/tokens';
import type { MangaPageDir } from '../lib/readerLayout';
import type { ReaderPrefs } from '../lib/readerStorage';
import type { EpubTocItem } from '../lib/foliateHtml';
import { TocPane } from './dock/TocPane';
import { SettingsPane } from './dock/SettingsPane';

// ─────────────────────────────────────────────────────────────────────────────
// One container, four visual modes. The dock owns its own mode, takes the
// container shape (width / height / position / radius) from that mode, and
// renders the appropriate content pane inside.
//
//   pill         · idle grip, small centered capsule
//   toolbar      · expanded, page-nav row + action row
//   toc          · chapter list (taller, backdrop-dimmed)
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

export type DockMode = 'pill' | 'toolbar' | 'toc' | 'settings';

type Props = {
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
  prefs: ReaderPrefs;

  // Actions
  onPrev: () => void;
  onNext: () => void;
  onNavigate: (href: string) => void;
  onChangePrefs: (patch: Partial<ReaderPrefs>) => void;
};

// ─── Layout per mode ─────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

const PILL_WIDTH = 80;
const PILL_HEIGHT = 38;
const PILL_BOTTOM = 22;
const PILL_RADIUS = 999;

const TOOLBAR_HEIGHT = 108;
const PANE_HEIGHT = Math.round(SCREEN_H * 0.7);

const SHEET_WIDTH = SCREEN_W;
const SHEET_BOTTOM = 0;
const SHEET_RADIUS = 22;

const MODES: Record<
  DockMode,
  {
    width: number;
    /** Omitted means "as tall as its content" -- see `settings`. */
    height?: number;
    bottom: number;
    radius: number;
    backdrop: boolean;
  }
> = {
  pill: { width: PILL_WIDTH, height: PILL_HEIGHT, bottom: PILL_BOTTOM, radius: PILL_RADIUS, backdrop: false },
  toolbar: { width: SHEET_WIDTH, height: TOOLBAR_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: false },
  toc: { width: SHEET_WIDTH, height: PANE_HEIGHT, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: true },
  // No height: the typography pane is four rows of controls and nothing that
  // scrolls, so a fixed box could only be too big -- and at PANE_HEIGHT it was,
  // spending 70% of the screen on something that needs a third of it. Leaving
  // height off lets the container take the height of what it actually holds.
  settings: { width: SHEET_WIDTH, bottom: SHEET_BOTTOM, radius: SHEET_RADIUS, backdrop: false },
};

// Swipe-down close thresholds.
const SWIPE_CLOSE_VELOCITY = 0.6;
const SWIPE_CLOSE_DISTANCE = 60;

export function ReaderBottomDock(props: Props) {
  const c = useColors();

  const [mode, setMode] = useState<DockMode>('pill');
  const box = MODES[mode];

  // ── Step-back ────────────────────────────────────────────────────────
  // Single rule: collapse one level. Pane → toolbar → pill.
  const stepBack = useCallback(() => {
    setMode((curr) => {
      if (curr === 'toc' || curr === 'settings') return 'toolbar';
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
      {/* Backdrop — visible only for toc. Tap dismisses. */}
      {showBackdrop && (
        <View style={styles.backdrop}>
          <PressableBackdrop style={StyleSheet.absoluteFill} onPress={stepBack} />
        </View>
      )}

      {/* Outside-tap zone — fills the area above the dock when expanded
          without a backdrop (toolbar / settings). */}
      {expanded && !showBackdrop && (
        <PressableBackdrop style={StyleSheet.absoluteFill} onPress={stepBack} />
      )}

      {/* The container.

          At rest the pill is the only chrome on screen and it sits directly
          ON the page, so it takes the same treatment as the selection menu:
          the palette's filled-primary pair, which is its highest-contrast
          combination and therefore the one thing that reads against a light,
          sepia or dark page alike. As bgElev over a near-white page it was
          all but invisible.

          Expanded, the dock is a sheet with its own edge against dimmed or
          displaced content, so it stays on the surface tokens. */}
      <View
        style={[
          styles.container,
          expanded
            ? { backgroundColor: c.bgElev, borderColor: c.border }
            : [styles.pillSurface, { backgroundColor: palette.btn }],
          {
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

        <View style={[styles.contentWrap, box.height == null && styles.contentAuto]}>
          {mode === 'pill' && <PillContent onPress={() => setMode('toolbar')} />}
          {mode === 'toolbar' && (
            <ToolbarContent
              colors={c}
              variant={props.variant ?? 'default'}
              mangaMode={props.mangaMode}
              onToggleMangaMode={props.onToggleMangaMode}
              mangaPageDir={props.mangaPageDir}
              onToggleMangaPageDir={props.onToggleMangaPageDir}
              onPrev={props.onPrev}
              onNext={props.onNext}
              onOpenToc={() => setMode('toc')}
              onOpenSettings={() => setMode('settings')}
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
          {mode === 'settings' && (
            <SettingsPane prefs={props.prefs} onChange={props.onChangePrefs} />
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill content (A1)
// ─────────────────────────────────────────────────────────────────────────────

function PillContent({ onPress }: { onPress: () => void }) {
  return (
    <Touchable
      minTarget={false}
      hitSlop={8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open reader controls"
      style={styles.pillRow}
    >
      <Text style={styles.pillDots}>•••</Text>
    </Touchable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbar content (A2)
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarContent({
  colors: c,
  variant,
  mangaMode,
  onToggleMangaMode,
  mangaPageDir,
  onToggleMangaPageDir,
  onPrev,
  onNext,
  onOpenToc,
  onOpenSettings,
}: {
  colors: ReturnType<typeof useColors>;
  variant: 'default' | 'manga';
  mangaMode?: 'scroll' | 'pages';
  onToggleMangaMode?: () => void;
  mangaPageDir?: MangaPageDir;
  onToggleMangaPageDir?: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenToc: () => void;
  onOpenSettings: () => void;
}) {
  const isManga = variant === 'manga';
  return (
    <View style={styles.toolbar}>
      {/* One row for everything.
          The arrows keep the edges, because that is where their direction
          reads from -- left goes back, right goes on -- and the tools sit
          between them. It was two rows, arrows above and TYPE below, which
          spent a whole band of the dock on a single button. */}
      <View style={styles.toolRow}>
        <NavCell colors={c} icon="chevron-left" onPress={onPrev} ariaLabel="Previous page" />

        <View style={styles.tools}>
          <ToolCol colors={c} icon="list" label="TOC" onPress={onOpenToc} />
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
          {/* Typography is the only reading control a reflowable book has
              left -- SCROLL/PAGES and VERT/HORIZ are gone, because the book
              decides its own flow now (see readerLayout). */}
          {!isManga && (
            <ToolCol colors={c} icon="type" label="TYPE" onPress={onOpenSettings} />
          )}
        </View>

        <NavCell colors={c} icon="chevron-right" onPress={onNext} ariaLabel="Next page" />
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
    <Touchable
      minTarget={false}
      hitSlop={6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
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
    </Touchable>
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
  // Resting pill: no hairline (it would only darken an already-dark edge) and
  // a cast shadow instead, which is what separates it from the page. Same
  // values as the selection menu, so the two read as one family.
  pillSurface: {
    borderColor: 'transparent',
    // overflow:hidden sets masksToBounds on iOS, which clips a view's OWN
    // shadow as well as its children. The pill holds one centred glyph and
    // has nothing that needs clipping, so it drops the mask and the shadow
    // actually draws. (The expanded sheet keeps the mask -- its panes do run
    // to the rounded corners -- which is why the shadow lives only here.)
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  contentWrap: { flex: 1 },
  // `flex: 1` is `flexBasis: 0` in RN, so inside a container that takes ITS
  // height from its content (the settings box) it resolves against zero free
  // space and collapses the pane to nothing. Modes with no fixed height opt
  // out and are measured normally.
  contentAuto: { flex: 0 },

  // Handle (expanded modes)
  handleArea: {
    paddingTop: 10,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
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
  pillDots: {
    color: palette.btnInk,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 2,
  },

  // Toolbar
  toolbar: { flex: 1, paddingHorizontal: 8, paddingBottom: 16 },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  // Takes the space between the two arrows and shares it out, so the tools
  // stay centred however many of them this variant renders.
  tools: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  navCell: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
